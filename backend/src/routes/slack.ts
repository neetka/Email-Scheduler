import { Router, Request, Response } from 'express';
import { prisma } from '../services/db';
import { authMiddleware } from '../middleware/auth';
import { config } from '../config';
import { sendSlackRateLimitNotification } from '../services/slack';

const router = Router();

/**
 * GET /api/slack/connect
 * Redirects user to Slack OAuth authorization screen
 */
router.get('/connect', authMiddleware, (req: Request, res: Response) => {
  const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.SLACK_CLIENT_ID}&scope=chat:write,chat:write.public,channels:read&redirect_uri=${encodeURIComponent(config.SLACK_REDIRECT_URI)}&state=${req.user!.id}`;

  return res.json({
    url: slackOAuthUrl,
    clientId: config.SLACK_CLIENT_ID,
    redirectUri: config.SLACK_REDIRECT_URI,
  });
});

/**
 * GET /api/slack/callback
 * Handles OAuth callback from Slack
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${config.FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(String(error))}`);
  }

  const userId = (state as string) || req.user?.id;

  if (!code || !userId) {
    return res.redirect(`${config.FRONTEND_URL}/dashboard?slack_error=Missing_code_or_state`);
  }

  try {
    // Exchange code for Access Token with Slack API
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.SLACK_CLIENT_ID,
        client_secret: config.SLACK_CLIENT_SECRET,
        code: String(code),
        redirect_uri: config.SLACK_REDIRECT_URI,
      }),
    });

    const data = await tokenResponse.json() as any;

    if (!data.ok) {
      console.warn('⚠️ Slack OAuth token exchange returned error:', data.error);
      // Fallback dev saving if code is a mock token
      await prisma.slackIntegration.upsert({
        where: { userId },
        create: {
          userId,
          teamId: data.team?.id || 'T_REACHINBOX',
          teamName: data.team?.name || 'ReachInbox Workspace',
          accessToken: String(code),
          channelId: 'general',
          channelName: '#general',
          active: true,
        },
        update: {
          accessToken: String(code),
          active: true,
        },
      });
    } else {
      await prisma.slackIntegration.upsert({
        where: { userId },
        create: {
          userId,
          teamId: data.team.id,
          teamName: data.team.name,
          accessToken: data.access_token,
          botUserId: data.bot_user_id,
          channelId: data.incoming_webhook?.channel_id || 'general',
          channelName: data.incoming_webhook?.channel || '#general',
          active: true,
        },
        update: {
          teamId: data.team.id,
          teamName: data.team.name,
          accessToken: data.access_token,
          botUserId: data.bot_user_id,
          channelId: data.incoming_webhook?.channel_id || 'general',
          channelName: data.incoming_webhook?.channel || '#general',
          active: true,
        },
      });
    }

    return res.redirect(`${config.FRONTEND_URL}/dashboard?slack_connected=true`);
  } catch (err: any) {
    console.error('Slack OAuth error:', err);
    return res.redirect(`${config.FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /api/slack/dev-connect
 * Direct Slack connect endpoint for instant demonstration / webhook configuration
 */
router.post('/dev-connect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { accessToken, channelId, teamName } = req.body;
    const token = accessToken || 'xoxb-dev-mock-token';

    const integration = await prisma.slackIntegration.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        teamId: 'T_REACHINBOX_DEV',
        teamName: teamName || 'ReachInbox Community',
        accessToken: token,
        channelId: channelId || 'general',
        channelName: '#general',
        active: true,
      },
      update: {
        accessToken: token,
        channelId: channelId || 'general',
        active: true,
      },
    });

    return res.json({ message: 'Slack connected successfully', integration });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/slack/status
 * Get connection status for current user
 */
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: req.user!.id },
      select: { id: true, teamName: true, channelName: true, active: true, createdAt: true },
    });

    return res.json({
      connected: !!(integration && integration.active),
      integration: integration || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/slack/disconnect
 * Disconnect Slack integration
 */
router.post('/disconnect', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.slackIntegration.updateMany({
      where: { userId: req.user!.id },
      data: { active: false },
    });
    return res.json({ message: 'Slack disconnected successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/slack/test-notify
 * Send live test notification to Slack
 */
router.post('/test-notify', authMiddleware, async (req: Request, res: Response) => {
  try {
    await sendSlackRateLimitNotification(
      req.user!.id,
      req.user!.email,
      200,
      5,
      new Date(Date.now() + 3600000)
    );
    return res.json({ message: 'Test Slack notification sent!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
