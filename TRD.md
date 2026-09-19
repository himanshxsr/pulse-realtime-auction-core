<h2>Technical Requirements Document (TRD)</h2>

<h3>Project: `pulse-realtime-auction-core`</h3>

- **Version:** 2.0.0
- **Target Stack:** Node.js 20+ LTS, TypeScript 5.4+, Next.js 15 (App Router), Socket.io 4.7+, Redis 7.2-Alpine, BullMQ 5.x, PostgreSQL 16.2

---

<h3>1. Monorepo Structure & Package Boundaries</h3>

pulse-realtime-auction-core/

├── apps/

│ ├── web/ # Next.js 15 Indian Auction Frontend

│ │ ├── app/ # App router pages (live auction room, catalog)

│ │ ├── components/auction/ # Bidding paddles, clock, commentary, order book

│ │ ├── hooks/ # useAuctionSocket, useCountdown, useProxyBid

│ │ ├── lib/audio/ # Sound triggers (chimes, alerts)

│ │ └── tsconfig.json

│ ├── server/ # Ingress Socket Gateway & Redis Lua Engine

│ │ ├── src/

│ │ │ ├── gateway/ # Socket.io gateway, room broadcast, outbid router

│ │ │ ├── lua/ # resolve_bid.lua

│ │ │ ├── services/ # BidEngine, commentaryService, proxyBidService

│ │ │ ├── config/ # Redis (pub, sub, cmd) and Express server

│ │ │ └── index.ts # Gateway bootstrapper

│ │ ├── Dockerfile

│ │ └── tsconfig.json

│ └── worker/ # BullMQ Settlement Service

│ ├── src/

│ │ ├── queues/ # BullMQ queue & scheduler definitions

│ │ ├── processors/ # settle-auction processor

│ │ ├── persistence/ # PostgreSQL atomic transaction repository

│ │ ├── config/ # PostgreSQL Pool & Redis queue client

│ │ └── index.ts # Worker bootstrapper

│ ├── Dockerfile

│ └── tsconfig.json

├── packages/

│ └── shared-types/ # Shared contracts & DTOs

│ ├── src/

│ │ ├── auction.ts # AuctionState, BidRecord, ProxyBidConfig

│ │ ├── events.ts # Socket event interfaces (C2S, S2C)

│ │ └── index.ts # Barrel export

│ ├── package.json

│ └── tsconfig.json

├── infra/

│ ├── docker-compose.yml # PostgreSQL 16 & Redis 7 Alpine

│ └── migrations/

│ └── 001_initial_schema.sql

├── package.json

└── tsconfig.base.json

---

<h3>2. Shared Data Contracts (`packages/shared-types`)</h3>

All monetary amounts are represented in **integer cents** (or paise in INR context: 1 Rupee = 100 paise) to guarantee mathematical precision without floating-point errors.

// packages/shared-types/src/auction.ts

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

---

<h3>3. Atomic Redis Lua Engine: `resolve_bid.lua`</h3>

All bid verification and state updates execute atomically inside Redis:

-- KEYS[1]: auction:{id}:state

-- KEYS[2]: auction:{id}:bids

-- KEYS[3]: auction:{id}:proxies (Hash: bidderId -> maxAmountCents)

-- ARGV[1]: bidderId

-- ARGV[2]: bidderName

-- ARGV[3]: amountCents

-- ARGV[4]: serverNowMs

-- ARGV[5]: snipeWindowMs (30000)

-- ARGV[6]: extendDurationMs (60000)

local stateKey = KEYS[1]

local bidsKey = KEYS[2]

local proxiesKey = KEYS[3]

local bidderId = ARGV[1]

local bidderName = ARGV[2]

local amountCents = tonumber(ARGV[3])

local nowMs = tonumber(ARGV[4])

local snipeWindowMs = tonumber(ARGV[5])

local extendDurationMs = tonumber(ARGV[6])

-- Verify auction exists and is active

if redis.call("EXISTS", stateKey) == 0 then

    return cjson.encode({ code = "AUCTION_NOT_ACTIVE", success = false })

end

local currentStatus = redis.call("HGET", stateKey, "status")

if currentStatus ~= "ACTIVE" and currentStatus ~= "ENDING_SOON" then

    return cjson.encode({ code = "AUCTION_NOT_ACTIVE", success = false })

end

local endTimeMs = tonumber(redis.call("HGET", stateKey, "endTime"))

if nowMs >= endTimeMs then

    redis.call("HSET", stateKey, "status", "SETTLING")

    return cjson.encode({ code = "AUCTION_EXPIRED", success = false })

end

local currentPriceCents = tonumber(redis.call("HGET", stateKey, "currentPriceCents"))

