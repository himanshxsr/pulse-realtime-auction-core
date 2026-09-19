'use client';

import { formatInr } from '@/components/auction/PricePanel';
import { Bot, ShieldCheck, X } from 'lucide-react';
import React, { useState } from 'react';

interface AutoBidModalProps {
  isOpen: boolean;
  currentPriceCents: number;
  minIncrementCents: number;
  activeProxyCeilingCents: number | null;
  onSaveProxy: (maxAmountCents: number | null) => void;
  onClose: () => void;
}

export const AutoBidModal: React.FC<AutoBidModalProps> = ({
  isOpen,
  currentPriceCents,
  minIncrementCents,
  activeProxyCeilingCents,
  onSaveProxy,
  onClose,
}) => {
  const minRequiredCents = currentPriceCents + minIncrementCents;
  const initialRupees = activeProxyCeilingCents
    ? (activeProxyCeilingCents / 100).toString()
    : (minRequiredCents / 100 + 100000).toString();

  const [rupeesInput, setRupeesInput] = useState<string>(initialRupees);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRupees = parseFloat(rupeesInput.replace(/[^0-9.]/g, ''));

    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setError('Please enter a valid numeric budget ceiling');
      return;
    }

    const maxCents = Math.round(parsedRupees * 100);

    if (maxCents < minRequiredCents) {
      setError(`Proxy ceiling must be at least ${formatInr(minRequiredCents)}`);
      return;
    }

    setError(null);
    onSaveProxy(maxCents);
    onClose();
  };

  const handleDisable = () => {
    onSaveProxy(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Auto-Bid Proxy Agent</h3>
              <p className="text-xs text-slate-500">
                Automated incremental counter-bidding up to your max budget
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Current Highest Bid:</span>
              <strong className="text-slate-900">{formatInr(currentPriceCents)}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Minimum Required Next Bid:</span>
              <strong className="text-slate-900">{formatInr(minRequiredCents)}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Maximum Budget Ceiling (₹ INR)
            </label>
            <div className="relative rounded-lg shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-slate-500 font-bold sm:text-sm">₹</span>
              </div>
              <input
                type="number"
                step="1000"
                value={rupeesInput}
                onChange={(e) => {
                  setRupeesInput(e.target.value);
                  setError(null);
                }}
                className="block w-full rounded-lg border border-slate-300 pl-8 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g. 3500000"
              />
            </div>
            {error && <p className="text-xs font-medium text-crimson-600 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              Your proxy budget cap is private. The Lua engine only bids by the exact minimum increment needed to counter competing bids.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {activeProxyCeilingCents && (
              <button
                type="button"
                onClick={handleDisable}
                className="px-4 py-2 text-xs font-semibold text-crimson-600 hover:bg-crimson-50 rounded-lg transition-colors"
              >
                Disable Proxy Agent
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
            >
              Activate Proxy Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
