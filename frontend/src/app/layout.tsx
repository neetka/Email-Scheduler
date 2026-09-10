import type { Metadata } from 'next';
import './globals.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

export const metadata: Metadata = {
  title: 'ReachInbox - Production-Grade Email Job Scheduler',
  description: 'AI-driven cold email outreach scheduling platform powered by BullMQ, Redis, PostgreSQL, and Ethereal SMTP.',
};

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your_google_client_id_here';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-gray-100 antialiased selection:bg-brand-500 selection:text-white">
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
