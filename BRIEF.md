# Telos Zero Premium Name Bidding Site

## What This Is
A web app for bidding on Telos "premium" account names (short/desirable names) through the native Telos name bidding system (newname action on eosio system contract).

## Telos Name Bidding Background
- On Telos (EOSIO-based), account names are 12 characters by default
- Names shorter than 12 chars are "premium" and must be won through an auction/bidding system
- The `eosio` system contract has a `bidname` action: `bidname(bidder, newname, bid)`
- Bids are in TLOS tokens
- Each new bid must be 10% higher than the previous highest bid
- After 24 hours with no new bids, the highest bidder wins the name
- Winner can then create the account with that name

## Tech Stack
- Single-page app (HTML/CSS/JS) — no framework, keep it simple
- Use the Telos API endpoints to query chain data
- Use Anchor wallet / WharfKit for signing transactions
- RPC: https://mainnet.telos.net/v1 (primary), https://rpc.telos.net/evm (backup)

## Features
1. **Browse Available Names** — Show current active bids, search for name availability
2. **Place Bids** — Connect wallet (Anchor/Wharfkit), place bids on names
3. **My Bids** — Track your active bids and won names
4. **Bid History** — Show bid history for any name
5. **Name Search** — Check if a name is taken, available, or being bid on

## API Calls Needed
- `get_table_rows` from `eosio` contract, `namebids` table — lists all active name bids
- `bidname` action on `eosio` contract — place a bid
- `get_account` — check if name already exists

## Design
- Clean, modern UI
- Telos brand colors: Cyan #00F2FE, Blue #4FACFE, Purple #C471F5
- Dark background with gradient accents
- Mobile responsive

## Deploy
- Static site, deployable to GitHub Pages (repo: molty365/telos-names)
