'use client';

import React from 'react';
import { EmailJob } from '../types';
import { ExternalLink, Mail, Clock, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface EmailTableProps {
  emails: EmailJob[];
  loading: boolean;
  type: 'scheduled' | 'sent';
}

export const EmailTable: React.FC<EmailTableProps> = ({ emails, loading, type }) => {
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-dark-card/50 animate-pulse border border-dark-border" />
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto text-gray-500">
          <Mail className="w-6 h-6" />
        </div>
        <div className="text-sm font-semibold text-gray-300">
          {type === 'scheduled' ? 'No Scheduled Emails Found' : 'No Sent Emails Yet'}
        </div>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          {type === 'scheduled'
            ? 'Click "Compose Campaign" to schedule cold outreach emails via BullMQ delayed queue.'
            : 'Emails will appear here once processed and sent via Ethereal SMTP.'}
        </p>
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            Scheduled
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-3 h-3" />
            Rate Limited (Rescheduled)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return <span className="text-xs text-gray-400">{status}</span>;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-dark-border text-[11px] font-semibold uppercase tracking-wider text-gray-400 bg-dark-bg/40">
            <th className="py-3.5 px-6">Recipient Lead</th>
            <th className="py-3.5 px-6">Subject</th>
            <th className="py-3.5 px-6">{type === 'scheduled' ? 'Scheduled Time' : 'Sent Time'}</th>
            <th className="py-3.5 px-6">Status</th>
            {type === 'sent' && <th className="py-3.5 px-6 text-right">Ethereal Preview</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-border text-xs">
          {emails.map((email) => {
            const timeVal = type === 'scheduled' ? email.scheduledAt : (email.sentAt || email.updatedAt);
            const formattedDate = new Date(timeVal).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <tr key={email.id} className="hover:bg-dark-hover/50 transition-colors group">
                <td className="py-4 px-6 font-medium text-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-[10px]">
                      {email.recipientEmail.charAt(0).toUpperCase()}
                    </div>
                    <span>{email.recipientEmail}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-gray-300 max-w-xs truncate">{email.subject}</td>
                <td className="py-4 px-6 text-gray-400 font-mono text-[11px]">{formattedDate}</td>
                <td className="py-4 px-6">{renderStatusBadge(email.status)}</td>
                {type === 'sent' && (
                  <td className="py-4 px-6 text-right">
                    {email.previewUrl ? (
                      <a
                        href={email.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-[11px] font-semibold transition-all"
                      >
                        <span>View Email</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-500 text-[11px]">-</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
