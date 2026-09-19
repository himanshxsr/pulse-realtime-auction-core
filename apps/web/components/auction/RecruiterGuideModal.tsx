'use client';

import { Bot, RotateCcw, Sparkles, Timer, Users, X, Zap } from 'lucide-react';
import { useState } from 'react';

export interface RecruiterGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecruiterGuideModal({ isOpen, onClose }: RecruiterGuideModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleStartBidding = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('pulse_guide_seen', 'true');
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Dual Tone Dark Header (#0F172A) */}
        <div className="bg-[#0f172a] text-white px-6 py-5 border-b border-slate-800 flex items-start justify-between relative">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wide uppercase">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                PULSE v2.0 // AWS EC2
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Live Engine Testing Guide
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-medium pt-1">
              A sub-millisecond real-time bidding engine built to eliminate race conditions, lock contention, and bot sniping.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Test Steps */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Step 1 */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <span>1. One-Click Paddle Bidding</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click <code className="bg-slate-200 text-slate-900 px-1 py-0.5 rounded text-[11px] font-mono font-bold">+₹25,000</code> or <code className="bg-slate-200 text-slate-900 px-1 py-0.5 rounded text-[11px] font-mono font-bold">+₹50,000</code> to test atomic in-memory Redis Lua execution (&lt; 1ms).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </span>
                <span>2. Multiplayer Bidding War</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Open this URL in an Incognito window side-by-side. Bid in Window A and watch Window B instantly receive the crimson Outbid Alert with one-click counter-bidding!
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Timer className="w-3.5 h-3.5" />
                </span>
                <span>3. Anti-Sniping Soft-Close</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Let the clock tick below 30s, then place a bid. The clock automatically extends by +60s to give all bidders a fair chance to counter.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </span>
                <span>4. Auto-Bid Proxy Agent</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click "Set Max Auto-Bid" (e.g. ₹35 Lakhs) to let the engine counter-bid on your behalf up to your cap.
              </p>
            </div>
          </div>

          {/* Helpful Note Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
            <RotateCcw className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Need a fresh countdown? </span>
              If the auction clock expires, click <span className="font-semibold text-slate-900 bg-amber-200/60 px-1.5 py-0.5 rounded border border-amber-300">Reset Demo (5m)</span> in the top header bar to restart the 5-minute countdown.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
            />
            <span>Don't show again automatically</span>
          </label>

          <button
            onClick={handleStartBidding}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>Start Interactive Bidding →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
