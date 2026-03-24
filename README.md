# Galactic Trading Post

Galactic Trading Post is a mobile-first browser trading and management game built with plain HTML, CSS, and JavaScript.

You operate a trading post in `Sol Nexus`, dispatch merchant ships on round-trip missions, scout new systems, fulfill premium `Corporate Contracts`, level up your station through reputation, and unlock `Trade Envoys` who improve mission pricing on their specialty commodities. The game saves in `localStorage` and supports offline-capable PWA behavior when served from a real web origin.

## Current Game Loops

### Trading

- Launch round-trip trade missions from `Sol Nexus`
- Pick:
  - a destination system
  - outbound cargo
  - return cargo
  - the exact merchant ships to send
  - optionally one idle Trade Envoy
- Missions use escrow for return cargo planning
- If you cannot fully fund a route, you can:
  - launch a partial load
  - finance the mission and pay additive time-based interest
- Ships with different speed upgrades can still launch together, but their timing remains ship-specific

### Corporate Contracts

- Three `Corporate Contracts` are always active
- Each contract targets:
  - one commodity
  - one discovered system
  - one quantity goal
  - one delivery deadline
- Contracts award:
  - a large Credit bounty
  - `1`, `2`, or `3` reputation XP based on difficulty
- Progress increases when outbound cargo reaches the matching destination
- Completed contracts generate:
  - a toast notification
  - an Event Log entry
  - replacement contracts to keep the board full

### Reputation And Levels

Reputation is now progression XP, not currency.

- Player level thresholds use cumulative growth:
  - Level 1: `0`
  - Level 2: `3`
  - Level 3: `7`
  - Level 4: `12`
  - Level 5: `18`
  - Level 6: `25`
  - and so on with increasing increments
- Level rewards are automatic:
  - non-third levels: `+1 max merchant ship`
  - every third level: `+1 Trade Envoy`

### Trade Envoys

Trade Envoys are granted automatically, not recruited manually.

- Envoys unlock every third level
- Grant order is deterministic:
  - all single-commodity envoys first, lowest base-price commodity to highest
  - then two-commodity envoys, lowest combined base price to highest
- Every envoy has:
  - a unique first name
  - a unique last name
  - one or two specialty commodities
  - XP and level
- Envoys become unavailable while assigned to a trade mission batch
- Envoy bonus strength scales with envoy level

### Merchant Ships

Each merchant ship is unique.

- Custom name
- Custom name color
- Cargo upgrades
- Speed upgrades
- Upgrades take time and block the ship from missions while in refit
- Merchant ship purchases are capped by player level progression

### Scouting

- Buy one scout ship in the Shipyard
- Scouting missions reveal undiscovered systems over time
- Scout mission duration starts at `20 minutes` and increases for each launch
- Scout completion notifications include:
  - system name
  - distance
  - high-price commodities
  - low-price commodities

## Economy And Markets

### Commodities

- Food
- Water
- Ore
- Fuel
- Electronics
- Medicine

### System Types

Every remote system is generated from a unique market profile:

- choose `2` high-priced commodities from the `6`
- choose `2` low-priced commodities from the remaining `4`
- highs and lows never overlap

### Pricing Model

Prices are shaped by:

- system market tier profile
- global commodity base prices
- local supply and demand pressure from player trading
- temporary news events
- permanent structural shifts

Market tiers are:

- Very Low
- Low
- Normal
- High
- Very High

### Events

Temporary market events:

- two active at a time
- offset by `10 minutes`
- each lasts `20 minutes`
- move one commodity in one discovered system up or down one tier

Permanent structural events:

- occur every `8 to 12 hours`
- `90%` chance:
  - permanently shift one commodity in one discovered system by one tier
- `10%` chance:
  - permanently change the global base price of one commodity

## Spaceport UI

The app now uses a hub-and-location layout.

### Home Screen

The home screen is intentionally minimal:

- Credits
- Escrow
- Level and reputation progress
- merchant ship usage and cap
- scout status
- discovered system count

From there, the player opens full-screen `spaceport locations`:

- Trade Exchange
- Navigation Office
- Merchant Fleet
- Shipyard
- Hangar
- Corporate Contracts
- Trade Envoys
- Trade Analytics
- Newsfeed & History

Each location resets its scroll position to the top when reopened.

### Trade Analytics

The `Trade Analytics` section tracks completed mission batches and shows:

- lifetime revenue
- lifetime profit
- financed mission count
- contract-serving mission count
- total cargo moved
- systems discovered
- recent profit trend chart
- commodity mix chart
- top profit routes
- best profit-per-distance routes

## Files

- `index.html`
  - app shell, modal locations, help, and away summary structure
- `styles.css`
  - mobile-first styling, spaceport hub layout, cards, charts, and modal presentation
- `script.js`
  - game state, generation logic, progression, missions, contracts, envoys, events, analytics, persistence, and rendering
- `manifest.webmanifest`
  - PWA metadata
- `sw.js`
  - service worker for offline app-shell support
- `icons/`
  - app icons

## Running Locally

You can open `index.html` directly for basic play.

For proper PWA install/offline behavior, run a local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Save Data

- Saves are stored in `localStorage`
- The game advances while you are away:
  - missions continue
  - scouting continues
  - refits continue
  - contract timers continue
  - markets continue evolving
- On return, an `Away Summary` reports key progress made offline
