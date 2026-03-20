# Galactic Trading Post

Galactic Trading Post is a mobile-first browser trading and management game built with plain HTML, CSS, and JavaScript.

You run a trading post in the home system `Sol Nexus`, send merchant ships on round-trip trade runs, scout distant systems, customize and upgrade your fleet, react to market events, fulfill premium `Corporate Contracts`, and recruit `Trade Envoys` who improve pricing on their specialty commodities. The game saves locally in `localStorage` and supports offline-capable PWA behavior when served from a real web origin.

## Current Gameplay

- Buy outbound cargo at the home system and sell it at a remote destination
- Buy return cargo at the destination and sell it back home
- Use multiple merchant ships at once
- Customize each merchant ship with:
  - a custom name
  - a custom name color
  - cargo upgrades
  - speed upgrades
- Scout new systems over time
- Monitor temporary and permanent market events
- Complete high-value `Corporate Contracts`
- Recruit and level `Trade Envoys`
- Continue progressing while away from the game

## Core Systems

### Economy

- Currency: `Credits`
- Commodities:
  - Food
  - Water
  - Ore
  - Fuel
  - Electronics
  - Medicine
- Every commodity has a base price
- Each system has local pricing shaped by:
  - its market profile
  - temporary supply/demand pressure from buying and selling
  - temporary news events
  - permanent structural shifts

### System Types

System types are generated from all valid combinations of:

- 2 high-priced commodities chosen from 6
- 2 low-priced commodities chosen from the remaining 4

This creates all unique valid market profiles with no overlap between high and low commodities.

### Star Systems

- New games generate `100` discoverable remote systems
- Distances are expressed in `LY`
- Distances are deterministic but irregularly distributed
- Only discovered systems are visible to the player
- Scouting reveals additional systems over time

### Merchant Ships

Each merchant ship is unique.

- Can be renamed
- Can be recolored
- Can be upgraded repeatedly
- Cargo upgrades increase carrying capacity
- Speed upgrades reduce mission duration
- Upgrade cost scales by ship and level
- Upgrade time scales by level
- Upgrading ships are unavailable for missions

### Trade Missions

Trade missions are round-trip.

- Choose a destination
- Choose outbound cargo
- Choose return cargo
- Choose exactly which idle ships to send
- Optionally select all idle ships at once
- Multi-ship launches are supported
- Ships with different speeds are tracked separately in the fleet view

Mission flow:

1. Buy outbound cargo at home
2. Hold return-cost escrow
3. Arrive at destination
4. Sell outbound cargo
5. Release escrow
6. Buy return cargo
7. Return home
8. Sell return cargo

If the player lacks enough Credits for a full mission:

- they can launch a `Partial Load`, or
- they can `Finance` the mission

### Financing

- The player borrows the difference between current Credits and total mission cost
- Financing charges additive interest based on mission time
- Current balance:
  - `1% per minute`
  - minimum billed duration of `5 minutes`
- Fleet cards and mission logs show financed outcomes

### Corporate Contracts

`Corporate Contracts` are premium delivery quests.

- Three contracts are active at all times
- Each contract requires:
  - a specific commodity
  - a target system
  - a total quantity delivered
  - delivery before a deadline
- Progress increases when outbound cargo arrives at the matching destination
- Bounties scale with:
  - distance
  - quantity
- Rewards are intentionally much more lucrative than normal trade margins

### Trade Envoys

`Trade Envoys` are specialist negotiators unlocked through reputation.

- Completing `Corporate Contracts` awards reputation
- Reputation is spent to recruit envoys
- Recruitment offers three generated candidates at a time
- Recruitment cost scales exponentially as more envoys are hired
- Each envoy specializes in one commodity
- An envoy can be assigned to a trade mission during planning
- If their specialty commodity is used on the mission:
  - buy prices improve
  - sell prices improve
- Envoys earn XP based on:
  - the square root of the total amount of their specialty commodity carried on the mission
- Higher envoy levels give stronger pricing bonuses

### Events

The game has two layers of market events.

Temporary market events:

- Two active at a time
- Offset by 10 minutes
- Each lasts 20 minutes
- Shift one commodity in one discovered system by one tier

Permanent structural events:

- Occur every 20 to 30 hours
- `90%` chance:
  - permanently shift one commodity in one discovered system by one tier
- `10%` chance:
  - permanently change the global base price of one commodity

Market tiers:

- Very Low
- Low
- Normal
- High
- Very High

### Offline Progression

The simulation continues while the player is away.

- Trade missions continue
- Scout missions continue
- Ship upgrades continue
- Contract deadlines continue
- Market pressure decays
- Temporary and permanent events continue

An `Away Summary` modal reports the key results when the player returns.

## UI Overview

- Header
  - Credits
  - available merchant ships
  - scout status
  - escrow
  - reputation
- Newsfeed
  - active temporary market events
  - most recent permanent market shift
- Corporate Contracts
  - active contract cards with progress
- Trade Envoys
  - recruitment candidates
  - current envoy roster
  - envoy specialty, level, and pricing bonus
- Home System Market
  - current home prices for all commodities
- Discovered Systems
  - two featured routes on the main screen:
    - best round-trip profit
    - best profit-to-distance ratio
  - button to open all discovered systems in a sortable dialog
- Fleet / Missions
  - active trade missions
  - active upgrades
  - scout status
- Shipyard
  - buy merchant ships
  - buy the scout ship
- Hangar
  - customize and upgrade ships
- Event Log
  - recent actions and outcomes
- Economic History
  - scrollable archive of permanent structural shifts
- Help
  - floating button with an in-game overview dialog

## Project Files

- `index.html`
  - app structure, panels, and modal markup
- `styles.css`
  - mobile-first layout, sci-fi styling, cards, modal styles, and responsive behavior
- `script.js`
  - game state, generation logic, timers, persistence, rendering, contracts, events, and interactions
- `manifest.webmanifest`
  - PWA manifest
- `sw.js`
  - service worker for offline app-shell behavior
- `icons/`
  - application icons

## Running Locally

You can open `index.html` directly for basic play.

For PWA installation, offline caching, and service worker behavior, use a local web server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## PWA Notes

- Offline app-shell support requires `http://` or `https://`
- `file://` does not support normal service worker or install behavior
- The service worker is configured to update more aggressively so deployments refresh more reliably

## Save Data

- Save data is stored in browser `localStorage`
- Resetting from the UI clears the current run
- Save key:
  - `galacticTradingPostSave_v1`

## Technical Notes

- No framework
- No backend
- No build step
- Single-page application
- Plain JavaScript with timer-driven state updates
- Designed to stay easy to expand
