'use client';

import { soundFx } from '@/lib/audio';
import { formatInr } from '@/lib/format';
import type {
  AuctionState,
  BidAcceptedPayload,
  BidRecord,
  BidRejectedPayload,
  BidSubmissionPayload,
  CommentaryMessage,
  OutbidAlertPayload,
  RoomCountPayload,
} from '@pulse/shared-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  if (process.env['NEXT_PUBLIC_SOCKET_URL']) {
    return process.env['NEXT_PUBLIC_SOCKET_URL'];
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
};

export interface UseAuctionSocketReturn {
  auctionState: AuctionState | null;
  bids: BidRecord[];
  commentaryList: CommentaryMessage[];
  activeBidders: number;
  outbidAlert: { isOutbid: boolean; currentPriceCents: number; minIncrementCents: number } | null;
  lastError: string | null;
  isConnected: boolean;
  isLoading: boolean;
  currentBidderId: string;
  currentBidderName: string;
  activeProxyCeilingCents: number | null;
  setProxyCeiling: (maxCents: number | null) => void;
  submitBid: (amountCents: number) => void;
  resetAuction: (durationMinutes?: number) => void;
  dismissOutbidAlert: () => void;
}

export function useAuctionSocket(auctionId: string): UseAuctionSocketReturn {
  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return { id: 'user_default', name: 'Bidder' };
    let id = sessionStorage.getItem('pulse_bidder_id');
    let name = sessionStorage.getItem('pulse_bidder_name');
    if (!id) {
      id = `bidder_${Math.floor(100 + Math.random() * 900)}`;
      sessionStorage.setItem('pulse_bidder_id', id);
    }
    if (!name) {
      const names = [
        'Aakash Sharma (Mumbai)',
        'Priya Nair (Bengaluru)',
        'Vikram Malhotra (Delhi)',
        'Ananya Roy (Kolkata)',
        'Rohan Mehta (Ahmedabad)',
      ];
      name = names[Math.floor(Math.random() * names.length)]!;
      sessionStorage.setItem('pulse_bidder_name', name);
    }
    return { id, name };
  }, []);

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [commentaryList, setCommentaryList] = useState<CommentaryMessage[]>([]);
  const [activeBidders, setActiveBidders] = useState<number>(1);
  const [outbidAlert, setOutbidAlert] = useState<{
    isOutbid: boolean;
    currentPriceCents: number;
    minIncrementCents: number;
  } | null>(null);
  const [activeProxyCeilingCents, setActiveProxyCeilingCents] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const socketRef = useRef<Socket | null>(null);
  const proxyCeilingRef = useRef<number | null>(null);
  proxyCeilingRef.current = activeProxyCeilingCents;

  const submitBid = useCallback(
    (amountCents: number) => {
      if (!socketRef.current || !isConnected) {
        setLastError('Socket not connected');
        return;
      }

      const payload: BidSubmissionPayload = {
        auctionId,
        bidderId: currentUserRef.current.id,
        bidderName: currentUserRef.current.name,
        amountCents,
        clientTimestamp: Date.now(),
      };

      console.log('[Web Socket] Submitting auction bid:', payload);
      soundFx.playGavelTap();
      socketRef.current.emit('auction:bid', payload);
    },
    [auctionId, isConnected]
  );

  const submitBidRef = useRef(submitBid);
  submitBidRef.current = submitBid;

  const resetAuction = useCallback(
    (durationMinutes = 5) => {
      if (socketRef.current?.connected) {
        console.log('[Web Socket] Emitting auction:reset for', auctionId, 'duration:', durationMinutes);
        socketRef.current.emit('auction:reset', { auctionId, durationMinutes });
      } else {
        console.warn('[Web Socket] Cannot emit auction:reset - socket disconnected');
      }
    },
    [auctionId]
  );

  useEffect(() => {
    if (!auctionId) return;

    setIsLoading(true);
    const targetUrl = getSocketUrl();
    console.log('[Client] Connecting to gateway:', targetUrl, 'for auction:', auctionId);

    const socket: Socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Client] Connected to gateway, joining room:', auctionId);
      setIsConnected(true);
      socket.emit('auction:join', { auctionId, userId: currentUserRef.current.id });
      socket.emit('room:join', { auctionId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('auction:state', (state: AuctionState) => {
      console.log('[Client] Received auction state:', state);
      setAuctionState(state);
      setIsLoading(false);
    });

    socket.on('bid:accepted', (payload: BidAcceptedPayload) => {
      setAuctionState(payload.newState);
      setIsLoading(false);
      setBids((prev) => [payload.bid, ...prev]);

      if (payload.newState.leaderId === currentUserRef.current.id) {
        setOutbidAlert(null);
        soundFx.playGavelTap();
      } else {
        // Automatic proxy agent counter-bid check with ₹1 precision resolution
        const ceiling = proxyCeilingRef.current;
        if (
          ceiling &&
          payload.newState.leaderId !== currentUserRef.current.id &&
          (payload.newState.status === 'ACTIVE' || payload.newState.status === 'ENDING_SOON')
        ) {
          let nextAutoBidCents =
            payload.newState.currentPriceCents + payload.newState.minIncrementCents;
          if (nextAutoBidCents > ceiling && payload.newState.currentPriceCents + 100 <= ceiling) {
            nextAutoBidCents = Math.min(ceiling, payload.newState.currentPriceCents + 100);
          }

          if (
            nextAutoBidCents <= ceiling &&
            nextAutoBidCents > payload.newState.currentPriceCents
          ) {
            console.log(
              `[Proxy Agent] Auto-countering bid to ${nextAutoBidCents} (Ceiling: ${ceiling})`
            );
            setTimeout(() => {
              submitBidRef.current(nextAutoBidCents);
            }, 300);
          }
        }
      }
    });

    socket.on('bid:outbid', (payload: OutbidAlertPayload) => {
      if (payload.previousLeaderId === currentUserRef.current.id) {
        soundFx.playOutbidChime();
        setOutbidAlert({
          isOutbid: true,
          currentPriceCents: payload.currentPriceCents,
          minIncrementCents: payload.minIncrementCents,
        });

        // Automatic proxy agent counter-bid trigger with ₹1 precision resolution
        const ceiling = proxyCeilingRef.current;
        if (ceiling) {
          let nextAutoBidCents = payload.currentPriceCents + payload.minIncrementCents;
          if (nextAutoBidCents > ceiling && payload.currentPriceCents + 100 <= ceiling) {
            nextAutoBidCents = Math.min(ceiling, payload.currentPriceCents + 100);
          }

          if (nextAutoBidCents <= ceiling && nextAutoBidCents > payload.currentPriceCents) {
            console.log(
              `[Proxy Agent Outbid] Auto-countering outbid to ${nextAutoBidCents} (Ceiling: ${ceiling})`
            );
            setTimeout(() => {
              submitBidRef.current(nextAutoBidCents);
            }, 300);
          }
        }
      }
    });

    socket.on('bid:rejected', (payload: BidRejectedPayload) => {
      console.warn('[Web Socket] Bid rejected:', payload);
      let toastMsg = payload.reason || 'Bid rejected';

      if (payload.code === 'ALREADY_LEADER' || payload.reason === 'ALREADY_LEADER') {
        toastMsg = '⚠ You already hold the highest bid!';
      } else if (
        payload.code === 'BELOW_MINIMUM_INCREMENT' ||
        payload.code === 'BELOW_CURRENT_PRICE' ||
        payload.reason === 'BELOW_MINIMUM_INCREMENT'
      ) {
        const minNext = (payload.currentPriceCents ?? 0) + (payload.minIncrementCents ?? 0);
        const minFormatted = minNext > 0 ? formatInr(minNext) : 'the minimum required amount';
        toastMsg = `⚠ Bid must be at least ${minFormatted}`;
      } else if (
        payload.code === 'AUCTION_EXPIRED' ||
        payload.code === 'AUCTION_NOT_ACTIVE' ||
        payload.reason === 'AUCTION_EXPIRED'
      ) {
        toastMsg = '⚠ Bidding has closed for this lot.';
      }

      setLastError(toastMsg);
      setTimeout(() => setLastError(null), 5000);
    });

    socket.on('auction:commentary', (msg: CommentaryMessage) => {
      setCommentaryList((prev) => [msg, ...prev]);
    });

    socket.on('room:count', (payload: RoomCountPayload) => {
      if (payload.auctionId === auctionId) {
        setActiveBidders(payload.activeBiddersCount);
      }
    });

    return () => {
      console.log('[Client] Cleaning up socket connection for room:', auctionId);
      socket.emit('room:leave', { auctionId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [auctionId]);

  const setProxyCeiling = useCallback((maxCents: number | null) => {
    setActiveProxyCeilingCents(maxCents);
  }, []);

  const dismissOutbidAlert = useCallback(() => {
    setOutbidAlert(null);
  }, []);

  return {
    auctionState,
    bids,
    commentaryList,
    activeBidders,
    outbidAlert,
    lastError,
    isConnected,
    isLoading,
    currentBidderId: currentUser.id,
    currentBidderName: currentUser.name,
    activeProxyCeilingCents,
    setProxyCeiling,
    submitBid,
    resetAuction,
    dismissOutbidAlert,
  };
}
