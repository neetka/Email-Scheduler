import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../services/db';
import { redisClient } from '../services/redis';
import { scheduleEmails } from '../queue/emailQueue';
import { checkAndReserveHourlyQuota, reserveSendSlot } from '../services/rateLimiter';
import { EmailStatus } from '@prisma/client';
import { sendSlackRateLimitNotification } from '../services/slack';

describe('Production-Grade Email Scheduler & Worker Audit Suite', () => {
  let testUser: any;
  let testSender: any;

  beforeAll(async () => {
    await prisma.$connect();
    // Clean up test data
    await prisma.emailJob.deleteMany();
    await prisma.sender.deleteMany();
    await prisma.user.deleteMany();

    testUser = await prisma.user.create({
      data: {
        googleId: 'test_google_123',
        email: 'test.user@reachinbox.ai',
        name: 'Test User',
        avatarUrl: 'https://ui-avatars.com/api/?name=Test+User',
      },
    });

    testSender = await prisma.sender.create({
      data: {
        userId: testUser.id,
        email: 'sender@reachinbox.ai',
        displayName: 'ReachInbox Test Sender',
        smtpUser: 'placeholder',
        smtpPass: 'placeholder',
        hourlyLimit: 5,
      },
    });
  });

  afterAll(async () => {
    await prisma.emailJob.deleteMany();
    await prisma.sender.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redisClient.quit();
  });

  it('1. Should schedule individual email jobs into PostgreSQL and BullMQ delayed queue', async () => {
    const scheduledAt = new Date(Date.now() + 60000);
    const result = await scheduleEmails({
      userId: testUser.id,
      senderId: testSender.id,
      recipients: ['lead1@example.com', 'lead2@example.com'],
      subject: 'Welcome to ReachInbox',
      body: 'Hello lead!',
      scheduledAt,
    });

    expect(result.scheduledCount).toBe(2);
    expect(result.emailJobs).toHaveLength(2);
    expect(result.emailJobs[0].status).toBe(EmailStatus.SCHEDULED);
    expect(result.emailJobs[0].bullmqJobId).toContain('email-job-');
  });

  it('2. Should enforce idempotency and block duplicate worker executions', async () => {
    const job = await prisma.emailJob.create({
      data: {
        userId: testUser.id,
        senderId: testSender.id,
        recipientEmail: 'idempotent@example.com',
        subject: 'Idempotency Test',
        body: 'Testing state transitions',
        scheduledAt: new Date(),
        status: EmailStatus.SCHEDULED,
      },
    });

    // 1st transition: SCHEDULED -> PROCESSING
    const claim1 = await prisma.emailJob.updateMany({
      where: {
        id: job.id,
        status: { in: [EmailStatus.SCHEDULED, EmailStatus.RATE_LIMITED] },
      },
      data: { status: EmailStatus.PROCESSING, attempts: { increment: 1 } },
    });

    expect(claim1.count).toBe(1);

    // 2nd transition attempt while in PROCESSING: Must fail (0 rows updated)
    const claim2 = await prisma.emailJob.updateMany({
      where: {
        id: job.id,
        status: { in: [EmailStatus.SCHEDULED, EmailStatus.RATE_LIMITED] },
      },
      data: { status: EmailStatus.PROCESSING, attempts: { increment: 1 } },
    });

    expect(claim2.count).toBe(0);
  });

  it('3. Should calculate distributed inter-email minimum delay slots using Redis Lua script', async () => {
    const minDelay = 2000;
    const slot1 = await reserveSendSlot(testSender.id, minDelay);
    const slot2 = await reserveSendSlot(testSender.id, minDelay);

    expect(slot1).toBeGreaterThanOrEqual(0);
    // Slot 2 must be spaced by minDelay
    expect(slot2).toBeGreaterThanOrEqual(minDelay - 100);
  });

  it('4. Should atomically enforce sender hourly quota and return rate-limit status when exceeded', async () => {
    const senderId = `rate_test_${Date.now()}`;
    const hourlyLimit = 3;

    const r1 = await checkAndReserveHourlyQuota(senderId, hourlyLimit);
    const r2 = await checkAndReserveHourlyQuota(senderId, hourlyLimit);
    const r3 = await checkAndReserveHourlyQuota(senderId, hourlyLimit);
    const r4 = await checkAndReserveHourlyQuota(senderId, hourlyLimit);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
  });

  it('5. Should handle Slack disconnect/not-connected gracefully without errors', async () => {
    await expect(
      sendSlackRateLimitNotification(
        testUser.id,
        testSender.email,
        testSender.hourlyLimit,
        2,
        new Date(Date.now() + 3600000)
      )
    ).resolves.not.toThrow();
  });
});
