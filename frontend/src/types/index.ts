export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface Sender {
  id: string;
  email: string;
  displayName?: string | null;
  hourlyLimit: number;
}

export interface EmailJob {
  id: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  attempts: number;
  bullmqJobId?: string | null;
  providerMessageId?: string | null;
  previewUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
}

export interface SlackIntegration {
  id: string;
  teamName?: string | null;
  channelName?: string | null;
  active: boolean;
  createdAt: string;
}

export interface ScheduleEmailsPayload {
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  hourlyLimit?: number;
  senderId?: string;
}
