import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { connectDB, disconnectDB } from './services/db';
import { disconnectRedis } from './services/redis';
import { initElasticsearch } from './services/elasticsearch';
import { getOrCreateEtherealAccount } from './services/ethereal';
import { createEmailWorker } from './queue/emailWorker';
import { emailQueue } from './queue/emailQueue';
import { setupBullBoard } from './routes/dashboard';

import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';

const app = express();

// Middlewares
app.use(
  cors({
    origin: [config.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Healthcheck Route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mounting Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

// Mount BullBoard at /admin/queues
app.use('/admin/queues', setupBullBoard());

let emailWorker: any;

async function bootstrap() {
  console.log('🚀 Starting ReachInbox Email Scheduler Service...');

  // 1. Connect PostgreSQL
  await connectDB();

  // 2. Initialize Elasticsearch (with non-blocking fallback)
  await initElasticsearch();

  // 3. Initialize default Ethereal SMTP account
  await getOrCreateEtherealAccount().catch(() => {});

  // 4. Start BullMQ Email Worker
  emailWorker = createEmailWorker();

  // 5. Start Express HTTP Server
  const server = app.listen(config.PORT, () => {
    console.log(`✨ Express server running on port ${config.PORT}`);
    console.log(`📊 Bull Board Queue Monitor available at: http://localhost:${config.PORT}/admin/queues`);
  });

  // Graceful Shutdown Handlers
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n⚠️ ${signal} received. Initiating graceful shutdown...`);

    server.close(() => {
      console.log('🛑 Express HTTP server closed');
    });

    if (emailWorker) {
      await emailWorker.close();
      console.log('🛑 BullMQ Worker closed');
    }

    await emailQueue.close();
    console.log('🛑 BullMQ Queue closed');

    await disconnectRedis();
    await disconnectDB();

    console.log('👋 Clean shutdown completed. Exiting process.');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('💥 Fatal error during bootstrap:', err);
  process.exit(1);
});
