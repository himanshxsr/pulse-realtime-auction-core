'use client';

import type { BidRecord } from '@pulse/shared-types';
import { History, Trophy } from 'lucide-react';
import React from 'react';
import { formatInr } from './PricePanel';

interface OrderBookProps {
  bids: BidRecord[];
  currentBidderId: string;
}

export const OrderBook: React.FC<OrderBookProps> = ({ bids, currentBidderId }) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[320px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Live Order Book ({bids.length})
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Real-time Stream</span>
      </div>

      <div className="overflow-y-auto flex-1 mt-3 space-y-2 pr-1">
        {bids.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No bids placed yet. Be the first to raise the paddle!
          </div>
        ) : (
          bids.map((bid, index) => {
            const isHighest = index === 0;
            const isUserBid = bid.bidderId === currentBidderId;
            const timeStr = new Date(bid.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={bid.id || `${bid.bidderId}-${bid.timestamp}-${index}`}
                className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  isHighest
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-slate-50/50 border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isHighest ? (
                    <Trophy className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                  )}

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900">
                        {bid.bidderName || bid.bidderId}
                      </span>
                      {isUserBid && (
                        <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatInr(bid.amountCents)}</div>
                  {isHighest ? (
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                      Winning
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 uppercase">Outbid</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
