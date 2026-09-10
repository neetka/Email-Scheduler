import nodemailer from 'nodemailer';
import { Sender } from '@prisma/client';

export interface EtherealAccount {
  user: string;
  pass: string;
  smtp: { host: string; port: number; secure: boolean };
}

let globalDefaultTestAccount: EtherealAccount | null = null;

export async function getOrCreateEtherealAccount(): Promise<EtherealAccount> {
  if (globalDefaultTestAccount) {
    return globalDefaultTestAccount;
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    globalDefaultTestAccount = {
      user: testAccount.user,
      pass: testAccount.pass,
      smtp: testAccount.smtp,
    };
    console.log(`✅ Default Ethereal SMTP account created: ${testAccount.user}`);
    return globalDefaultTestAccount;
  } catch (error: any) {
    console.error('❌ Failed to create Ethereal account:', error.message);
    throw error;
  }
}

export async function createTransporterForSender(sender: Sender) {
  let user = sender.smtpUser;
  let pass = sender.smtpPass;
  let host = sender.smtpHost;
  let port = sender.smtpPort;

  // Fallback if fake credentials are placeholder
  if (!user || !pass || user.includes('placeholder')) {
    const defaultAccount = await getOrCreateEtherealAccount();
    user = defaultAccount.user;
    pass = defaultAccount.pass;
    host = defaultAccount.smtp.host;
    port = defaultAccount.smtp.port;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });
}

export async function sendEtherealEmail(sender: Sender, to: string, subject: string, body: string) {
  const transporter = await createTransporterForSender(sender);

  const info = await transporter.sendMail({
    from: `"${sender.displayName || sender.email}" <${sender.email}>`,
    to,
    subject,
    text: body,
    html: `<div style="font-family: sans-serif; padding: 20px;">
      <h2>${subject}</h2>
      <p style="white-space: pre-wrap;">${body}</p>
      <hr />
      <small style="color: #666;">Sent via ReachInbox Ethereal Scheduler (Sender: ${sender.email})</small>
    </div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  const messageId = info.messageId;

  return {
    messageId,
    previewUrl: previewUrl ? (previewUrl as string) : null,
  };
}
