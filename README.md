# 🚀 ReachInbox Production-Grade Email Job Scheduler

A production-grade, distributed cold email job scheduler service and interactive frontend dashboard built for **ReachInbox.ai**.

---

## 📐 System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  FRONTEND DASHBOARD                               |
| (Next.js 14 App Router + TypeScript + Tailwind CSS | Google OAuth + Slack OAuth)  |
+-----------------------------------------------------------------------------------+
                                         |  API Requests (REST / HTTP)
                                         v
+-----------------------------------------------------------------------------------+
|                                 EXPRESS BACKEND                                   |
|  - Auth Routes (Google OAuth, JWT Cookie / Bearer)                                |
|  - Email API (/api/emails/schedule, /api/emails/scheduled, /api/emails/sent)     |
|  - Search API (/api/emails/search - Elasticsearch with PostgreSQL fallback)       |
|  - Slack API (/api/slack/connect, /api/slack/callback, /api/slack/status)         |
|  - BullBoard Queue Dashboard (/admin/queues)                                      |
+-----------------------------------------------------------------------------------+
            |                                |                              |
            v                                v                              v
+-----------------------+        +-----------------------+      +-----------------------+
|  PostgreSQL Database  |        |     Redis + BullMQ    |      |     Elasticsearch     |
| (Prisma ORM: Users,   |        |  (Delayed Email Queue,|      | (Email Indexing &     |
|  Senders, EmailJobs,  |        |   Hourly Rate Limit,  |      |   Full-Text Search)   |
|  SlackIntegrations)   |        |   Inter-Email Delay)  |      |                       |
+-----------------------+        +-----------------------+      +-----------------------+
                                             |
                                             v
                                  +---------------------+
                                  |    BULLMQ WORKER    |
                                  | (Configurable       |
                                  |  Concurrency = 5)   |
                                  +---------------------+
                                             |
                                             v
                                  +---------------------+
                                  |    Ethereal SMTP    |
                                  |  (Fake Mailer API)  |
                                  +---------------------+
```

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, TypeScript, PostgreSQL, Prisma ORM, BullMQ, Redis, Nodemailer, Ethereal Email, Elasticsearch, `@bull-board/express`, Zod, Google Auth Library, Slack Web API.
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, `@react-oauth/google`, Axios, PapaParse (CSV Parser), Lucide Icons.
- **Infrastructure**: Docker Compose (`PostgreSQL`, `Redis`, `Elasticsearch`).

---

## ⚡ Core Engineering Strategies

### 1. No Cron Jobs & Persistent Delayed Queues
- **Constraint**: **Zero cron jobs** (`crontab`, `node-cron`, `agenda`, or `setInterval` polling loops).
- **Mechanism**: Every recipient email generates an individual delayed job in **BullMQ** (`emailQueue.add('send-email', { emailId }, { jobId, delay })`).
- **Persistence**: BullMQ delays are stored as sorted sets (`zset`) inside Redis. If the Express backend server crashes or restarts, scheduled jobs **persist in Redis** and execute at the exact scheduled timestamp without losing state or re-sending.

### 2. Idempotency & Duplicate Send Prevention
- **Pre-send Atomic DB Transition**: Before sending via Nodemailer, the worker executes an atomic PostgreSQL state update:
  ```ts
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
  ```
- If `claimed.count === 0` (because another worker or process claimed the job or it was already sent/failed), the worker logs an **idempotency skip** and terminates without re-sending.
- Post-send transitions update state to `SENT` (capturing `providerMessageId` and `previewUrl`) or `FAILED` (capturing `errorMessage`).

### 3. Distributed Inter-Email Minimum Delay Throttling
- Configurable setting: `MIN_EMAIL_DELAY_MS` (e.g. 2000ms = 2 seconds between sends).
- To prevent race conditions when multiple workers run in parallel, inter-email delay is enforced using an **atomic Redis Lua script** (`reserveSendSlot`).
- Calculates consecutive allowed send timestamps per sender:
  $$\text{nextSlot} = \max(\text{now}, \text{lastSlot} + \text{minDelayMs})$$
- Workers wait for their reserved delay slot before calling SMTP, ensuring exact serialization spacing per sender across all concurrent worker instances.

### 4. Distributed Hourly Rate Limiting & Rescheduling
- Configurable quota limit per sender (`MAX_EMAILS_PER_HOUR_PER_SENDER` or custom limit specified in scheduling request).
- Redis atomic counter key: `rate_limit:{senderId}:{YYYYMMDDHH}` with 2-hour TTL.
- Evaluated atomically via Lua script (`checkAndReserveHourlyQuota`).
- When hourly quota is reached:
  1. Job is **NOT dropped or failed**.
  2. Database status updates to `RATE_LIMITED`.
  3. Job is rescheduled in BullMQ to the start of the next hour window (`getNextHourWindowStart()`).
  4. If user connected Slack, a **live Slack notification** is sent.

### 5. Real Slack OAuth & Rate Limit Notifications
- Users can click **Connect Slack** on the dashboard.
- Uses official **Slack OAuth 2.0 flow** (`/api/slack/connect` $\rightarrow$ Slack authorize $\rightarrow$ `/api/slack/callback` $\rightarrow$ token exchange $\rightarrow$ save `SlackIntegration`).
- When a sender's rate limit is reached during job execution, the worker calls Slack Web API `https://slack.com/api/chat.postMessage` to send a rich notification with sender email, quota details, and rescheduled count.
- If Slack is not connected, rate limit events skip notification cleanly without worker crashes.

