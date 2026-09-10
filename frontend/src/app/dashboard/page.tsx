'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, EmailJob } from '../../types';
import { fetchCurrentUser, getScheduledEmails, getSentEmails, searchEmails } from '../../services/api';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { EmailListView } from '../../components/EmailListView';
import { EmailDetailView } from '../../components/EmailDetailView';
import { ComposeModal } from '../../components/ComposeModal';
import { SlackModal } from '../../components/SlackModal';
import { Search, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [searchResults, setSearchResults] = useState<EmailJob[] | null>(null);
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Check auth user
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (!u) {
        router.push('/');
      } else {
        setUser(u);
      }
    });
  }, [router]);

  // Load emails
  const loadEmails = useCallback(async () => {
    try {
      setRefreshing(true);
      const [scheduledData, sentData] = await Promise.all([
        getScheduledEmails(),
        getSentEmails(),
      ]);
      setScheduledEmails(scheduledData);
      setSentEmails(sentData);
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadEmails();
      // Auto refresh every 5 seconds for real-time status updates
      const interval = setInterval(loadEmails, 5000);
      return () => clearInterval(interval);
    }
  }, [user, loadEmails]);

  // Handle Elasticsearch Search Query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchSource(null);
      return;
    }

    const timer = setTimeout(() => {
      searchEmails(searchQuery, activeTab === 'scheduled' ? 'SCHEDULED' : undefined)
        .then((data) => {
          setSearchResults(data.emails);
          setSearchSource(data.source);
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleLogout = () => {
    setUser(null);
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 text-[#10B981] font-semibold text-xs">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  const displayedEmails = searchResults !== null
    ? searchResults
    : activeTab === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Left Sidebar Navigation (Figma Spec) */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedEmail(null);
          setSearchQuery('');
        }}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        onOpenCompose={() => setIsComposeOpen(true)}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          user={user}
          onLogout={handleLogout}
          onOpenCompose={() => setIsComposeOpen(true)}
          onOpenSlackModal={() => setIsSlackOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (q) setSelectedEmail(null);
          }}
        />

        {/* Content Body */}
        <main className="flex-1 p-6 space-y-4 max-w-7xl w-full mx-auto">
          {/* Refreshing & Sync indicator bar */}
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold text-[#18181B] capitalize">
              {selectedEmail ? 'Email View' : `${activeTab} (${displayedEmails.length})`}
            </h1>
            <div className="flex items-center gap-2">
              {refreshing && (
                <span className="text-[11px] text-[#A1A1AA] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#10B981]" />
                  Syncing...
                </span>
              )}
              <button
                onClick={loadEmails}
                className="p-1.5 rounded-lg bg-white border border-[#E4E4E7] text-[#71717A] hover:text-[#18181B] transition-colors"
                title="Refresh queue"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Result Indicator Banner */}
          {searchQuery && (
            <div className="flex items-center justify-between p-3 bg-[#ECFDF5] border border-[#10B981]/30 rounded-xl text-xs text-[#047857]">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#10B981]" />
                <span>
                  Search results for <strong className="text-[#18181B]">"{searchQuery}"</strong>
                </span>
                {searchSource && (
                  <span className="px-2 py-0.5 rounded-md bg-[#10B981]/20 text-[#047857] font-mono text-[10px] uppercase font-bold">
                    {searchSource}
                  </span>
                )}
              </div>
              <span>{displayedEmails.length} items</span>
            </div>
          )}

          {/* Display Email Detail View OR Email List View */}
          {selectedEmail ? (
            <EmailDetailView email={selectedEmail} onBack={() => setSelectedEmail(null)} />
          ) : (
            <EmailListView
              emails={displayedEmails}
              loading={loading}
              type={activeTab}
              onSelectEmail={(email) => setSelectedEmail(email)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          loadEmails();
        }}
      />

      <SlackModal isOpen={isSlackOpen} onClose={() => setIsSlackOpen(false)} />
    </div>
  );
}
