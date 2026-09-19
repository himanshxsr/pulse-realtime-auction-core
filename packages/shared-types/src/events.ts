import type {
  AuctionState,
  BidRecord,
  BidSubmissionPayload,
  CommentaryMessage,
  ProxyBidConfig,
} from './auction.js';

export interface BidAcceptedPayload {
  auctionId: string;
  bid: BidRecord;
  newState: AuctionState;
  wasExtended: boolean;
}

export interface BidRejectedPayload {
  auctionId: string;
  reason: string;
  code: string;
  currentPriceCents?: number;
  minIncrementCents?: number;
}

export interface OutbidAlertPayload {
  auctionId: string;
  previousLeaderId: string;
  currentPriceCents: number;
  minIncrementCents: number;
}

export interface RoomCountPayload {
  auctionId: string;
  activeBiddersCount: number;
}

export interface AuctionEndedPayload {
  auctionId: string;
  winnerId: string | null;
  winnerName: string | null;
  finalPriceCents: number;
}

export interface JoinRoomPayload {
  auctionId: string;
}

export interface LeaveRoomPayload {
  auctionId: string;
}

export interface ClientToServerEvents {
  'room:join': (payload: JoinRoomPayload) => void;
  'auction:join': (payload: JoinRoomPayload) => void;
  'room:leave': (payload: LeaveRoomPayload) => void;
  'bid:submit': (payload: BidSubmissionPayload) => void;
  'auction:bid': (payload: BidSubmissionPayload) => void;
  'proxy_bid:set': (payload: ProxyBidConfig) => void;
  'auction:reset': (payload: { auctionId: string; durationMinutes?: number }) => void;
}

export interface ServerToClientEvents {
  'auction:state': (state: AuctionState) => void;
  'bid:accepted': (payload: BidAcceptedPayload) => void;
  'bid:rejected': (payload: BidRejectedPayload) => void;
  'bid:outbid': (payload: OutbidAlertPayload) => void;
  'auction:commentary': (commentary: CommentaryMessage) => void;
  'room:count': (payload: RoomCountPayload) => void;
  'auction:ended': (payload: AuctionEndedPayload) => void;
}
