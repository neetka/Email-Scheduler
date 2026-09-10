import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db';
import { authMiddleware } from '../middleware/auth';
import { scheduleEmails } from '../queue/emailQueue';
import { searchEmailsInES } from '../services/elasticsearch';
import { EmailStatus } from '@prisma/client';

const router = Router();

// Zod schema for email scheduling request
const scheduleSchema = z.object({
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  hourlyLimit: z.number().int().positive().optional(),
  senderId: z.string().optional(),
});

/**
 * POST /api/emails/schedule
 * Schedule one or multiple emails for a future time using BullMQ delayed jobs
 */
router.post('/schedule', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parseResult = scheduleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
    }

    const { recipients, subject, body, scheduledAt, hourlyLimit, senderId } = parseResult.data;
    const scheduledDate = new Date(scheduledAt);

    // Filter out duplicates
    const uniqueRecipients = Array.from(new Set(recipients.map((r) => r.toLowerCase().trim())));

    const result = await scheduleEmails({
      userId: req.user!.id,
      senderId,
      recipients: uniqueRecipients,
      subject,
      body,
      scheduledAt: scheduledDate,
      hourlyLimit,
    });

    return res.status(201).json({
      message: `Successfully scheduled ${result.scheduledCount} email(s)`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error scheduling emails:', error);
    return res.status(500).json({ error: error.message || 'Failed to schedule emails' });
  }
});

/**
 * GET /api/emails/scheduled
 * Get list of pending/scheduled emails for authenticated user
 */
router.get('/scheduled', authMiddleware, async (req: Request, res: Response) => {
  try {
    const scheduledEmails = await prisma.emailJob.findMany({
      where: {
        userId: req.user!.id,
        status: { in: [EmailStatus.SCHEDULED, EmailStatus.PROCESSING, EmailStatus.RATE_LIMITED] },
      },
      include: {
        sender: {
          select: { email: true, displayName: true, hourlyLimit: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return res.json({ count: scheduledEmails.length, emails: scheduledEmails });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/sent
 * Get list of sent and failed emails for authenticated user
 */
router.get('/sent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sentEmails = await prisma.emailJob.findMany({
      where: {
        userId: req.user!.id,
        status: { in: [EmailStatus.SENT, EmailStatus.FAILED] },
      },
      include: {
        sender: {
          select: { email: true, displayName: true },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    return res.json({ count: sentEmails.length, emails: sentEmails });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/search?q=...&status=...
 * Search emails across recipient, subject, and body using Elasticsearch (with PostgreSQL fallback)
 */
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const queryText = (req.query.q as string || '').trim();
    const status = (req.query.status as string || '').trim();

    if (!queryText) {
      // Return recent emails if no query
      const emails = await prisma.emailJob.findMany({
        where: {
          userId: req.user!.id,
          ...(status ? { status: status as EmailStatus } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return res.json({ source: 'database', count: emails.length, emails });
    }

    // Attempt search in Elasticsearch first
    const esHits = await searchEmailsInES(req.user!.id, queryText, status);

    if (esHits !== null) {
      return res.json({ source: 'elasticsearch', count: esHits.length, emails: esHits });
    }

    // DB Fallback search
    console.log('🔍 Executing DB fallback search for:', queryText);
    const dbEmails = await prisma.emailJob.findMany({
      where: {
        userId: req.user!.id,
        ...(status ? { status: status as EmailStatus } : {}),
        OR: [
          { recipientEmail: { contains: queryText, mode: 'insensitive' } },
          { subject: { contains: queryText, mode: 'insensitive' } },
          { body: { contains: queryText, mode: 'insensitive' } },
        ],
      },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });

    return res.json({ source: 'database_fallback', count: dbEmails.length, emails: dbEmails });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
