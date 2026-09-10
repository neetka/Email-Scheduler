import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../services/redis';
import { prisma } from '../services/db';
import { indexEmailDoc } from '../services/elasticsearch';
import { EmailStatus } from '@prisma/client';

export const EMAIL_QUEUE_NAME = 'email-sending-queue';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false, // Keep for visibility in Bull Board
    removeOnFail: false,
  },
});

export interface ScheduleEmailsPayload {
  userId: string;
  senderId?: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: Date;
  minDelayMs?: number;
  hourlyLimit?: number;
}

export async function scheduleEmails(payload: ScheduleEmailsPayload) {
  const { userId, senderId, recipients, subject, body, scheduledAt, hourlyLimit } = payload;

  // 1. Resolve or create Sender for User
  let sender = senderId
    ? await prisma.sender.findFirst({ where: { id: senderId, userId } })
    : await prisma.sender.findFirst({ where: { userId, active: true } });

  if (!sender) {
    sender = await prisma.sender.create({
      data: {
        userId,
        email: `outreach-${userId.slice(0, 6)}@ethereal.email`,
        displayName: 'ReachInbox Sender',
        smtpUser: 'placeholder_user',
        smtpPass: 'placeholder_pass',
        hourlyLimit: hourlyLimit || 200,
      },
    });
  } else if (hourlyLimit && sender.hourlyLimit !== hourlyLimit) {
    sender = await prisma.sender.update({
      where: { id: sender.id },
      data: { hourlyLimit },
    });
  }

  const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());
  const createdEmailJobs = [];

  for (const recipient of recipients) {
    const trimmedRecipient = recipient.trim();
    if (!trimmedRecipient) continue;

    // Create DB EmailJob record
    const emailJob = await prisma.emailJob.create({
      data: {
        userId,
        senderId: sender.id,
        recipientEmail: trimmedRecipient,
        subject,
        body,
        scheduledAt,
        status: EmailStatus.SCHEDULED,
      },
    });

    // Create BullMQ Delayed Job with deterministic ID
    const bullmqJobId = `email-job-${emailJob.id}`;
    const job = await emailQueue.add(
      'send-email',
      { emailId: emailJob.id },
      {
        jobId: bullmqJobId,
        delay: delayMs,
      }
    );

    // Store bullmqJobId in DB
    const updatedJob = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullmqJobId: job.id },
    });

    // Index in Elasticsearch (non-blocking)
    indexEmailDoc(updatedJob).catch(() => {});

    createdEmailJobs.push(updatedJob);
  }

  console.log(`📦 Scheduled ${createdEmailJobs.length} emails for user ${userId} at ${scheduledAt.toISOString()} (delay: ${delayMs}ms)`);
  return {
    scheduledCount: createdEmailJobs.length,
    senderEmail: sender.email,
    scheduledAt,
    emailJobs: createdEmailJobs,
  };
}
