import { prisma } from './db';

export async function sendSlackRateLimitNotification(userId: string, senderEmail: string, hourlyLimit: number, rescheduledCount: number, nextHourTime: Date) {
  try {
    const slackIntegration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    if (!slackIntegration || !slackIntegration.active || !slackIntegration.accessToken) {
      // Slack not connected or inactive -> skip without crash
      return;
    }

    const channel = slackIntegration.channelId || 'general';
    const nextFormatted = nextHourTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const messagePayload = {
      channel,
      text: `🚨 Rate Limit Alert: Sender ${senderEmail} reached limit of ${hourlyLimit} emails/hr!`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 ReachInbox Rate Limit Triggered',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:* ${senderEmail}`,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Quota:* ${hourlyLimit} emails/hr`,
            },
            {
              type: 'mrkdwn',
              text: `*Rescheduled Jobs:* ${rescheduledCount} email(s)`,
            },
            {
              type: 'mrkdwn',
              text: `*Next Send Window:* ${nextFormatted}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '⚡ BullMQ delayed queue automatically preserved order and rescheduled pending jobs to the next hour window.',
            },
          ],
        },
      ],
    };

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${slackIntegration.accessToken}`,
      },
      body: JSON.stringify(messagePayload),
    });

    const data = await response.json() as { ok: boolean; error?: string };

    if (!data.ok) {
      console.warn(`⚠️ Slack notification API returned error (${data.error || 'unknown'}).`);
    } else {
      console.log(`💬 Live Slack notification sent to channel '${channel}' for sender ${senderEmail}`);
    }
  } catch (error: any) {
    console.error('⚠️ Failed to send Slack notification:', error.message);
    // Non-blocking for email worker
  }
}
