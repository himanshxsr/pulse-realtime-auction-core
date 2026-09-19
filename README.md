# pulse-realtime-auction-core

> **A high-concurrency, real-time live auction engine** built from scratch to eliminate race conditions, bid collisions, and bot sniping during peak bidding wars.

Inspired by the intensity of high-stakes live auctions (like the IPL player auction and luxury asset bidding), this project demonstrates how to handle high-frequency concurrent bidding under sub-millisecond execution budgets without database deadlocks.

---

## The Problem It Solves

During the final 30 seconds of an online auction, hundreds of users and automated bots submit bids simultaneously. 

Standard database transaction models (`SELECT ... FOR UPDATE` with relational row locks) break down under this load:
* **Deadlocks & Latency Spikes:** Competing database transactions queue up, causing lock contention and millisecond delays.
* **Race Conditions & Phantom Bids:** In distributed setups, two identical bids at the same price tier can be acknowledged at the exact same millisecond.
* **Bot Sniping:** Algorithmic bidders place bids at T - 100ms before closure, preventing human counter-bids and depriving sellers of fair price discovery.

---

## How It Works

Instead of writing directly to a database on every bid, **Pulse** uses a decoupled three-tier pipeline:

1. **Atomic Ingress Engine (Redis Lua & Socket.io Gateway)**
   - All incoming bids hit a single-threaded Redis Lua script (`resolve_bid.lua`).
   - Atomically checks current leader, price validity (`amountCents > currentPriceCents`), and soft-close anti-sniping rules.
   - Updates auction state, appends to a monotonic sorted-set order book, and broadcasts new price via Socket.io in sub-milliseconds without touching PostgreSQL.

2. **Fair-Play Soft Close (Anti-Sniping Engine)**
   - If a valid bid arrives within the final 30 seconds of an auction, the clock is automatically extended by **+60 seconds**.
   - Ensures human bidders have ample opportunity to respond to automated bot bids.

3. **Asynchronous Settlement Pipeline (BullMQ & PostgreSQL 16)**
   - A delayed BullMQ job is scheduled at `endTime`.
   - When the auction expires, worker processes the settlement inside an isolated PostgreSQL transaction, setting the winner and generating an audit-trail SHA-256 integrity hash.

4. **Humanized Live Bidding Terminal (Next.js 15)**
   - Real-time dual-tone terminal with high-precision countdown timer (`requestAnimationFrame`).
   - Dynamic Indian Lakhs/Crores increment scaling (₹25k, ₹50k, ₹10L, ₹50L base steps).
   - One-click bidding paddles, custom bid input box, auto-bid proxy agent modal, multi-lot carousel, live commentary stream, and synthetic Web Audio sound effects.

---

## Architecture Overview

```
[ Next.js 15 Web Terminal ] ──(WebSocket)──► [ Socket.io Ingress Gateway ]
                                                      │
                                                      ▼
                                       [ Redis 7 Engine (Lua Script) ]
                                            │                 │
                               (Pub/Sub Broadcast)     (Order Book ZSET)
                                            │
                                            ▼
                               [ BullMQ Settlement Queue ]
                                            │
                                            ▼
                                [ PostgreSQL 16 DB (Settled Bids) ]
```

---

## Tech Stack

* **Frontend:** Next.js 15, React, TailwindCSS, Lucide Icons, Web Audio API
* **Backend Gateway:** Node.js, Express, Socket.io (with Redis Adapter)
* **Execution Engine:** Redis 7 (Atomic Lua Scripts)
* **Async Worker:** BullMQ, PostgreSQL 16 (`pg`)
* **Monorepo Architecture:** npm Workspaces (`apps/web`, `apps/server`, `apps/worker`, `packages/shared-types`)

---

## Getting Started

### Prerequisites

* Node.js >= 18
* Docker & Docker Compose

### 1. Start Infrastructure (PostgreSQL & Redis)

```bash
docker-compose -f infra/docker-compose.yml up -d
```

### 2. Install Dependencies & Build Packages

```bash
npm install
npm run build --workspace=packages/shared-types
```

### 3. Run Development Servers

Run services in separate terminal windows:

```bash
# Gateway & Lua Engine (Port 4000)
npm run dev --workspace=apps/server

# Async Settlement Worker
npm run dev --workspace=apps/worker

# Next.js Live Bidding Terminal (Port 3000)
npm run dev --workspace=apps/web
```

Open [http://localhost:3000](http://localhost:3000) in multiple browser tabs to simulate concurrent bidders!

---

## Key API Endpoints

* `POST /api/auction/:id/reset` - Resets demo auction timer to 5 minutes ACTIVE state for testing.

---

## License

MIT
