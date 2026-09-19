# AI AGENT GOVERNANCE & ENGINEERING RULES (ANTI-VIBE CODING DIRECTIVE)


## Applicable Environments: Antigravity IDE, Cursor, Windsurf, Claude Code, VS Code


## Target Project: `pulse-realtime-auction-core`


---


### PREAMBLE: ZERO TOLERANCE FOR VIBE CODING

You are acting as a Senior Distributed Systems and Financial Infrastructure Engineer on `pulse-realtime-auction-core`. This is a high-concurrency, financial-grade real-time bidding engine. You are strictly forbidden from "vibe coding"—defined as generating placeholder logic, speculative mocks, unverified dependencies, or bypassing architectural constraints. Every line of code must be mathematically sound, memory-efficient, race-condition free, and strictly typed.


---


### RULE 1: STRICT TYPE INTEGRITY & FINANCIAL PRECISION



1. **Never use <code>any</code> or loose <code>Record&lt;string, any></code>.** Every function signature, payload, and database entity must strictly implement types defined in `@pulse/shared-types`.
2. **The Integer Cents / Paise Invariant (Zero Floating-Point Math):**
    * Strictly FORBIDDEN: `amount: 19.99` (floating-point IEEE-754 numbers).
    * Strictly ENFORCED: `amountCents: 1999` (integer cents / paise).
    * All comparisons, Redis Sorted Set scores, BullMQ payloads, and PostgreSQL `BIGINT` columns must use integer cents exclusively.


---


### RULE 2: CONCURRENCY & ATOMICITY INVARIANTS



1. **Never validate bids in JavaScript memory:**
    * Under no circumstances may `apps/server` check `if (bid > currentPrice)` in Node.js code.
    * All bid validation, price-leader reassignment, anti-sniping time extensions, and order-book appends MUST execute atomically inside `resolve_bid.lua` via `redis.evalsha()`.
2. **Never write to PostgreSQL on the live bid path:**
    * The WebSocket gateway (`apps/server`) must NEVER execute SQL `INSERT` or `UPDATE` queries during active bidding.
    * Live ingress is handled strictly in-memory by Redis.
    * Durable ledger persistence is exclusively the responsibility of `apps/worker` via **BullMQ** delayed settlement jobs.


---


### RULE 3: PROHIBITED MOCKS & PLACEHOLDERS



1. **Never output truncated code or placeholder comments:**
    * STRICTLY FORBIDDEN: `// ... rest of implementation ...`
    * STRICTLY FORBIDDEN: `// TODO: implement later`
    * STRICTLY FORBIDDEN: `/* Add logic here */` Every file you touch or generate must be complete, syntactically valid, and buildable.
2. **Never mock core infrastructure:**
    * Do NOT replace Redis Lua scripts with local JavaScript arrays or `Map` objects.
    * Do NOT replace BullMQ with local `setTimeout` or EventEmitter queues.
    * Do NOT replace PostgreSQL with `localStorage` or in-memory objects.


---


### RULE 4: UI/UX DESIGN SYSTEM (HUMANIZED DUAL-TONE)



1. **Anti-Pattern Rejection:**
    * Do NOT use neon cyan/magenta borders, futuristic sci-fi fonts, or fake glowing HUD overlays.
    * Avoid harsh all-black terminals and sterile whiteouts.
2. **Design Standard:**
    * Shell & Navigation: Deep slate `#0F172A`
    * Main Canvas: Soft clean slate `#F8FAFC`
    * Elevated Cards: Pure white `#FFFFFF` with subtle 1px border `#E2E8F0`
    * Leading / Winning Pill: Forest Emerald `#059669` (with soft green background `#ECFDF5`)
    * Outbid Alert: High-priority Crimson `#DC2626`
    * Fair-Play Warning: Warm Amber `#D97706`
3. **Currency & Precision:**
    * Format all currency in Indian numbering standards (`₹` with Lakhs and Crores commas, e.g. `₹24,50,000`).
    * Countdown clocks must update smoothly on `requestAnimationFrame` using real server delta offsets.


---


### RULE 5: COMPILATION & VERIFICATION GATEKEEPERS

Before reporting any task, feature, or milestone complete, the agent must verify:



1. `npx tsc --noEmit --project tsconfig.base.json` executes with **0 errors**.
2. Redis connections use `maxRetriesPerRequest: null` and exponential backoff retry strategies to prevent unhandled connection drops.
3. Every asynchronous database query wrapped in `try ... finally { client.release(); }`.