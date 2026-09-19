'use client';

import { Zap } from 'lucide-react';
import React from 'react';

interface FairPlayBannerProps {
  antiSnipeCount: number;
}

export const FairPlayBanner: React.FC<FairPlayBannerProps> = ({ antiSnipeCount }) => {
  if (antiSnipeCount === 0) {
    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600" />
          <span>
            <strong>Fair-Play Anti-Sniping Protection Active:</strong> Bids placed in the final 30
            seconds automatically extend the clock by +60 seconds.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-800 flex items-center justify-between shadow-sm animate-pulse-subtle">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-amber-600 text-white rounded-md">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-bold text-amber-900">⏱️ Fair-Play Extension Triggered</h5>
          <p className="text-amber-800 mt-0.5">
            +60 seconds added to give all bidders a fair chance to counter late bids. ({antiSnipeCount}x extended)
          </p>
        </div>
      </div>
    </div>
  );
};