local minIncrementCents = tonumber(redis.call("HGET", stateKey, "minIncrementCents"))

local currentLeaderId = redis.call("HGET", stateKey, "leaderId")

-- Anti-self-bidding

if currentLeaderId == bidderId then

    return cjson.encode({ code = "ALREADY_LEADER", success = false })

end

-- Validate minimum price threshold

if amountCents < (currentPriceCents + minIncrementCents) then

    return cjson.encode({

        code = "BELOW_MINIMUM_INCREMENT",

        success = false,

        currentPriceCents = currentPriceCents,

        minIncrementCents = minIncrementCents

    })

end

-- Determine Dynamic Minimum Increment for next tier (Indian Lakhs/Crores scaling)

local nextIncrement = 2500000 -- Base ₹25,000

if amountCents >= 1000000000 then -- ₹10 Crore+

    nextIncrement = 50000000          -- ₹50 Lakh

elseif amountCents >= 100000000 then -- ₹1 Crore+

    nextIncrement = 10000000          -- ₹10 Lakh

elseif amountCents >= 25000000 then -- ₹25 Lakh+

    nextIncrement = 5000000           -- ₹50,000

end

-- Check Anti-Sniping Soft-Close Trigger

local wasExtended = false

local antiSnipeCount = tonumber(redis.call("HGET", stateKey, "antiSnipeCount") or "0")

if (endTimeMs - nowMs) <= snipeWindowMs then

    endTimeMs = nowMs + extendDurationMs

    wasExtended = true

    antiSnipeCount = antiSnipeCount + 1

    redis.call("HSET", stateKey, "endTime", tostring(endTimeMs), "status", "ENDING_SOON", "antiSnipeCount", tostring(antiSnipeCount))

end

-- Update Auction State

local bidCount = redis.call("HINCRBY", stateKey, "bidCount", 1)

redis.call("HSET", stateKey,

    "currentPriceCents", tostring(amountCents),

    "minIncrementCents", tostring(nextIncrement),

    "leaderId", bidderId,

    "leaderName", bidderName,

    "updatedAt", tostring(nowMs)

)

-- Append to Monotonic Bid Order Book

local bidEntry = bidderId .. ":" .. bidderName .. ":" .. tostring(nowMs)

redis.call("ZADD", bidsKey, amountCents, bidEntry)

return cjson.encode({

    code = "ACCEPTED_LEADING",

    success = true,

    currentPriceCents = amountCents,

    minIncrementCents = nextIncrement,

    leaderId = bidderId,

    leaderName = bidderName,

    previousLeaderId = currentLeaderId,

    endTime = endTimeMs,

    wasExtended = wasExtended,

    bidCount = bidCount

})

---

<h3>4. BullMQ Settlement Worker (`apps/worker`)</h3>

When an auction expires:

1. BullMQ claims the `settle-auction` delayed job.
2. An atomic SQL transaction in PostgreSQL 16:
   - Sets auction status to `COMPLETED`.
   - Assigns `winner_id` and `current_price_cents`.
   - Inserts an immutable audit record into `settlement_records` with a SHA-256 transaction hash.
   - Commits and closes the room in Redis.

---

<h3>5. PostgreSQL 16 Schema (`infra/migrations/001_initial_schema.sql`)</h3>

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE auction_status AS ENUM (

    'DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDING_SOON', 'SETTLING', 'COMPLETED', 'UNSOLD', 'CANCELLED'

);

CREATE TABLE IF NOT EXISTS users (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    email VARCHAR(255) UNIQUE NOT NULL,

    display_name VARCHAR(64) NOT NULL,

    escrow_balance_cents BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS auctions (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    slug VARCHAR(128) UNIQUE NOT NULL,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    starting_price_cents BIGINT NOT NULL,

    reserve_price_cents BIGINT DEFAULT 0,

    current_price_cents BIGINT NOT NULL,

    status auction_status NOT NULL DEFAULT 'DRAFT',

    winner_id UUID REFERENCES users(id),

    start_time TIMESTAMPTZ NOT NULL,

    end_time TIMESTAMPTZ NOT NULL,

    anti_snipe_count INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS bids (

    id BIGSERIAL PRIMARY KEY,

    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,

    bidder_id UUID NOT NULL REFERENCES users(id),

    amount_cents BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS settlement_records (

    id BIGSERIAL PRIMARY KEY,

    auction_id UUID UNIQUE NOT NULL REFERENCES auctions(id),

    winner_id UUID NOT NULL REFERENCES users(id),

    final_amount_cents BIGINT NOT NULL,

    transaction_hash VARCHAR(64) NOT NULL,

    settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE INDEX idx_auctions_status ON auctions(status);

CREATE INDEX idx_bids_auction ON bids(auction_id, amount_cents DESC);
