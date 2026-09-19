export type AuctionStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'ENDING_SOON'
  | 'SETTLING'
  | 'COMPLETED'
  | 'UNSOLD'
  | 'CANCELLED';

export interface AuctionState {
  readonly id: string;
  readonly slug: string;
  title: string;
  description: string;
  startingPriceCents: number;
  reservePriceCents: number;
  currentPriceCents: number;
  minIncrementCents: number;
  leaderId: string | null;
  leaderName: string | null;
  startTime: number;
  endTime: number;
  status: AuctionStatus;
  bidCount: number;
  antiSnipeCount: number;
  updatedAt: number;
}

export interface BidSubmissionPayload {
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amountCents: number;
  clientTimestamp: number;
}

export interface ProxyBidConfig {
  auctionId: string;
  bidderId: string;
  maxAmountCents: number;
}

export interface CommentaryMessage {
  id: string;
  auctionId: string;
  text: string;
  timestamp: number;
  type: 'BID' | 'ANTI_SNIPE' | 'CALL' | 'SOLD';
}

export interface BidRecord {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amountCents: number;
  timestamp: number;
}

export interface BidResult {
  code:
    | 'ACCEPTED_LEADING'
    | 'AUCTION_NOT_ACTIVE'
    | 'AUCTION_EXPIRED'
    | 'ALREADY_LEADER'
    | 'BELOW_MINIMUM_INCREMENT'
    | 'ERROR';
  success: boolean;
  currentPriceCents?: number;
  minIncrementCents?: number;
  leaderId?: string;
  leaderName?: string;
  previousLeaderId?: string | null;
  endTime?: number;
  wasExtended?: boolean;
  bidCount?: number;
  reason?: string;
}
