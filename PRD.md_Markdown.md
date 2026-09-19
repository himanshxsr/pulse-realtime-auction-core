# Product Requirements Document (PRD)

## Project: `pulse-realtime-auction-core`

- **Author:** Himanshu Aashish (Systems & Full-Stack Architecture)

- **Document Status:** Approved for Engineering Implementation

- **Revision:** 2.0.0 (Humanized Dual-Tone & Indian Auction Engine Edition)

- **Target Stack:** Node.js 20+ LTS, TypeScript 5.4+, Next.js 15 (App Router), Socket.io 4.7+, Redis 7.2 (Alpine, Lua Engine), BullMQ 5.x, PostgreSQL 16.2


## 1. Executive Summary & Product Vision

### 1.1 Objective

`pulse-realtime-auction-core` is an institutional-grade, real-time live auction platform built for high-concurrency asset bidding. Inspired by the intensity of the **Indian Premier League (IPL) mega-auctions** and luxury heritage asset bidding, the platform replaces intimidating financial jargon with human, intuitive interactions while executing sub-millisecond atomic bid resolution under the hood.

### 1.2 Core Product Problems Solved

1. **Concurrency & Race Conditions:** Hundreds of competing bidders raising their paddles simultaneously at the same second. Resolved in $< 1\text{ms}$ in-memory via atomic **Redis Lua scripts** with zero database lock contention.

2. **Bot Sniping:** Algorithmic bidders attempting to snatch lots at $T - 100\text{ms}$. Prevented via a **Dynamic Fair-Play Soft-Close Timer** that auto-extends the auction clock whenever bids land in the final 30 seconds.

3. **Complex User Friction:** Replaces obscure trading terms with transparent, human-first bidding paddles, live auctioneer commentary, and auto-bidding proxy caps.


## 2. Expanded Feature Specifications

### 2.1 Live Bidding Engine & Paddle Controls

- **One-Click Bidding Paddles:** Pre-calculated raise increments (+₹25,000, +₹50,000, +₹1,00,000) allowing bidders to react instantly without manual typing.

- **Auto-Bid Proxy Agent:** Bidders can set a private maximum budget cap (*e.g., "Bid for me up to ₹35 Lakhs"*). The Lua engine automatically counters competing bids up to the cap by exactly one increment.

- **Outbid Counter-Trigger:** Instant alert when displaced as leader, with a single high-priority "Counter-Bid Now" action.

### 2.2 Fair-Play Anti-Sniping Protection

- If an accepted bid arrives when time remaining is $\le 30\text{ seconds}$, the closing time automatically extends by $+60\text{ seconds}$.

- A visual banner notifies all participants: *"⏱️ Fair-Play Extension: +60 seconds added to give all bidders a fair chance to counter."*

### 2.3 Live Auctioneer Commentary Stream

- A streaming commentary feed mirroring live auctioneer calls (*"Priya Nair raises the paddle to ₹24,75,000"*, *"Going once at ₹25 Lakhs to Aakash Sharma..."*).

### 2.4 Asset Details & Verification Drawer

- High-resolution asset showcase with tabs for:

- **Lot Specifications & Condition Report**

- **Provenance & Holographic Verification**

- **Escrow & Safe Transfer Terms**

### 2.5 Audio-Tactile Feedback

- Subtle audio feedback:

- Soft hammer strike on bid acceptance.

- Urgent alert chime on outbid.

- Clock pulse sound during final 10 seconds.


## 3. UI/UX Design System: Humanized Dual-Tone

- **Dual-Tone Philosophy:** Avoids both harsh, eye-straining all-black terminals and sterile corporate whiteouts. Uses a rich slate/charcoal header navigation (`#0F172A`) paired with clean, elevated porcelain/stone cards (`#FFFFFF` and `#F8FAFC`).

- **Currency Formatting:** Strict Indian numbering standard (`₹` with Lakhs and Crores commas, e.g., `₹24,50,000`).

- **Visual States:**

- **Winning Position:** Forest Emerald pill (`#059669`) with `You (Current Highest Bidder 🏆)`.

- **Outbid Position:** Crimson card (`#DC2626`) with immediate counter-action.

- **Urgency Bar:** Transitions from Emerald $\to$ Amber ($\le 30\text{s}$) $\to$ Crimson ($\le 10\text{s}$).


## 4. Technical Architecture

Connected Bidders (Web/Mobile)

│

WebSocket (Socket.io)

▼

[ Ingress Socket Gateway ]

│

┌────────────────────┴────────────────────┐

▼                                         ▼

[ Redis 7 Cluster ]                       [ Room Broadcast ]

- Atomic Lua Script (EVALSHA)             - Instant Price / Leader

- Dynamic +60s Anti-Snipe Extension       - Auctioneer Commentary

- Proxy Auto-Bid Engine                   - Outbid Alerts

- Sorted Set Order Book                   - Live Bidder Count

│

│ On Auction Expiration (Clock = 00:00.000)

▼

[ BullMQ Settlement Queue ]

│

│ Worker Job Claim (Concurrency: 10)

▼

[ PostgreSQL 16 ]

- auctions (winner_id, final_price)

- bids (immutable audit log)

- settlement_records (SHA-256 hash)


## 5. Non-Functional Requirements & Performance Budgets

- **Bid Execution Latency:** $\le 2\text{ms}$ in-memory Redis resolution.

- **WebSocket Propagation:** $\le 25\text{ms}$ P95 latency to all room participants.

- **Concurrency Tolerance:** Zero phantom bids and zero race conditions under 1,000 concurrent bids.

- **Settlement Execution:** Asynchronous settlement job completed and committed to PostgreSQL in $\le 1.5\text{ seconds}$ post-auction.
