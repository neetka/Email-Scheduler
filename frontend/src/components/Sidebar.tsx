'use client';

import React from 'react';
import { User } from '../types';
import { Plus, Clock, Send, ChevronDown } from 'lucide-react';

interface SidebarProps {
  user: User;
  activeTab: 'scheduled' | 'sent';
  setActiveTab: (tab: 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  onOpenCompose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  setActiveTab,
  scheduledCount,
  sentCount,
  onOpenCompose,
}) => {
  return (
    <aside className="w-64 bg-white border-r border-[#E4E4E7] flex flex-col justify-between p-4 shrink-0 h-screen sticky top-0">
      <div className="space-y-6">
        {/* User Account Profile Card (Figma Style) */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff`}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
            <div className="truncate">
              <div className="font-semibold text-xs text-[#18181B] truncate">{user.name}</div>
              <div className="text-[10px] text-[#71717A] truncate">{user.email}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-[#A1A1AA] shrink-0" />
        </div>

        {/* Compose Pill Button (Figma Style) */}
        <button
          onClick={onOpenCompose}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-[#10B981] bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#047857] font-bold text-xs tracking-wide transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#047857]" />
          <span>Compose</span>
        </button>

        {/* Navigation Section */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
            CORE
          </div>

          {/* Scheduled Tab */}
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'scheduled'
                ? 'bg-[#F4F4F5] text-[#18181B]'
                : 'text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className={`w-4 h-4 ${activeTab === 'scheduled' ? 'text-[#18181B]' : 'text-[#A1A1AA]'}`} />
              <span>Scheduled</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E4E4E7] text-[#3F3F46]">
              {scheduledCount}
            </span>
          </button>

          {/* Sent Tab */}
          <button
            onClick={() => setActiveTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'sent'
                ? 'bg-[#F4F4F5] text-[#18181B]'
                : 'text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className={`w-4 h-4 ${activeTab === 'sent' ? 'text-[#18181B]' : 'text-[#A1A1AA]'}`} />
              <span>Sent</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E4E4E7] text-[#3F3F46]">
              {sentCount}
            </span>
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E4E4E7] text-[10px] text-[#A1A1AA] text-center">
        ReachInbox Outbox Labs • v1.0
      </div>
    </aside>
  );
};
