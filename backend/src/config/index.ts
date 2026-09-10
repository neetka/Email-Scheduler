import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/email_scheduler?schema=public'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
  JWT_SECRET: z.string().default('supersecret_jwt_key_reachinbox_2026'),
  GOOGLE_CLIENT_ID: z.string().default('mock_google_client_id_for_dev'),
  SLACK_CLIENT_ID: z.string().default('mock_slack_client_id'),
  SLACK_CLIENT_SECRET: z.string().default('mock_slack_client_secret'),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:4000/api/slack/callback'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  EMAIL_WORKER_CONCURRENCY: z.coerce.number().default(5),
  MIN_EMAIL_DELAY_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().default(200),
});

export const config = configSchema.parse(process.env);
