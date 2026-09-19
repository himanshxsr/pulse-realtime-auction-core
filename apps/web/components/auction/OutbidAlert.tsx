'use client';

import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import React from 'react';
import { formatInr } from './PricePanel';

interface OutbidAlertProps {
  currentPriceCents: number;
  minIncrementCents: number;
  onCounterBid: (amountCents: number) => void;
  onDismiss: () => void;
}

export const OutbidAlert: React.FC<OutbidAlertProps> = ({
  currentPriceCents,
  minIncrementCents,
  onCounterBid,
  onDismiss,
}) => {
  const counterAmountCents = currentPriceCents + minIncrementCents;

  return (
    <div className="w-full bg-crimson-50 border-2 border-crimson-600 rounded-xl p-4 shadow-md animate-bounce-subtle">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-crimson-600 text-white rounded-lg mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-crimson-700">
              ⚡ You Have Been Outbid!
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Another bidder raised the paddle to{' '}
              <strong className="text-slate-900 font-semibold">
                {formatInr(currentPriceCents)}
              </strong>
              . Reclaim your position now!
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          aria-label="Dismiss outbid alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <button
          onClick={() => onCounterBid(counterAmountCents)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-crimson-600 hover:bg-crimson-700 text-white text-sm font-bold rounded-lg shadow transition-colors active:scale-95"
        >
          <span>Counter-Bid Now ({formatInr(counterAmountCents)})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
