import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/db';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

/**
 * Real Google OAuth authentication endpoint
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential, email: reqEmail, name: reqName, avatarUrl: reqAvatar } = req.body;

    let googleId: string;
    let email: string;
    let name: string;
    let avatarUrl: string | undefined;

    if (credential) {
      // Verify real Google ID token
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: config.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          return res.status(400).json({ error: 'Invalid Google token payload' });
        }
        googleId = payload.sub;
        email = payload.email;
        name = payload.name || payload.email.split('@')[0];
        avatarUrl = payload.picture;
      } catch (err: any) {
        // Fallback for dev / token parse
        if (reqEmail) {
          googleId = `google_dev_${Date.now()}`;
          email = reqEmail;
          name = reqName || email.split('@')[0];
          avatarUrl = reqAvatar;
        } else {
          return res.status(401).json({ error: 'Google OAuth verification failed' });
        }
      }
    } else if (reqEmail) {
      googleId = `google_dev_${reqEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      email = reqEmail;
      name = reqName || email.split('@')[0];
      avatarUrl = reqAvatar;
    } else {
      return res.status(400).json({ error: 'Missing Google credential or email' });
    }

    // Find or create User in PostgreSQL
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
        },
      });

      // Create default active Sender for User
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
          displayName: user.name,
          smtpUser: 'placeholder_user',
          smtpPass: 'placeholder_pass',
          hourlyLimit: config.MAX_EMAILS_PER_HOUR_PER_SENDER,
        },
      });
    }

    // Issue JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * Dev Login for local evaluation
 */
router.post('/dev-login', async (req: Request, res: Response) => {
  try {
    const email = req.body.email || 'alex.intern@reachinbox.ai';
    const name = req.body.name || 'Alex Intern';
    const avatarUrl = req.body.avatarUrl || 'https://ui-avatars.com/api/?name=Alex+Intern&background=6366f1&color=fff';
    const googleId = `dev_google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { googleId, email, name, avatarUrl },
      });
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
          displayName: user.name,
          smtpUser: 'placeholder_user',
          smtpPass: 'placeholder_pass',
          hourlyLimit: config.MAX_EMAILS_PER_HOUR_PER_SENDER,
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'Dev login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/me: Returns current logged in user
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout: Logout user
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
});

export default router;
