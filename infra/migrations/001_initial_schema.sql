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
