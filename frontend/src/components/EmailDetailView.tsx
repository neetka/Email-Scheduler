'use client';

import React from 'react';
import { EmailJob } from '../types';
import { ArrowLeft, Star, Trash2, Tag, Paperclip, ExternalLink } from 'lucide-react';

interface EmailDetailViewProps {
  email: EmailJob;
  onBack: () => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({ email, onBack }) => {
  const formattedDate = email.sentAt
    ? new Date(email.sentAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : new Date(email.scheduledAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

  return (
    <div className="bg-white rounded-2xl border border-[#E4E4E7] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      {/* Top Action Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7] bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-colors"
            title="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold text-[#18181B]">
            {email.subject || 'Oliver, hello there! | MJWYT44 BM#52W01'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F59E0B] hover:bg-[#F4F4F5] transition-colors">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors">
            <Tag className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Email Content Container */}
      <div className="p-8 space-y-6 flex-1">
        {/* Sender Info Line */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {email.sender?.displayName ? email.sender.displayName.charAt(0) : 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#18181B]">
                  {email.sender?.displayName || 'Amanda Clark'}
                </span>
                <span className="text-[11px] text-[#71717A]">
                  &lt;{email.sender?.email || 'sender@example.com'}&gt;
                </span>
              </div>
              <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1 mt-0.5">
                <span>to me ({email.recipientEmail})</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-[#A1A1AA] font-medium">{formattedDate}</div>
        </div>

        {/* Message Body Content */}
        <div className="space-y-4 text-xs text-[#3F3F46] leading-relaxed pt-2">
          <p className="font-medium">Hey Oliver,</p>
          <p>You've just RECEIVED something special regarding your email campaign schedule!</p>

          {/* Figma Yellow Callout Highlight Box */}
          <div className="p-4 bg-[#FEF9C3] border-l-4 border-[#EAB308] rounded-r-xl space-y-2 text-[#854D0E]">
            <div className="font-bold text-xs flex items-center gap-1.5">
              <span>⚡ Extremely Exclusive—Only 4 Spots Worldwide Per Year</span>
              <span className="text-[10px]">| $25,000 investment</span>
            </div>
            <p className="text-[11px] opacity-90">
              To explore securing your private transformation, simply reply right now with <strong className="font-semibold text-[#713F12]">"FLY OUT FIX"</strong>.
            </p>
          </div>

          <div className="pt-2">
            {email.body ? (
              <div
                className="prose max-w-none text-xs text-[#3F3F46]"
                dangerouslySetInnerHTML={{ __html: email.body }}
              />
            ) : (
              <p>Your coach for world class performance,</p>
            )}
          </div>

          <div className="pt-2 text-[#71717A]">
            <p className="italic">P.S. Always remember that you can develop world class technique! 🚀</p>
          </div>

          {/* Ethereal Preview URL if sent */}
          {email.previewUrl && (
            <div className="p-3 bg-[#ECFDF5] border border-[#10B981]/30 rounded-xl text-xs text-[#047857] flex items-center justify-between">
              <span>Live Mailer Delivery Snapshot Available</span>
              <a
                href={email.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold flex items-center gap-1 hover:underline"
              >
                View Ethereal Email <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Attachment Cards Section (Figma Spec) */}
        <div className="pt-6 border-t border-[#E4E4E7] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#18181B]">
            <Paperclip className="w-4 h-4 text-[#A1A1AA]" />
            <span>Attachments (2)</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] transition-colors cursor-pointer w-60">
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold text-xs shrink-0">
                PNG
              </div>
              <div className="truncate">
                <div className="font-semibold text-xs text-[#18181B] truncate">Tennis_Coach_Profile.png</div>
                <div className="text-[10px] text-[#A1A1AA]">1.2 MB</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] transition-colors cursor-pointer w-60">
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold text-xs shrink-0">
                PNG
              </div>
              <div className="truncate">
                <div className="font-semibold text-xs text-[#18181B] truncate">Tennis_Coach_Profile2.png</div>
                <div className="text-[10px] text-[#A1A1AA]">1.2 MB</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
