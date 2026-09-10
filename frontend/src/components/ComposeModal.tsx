'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  ArrowLeft,
  X,
  Upload,
  Clock,
  Send,
  Edit2,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { scheduleEmailCampaign } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [senderEmail] = useState('oliver.brown@domain.io');
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientsList, setRecipientsList] = useState<string[]>([
    'recipient@example.com',
  ]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetweenEmailsSec, setDelayBetweenEmailsSec] = useState<number>(0);
  const [hourlyLimit, setHourlyLimit] = useState<number>(0);
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    return d.toISOString().substring(0, 16);
  });

  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const extractEmails = (text: string): string[] => {
    const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(regex) || [];
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      complete: (results) => {
        const text = JSON.stringify(results.data);
        const extracted = extractEmails(text);
        if (extracted.length > 0) {
          setRecipientsList((prev) => Array.from(new Set([...prev, ...extracted])));
        }
      },
      error: () => setError('Failed to parse CSV file'),
    });
  };

  const handleAddRecipient = () => {
    if (!recipientInput.trim()) return;
    const extracted = extractEmails(recipientInput);
    if (extracted.length > 0) {
      setRecipientsList((prev) => Array.from(new Set([...prev, ...extracted])));
      setRecipientInput('');
    }
  };

  const removeRecipient = (emailToRemove: string) => {
    setRecipientsList((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleSendNow = async () => {
    await submitCampaign(new Date().toISOString());
  };

  const handleSendScheduled = async () => {
    setIsSendLaterOpen(false);
    await submitCampaign(new Date(scheduledAt).toISOString());
  };

  const submitCampaign = async (scheduledTimestamp: string) => {
    setError(null);
    const activeRecipients =
      recipientsList.length > 0 ? recipientsList : extractEmails(recipientInput);

    if (activeRecipients.length === 0) {
      setError('Please specify at least one recipient email address');
      return;
    }

    try {
      setLoading(true);
      await scheduleEmailCampaign({
        recipients: activeRecipients,
        subject: subject || 'No Subject',
        body: body || 'No Content',
        scheduledAt: scheduledTimestamp,
        hourlyLimit: hourlyLimit > 0 ? hourlyLimit : 200,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send campaign');
    } finally {
      setLoading(false);
    }
  };

  const setPresetTomorrow = (hours: number) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, 0, 0, 0);
    setScheduledAt(tomorrow.toISOString().substring(0, 16));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-3xl bg-white border border-[#E4E4E7] rounded-2xl shadow-xl overflow-hidden relative flex flex-col max-h-[92vh]">
        {/* Header Bar (Figma Specs) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7] bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 text-[#71717A] hover:text-[#18181B] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm text-[#18181B]">Compose New Email</h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-1.5 rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-colors"
              title="Edit parameters"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Timer Icon / Send Later Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
                className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-xs font-semibold ${
                  isSendLaterOpen
                    ? 'bg-[#ECFDF5] border-[#10B981] text-[#047857]'
                    : 'border-[#E4E4E7] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]'
                }`}
                title="Send Later Options"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Send Later</span>
              </button>

              {/* Figma "Send Later" Popover Menu (Screen 4) */}
              {isSendLaterOpen && (
                <div className="absolute right-0 top-10 z-50 w-72 bg-white border border-[#E4E4E7] rounded-2xl p-4 shadow-xl space-y-4 text-left">
                  <div className="font-bold text-xs text-[#18181B] border-b border-[#E4E4E7] pb-2">
                    Send Later
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#71717A]">
                      Pick date & time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl px-3 py-1.5 text-xs text-[#18181B] focus:outline-none focus:border-[#10B981]"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-[#71717A]">Tomorrow</div>
                    <button
                      type="button"
                      onClick={() => setPresetTomorrow(10)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#3F3F46] hover:bg-[#F4F4F5] flex justify-between"
                    >
                      <span>Tomorrow</span>
                      <span className="text-[#A1A1AA]">10:00 AM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetTomorrow(11)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#3F3F46] hover:bg-[#F4F4F5] flex justify-between"
                    >
                      <span>Tomorrow</span>
                      <span className="text-[#A1A1AA]">11:00 AM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetTomorrow(15)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#3F3F46] hover:bg-[#F4F4F5] flex justify-between"
                    >
                      <span>Tomorrow</span>
                      <span className="text-[#A1A1AA]">3:00 PM</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E4E7]">
                    <button
                      type="button"
                      onClick={() => setIsSendLaterOpen(false)}
                      className="px-3 py-1.5 rounded-xl border border-[#E4E4E7] text-xs font-semibold text-[#71717A] hover:bg-[#F4F4F5]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendScheduled}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold shadow-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Send Primary Button */}
            <button
              type="button"
              onClick={handleSendNow}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Sending...' : 'Send'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Compose Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
          {/* From Line */}
          <div className="flex items-center gap-3 border-b border-[#E4E4E7] pb-3">
            <span className="text-xs font-semibold text-[#71717A] w-16">From</span>
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#F4F4F5] rounded-xl text-xs font-medium text-[#18181B]">
              <span>{senderEmail}</span>
            </div>
          </div>

          {/* To Line with Recipient Chips & Upload List button */}
          <div className="border-b border-[#E4E4E7] pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#71717A] w-16">To</span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E4E4E7] text-xs font-semibold text-[#3F3F46] cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                <span>{fileName ? fileName : 'Upload List'}</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Recipient Chips Container */}
            <div className="flex flex-wrap items-center gap-1.5 pl-16">
              {recipientsList.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] text-xs text-[#18181B] font-medium"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    className="text-[#A1A1AA] hover:text-[#18181B]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <div className="flex-1 min-w-[200px] flex items-center gap-1">
                <input
                  type="email"
                  placeholder="Type email and press Enter..."
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRecipient();
                    }
                  }}
                  className="w-full text-xs text-[#18181B] placeholder-[#A1A1AA] focus:outline-none py-1"
                />
              </div>
            </div>
          </div>

          {/* Subject Line */}
          <div className="flex items-center gap-3 border-b border-[#E4E4E7] pb-3">
            <span className="text-xs font-semibold text-[#71717A] w-16">Subject</span>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-xs font-semibold text-[#18181B] placeholder-[#A1A1AA] focus:outline-none py-1"
            />
          </div>

          {/* Parameters Row (Delay between 2 emails & Hourly Limit) */}
          <div className="flex flex-wrap items-center gap-6 border-b border-[#E4E4E7] pb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#71717A]">Delay between 2 emails</span>
              <input
                type="number"
                min={0}
                max={60}
                value={delayBetweenEmailsSec}
                onChange={(e) => setDelayBetweenEmailsSec(Number(e.target.value))}
                className="w-12 px-2 py-1 bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg text-center font-mono text-xs text-[#18181B] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#71717A]">Hourly Limit</span>
              <input
                type="number"
                min={0}
                max={10000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-14 px-2 py-1 bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg text-center font-mono text-xs text-[#18181B] focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          {/* Rich Text Editor Container */}
          <div className="space-y-3 pt-1">
            {/* Formatting Toolbar (Figma Specs) */}
            <div className="flex flex-wrap items-center gap-1 p-1.5 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl text-[#71717A]">
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <Redo className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-[#E4E4E7] mx-1" />
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-[#E4E4E7] mx-1" />
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <List className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <Quote className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-[#E4E4E7] mx-1" />
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-[#18181B] hover:bg-white rounded-lg">
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Email Content Textarea */}
            <textarea
              placeholder="Type Your Reply..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full p-3 text-xs text-[#18181B] placeholder-[#A1A1AA] focus:outline-none resize-none border border-[#E4E4E7] rounded-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
