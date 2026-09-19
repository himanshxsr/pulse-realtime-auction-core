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
    return cjson.encode({ code = "AUCTION_NOT_ACTIVE", success = false, reason = "Auction does not exist" })
end

local currentStatus = redis.call("HGET", stateKey, "status")
if currentStatus ~= "ACTIVE" and currentStatus ~= "ENDING_SOON" then
    return cjson.encode({ code = "AUCTION_NOT_ACTIVE", success = false, reason = "Auction is not active" })
end

local endTimeMs = tonumber(redis.call("HGET", stateKey, "endTime"))
if nowMs >= endTimeMs then
    redis.call("HSET", stateKey, "status", "SETTLING")
    return cjson.encode({ code = "AUCTION_EXPIRED", success = false, reason = "Auction has expired" })
end

local currentPriceCents = tonumber(redis.call("HGET", stateKey, "currentPriceCents"))
local minIncrementCents = tonumber(redis.call("HGET", stateKey, "minIncrementCents"))
local currentLeaderId = redis.call("HGET", stateKey, "leaderId")

-- Anti-self-bidding
if currentLeaderId == bidderId then
    return cjson.encode({ code = "ALREADY_LEADER", success = false, reason = "You are already the highest bidder" })
end

-- Validate price threshold: bid must be strictly greater than current price
if amountCents <= currentPriceCents then
    return cjson.encode({
        code = "BELOW_CURRENT_PRICE",
        success = false,
        reason = "Bid must be strictly greater than current price",
        currentPriceCents = currentPriceCents,
        minIncrementCents = minIncrementCents
    })
end

-- Determine Dynamic Minimum Increment for next tier (Indian Lakhs/Crores scaling)
-- 1 Rupee = 100 paise/cents
local nextIncrement = 2500000 -- Base ₹25,000 (2,500,000 cents)
if amountCents >= 1000000000 then -- ₹10 Crore+ (1,000,000,000 cents)
    nextIncrement = 50000000          -- ₹50 Lakh (50,000,000 cents)
elseif amountCents >= 100000000 then -- ₹1 Crore+ (100,000,000 cents)
    nextIncrement = 10000000          -- ₹10 Lakh (10,000,000 cents)
elseif amountCents >= 50000000 then  -- ₹50 Lakh+ (50,000,000 cents)
    nextIncrement = 5000000           -- ₹50,000 (5,000,000 cents)
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