### 6. Elasticsearch Search with Database Fallback
- Email jobs are indexed in Elasticsearch index `emails`.
- Search endpoint `GET /api/emails/search?q=...` performs full-text queries across recipient, subject, and body.
- If Elasticsearch is temporarily unreachable, search seamlessly falls back to PostgreSQL ILIKE queries without throwing errors or breaking email dispatch.

---

## 📁 Repository Structure

```
EmailJobScheduler/
├── docker-compose.yml       # Docker Compose for PostgreSQL, Redis, Elasticsearch
├── backend/
│   ├── src/
│   │   ├── config/          # Environment configuration with Zod
│   │   ├── middleware/      # Auth & JWT cookie middleware
│   │   ├── queue/           # BullMQ queue & worker (concurrency = 5)
│   │   ├── routes/          # Express REST routes (auth, emails, slack, dashboard)
│   │   ├── services/        # Prisma DB, Redis, Ethereal, Elasticsearch, Slack, RateLimiter
│   │   ├── tests/           # Vitest integration test suite
│   │   └── index.ts         # Server bootstrap & graceful shutdown
│   ├── prisma/
│   │   └── schema.prisma    # User, Sender, EmailJob, SlackIntegration models
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── app/             # Next.js 14 App Router pages (login, dashboard)
    │   ├── components/      # Header, EmailTable, ComposeModal, SlackModal
    │   ├── services/        # Axios API client
    │   └── types/           # TypeScript interfaces
    ├── package.json
    └── tailwind.config.js
```

---

## 🚦 Local Setup & Run Guide

### Prerequisites
- Node.js v18+ & npm
- PostgreSQL 15 & Redis 7 (or Docker Compose)

### 1. Infrastructure Setup (Docker Compose or Local Services)
Run PostgreSQL, Redis, and Elasticsearch using Docker Compose:
```bash
docker compose up -d
```
*(Or use local PostgreSQL on port 5433 / 5432 and local Redis on 6379)*.

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm test             # Run Vitest test suite
npm run dev          # Starts Express server on http://localhost:4000
```
- **Bull Board Queue Monitor**: Available at `http://localhost:4000/admin/queues`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev          # Starts Next.js app on http://localhost:3000
```

---

## 🎬 5-Minute Demo Walkthrough Guide

Follow these steps for the demo video:

1. **Google Login / Dev Login**:
   - Open `http://localhost:3000`.
   - Click "Sign in as Alex Intern (Dev Mode)" or use real Google OAuth.
   - Redirects to Dashboard displaying user avatar, name, and email.

2. **Schedule Email Campaign & CSV Lead Upload**:
   - Click **Compose Campaign**.
   - Upload a CSV file or paste lead emails. Observe the **Valid Recipients Detected** count badge update instantly.
   - Set Start Time to **now + 1 minute**, inter-email delay to **2 seconds**, and hourly limit to **200**.
   - Click **Schedule Campaign**.

3. **Verify Bull Board & Delayed Queue**:
   - Open `http://localhost:4000/admin/queues` in a new tab.
   - Demonstrate the jobs sitting in BullMQ's **Delayed** queue with exact send timestamps.

4. **Server Restart Persistence Test**:
   - Stop the backend server process (`Ctrl+C` in backend terminal).
   - Wait 15 seconds.
   - Restart the backend server (`npm run dev`).
   - Observe that delayed jobs **persist in Redis** and process automatically at their target time without duplicate sends!

5. **Sent Emails & Ethereal SMTP Preview**:
   - Switch to **Sent Emails** tab in dashboard.
   - Observe emails transition to status `SENT`.
   - Click **View Email** button to open the live Ethereal Email test message preview in browser!

6. **Elasticsearch Full-Text Search**:
   - Enter a search query in the top header search bar.
   - Observe instant full-text filtering across recipient, subject, and body powered by Elasticsearch.

7. **Rate Limit & Live Slack Notification**:
   - Click **Connect Slack** and set up Slack integration.
   - Schedule a campaign with a low hourly limit (e.g. `hourlyLimit: 2`).
   - Observe excess jobs transition to `RATE_LIMITED`, get rescheduled to the next hour window, and trigger a **live notification message in Slack**!

---

## 🔍 API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/google` | Real Google OAuth ID token verification & session creation |
| `POST` | `/api/auth/dev-login` | Evaluation dev login endpoint |
| `GET` | `/api/me` | Fetch authenticated user profile |
| `POST` | `/api/emails/schedule` | Schedule multi-recipient email campaign in BullMQ delayed queue |
| `GET` | `/api/emails/scheduled` | List user's pending scheduled emails |
| `GET` | `/api/emails/sent` | List user's sent & failed emails with Ethereal preview links |
| `GET` | `/api/emails/search?q=...` | Full-text email search via Elasticsearch (with DB fallback) |
| `GET` | `/api/slack/connect` | Initiates Slack OAuth 2.0 authorization redirect |
| `GET` | `/api/slack/callback` | Handles Slack OAuth callback and stores credentials |
| `GET` | `/api/slack/status` | Get user's Slack connection status |
| `POST` | `/api/slack/disconnect` | Disconnect Slack integration |
| `GET` | `/admin/queues` | Live BullBoard queue visualization UI |
