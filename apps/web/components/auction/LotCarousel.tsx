'use client';

import { Layers, Radio, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

interface LotItem {
  id: string;
  lotNumber: string;
  title: string;
  priceTag: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

interface LotCarouselProps {
  currentAuctionId: string;
}

export const LotCarousel: React.FC<LotCarouselProps> = ({ currentAuctionId }) => {
  const router = useRouter();

  const lots: LotItem[] = [
    {
      id: 'lot-41',
      lotNumber: 'Lot #41',
      title: 'MS Dhoni 2011 World Cup Final Jersey',
      priceTag: '₹18,00,000',
      status: 'ACTIVE',
    },
    {
      id: 'demo-auction-1',
      lotNumber: 'Lot #42',
      title: 'Virat Kohli 2016 IPL Match Bat (Signed)',
      priceTag: '₹24,50,000',
      status: 'ACTIVE',
    },
    {
      id: 'lot-43',
      lotNumber: 'Lot #43',
      title: '1983 Prudential World Cup Gold Medal',
      priceTag: '₹12,00,000',
      status: 'ACTIVE',
    },
  ];

  return (
    <div className="w-full bg-slate-900 text-white border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Multi-Lot Live Auction Catalog
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> 3 High-Value Assets
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        {lots.map((lot) => {
          const isSelected =
            currentAuctionId === lot.id ||
            (currentAuctionId === 'lot-42' && lot.id === 'demo-auction-1');

          return (
            <button
              key={lot.id}
              onClick={() => router.push(`/auction/${lot.id}`)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-slate-800 border-emerald-500 shadow-lg ring-1 ring-emerald-500'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider">
                  {lot.lotNumber}
                </span>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                    <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                    LIVE TERMINAL
                  </span>
                )}
              </div>

              <h4 className="text-xs font-semibold text-white mt-1 line-clamp-1">
                {lot.title}
              </h4>

              <div className="text-xs font-bold text-slate-300 mt-1.5">
                Current: <span className="text-emerald-400">{lot.priceTag}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
