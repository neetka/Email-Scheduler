import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, emailQueue } from './emailQueue';
import { redisConnectionOptions } from '../services/redis';
import { prisma } from '../services/db';
import { EmailStatus } from '@prisma/client';
import { sendEtherealEmail } from '../services/ethereal';
import { indexEmailDoc } from '../services/elasticsearch';
import { reserveSendSlot, checkAndReserveHourlyQuota } from '../services/rateLimiter';
import { sendSlackRateLimitNotification } from '../services/slack';
import { config } from '../config';

export function createEmailWorker() {
  const worker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job: Job<{ emailId: string }>) => {
      const { emailId } = job.data;

      // 1. Fetch EmailJob record with Sender
      const emailJob = await prisma.emailJob.findUnique({
        where: { id: emailId },
        include: { sender: true },
      });

      if (!emailJob) {
        console.warn(`⚠️ EmailJob ${emailId} not found in DB. Skipping.`);
        return;
      }

      // 2. Idempotency & Pre-send atomic transition (SCHEDULED/RATE_LIMITED -> PROCESSING)
      const claimed = await prisma.emailJob.updateMany({
        where: {
          id: emailId,
          status: { in: [EmailStatus.SCHEDULED, EmailStatus.RATE_LIMITED] },
        },
        data: {
          status: EmailStatus.PROCESSING,
          attempts: { increment: 1 },
        },
      });

      if (claimed.count === 0) {
        console.log(`🛡️ Idempotency skip: EmailJob ${emailId} is already in state '${emailJob.status}'`);
        return;
      }

      const sender = emailJob.sender;

      // 3. Apply Distributed Inter-Email Minimum Delay Throttling
      const minDelay = config.MIN_EMAIL_DELAY_MS;
      const slotWaitMs = await reserveSendSlot(sender.id, minDelay);
      if (slotWaitMs > 0) {
        console.log(`⏱️ Worker delaying send for ${slotWaitMs}ms to respect inter-email throttling (Sender: ${sender.email})`);
        await new Promise((res) => setTimeout(res, slotWaitMs));
      }

      // 4. Apply Distributed Sender Hourly Rate Limiting
      const quota = await checkAndReserveHourlyQuota(sender.id, sender.hourlyLimit);

      if (!quota.allowed) {
        console.warn(`🚨 Rate limit exceeded for sender ${sender.email} (${quota.currentCount}/${sender.hourlyLimit} per hour). Rescheduling.`);

        // Re-mark EmailJob as RATE_LIMITED
        await prisma.emailJob.update({
          where: { id: emailId },
          data: { status: EmailStatus.RATE_LIMITED },
        });

        // Reschedule into next hour window
        const delayUntilNextHour = Math.max(2000, quota.nextHourStart.getTime() - Date.now());
        const rescheduleJobId = `email-job-${emailId}-rescheduled-${Date.now()}`;

        await emailQueue.add(
          'send-email',
          { emailId },
          {
            jobId: rescheduleJobId,
            delay: delayUntilNextHour,
          }
        );

        // Send Live Slack Notification if user has connected Slack
        await sendSlackRateLimitNotification(
          emailJob.userId,
          sender.email,
          sender.hourlyLimit,
          1,
          quota.nextHourStart
        );

        return;
      }

      // 5. Execute Email Send via Ethereal SMTP
      try {
        console.log(`📤 Sending email ${emailJob.id} to ${emailJob.recipientEmail}...`);
        const sendResult = await sendEtherealEmail(
          sender,
          emailJob.recipientEmail,
          emailJob.subject,
          emailJob.body
        );

        // 6. Post-send Atomic State Transition -> SENT
        const updatedJob = await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            providerMessageId: sendResult.messageId,
            previewUrl: sendResult.previewUrl,
          },
        });

        console.log(`✅ Email ${emailJob.id} sent successfully! Preview: ${sendResult.previewUrl}`);

        // Index in Elasticsearch (non-blocking)
        indexEmailDoc(updatedJob).catch(() => {});

        return { success: true, messageId: sendResult.messageId, previewUrl: sendResult.previewUrl };
      } catch (error: any) {
        console.error(`❌ Email send failed for ${emailJob.id}:`, error.message);

        // Mark as FAILED in DB
        const failedJob = await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.FAILED,
            errorMessage: error.message,
          },
        });

        indexEmailDoc(failedJob).catch(() => {});
        throw error;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: config.EMAIL_WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`🎉 Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log(`⚙️ BullMQ Email Worker started with concurrency level = ${config.EMAIL_WORKER_CONCURRENCY}`);
  return worker;
}
