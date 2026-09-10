'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { googleAuth, devLogin, fetchCurrentUser } from '../services/api';
import { Sparkles, Shield, Clock, Zap, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already authenticated
    fetchCurrentUser().then((user) => {
      if (user) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError(null);
      await googleAuth(credentialResponse.credential);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await devLogin('alex.intern@reachinbox.ai', 'Alex Intern');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Dev login failed');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FA]">
      <div className="w-full max-w-md bg-white border border-[#E4E4E7] rounded-2xl p-8 shadow-sm space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mx-auto text-white font-black text-xl tracking-tight">
            ONB
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#18181B] tracking-tight">Login</h1>
            <p className="text-xs text-[#71717A] mt-1">Email Job Scheduler & Campaign Dashboard</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        {/* Standard Form Inputs (Figma Design) */}
        <div className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-[#3F3F46]">Email Address</label>
            <input
              type="email"
              defaultValue="oliver.brown@domain.io"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E4E4E7] rounded-xl text-sm text-[#18181B] focus:outline-none focus:border-[#10B981] transition-all"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-[#3F3F46]">Password</label>
            <input
              type="password"
              defaultValue="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E4E4E7] rounded-xl text-sm text-[#18181B] focus:outline-none focus:border-[#10B981] transition-all"
            />
          </div>

          <button
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Logging in...' : 'Login'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E4E4E7]" />
          <span className="text-[11px] uppercase font-semibold text-[#A1A1AA]">Or sign in with</span>
          <div className="flex-1 h-px bg-[#E4E4E7]" />
        </div>

        {/* Google OAuth & Dev Evaluation Login */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Authentication Failed')}
              useOneTap={false}
              theme="outline"
              shape="rectangular"
              text="continue_with"
            />
          </div>

          <button
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E4E4E7] text-[#3F3F46] font-medium text-xs transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#10B981]" />
            <span>Dev Quick Access (Alex Intern)</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-[#A1A1AA]">
            ReachInbox Outbox Labs Hiring Assignment • Figma Spec Aligned
          </p>
        </div>
      </div>
    </main>
  );
}
