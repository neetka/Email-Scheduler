'use client';

import React, { useState } from 'react';
import { EmailJob } from '../types';
import { Star } from 'lucide-react';

interface EmailListViewProps {
  emails: EmailJob[];
  loading: boolean;
  type: 'scheduled' | 'sent';
  onSelectEmail: (email: EmailJob) => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  emails,
  loading,
  type,
  onSelectEmail,
}) => {
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDateString = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = days[date.getDay()];
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      return `${dayName} ${formattedHours}:${minutes} ${seconds} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-8 text-center space-y-3">
        <div className="inline-block w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-[#71717A] font-medium">Fetching emails...</div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E4E4E7] p-12 text-center space-y-2">
        <div className="text-sm font-bold text-[#18181B]">No emails found</div>
        <div className="text-xs text-[#71717A]">
          {type === 'scheduled' ? 'No emails currently scheduled in the queue.' : 'No sent emails recorded yet.'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden divide-y divide-[#E4E4E7] shadow-sm">
      {emails.map((email) => {
        const isStarred = !!starredIds[email.id];
        const displayRecipient = email.recipientEmail ? `To: ${email.recipientEmail}` : 'To: Recipient';
        const formattedTime = formatDateString(email.scheduledAt);

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
          >
            {/* Star Icon Button */}
            <button
              onClick={(e) => toggleStar(e, email.id)}
              className="text-[#D4D4D8] hover:text-[#F59E0B] transition-colors shrink-0"
            >
              <Star
                className={`w-4 h-4 ${
                  isStarred ? 'fill-[#F59E0B] text-[#F59E0B]' : ''
                }`}
              />
            </button>

            {/* Recipient Name */}
            <div className="w-44 font-semibold text-xs text-[#18181B] truncate shrink-0">
              {displayRecipient}
            </div>

            {/* Status / Scheduled Time Badge Pill (Figma Specs) */}
            <div className="shrink-0">
              {type === 'scheduled' ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                  {formattedTime}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F4F4F5] text-[#71717A]">
                  Sent
                </span>
              )}
            </div>

            {/* Subject Line & Snippet Text */}
            <div className="flex-1 min-w-0 text-xs truncate">
              <span className="font-semibold text-[#18181B]">{email.subject || 'No Subject'}</span>
              <span className="text-[#A1A1AA] mx-1.5">-</span>
              <span className="text-[#71717A] truncate">
                {email.body ? email.body.replace(/<[^>]*>?/gm, '') : 'No content preview available...'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
