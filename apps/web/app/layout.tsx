import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { UserChip } from '../components/UserChip';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse Realtime Auction Core | Live Bidding Terminal',
  description: 'Financial-grade real-time live asset auction platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-canvas text-slate-900 min-h-screen flex flex-col" suppressHydrationWarning>
        {/* Deep Slate Header Navigation (#0F172A) */}
        <header className="bg-shell text-white border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-extrabold text-lg tracking-tight text-white">
                PULSE <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider ml-1">LIVE AUCTIONS</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Institutional Escrow</span>
            </div>

            <UserChip />
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">{children}</main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          Pulse Realtime Auction Engine v2.0 &bull; Atomic Redis Lua Bidding Gateway &bull; INR Standard
        </footer>
      </body>
    </html>
  );
}
