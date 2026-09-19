'use client';

import { useCountdown } from '@/hooks/useCountdown';
import { Clock, ShieldAlert, Zap } from 'lucide-react';
import React from 'react';

interface CountdownTimerProps {
  endTimeMs: number;
  antiSnipeCount: number;
  status: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTimeMs,
  antiSnipeCount,
  status,
}) => {
  const { minutes, seconds, milliseconds, isEndingSoon, isCritical, isExpired, progressPercent } =
    useCountdown(endTimeMs);

  const getTimerColorClass = () => {
    if (isExpired || status === 'COMPLETED' || status === 'SETTLING') {
      return 'text-slate-400 bg-slate-100 border-slate-200';
    }
    if (isCritical) {
      return 'text-crimson-600 bg-crimson-50 border-crimson-200 animate-pulse';
    }
    if (isEndingSoon) {
      return 'text-amber-600 bg-amber-50 border-amber-200';
    }
    return 'text-slate-900 bg-white border-slate-200';
  };

  const getProgressBarClass = () => {
    if (isCritical) return 'bg-crimson-600';
    if (isEndingSoon) return 'bg-amber-600';
    return 'bg-emerald-600';
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Time Remaining
          </span>
        </div>

        {antiSnipeCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Zap className="w-3.5 h-3.5" />
            <span>Fair-Play Soft Close ({antiSnipeCount}x Extended)</span>
          </div>
        )}

        {isExpired && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Auction Ended</span>
          </div>
        )}
      </div>

      {/* Clock display */}
      <div
        className={`flex items-center justify-center gap-2 border rounded-lg py-4 px-6 font-mono text-3xl md:text-4xl font-bold tracking-tight transition-colors ${getTimerColorClass()}`}
      >
        <span>{minutes}</span>
        <span className="text-slate-400">:</span>
        <span>{seconds}</span>
        <span className="text-slate-400">:</span>
        <span className="text-xl md:text-2xl text-slate-500 font-normal">{milliseconds}</span>
      </div>

      {/* Animated progress bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
        <div
          className={`h-full transition-all duration-100 ease-linear ${getProgressBarClass()}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
