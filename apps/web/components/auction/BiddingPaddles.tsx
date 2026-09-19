'use client';

import { formatInr } from '@/lib/format';
import { AlertTriangle, Bot, Gavel, Plus, Send } from 'lucide-react';
import React, { useState } from 'react';

interface BiddingPaddlesProps {
  currentPriceCents: number;
  minIncrementCents: number;
  isUserLeading: boolean;
  status: string;
  activeProxyCeilingCents: number | null;
  onPlaceBid: (amountCents: number) => void;
  onOpenProxyModal: () => void;
}

export const BiddingPaddles: React.FC<BiddingPaddlesProps> = ({
  currentPriceCents,
  minIncrementCents,
  isUserLeading,
  status,
  activeProxyCeilingCents,
  onPlaceBid,
  onOpenProxyModal,
}) => {
  const isAuctionActive = status === 'ACTIVE' || status === 'ENDING_SOON';
  const isDisabled = !isAuctionActive || isUserLeading;

  const minBidAmount = currentPriceCents + minIncrementCents;

  const [customRupees, setCustomRupees] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);

  const paddlePresets = [
    { label: '+ ₹25,000', amountCents: minBidAmount },
    { label: '+ ₹50,000', amountCents: minBidAmount + 2500000 },
    { label: '+ ₹1,00,000', amountCents: minBidAmount + 7500000 },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuctionActive) return;

    if (isUserLeading) {
      setCustomError('You already hold the highest bid. Wait for another bidder before raising.');
      return;
    }

    const rawNumeric = customRupees.replace(/[^0-9]/g, '');
    if (!rawNumeric) {
      setCustomError('Enter a valid amount in Rupees');
      return;
    }

    const amountCents = parseInt(rawNumeric, 10) * 100;

    if (amountCents <= currentPriceCents) {
      setCustomError(`Custom bid must be greater than current bid (${formatInr(currentPriceCents)})`);
      return;
    }

    setCustomError(null);
    onPlaceBid(amountCents);
    setCustomRupees('');
  };

  const formattedDisplayValue = customRupees
    ? parseInt(customRupees, 10).toLocaleString('en-IN')
    : '';

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          One-Click Bidding Paddles & Controls
        </span>

        {activeProxyCeilingCents ? (
          <button
            onClick={onOpenProxyModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-blue-600" />
            <span>Proxy Active: Up to {formatInr(activeProxyCeilingCents)}</span>
          </button>
        ) : (
          <button
            onClick={onOpenProxyModal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <Bot className="w-3.5 h-3.5 text-blue-600" />
            <span>Set Max Auto-Bid</span>
          </button>
        )}
      </div>

      {/* Leader visual banner when user is leading */}
      {isUserLeading && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>You already hold the highest bid. Wait for another bidder before raising.</span>
        </div>
      )}

      {/* Main minimum raise button */}
      <button
        onClick={() => onPlaceBid(minBidAmount)}
        disabled={isDisabled}
        className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-md ${
          isDisabled
            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
        }`}
      >
        <Gavel className="w-5 h-5" />
        <span>
          {isUserLeading
            ? 'You Hold Highest Bid'
            : `Raise Paddle to ${formatInr(minBidAmount)}`}
        </span>
      </button>

      {/* Quick paddle increment buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {paddlePresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onPlaceBid(preset.amountCents)}
            disabled={isDisabled}
            className={`py-3 px-3 rounded-lg text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
              isDisabled
                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 active:scale-95'
            }`}
          >
            <div className="flex items-center text-slate-700 font-semibold">
              <Plus className="w-3 h-3 mr-0.5 text-emerald-600" />
              <span>{preset.label.replace(/^\+\s*\+/, '+')}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-normal">
              {formatInr(preset.amountCents)}
            </span>
          </button>
        ))}
      </div>

      {/* Custom Bid Input Box */}
      <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-slate-100 space-y-2">
        <label className="block text-xs font-medium text-slate-600">
          Or Enter Custom High-Value Bid (₹ INR):
        </label>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-slate-500 font-bold text-xs">₹</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={formattedDisplayValue}
              onChange={(e) => {
                const rawNumeric = e.target.value.replace(/[^0-9]/g, '');
                setCustomRupees(rawNumeric);
                setCustomError(null);
              }}
              disabled={isDisabled}
              placeholder="Enter any amount > current bid"
              className="block w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isDisabled || !customRupees}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
              isDisabled || !customRupees
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
            }`}
          >
            <span>Submit Bid</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {customError && (
          <p className="text-[11px] font-medium text-crimson-600">{customError}</p>
        )}
      </form>
    </div>
  );
};

