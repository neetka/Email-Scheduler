'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { logout, getSlackStatus } from '../services/api';
import { Search, LogOut, Activity, MessageSquare, PlusCircle, ExternalLink } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenCompose,
  onOpenSlackModal,
  searchQuery,
  setSearchQuery,
}) => {
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackChannel, setSlackChannel] = useState<string | null>(null);

  useEffect(() => {
    getSlackStatus()
      .then((data) => {
        setSlackConnected(data.connected);
        if (data.integration?.channelName) {
          setSlackChannel(data.integration.channelName);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogoutClick = async () => {
    await logout();
    onLogout();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E4E4E7] px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Brand Logo (ONB Figma style) */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white font-black text-sm tracking-tighter">
            ONB
          </div>
        </div>

        {/* Global Search Bar (Figma spec) */}
        <div className="flex-1 max-w-xl relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F4F4F5] border border-transparent focus:border-[#E4E4E7] focus:bg-white rounded-xl pl-9 pr-8 py-2 text-xs text-[#18181B] placeholder-[#A1A1AA] focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A1A1AA] hover:text-[#18181B]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Controls & Integrations */}
        <div className="flex items-center gap-3">
          {/* BullBoard Queue Link */}
          <a
            href="http://localhost:4000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E4E4E7] text-xs font-semibold text-[#3F3F46] transition-colors"
            title="Open Live BullMQ Queue Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Queues</span>
            <ExternalLink className="w-3 h-3 text-[#A1A1AA]" />
          </a>

          {/* Slack Connection Button */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              slackConnected
                ? 'bg-[#ECFDF5] border-[#10B981]/30 text-[#047857]'
                : 'bg-[#F4F4F5] border-[#E4E4E7] text-[#3F3F46] hover:bg-[#E4E4E7]'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${slackConnected ? 'text-[#10B981]' : 'text-[#71717A]'}`} />
            <span>{slackConnected ? `Slack (${slackChannel || '#general'})` : 'Slack'}</span>
          </button>

          {/* User Logout Icon */}
          <button
            onClick={handleLogoutClick}
            title="Logout"
            className="p-2 rounded-xl text-[#71717A] hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
