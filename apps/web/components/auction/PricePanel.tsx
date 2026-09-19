'use client';

import { formatInr } from '@/lib/format';
import { ArrowUpRight, CheckCircle2, TrendingUp, Trophy, User } from 'lucide-react';
import React from 'react';

export { formatInr };

interface PricePanelProps {
  currentPriceCents: number;
  minIncrementCents: number;
  startingPriceCents: number;
  reservePriceCents: number;
  leaderId: string | null;
  leaderName: string | null;
  currentBidderId: string;
  bidCount: number;
}

export const PricePanel: React.FC<PricePanelProps> = ({
  currentPriceCents,
  minIncrementCents,
  startingPriceCents,
  reservePriceCents,
  leaderId,
  leaderName,
  currentBidderId,
  bidCount,
}) => {
  const isUserLeading = leaderId === currentBidderId;
  const isReserveMet = currentPriceCents >= reservePriceCents;
  const nextMinBidCents = currentPriceCents + minIncrementCents;

  const growthPercent =
    startingPriceCents > 0
      ? (((currentPriceCents - startingPriceCents) / startingPriceCents) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current Highest Bid
            </span>
            {parseFloat(growthPercent) > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                +{growthPercent}% Growth
              </span>
            )}
          </div>
          <div className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-1">
            {formatInr(currentPriceCents)}
          </div>
        </div>

        {isReserveMet && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Reserve Price Met</span>
          </div>
        )}
      </div>

      {/* Leader status pill */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isUserLeading ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span>You (Current Highest Bidder 🏆)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <User className="w-4 h-4 text-slate-500" />
              <span>Highest Bidder: {leaderName || 'No bids yet'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-xs text-slate-400 block">Starting Price</span>
            <span className="text-xs font-medium text-slate-600">{formatInr(startingPriceCents)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Total Bids</span>
            <span className="text-xs font-semibold text-slate-900">{bidCount} Bids</span>
          </div>
        </div>
      </div>

      {/* Minimum Next Bid banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
          <ArrowUpRight className="w-4 h-4 text-blue-600" />
          <span>Next Minimum Required Raise:</span>
        </div>
        <span className="text-sm font-bold text-slate-900">{formatInr(nextMinBidCents)}</span>
      </div>
    </div>
  );
};
