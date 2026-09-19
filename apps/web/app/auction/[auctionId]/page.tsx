'use client';

import { AssetDrawer } from '@/components/auction/AssetDrawer';
import { AutoBidModal } from '@/components/auction/AutoBidModal';
import { BiddingPaddles } from '@/components/auction/BiddingPaddles';
import { CommentaryStream } from '@/components/auction/CommentaryStream';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { FairPlayBanner } from '@/components/auction/FairPlayBanner';
import { LotCarousel } from '@/components/auction/LotCarousel';
import { OrderBook } from '@/components/auction/OrderBook';
import { OutbidAlert } from '@/components/auction/OutbidAlert';
import { PricePanel } from '@/components/auction/PricePanel';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import { AlertCircle, Radio, RotateCcw, Users } from 'lucide-react';
import { useState } from 'react';

interface AuctionPageProps {
  params: {
    auctionId: string;
  };
}

export default function AuctionTerminalPage({ params }: AuctionPageProps) {
  const { auctionId } = params;
  const {
    auctionState,
    bids,
    commentaryList,
    activeBidders,
    outbidAlert,
    lastError,
    isConnected,
    isLoading,
    currentBidderId,
    activeProxyCeilingCents,
    setProxyCeiling,
    submitBid,
    resetAuction,
    dismissOutbidAlert,
  } = useAuctionSocket(auctionId);

  const [isResetting, setIsResetting] = useState(false);
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);

  const handleResetDemoAuction = () => {
    setIsResetting(true);
    resetAuction(5);
    setTimeout(() => setIsResetting(false), 500);
  };

  if (isLoading && !auctionState) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
        <p className="text-sm font-medium text-slate-500">
          Connecting to Live Auction Gateway ({auctionId})...
        </p>
      </div>
    );
  }

  if (!auctionState) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-sm font-medium text-slate-500">
          Auction ({auctionId}) state unavailable. Please reset or try another lot.
        </p>
        <button
          onClick={handleResetDemoAuction}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg"
        >
          Reset Demo Auction
        </button>
      </div>
    );
  }

  const isUserLeading = auctionState.leaderId === currentBidderId;

  return (
    <div className="space-y-6">
      {/* Top Lot Selector Carousel */}
      <LotCarousel currentAuctionId={auctionId} />

      {/* Main Lot Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lot #{auctionState.id} &bull; {auctionState.slug}
            </span>
            <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
              <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
              <span>{auctionState.status}</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {auctionState.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetDemoAuction}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold transition-all active:scale-95 shadow-sm disabled:opacity-50"
            title="Reset demo auction clock to 5 minutes"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo (5m)</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium">
            <Users className="w-4 h-4 text-slate-500" />
            <span>{activeBidders} Active Bidders</span>
          </div>

          <div
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isConnected ? '● Gateway Connected' : '○ Reconnecting...'}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {lastError && (
        <div className="bg-crimson-50 border border-crimson-300 text-crimson-800 p-3.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-crimson-600" />
          <span className="font-semibold">{lastError}</span>
        </div>
      )}

      {/* High-Priority Outbid Alert Card */}
      {outbidAlert?.isOutbid && (
        <OutbidAlert
          currentPriceCents={outbidAlert.currentPriceCents}
          minIncrementCents={outbidAlert.minIncrementCents}
          onCounterBid={(amount: number) => {
            submitBid(amount);
            dismissOutbidAlert();
          }}
          onDismiss={dismissOutbidAlert}
        />
      )}

      {/* Fair Play Soft Close Banner */}
      <FairPlayBanner antiSnipeCount={auctionState.antiSnipeCount} />

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Price, Clock & Paddles */}
        <div className="lg:col-span-7 space-y-6">
          <PricePanel
            currentPriceCents={auctionState.currentPriceCents}
            minIncrementCents={auctionState.minIncrementCents}
            startingPriceCents={auctionState.startingPriceCents}
            reservePriceCents={auctionState.reservePriceCents}
            leaderId={auctionState.leaderId}
            leaderName={auctionState.leaderName}
            currentBidderId={currentBidderId}
            bidCount={auctionState.bidCount}
          />

          <CountdownTimer
            endTimeMs={auctionState.endTime}
            antiSnipeCount={auctionState.antiSnipeCount}
            status={auctionState.status}
          />

          <BiddingPaddles
            currentPriceCents={auctionState.currentPriceCents}
            minIncrementCents={auctionState.minIncrementCents}
            isUserLeading={isUserLeading}
            status={auctionState.status}
            activeProxyCeilingCents={activeProxyCeilingCents}
            onPlaceBid={(amount: number) => submitBid(amount)}
            onOpenProxyModal={() => setIsProxyModalOpen(true)}
          />

          <AssetDrawer
            title={auctionState.title}
            description={auctionState.description}
          />
        </div>

        {/* Right Column: Order Book & Commentary Stream */}
        <div className="lg:col-span-5 space-y-6">
          <OrderBook bids={bids} currentBidderId={currentBidderId} />
          <CommentaryStream commentaryList={commentaryList} />
        </div>
      </div>

      {/* Auto-Bid Proxy Configuration Modal */}
      <AutoBidModal
        isOpen={isProxyModalOpen}
        currentPriceCents={auctionState.currentPriceCents}
        minIncrementCents={auctionState.minIncrementCents}
        activeProxyCeilingCents={activeProxyCeilingCents}
        onSaveProxy={(maxCents) => setProxyCeiling(maxCents)}
        onClose={() => setIsProxyModalOpen(false)}
      />
    </div>
  );
}
