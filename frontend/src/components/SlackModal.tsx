'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ExternalLink, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { getSlackStatus, getSlackConnectUrl, devConnectSlack, disconnectSlack, triggerTestSlackNotification } from '../services/api';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({ isOpen, onClose }) => {
  const [connected, setConnected] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [customChannel, setCustomChannel] = useState('general');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStatus = async () => {
    try {
      const data = await getSlackStatus();
      setConnected(data.connected);
      if (data.integration) {
        setTeamName(data.integration.teamName);
        setChannelName(data.integration.channelName);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      const data = await getSlackConnectUrl();
      window.location.href = data.url;
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to initialize Slack OAuth' });
      setLoading(false);
    }
  };

  const handleDevConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setFeedback(null);
      await devConnectSlack(customToken || 'xoxb-dev-mock-token', customChannel);
      setFeedback({ type: 'success', message: 'Slack connected successfully!' });
      await loadStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await disconnectSlack();
      setConnected(false);
      setTeamName(null);
      setChannelName(null);
      setFeedback({ type: 'success', message: 'Slack integration disconnected' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      await triggerTestSlackNotification();
      setFeedback({ type: 'success', message: 'Live rate-limit test alert sent to Slack!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white border border-[#E4E4E7] rounded-2xl p-6 shadow-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E4E7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#18181B]">Slack Integration & Rate Limit Alerts</h3>
              <p className="text-xs text-[#71717A]">Real-time Slack notifications when hourly quota limits trigger</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Connection Status */}
        {connected ? (
          <div className="bg-[#ECFDF5] border border-[#10B981]/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#047857] font-bold text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Slack Connected</span>
              </div>
              <span className="text-xs text-[#71717A]">{teamName || 'Workspace'}</span>
            </div>
            <p className="text-xs text-[#3F3F46]">
              Target Channel: <span className="font-mono font-bold text-[#10B981]">{channelName || '#general'}</span>
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTestNotification}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold transition-all shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Live Alert</span>
              </button>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold transition-all"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Real Slack OAuth Flow Button */}
            <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl space-y-3">
              <div className="font-bold text-xs text-[#18181B]">Option 1: Official Slack OAuth 2.0 Authorization</div>
              <p className="text-xs text-[#71717A]">
                Authorize ReachInbox bot on Slack to send automated notifications whenever rate limits occur.
              </p>
              <button
                onClick={handleOAuthConnect}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-xs transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Connect via Slack OAuth 2.0</span>
              </button>
            </div>

            {/* Quick Webhook / Token Dev Input */}
            <form onSubmit={handleDevConnect} className="p-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl space-y-3">
              <div className="font-bold text-xs text-[#18181B]">Option 2: Direct Token / Channel Setup</div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Slack Bot Token (xoxb-...) or leave empty for mock"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2 text-xs text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:border-[#10B981]"
                />
                <input
                  type="text"
                  placeholder="Channel Name or ID (e.g. general)"
                  value={customChannel}
                  onChange={(e) => setCustomChannel(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2 text-xs text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E4E4E7] text-[#3F3F46] text-xs font-semibold transition-all"
              >
                Connect Channel
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
