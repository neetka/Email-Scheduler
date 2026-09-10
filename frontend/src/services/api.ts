import axios from 'axios';
import { User, EmailJob, ScheduleEmailsPayload } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://email-scheduler-backend-39rx.onrender.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor for Error Handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const errorMsg = err.response?.data?.error || err.message || 'An unexpected error occurred';
    return Promise.reject(new Error(errorMsg));
  }
);

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await api.get<{ user: User }>('/api/auth/me');
    return res.data.user;
  } catch (err) {
    return null;
  }
}

export async function googleAuth(credential?: string, email?: string, name?: string, avatarUrl?: string): Promise<{ token: string; user: User }> {
  const res = await api.post<{ token: string; user: User }>('/api/auth/google', {
    credential,
    email,
    name,
    avatarUrl,
  });
  return res.data;
}

export async function devLogin(email?: string, name?: string): Promise<{ token: string; user: User }> {
  const res = await api.post<{ token: string; user: User }>('/api/auth/dev-login', { email, name });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

export async function scheduleEmailCampaign(payload: ScheduleEmailsPayload) {
  const res = await api.post('/api/emails/schedule', payload);
  return res.data;
}

export async function getScheduledEmails(): Promise<EmailJob[]> {
  const res = await api.get<{ count: number; emails: EmailJob[] }>('/api/emails/scheduled');
  return res.data.emails;
}

export async function getSentEmails(): Promise<EmailJob[]> {
  const res = await api.get<{ count: number; emails: EmailJob[] }>('/api/emails/sent');
  return res.data.emails;
}

export async function searchEmails(query: string, status?: string): Promise<{ source: string; emails: EmailJob[] }> {
  const res = await api.get<{ source: string; count: number; emails: EmailJob[] }>('/api/emails/search', {
    params: { q: query, status },
  });
  return { source: res.data.source, emails: res.data.emails };
}

export async function getSlackStatus() {
  const res = await api.get<{ connected: boolean; integration: any }>('/api/slack/status');
  return res.data;
}

export async function getSlackConnectUrl() {
  const res = await api.get<{ url: string; redirectUri: string }>('/api/slack/connect');
  return res.data;
}

export async function devConnectSlack(accessToken: string, channelId: string) {
  const res = await api.post('/api/slack/dev-connect', { accessToken, channelId });
  return res.data;
}

export async function disconnectSlack() {
  const res = await api.post('/api/slack/disconnect');
  return res.data;
}

export async function triggerTestSlackNotification() {
  const res = await api.post('/api/slack/test-notify');
  return res.data;
}
