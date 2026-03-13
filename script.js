"use strict";

/*
Economy:
- Credits are earned by buying cargo at the home system and selling at a destination system.
- Each mission carries fixed cargo (10 units) each way: outbound from home, then return cargo back home.
- Prices are derived from system type rules: 2 high commodities, 2 low commodities, 2 neutral.

System type generation:
- From 6 commodities, generate all unique types by choosing 2 highs and then 2 lows from the remaining 4.
- This produces 90 valid non-overlapping system types.

File structure:
- Constants + data model generation
- Game state creation/load/save and mission logic
- UI rendering and event wiring
*/

const STORAGE_KEY = "galacticTradingPostSave_v1";
const TICK_INTERVAL_MS = 1000;

const BALANCE = {
  STARTING_CREDITS: 500,
  CARGO_SIZE: 10,
  STARTING_MERCHANT_SHIPS: 1,
  STARTING_DISCOVERED_COUNT: 4,
  REMOTE_SYSTEM_COUNT: 16,
  MERCHANT_SHIP_BASE_COST: 300,
  MERCHANT_SHIP_COST_GROWTH: 1.16,
  CARGO_UPGRADE_BASE_COST: 240,
  CARGO_UPGRADE_COST_GROWTH: 1.55,
  SPEED_UPGRADE_BASE_COST: 280,
  SPEED_UPGRADE_COST_GROWTH: 1.65,
  UPGRADE_BASE_SECONDS: 5 * 60,
  UPGRADE_DURATION_GROWTH: 1.5,
  CARGO_PER_LEVEL: 2,
  SPEED_DURATION_MULT_PER_LEVEL: 0.9,
  SPEED_DURATION_MIN_MULTIPLIER: 0.55,
  SCOUT_SHIP_COST: 800,
  TRADE_TIME_PER_DISTANCE: 14,
  SCOUT_BASE_MISSION_SECONDS: 20 * 60,
  SCOUT_MISSION_INCREMENT_SECONDS: 5 * 60,
  MARKET_PRESSURE_BUY_STEP: 0.03,
  MARKET_PRESSURE_SELL_STEP: 0.03,
  MARKET_PRESSURE_MAX: 0.25,
  MARKET_PRESSURE_DECAY_PER_TICK: 0.998,
  MARKET_PRESSURE_EPSILON: 0.0005,
  MARKET_EVENT_DURATION_SECONDS: 20 * 60,
  MARKET_EVENT_INTERVAL_SECONDS: 10 * 60,
  PRICE_HIGH_MIN: 1.25,
  PRICE_HIGH_MAX: 1.5,
  PRICE_LOW_MIN: 0.58,
  PRICE_LOW_MAX: 0.82,
  PRICE_NEUTRAL_MIN: 0.9,
  PRICE_NEUTRAL_MAX: 1.1,
  HOME_PRICE_MIN: 0.93,
  HOME_PRICE_MAX: 1.08,
  MAX_LOG_ENTRIES: 40
};

const COMMODITIES = [
  { id: "food", name: "Food", basePrice: 10 },
  { id: "water", name: "Water", basePrice: 8 },
  { id: "ore", name: "Ore", basePrice: 15 },
  { id: "fuel", name: "Fuel", basePrice: 20 },
  { id: "electronics", name: "Electronics", basePrice: 35 },
  { id: "medicine", name: "Medicine", basePrice: 40 }
];

const COMMODITY_ICONS = {
  food: "🍞",
  water: "💧",
  ore: "⛏️",
  fuel: "⛽",
  electronics: "🔌",
  medicine: "🧪"
};

const SHIP_NAME_MAX_LENGTH = 20;
const SHIP_NAME_COLOR_OPTIONS = [
  { value: "#40e5ff", label: "Cyan" },
  { value: "#53ffa8", label: "Emerald" },
  { value: "#ffd98f", label: "Amber" },
  { value: "#ffb3c7", label: "Rose" },
  { value: "#d2c1ff", label: "Violet" },
  { value: "#ffffff", label: "White" }
];
const SHIP_NAME_COLORS = SHIP_NAME_COLOR_OPTIONS.map((c) => c.value);

const COMMODITY_INDEX = Object.fromEntries(COMMODITIES.map((c) => [c.id, c]));
const SYSTEM_TYPES = generateSystemTypes(COMMODITIES.map((c) => c.id));
const MARKET_TIER_DEFS = [
  { label: "Very Low", className: "tag-very-low", targetRatio: 0.68 },
  { label: "Low", className: "tag-low", targetRatio: 0.82 },
  { label: "Normal", className: "tag-normal", targetRatio: 1.0 },
  { label: "High", className: "tag-high", targetRatio: 1.18 },
  { label: "Very High", className: "tag-very-high", targetRatio: 1.36 }
];
const MARKET_EVENT_COPY = {
  food: {
    up: [
      { headline: "Crop Blight", body: "A fungal blight damaged hydroponic harvests, pushing food demand sharply upward." },
      { headline: "Refugee Influx", body: "Emergency arrivals are straining local food reserves and driving prices higher." }
    ],
    down: [
      { headline: "Harvest Surge", body: "A bumper harvest flooded station markets with surplus food supplies." },
      { headline: "Relief Convoy", body: "Aid shipments unloaded massive food stores, easing local scarcity." }
    ]
  },
  water: {
    up: [
      { headline: "Purifier Failure", body: "Water reclamation systems are down, forcing importers to pay a premium." },
      { headline: "Reservoir Leak", body: "Storage losses have tightened potable water supply across the system." }
    ],
    down: [
      { headline: "Ice Hauler Arrival", body: "Fresh ice haulers delivered abundant water stock to local markets." },
      { headline: "Filtration Upgrade", body: "New purification arrays restored water output faster than expected." }
    ]
  },
  ore: {
    up: [
      { headline: "Foundry Expansion", body: "Industrial refits have triggered a rush on raw ore contracts." },
      { headline: "Construction Boom", body: "Orbital construction yards are consuming ore faster than miners can deliver it." }
    ],
    down: [
      { headline: "Mining Glut", body: "New excavation runs overwhelmed buyers with excess ore stock." },
      { headline: "Freighter Dump", body: "Several bulk haulers unloaded ore at once, depressing spot prices." }
    ]
  },
  fuel: {
    up: [
      { headline: "Patrol Mobilization", body: "Security fleets are burning through reserves and bidding up fuel prices." },
      { headline: "Jump Corridor Surge", body: "Heavy traffic through local lanes has strained refinery output." }
    ],
    down: [
      { headline: "Refinery Overrun", body: "Refineries overshot demand and local depots are stuffed with fuel." },
      { headline: "Route Quieting", body: "Travel demand dipped sharply, leaving fuel suppliers with surplus stock." }
    ]
  },
  electronics: {
    up: [
      { headline: "Relay Retrofit", body: "Navigation relays are being upgraded, sending electronics demand soaring." },
      { headline: "Signal Blackout", body: "Emergency comms repairs are draining local electronics inventories." }
    ],
    down: [
      { headline: "Factory Oversupply", body: "A manufacturing run produced more electronics than brokers can move." },
      { headline: "Warehouse Clearance", body: "Storage operators are liquidating electronics stock at discount prices." }
    ]
  },
  medicine: {
    up: [
      { headline: "Disease Outbreak", body: "A local outbreak has spiked urgent medicine demand across civilian clinics." },
      { headline: "Hospital Overflow", body: "Overloaded medical wards are paying a premium for fresh supplies." }
    ],
    down: [
      { headline: "Cure Shipment", body: "A major medical convoy delivered enough stock to stabilize treatment demand." },
      { headline: "Clinical Recovery", body: "Case numbers are falling and medicine buyers are stepping back." }
    ]
  }
};

const NAME_PARTS_A = [
  "Orion",
  "Cygnus",
  "Draco",
  "Vega",
  "Helios",
  "Nyx",
  "Talos",
  "Astra",
  "Nadir",
  "Erebus",
  "Nova",
  "Zenith",
  "Lumen",
  "Argon",
  "Selene",
  "Atlas",
  "Cinder",
  "Echo",
  "Kepler",
  "Vesper"
];

const NAME_PARTS_B = [
  "Prime",
  "Gate",
  "Reach",
  "Bastion",
  "Harbor",
  "Station",
  "Frontier",
  "Spindle",
  "Junction",
  "Haven",
  "Array",
  "Crossing",
  "Drift",
  "Spur",
  "Anvil",
  "Vault",
  "Arc",
  "Port",
  "Node",
  "Ember"
];

function combinations(arr, choose) {
  const result = [];

  function backtrack(start, combo) {
    if (combo.length === choose) {
      result.push([...combo]);
      return;
    }

    for (let i = start; i < arr.length; i += 1) {
      combo.push(arr[i]);
      backtrack(i + 1, combo);
      combo.pop();
    }
  }

  backtrack(0, []);
  return result;
}

function generateSystemTypes(commodityIds) {
  const types = [];
  const highCombos = combinations(commodityIds, 2);

  for (const high of highCombos) {
    const remaining = commodityIds.filter((id) => !high.includes(id));
    const lowCombos = combinations(remaining, 2);

    for (const low of lowCombos) {
      const sortedHigh = [...high].sort();
      const sortedLow = [...low].sort();
      types.push({
        id: `h:${sortedHigh.join("-")}|l:${sortedLow.join("-")}`,
        high: sortedHigh,
        low: sortedLow
      });
    }
  }

  return types;
}

function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFraction(seedText) {
  const h = hashString(seedText);
  return (h % 1000000) / 1000000;
}

function randBetween(min, max, seedText) {
  return min + (max - min) * seededFraction(seedText);
}

function clampPositiveInt(value) {
  return Math.max(1, Math.round(value));
}

function formatCredits(value) {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString()} cr`;
}

function formatSeconds(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${String(rem).padStart(2, "0")}`;
}

function formatDistanceLy(distance) {
  return `${Number(distance).toFixed(1)} LY`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCommodityMarketLevel(system, commodityId) {
  if (!system || !COMMODITY_INDEX[commodityId]) {
    return MARKET_TIER_DEFS[2];
  }

  const currentPrice = system.prices?.[commodityId];
  const basePrice = COMMODITY_INDEX[commodityId].basePrice;
  if (!Number.isFinite(currentPrice) || !Number.isFinite(basePrice) || basePrice <= 0) {
    return MARKET_TIER_DEFS[2];
  }

  const ratio = currentPrice / basePrice;
  if (ratio >= 1.28) {
    return MARKET_TIER_DEFS[4];
  }
  if (ratio >= 1.12) {
    return MARKET_TIER_DEFS[3];
  }
  if (ratio <= 0.72) {
    return MARKET_TIER_DEFS[0];
  }
  if (ratio <= 0.88) {
    return MARKET_TIER_DEFS[1];
  }
  return MARKET_TIER_DEFS[2];
}

function renderCommodityLabel(commodityId, marketSystem) {
  const commodity = COMMODITY_INDEX[commodityId];
  const badge = getCommodityMarketLevel(marketSystem, commodityId);
  if (!commodity) {
    return commodityId;
  }
  return `${COMMODITY_ICONS[commodityId] || ""} ${commodity.name} <span class="commodity-tag ${badge.className}">${badge.label}</span>`;
}

function getTradeMissionDuration(distance) {
  const oneWaySeconds = Math.max(6, distance * BALANCE.TRADE_TIME_PER_DISTANCE);
  return oneWaySeconds * 2;
}

function getScoutMissionDuration(state) {
  return (
    BALANCE.SCOUT_BASE_MISSION_SECONDS +
    state.scoutMissionsLaunched * BALANCE.SCOUT_MISSION_INCREMENT_SECONDS
  );
}

function getShipDisplayName(ship) {
  return ship.name || ship.id.toUpperCase();
}

function getShipCargoUnits(state, ship) {
  return state.cargoSize + ship.cargoLevel * BALANCE.CARGO_PER_LEVEL;
}

function getShipSpeedMultiplier(ship) {
  return Math.max(
    BALANCE.SPEED_DURATION_MIN_MULTIPLIER,
    Math.pow(BALANCE.SPEED_DURATION_MULT_PER_LEVEL, ship.speedLevel)
  );
}

function getShipTradeDuration(distance, ship) {
  return Math.max(6, Math.round(getTradeMissionDuration(distance) * getShipSpeedMultiplier(ship)));
}

function getCargoUpgradeCost(ship) {
  return clampPositiveInt(
    BALANCE.CARGO_UPGRADE_BASE_COST * Math.pow(BALANCE.CARGO_UPGRADE_COST_GROWTH, ship.cargoLevel)
  );
}

function getSpeedUpgradeCost(ship) {
  return clampPositiveInt(
    BALANCE.SPEED_UPGRADE_BASE_COST * Math.pow(BALANCE.SPEED_UPGRADE_COST_GROWTH, ship.speedLevel)
  );
}

function getUpgradeDurationSeconds(ship, upgradeType) {
  const currentLevel = upgradeType === "cargo" ? ship.cargoLevel : ship.speedLevel;
  return clampPositiveInt(
    BALANCE.UPGRADE_BASE_SECONDS * Math.pow(BALANCE.UPGRADE_DURATION_GROWTH, currentLevel)
  );
}

function createZeroPressureMap() {
  const pressure = {};
  for (const commodity of COMMODITIES) {
    pressure[commodity.id] = 0;
  }
  return pressure;
}

function getBaseMarketTierIndex(system, commodityId) {
  const basePrice = COMMODITY_INDEX[commodityId]?.basePrice;
  const localBasePrice = system?.basePrices?.[commodityId];
  if (!Number.isFinite(basePrice) || !Number.isFinite(localBasePrice) || basePrice <= 0) {
    return 2;
  }
  const pressure = system.marketPressure?.[commodityId] || 0;
  const ratio = (localBasePrice * (1 + pressure)) / basePrice;
  return MARKET_TIER_DEFS.indexOf(getCommodityMarketLevel({ prices: { [commodityId]: localBasePrice * (1 + pressure) } }, commodityId));
}

function getCommodityEventShift(state, systemId, commodityId) {
  const events = state.marketEvents || [];
  return clamp(
    events.reduce((sum, event) => {
      if (event.systemId === systemId && event.commodityId === commodityId) {
        return sum + event.direction;
      }
      return sum;
    }, 0),
    -1,
    1
  );
}

function recomputeSystemPrices(state, system) {
  for (const commodity of COMMODITIES) {
    const baseTierIndex = getBaseMarketTierIndex(system, commodity.id);
    const shiftedTierIndex = clamp(baseTierIndex + getCommodityEventShift(state, system.id, commodity.id), 0, MARKET_TIER_DEFS.length - 1);
    const pressure = system.marketPressure[commodity.id] || 0;
    const rawBaseRatio = (system.basePrices[commodity.id] * (1 + pressure)) / COMMODITY_INDEX[commodity.id].basePrice;
    const ratio = shiftedTierIndex === baseTierIndex ? rawBaseRatio : MARKET_TIER_DEFS[shiftedTierIndex].targetRatio;
    system.prices[commodity.id] = clampPositiveInt(COMMODITY_INDEX[commodity.id].basePrice * ratio);
  }
}

function recomputeAllSystemPrices(state) {
  for (const system of state.systems) {
    recomputeSystemPrices(state, system);
  }
}

function applyMarketTrade(system, commodityId, action) {
  if (!system || !COMMODITY_INDEX[commodityId]) {
    return;
  }

  const current = system.marketPressure[commodityId] || 0;
  const delta =
    action === "buy" ? BALANCE.MARKET_PRESSURE_BUY_STEP : -BALANCE.MARKET_PRESSURE_SELL_STEP;
  const next = Math.max(-BALANCE.MARKET_PRESSURE_MAX, Math.min(BALANCE.MARKET_PRESSURE_MAX, current + delta));
  system.marketPressure[commodityId] = next;
}

function decayMarketPressure(state, elapsedSeconds) {
  let changed = false;
  const safeElapsed = Math.max(1, Math.floor(elapsedSeconds || 1));
  const decayFactor = Math.pow(BALANCE.MARKET_PRESSURE_DECAY_PER_TICK, safeElapsed);

  for (const system of state.systems) {
    let systemChanged = false;
    for (const commodity of COMMODITIES) {
      const id = commodity.id;
      const current = system.marketPressure[id] || 0;
      if (current === 0) {
        continue;
      }

      const decayed = current * decayFactor;
      const next = Math.abs(decayed) < BALANCE.MARKET_PRESSURE_EPSILON ? 0 : decayed;
      if (next !== current) {
        system.marketPressure[id] = next;
        systemChanged = true;
      }
    }

    if (systemChanged) {
      changed = true;
    }
  }

  return changed;
}

function pickUniqueSystemNames(count) {
  const names = [];
  const used = new Set(["Sol Nexus"]);

  for (let i = 0; names.length < count; i += 1) {
    const a = NAME_PARTS_A[i % NAME_PARTS_A.length];
    const b = NAME_PARTS_B[Math.floor(i / NAME_PARTS_A.length) % NAME_PARTS_B.length];
    const name = `${a} ${b}`;
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
  }

  return names;
}

function generateSystemDistanceLy(name, index) {
  // Deterministic but irregular LY distribution with one decimal precision.
  const min = 1.2;
  const max = 19.8;
  const r1 = seededFraction(`distance:a:${name}:${index}`);
  const r2 = seededFraction(`distance:b:${index}:${name}`);
  const r3 = seededFraction(`distance:c:${name.length}:${index * 7}`);
  const shape = randBetween(0.72, 1.38, `distance:shape:${name}:${index}`);
  const jitter = randBetween(-0.45, 0.45, `distance:jitter:${name}:${index}`);

  const mixed = (r1 * 0.55 + r2 * 0.35 + r3 * 0.1 + (r1 - r2) * 0.15 + 1) % 1;
  const spread = Math.pow(Math.min(1, Math.max(0, mixed)), shape);
  const raw = min + spread * (max - min) + jitter;
  const clamped = Math.max(min, Math.min(max, raw));
  return Math.round(clamped * 10) / 10;
}

function generateSystemPrices(systemName, type) {
  const prices = {};

  for (const commodity of COMMODITIES) {
    let min = BALANCE.PRICE_NEUTRAL_MIN;
    let max = BALANCE.PRICE_NEUTRAL_MAX;

    if (type.high.includes(commodity.id)) {
      min = BALANCE.PRICE_HIGH_MIN;
      max = BALANCE.PRICE_HIGH_MAX;
    } else if (type.low.includes(commodity.id)) {
      min = BALANCE.PRICE_LOW_MIN;
      max = BALANCE.PRICE_LOW_MAX;
    }

    const multiplier = randBetween(min, max, `${systemName}:${commodity.id}:mult`);
    prices[commodity.id] = clampPositiveInt(commodity.basePrice * multiplier);
  }

  return prices;
}

function generateHomePrices() {
  const prices = {};
  for (const commodity of COMMODITIES) {
    const multiplier = randBetween(
      BALANCE.HOME_PRICE_MIN,
      BALANCE.HOME_PRICE_MAX,
      `home:${commodity.id}:mult`
    );
    prices[commodity.id] = clampPositiveInt(commodity.basePrice * multiplier);
  }
  return prices;
}

function createMarketEvent(system, commodityId, direction, sequence, remainingSeconds = BALANCE.MARKET_EVENT_DURATION_SECONDS) {
  const copyPool = direction > 0 ? MARKET_EVENT_COPY[commodityId].up : MARKET_EVENT_COPY[commodityId].down;
  const copy = copyPool[sequence % copyPool.length];
  const levelText = direction > 0 ? "one tier higher" : "one tier lower";
  return {
    id: `me-${sequence}-${system.id}-${commodityId}-${direction > 0 ? "up" : "down"}`,
    systemId: system.id,
    commodityId,
    direction,
    headline: `${system.name}: ${copy.headline}`,
    body: `${copy.body} ${COMMODITY_INDEX[commodityId].name} is trading ${levelText} for the next ${formatSeconds(BALANCE.MARKET_EVENT_DURATION_SECONDS)}.`,
    remainingSeconds,
    durationSeconds: BALANCE.MARKET_EVENT_DURATION_SECONDS
  };
}

function spawnNextMarketEvent(state) {
  const discoveredSystems = getDiscoveredSystems(state);
  if (discoveredSystems.length === 0) {
    return false;
  }

  const activeKeys = new Set((state.marketEvents || []).map((event) => `${event.systemId}:${event.commodityId}`));
  const commodityIds = COMMODITIES.map((commodity) => commodity.id);
  let event = null;

  for (let attempt = 0; attempt < discoveredSystems.length * commodityIds.length * 2; attempt += 1) {
    const sequence = state.marketEventSequence + attempt;
    const system = discoveredSystems[sequence % discoveredSystems.length];
    const commodityId = commodityIds[(sequence * 3 + 1) % commodityIds.length];
    const direction = seededFraction(`market-event:${sequence}:${system.id}:${commodityId}`) >= 0.5 ? 1 : -1;
    const key = `${system.id}:${commodityId}`;
    if (activeKeys.has(key)) {
      continue;
    }
    event = createMarketEvent(system, commodityId, direction, sequence);
    state.marketEventSequence = sequence + 1;
    break;
  }

  if (!event) {
    return false;
  }

  state.marketEvents.push(event);
  return true;
}

function initializeMarketEvents(state) {
  state.marketEvents = [];
  state.marketEventSequence = 0;
  spawnNextMarketEvent(state);
  spawnNextMarketEvent(state);
  if (state.marketEvents[1]) {
    state.marketEvents[1].remainingSeconds = BALANCE.MARKET_EVENT_DURATION_SECONDS - BALANCE.MARKET_EVENT_INTERVAL_SECONDS;
  }
  state.secondsUntilNextMarketEvent = BALANCE.MARKET_EVENT_INTERVAL_SECONDS;
}

function advanceMarketEvents(state, elapsedSeconds) {
  let changed = false;
  let secondsRemaining = Math.max(0, Math.floor(elapsedSeconds || 0));
  if (secondsRemaining <= 0) {
    return changed;
  }

  while (secondsRemaining > 0) {
    const nextExpiry = state.marketEvents.length > 0
      ? Math.min(...state.marketEvents.map((event) => event.remainingSeconds))
      : Number.POSITIVE_INFINITY;
    const nextSpawn = Math.max(1, state.secondsUntilNextMarketEvent);
    const step = Math.max(1, Math.min(secondsRemaining, nextSpawn, nextExpiry));

    for (const event of state.marketEvents) {
      event.remainingSeconds -= step;
    }
    state.secondsUntilNextMarketEvent -= step;
    secondsRemaining -= step;

    const activeEvents = state.marketEvents.filter((event) => event.remainingSeconds > 0);
    if (activeEvents.length !== state.marketEvents.length) {
      changed = true;
      state.marketEvents = activeEvents;
    }

    if (state.secondsUntilNextMarketEvent <= 0) {
      changed = true;
      spawnNextMarketEvent(state);
      state.secondsUntilNextMarketEvent = BALANCE.MARKET_EVENT_INTERVAL_SECONDS;
    }
  }

  return changed;
}

function createStarSystems() {
  const remoteNames = pickUniqueSystemNames(BALANCE.REMOTE_SYSTEM_COUNT);
  const systems = [];
  const homeBasePrices = generateHomePrices();

  const homeSystem = {
    id: "sys-home",
    name: "Sol Nexus",
    distance: 0,
    discovered: true,
    typeId: "home-hub",
    typeHigh: [],
    typeLow: [],
    basePrices: { ...homeBasePrices },
    marketPressure: createZeroPressureMap(),
    prices: { ...homeBasePrices }
  };

  systems.push(homeSystem);

  for (let i = 0; i < BALANCE.REMOTE_SYSTEM_COUNT; i += 1) {
    const name = remoteNames[i];
    const type = SYSTEM_TYPES[i % SYSTEM_TYPES.length];
    const basePrices = generateSystemPrices(name, type);
    const distance = generateSystemDistanceLy(name, i);

    systems.push({
      id: `sys-${i + 1}`,
      name,
      distance,
      discovered: false,
      typeId: type.id,
      typeHigh: [...type.high],
      typeLow: [...type.low],
      basePrices: { ...basePrices },
      marketPressure: createZeroPressureMap(),
      prices: { ...basePrices }
    });
  }

  const discoveredTargets = systems
    .filter((s) => s.id !== "sys-home")
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.max(0, BALANCE.STARTING_DISCOVERED_COUNT - 1));

  for (const system of discoveredTargets) {
    system.discovered = true;
  }

  return systems;
}

function createMerchantShips(count) {
  const ships = [];
  for (let i = 0; i < count; i += 1) {
    ships.push({
      id: `m-${i + 1}`,
      name: `Merchant ${i + 1}`,
      nameColor: SHIP_NAME_COLORS[i % SHIP_NAME_COLORS.length],
      cargoLevel: 0,
      speedLevel: 0,
      status: "idle"
    });
  }
  return ships;
}

function nowIso() {
  return new Date().toISOString();
}

function createNewGameState() {
  const systems = createStarSystems();
  const merchantShips = createMerchantShips(BALANCE.STARTING_MERCHANT_SHIPS);

  const state = {
    version: 1,
    credits: BALANCE.STARTING_CREDITS,
    escrowCredits: 0,
    cargoSize: BALANCE.CARGO_SIZE,
    merchantShips,
    scoutShip: {
      owned: false,
      status: "none"
    },
    homeSystemId: "sys-home",
    systems,
    tradeMissions: [],
    upgradeMissions: [],
    marketEvents: [],
    marketEventSequence: 0,
    secondsUntilNextMarketEvent: BALANCE.MARKET_EVENT_INTERVAL_SECONDS,
    scoutMission: null,
    scoutMissionsLaunched: 0,
    lastUpdatedAt: nowIso(),
    nextMerchantShipCost: BALANCE.MERCHANT_SHIP_BASE_COST,
    log: []
  };

  pushLog(state, "Trading post established at Sol Nexus.");
  pushLog(
    state,
    `${merchantShips.length} merchant ship ready. ${getDiscoveredSystems(state).length - 1} nearby systems charted.`
  );

  initializeMarketEvents(state);
  recomputeAllSystemPrices(state);

  return state;
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return normalizeLoadedState(parsed);
  } catch (error) {
    console.warn("Save load failed, creating new game", error);
    return null;
  }
}

function normalizeLoadedState(state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  const rawSystems = Array.isArray(state.systems) && state.systems.length > 0 ? state.systems : createStarSystems();
  const systems = rawSystems.map((system) => {
    const basePrices = system.basePrices && typeof system.basePrices === "object" ? { ...system.basePrices } : { ...system.prices };
    const marketPressure =
      system.marketPressure && typeof system.marketPressure === "object"
        ? { ...createZeroPressureMap(), ...system.marketPressure }
        : createZeroPressureMap();
    const normalizedSystem = {
      ...system,
      basePrices,
      marketPressure,
      prices: system.prices && typeof system.prices === "object" ? { ...system.prices } : { ...basePrices }
    };
    return normalizedSystem;
  });
  const homeSystemId = state.homeSystemId || "sys-home";
  const homeSystem = systems.find((s) => s.id === homeSystemId) || systems[0];

  function getPriceOrBase(system, commodityId) {
    if (!system || !system.prices) {
      return COMMODITY_INDEX[commodityId]?.basePrice || 1;
    }
    return system.prices[commodityId] || COMMODITY_INDEX[commodityId]?.basePrice || 1;
  }

  const normalizedTradeMissions = Array.isArray(state.tradeMissions)
    ? state.tradeMissions.map((m, i) => {
        const destinationSystemId = m.destinationSystemId;
        const destination = systems.find((s) => s.id === destinationSystemId) || null;
        const outboundCommodityId = m.outboundCommodityId || m.commodityId || COMMODITIES[0].id;
        const returnCommodityId = m.returnCommodityId || m.commodityId || COMMODITIES[0].id;
        const units = Number.isFinite(m.units) ? m.units : BALANCE.CARGO_SIZE;
        const durationSeconds = Number.isFinite(m.durationSeconds)
          ? m.durationSeconds
          : destination
            ? getTradeMissionDuration(destination.distance)
            : 1;
        const outboundBuyPrice = Number.isFinite(m.outboundBuyPrice)
          ? m.outboundBuyPrice
          : Number.isFinite(m.buyPrice)
            ? m.buyPrice
            : getPriceOrBase(homeSystem, outboundCommodityId);
        const outboundSellPrice = Number.isFinite(m.outboundSellPrice)
          ? m.outboundSellPrice
          : Number.isFinite(m.sellPrice)
            ? m.sellPrice
            : getPriceOrBase(destination, outboundCommodityId);
        const returnBuyPrice = Number.isFinite(m.returnBuyPrice)
          ? m.returnBuyPrice
          : getPriceOrBase(destination, returnCommodityId);
        const returnSellPrice = Number.isFinite(m.returnSellPrice)
          ? m.returnSellPrice
          : getPriceOrBase(homeSystem, returnCommodityId);
        const estimatedProfit = Number.isFinite(m.estimatedProfit)
          ? m.estimatedProfit
          : (outboundSellPrice - outboundBuyPrice + (returnSellPrice - returnBuyPrice)) * units;
        const outboundCost = Number.isFinite(m.outboundCost) ? m.outboundCost : outboundBuyPrice * units;
        const returnEscrow = Number.isFinite(m.returnEscrow) ? m.returnEscrow : returnBuyPrice * units;

        return {
          id: m.id || `tm-${Date.now()}-${i}`,
          shipId: m.shipId,
          destinationSystemId,
          outboundCommodityId,
          returnCommodityId,
          units,
          outboundBuyPrice,
          outboundSellPrice,
          returnBuyPrice,
          returnSellPrice,
          estimatedProfit,
          outboundCost,
          returnEscrow,
          remainingSeconds: Number.isFinite(m.remainingSeconds) ? Math.max(0, m.remainingSeconds) : durationSeconds,
          durationSeconds,
          createdAt: m.createdAt || nowIso()
        };
      })
    : [];

  const discoveredCount = systems.filter((s) => s.discovered).length;
  const inferredScoutMissions = Math.max(0, discoveredCount - BALANCE.STARTING_DISCOVERED_COUNT);
  const scoutMissionsLaunched = Number.isFinite(state.scoutMissionsLaunched)
    ? Math.max(0, Math.floor(state.scoutMissionsLaunched))
    : inferredScoutMissions;
  const inferredEscrowFromMissions = normalizedTradeMissions.reduce(
    (sum, mission) => sum + (Number.isFinite(mission.returnEscrow) ? mission.returnEscrow : 0),
    0
  );
  const hasStoredEscrow = Number.isFinite(state.escrowCredits);
  const normalizedEscrow = hasStoredEscrow ? Math.max(0, state.escrowCredits) : inferredEscrowFromMissions;
  const baseCredits = Number.isFinite(state.credits) ? state.credits : BALANCE.STARTING_CREDITS;
  const normalizedCredits = hasStoredEscrow ? baseCredits : baseCredits - inferredEscrowFromMissions;

  const safe = {
    version: 1,
    credits: normalizedCredits,
    escrowCredits: normalizedEscrow,
    cargoSize: Number.isFinite(state.cargoSize) ? state.cargoSize : BALANCE.CARGO_SIZE,
    merchantShips: Array.isArray(state.merchantShips)
      ? state.merchantShips.map((s, i) => ({
          id: s.id || `m-${i + 1}`,
          name: (typeof s.name === "string" && s.name.trim()) || `Merchant ${i + 1}`,
          nameColor: SHIP_NAME_COLORS.includes(s.nameColor) ? s.nameColor : SHIP_NAME_COLORS[0],
          cargoLevel: Number.isFinite(s.cargoLevel) ? Math.max(0, Math.floor(s.cargoLevel)) : 0,
          speedLevel: Number.isFinite(s.speedLevel) ? Math.max(0, Math.floor(s.speedLevel)) : 0,
          status:
            s.status === "mission" || s.status === "upgrading"
              ? s.status
              : "idle"
        }))
      : createMerchantShips(BALANCE.STARTING_MERCHANT_SHIPS),
    scoutShip: {
      owned: Boolean(state.scoutShip && state.scoutShip.owned),
      status:
        state.scoutShip && (state.scoutShip.status === "idle" || state.scoutShip.status === "mission")
          ? state.scoutShip.status
          : state.scoutShip && state.scoutShip.owned
            ? "idle"
            : "none"
    },
    homeSystemId,
    systems,
    tradeMissions: normalizedTradeMissions,
    upgradeMissions: Array.isArray(state.upgradeMissions)
      ? state.upgradeMissions.map((u, i) => ({
          id: u.id || `um-${Date.now()}-${i}`,
          shipId: u.shipId,
          upgradeType: u.upgradeType === "speed" ? "speed" : "cargo",
          remainingSeconds: Number.isFinite(u.remainingSeconds) ? Math.max(0, u.remainingSeconds) : 1,
          durationSeconds: Number.isFinite(u.durationSeconds) ? Math.max(1, u.durationSeconds) : 1,
          cost: Number.isFinite(u.cost) ? Math.max(0, u.cost) : 0,
          startedAt: u.startedAt || nowIso()
        }))
      : [],
    marketEvents: Array.isArray(state.marketEvents)
      ? state.marketEvents.map((event, index) => ({
          id: event.id || `me-${index}-${Date.now()}`,
          systemId: event.systemId,
          commodityId: event.commodityId,
          direction: event.direction < 0 ? -1 : 1,
          headline: String(event.headline || ""),
          body: String(event.body || ""),
          remainingSeconds: Number.isFinite(event.remainingSeconds) ? Math.max(0, event.remainingSeconds) : BALANCE.MARKET_EVENT_DURATION_SECONDS,
          durationSeconds: Number.isFinite(event.durationSeconds) ? Math.max(1, event.durationSeconds) : BALANCE.MARKET_EVENT_DURATION_SECONDS
        }))
      : [],
    marketEventSequence: Number.isFinite(state.marketEventSequence) ? Math.max(0, Math.floor(state.marketEventSequence)) : 0,
    secondsUntilNextMarketEvent: Number.isFinite(state.secondsUntilNextMarketEvent)
      ? Math.max(1, Math.floor(state.secondsUntilNextMarketEvent))
      : BALANCE.MARKET_EVENT_INTERVAL_SECONDS,
    scoutMission:
      state.scoutMission && typeof state.scoutMission === "object"
        ? {
            id: state.scoutMission.id || `sm-${Date.now()}`,
            targetSystemId: state.scoutMission.targetSystemId,
            remainingSeconds: Number.isFinite(state.scoutMission.remainingSeconds)
              ? Math.max(0, state.scoutMission.remainingSeconds)
              : 1,
            durationSeconds: Number.isFinite(state.scoutMission.durationSeconds)
              ? state.scoutMission.durationSeconds
              : 1,
            createdAt: state.scoutMission.createdAt || nowIso()
          }
        : null,
    scoutMissionsLaunched,
    nextMerchantShipCost: Number.isFinite(state.nextMerchantShipCost)
      ? Math.max(1, Math.round(state.nextMerchantShipCost))
      : BALANCE.MERCHANT_SHIP_BASE_COST,
    lastUpdatedAt: typeof state.lastUpdatedAt === "string" ? state.lastUpdatedAt : nowIso(),
    log: Array.isArray(state.log)
      ? state.log
          .map((entry, idx) => ({
            id: entry.id || `log-${idx}-${Date.now()}`,
            text: String(entry.text || ""),
            timestamp: entry.timestamp || nowIso()
          }))
          .filter((entry) => entry.text)
          .slice(0, BALANCE.MAX_LOG_ENTRIES)
      : []
  };

  // Repair ship states to match active missions.
  const shipsInMission = new Set(safe.tradeMissions.map((m) => m.shipId));
  const shipsUpgrading = new Set(safe.upgradeMissions.map((u) => u.shipId));
  safe.merchantShips = safe.merchantShips.map((ship) => ({
    ...ship,
    status: shipsInMission.has(ship.id) ? "mission" : shipsUpgrading.has(ship.id) ? "upgrading" : "idle"
  }));

  if (safe.scoutShip.owned) {
    safe.scoutShip.status = safe.scoutMission ? "mission" : "idle";
  } else {
    safe.scoutShip.status = "none";
    safe.scoutMission = null;
  }

  if (safe.marketEvents.length === 0) {
    initializeMarketEvents(safe);
  }
  recomputeAllSystemPrices(safe);

  return safe;
}

function saveGameState(state) {
  state.lastUpdatedAt = nowIso();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getHomeSystem(state) {
  return state.systems.find((s) => s.id === state.homeSystemId);
}

function getDiscoveredSystems(state) {
  return state.systems.filter((s) => s.discovered);
}

function getDiscoveredRemoteSystems(state) {
  return state.systems
    .filter((s) => s.discovered && s.id !== state.homeSystemId)
    .sort((a, b) => a.distance - b.distance);
}

function getIdleMerchantShips(state) {
  return state.merchantShips.filter((ship) => ship.status === "idle");
}

function getUndiscoveredSystems(state) {
  return state.systems.filter((s) => !s.discovered);
}

function findSystem(state, id) {
  return state.systems.find((s) => s.id === id) || null;
}

function findMerchantShip(state, shipId) {
  return state.merchantShips.find((s) => s.id === shipId) || null;
}

function pushLog(state, text) {
  state.log.unshift({
    id: `log-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    text,
    timestamp: nowIso()
  });
  if (state.log.length > BALANCE.MAX_LOG_ENTRIES) {
    state.log.length = BALANCE.MAX_LOG_ENTRIES;
  }
}

function canLaunchTrade(state) {
  return getIdleMerchantShips(state).length > 0;
}

function launchTradeMission(state, destinationSystemId, outboundCommodityId, returnCommodityId, shipIds) {
  const destination = findSystem(state, destinationSystemId);
  const home = getHomeSystem(state);
  const idleShips = getIdleMerchantShips(state);
  const requestedShipIds = Array.isArray(shipIds) ? shipIds : [];

  if (!destination || destination.id === state.homeSystemId) {
    return { ok: false, message: "Invalid destination." };
  }
  if (!destination.discovered) {
    return { ok: false, message: "Destination is not discovered." };
  }
  if (!COMMODITY_INDEX[outboundCommodityId] || !COMMODITY_INDEX[returnCommodityId]) {
    return { ok: false, message: "Invalid commodity selection." };
  }
  if (idleShips.length === 0) {
    return { ok: false, message: "No idle merchant ships." };
  }

  const idleShipMap = new Map(idleShips.map((ship) => [ship.id, ship]));
  const selectedShips = requestedShipIds
    .map((shipId) => idleShipMap.get(shipId))
    .filter(Boolean);

  if (selectedShips.length === 0) {
    return { ok: false, message: "Select at least one idle merchant ship." };
  }
  if (selectedShips.length !== requestedShipIds.length) {
    return { ok: false, message: "One or more selected ships are unavailable." };
  }

  const outboundBuyPrice = home.prices[outboundCommodityId];
  const outboundSellPrice = destination.prices[outboundCommodityId];
  const returnBuyPrice = destination.prices[returnCommodityId];
  const returnSellPrice = home.prices[returnCommodityId];
  let totalLaunchCost = 0;
  let totalEscrow = 0;
  const launchPlans = selectedShips.map((ship, idx) => {
    const units = getShipCargoUnits(state, ship);
    const outboundCost = outboundBuyPrice * units;
    const returnEscrow = returnBuyPrice * units;
    const missionCost = outboundCost + returnEscrow;
    const durationSeconds = getShipTradeDuration(destination.distance, ship);
    const estimatedProfit =
      (outboundSellPrice - outboundBuyPrice + (returnSellPrice - returnBuyPrice)) * units;
    totalLaunchCost += missionCost;
    totalEscrow += returnEscrow;

    return {
      idSuffix: idx,
      ship,
      units,
      outboundCost,
      returnEscrow,
      durationSeconds,
      estimatedProfit
    };
  });

  if (state.credits < totalLaunchCost) {
    return {
      ok: false,
      message: `Need ${formatCredits(totalLaunchCost)} (outbound + return escrow).`
    };
  }

  state.credits -= totalLaunchCost;
  state.escrowCredits += totalEscrow;

  for (const plan of launchPlans) {
    const { ship, units, outboundCost, returnEscrow, durationSeconds, estimatedProfit, idSuffix } = plan;
    applyMarketTrade(home, outboundCommodityId, "buy");
    ship.status = "mission";

    const mission = {
      id: `tm-${Date.now()}-${Math.floor(Math.random() * 1000)}-${idSuffix}`,
      shipId: ship.id,
      destinationSystemId,
      outboundCommodityId,
      returnCommodityId,
      units,
      outboundBuyPrice,
      outboundSellPrice,
      returnBuyPrice,
      returnSellPrice,
      estimatedProfit,
      outboundCost,
      returnEscrow,
      remainingSeconds: durationSeconds,
      durationSeconds,
      createdAt: nowIso()
    };

    state.tradeMissions.push(mission);
  }
  recomputeAllSystemPrices(state);

  const outboundCargoName = COMMODITY_INDEX[outboundCommodityId].name;
  const returnCargoName = COMMODITY_INDEX[returnCommodityId].name;
  pushLog(
    state,
    `Launched ${selectedShips.length} ship${selectedShips.length > 1 ? "s" : ""} to ${destination.name}: ${outboundCargoName} out, ${returnCargoName} back (total cost ${formatCredits(totalLaunchCost)}).`
  );

  return { ok: true };
}

function resolveTradeMission(state, mission) {
  const ship = state.merchantShips.find((s) => s.id === mission.shipId);
  if (ship) {
    ship.status = "idle";
  }

  const destination = findSystem(state, mission.destinationSystemId);
  const home = getHomeSystem(state);
  const outboundSellPrice = destination
    ? destination.prices[mission.outboundCommodityId]
    : mission.outboundSellPrice;
  const returnBuyPrice = destination ? destination.prices[mission.returnCommodityId] : mission.returnBuyPrice;
  const returnSellPrice = home ? home.prices[mission.returnCommodityId] : mission.returnSellPrice;

  const outboundRevenue = outboundSellPrice * mission.units;
  const returnRevenue = returnSellPrice * mission.units;
  const outboundCost = Number.isFinite(mission.outboundCost)
    ? mission.outboundCost
    : mission.outboundBuyPrice * mission.units;
  const returnEscrow = Number.isFinite(mission.returnEscrow)
    ? mission.returnEscrow
    : mission.returnBuyPrice * mission.units;
  const totalRevenue = outboundRevenue + returnRevenue;
  const totalCost = outboundCost + returnEscrow;
  const profit = totalRevenue - totalCost;

  state.credits += outboundRevenue;
  if (destination) {
    applyMarketTrade(destination, mission.outboundCommodityId, "sell");
  }
  state.escrowCredits = Math.max(0, state.escrowCredits - returnEscrow);
  if (destination) {
    applyMarketTrade(destination, mission.returnCommodityId, "buy");
  }
  state.credits += returnRevenue;
  if (home) {
    applyMarketTrade(home, mission.returnCommodityId, "sell");
  }
  recomputeAllSystemPrices(state);
  const outboundCargoName = COMMODITY_INDEX[mission.outboundCommodityId]
    ? COMMODITY_INDEX[mission.outboundCommodityId].name
    : mission.outboundCommodityId;
  const returnCargoName = COMMODITY_INDEX[mission.returnCommodityId]
    ? COMMODITY_INDEX[mission.returnCommodityId].name
    : mission.returnCommodityId;

  const signClass = profit >= 0 ? "+" : "";
  const shipLabel = ship ? getShipDisplayName(ship) : "Ship";
  pushLog(
    state,
    `${shipLabel} completed round trip to ${destination ? destination.name : "unknown"} (${outboundCargoName} out, ${returnCargoName} back): ${signClass}${formatCredits(profit)}.`
  );
}

function updateMerchantShipStyle(state, shipId, name, color) {
  const ship = findMerchantShip(state, shipId);
  if (!ship) {
    return { ok: false, message: "Ship not found." };
  }

  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return { ok: false, message: "Ship name cannot be empty." };
  }
  if (trimmed.length > SHIP_NAME_MAX_LENGTH) {
    return { ok: false, message: `Ship name must be ${SHIP_NAME_MAX_LENGTH} chars or fewer.` };
  }
  if (!SHIP_NAME_COLORS.includes(color)) {
    return { ok: false, message: "Invalid ship name color." };
  }

  ship.name = trimmed;
  ship.nameColor = color;
  pushLog(state, `${ship.id.toUpperCase()} updated: callsign "${ship.name}".`);
  return { ok: true };
}

function startShipUpgrade(state, shipId, upgradeType) {
  const ship = findMerchantShip(state, shipId);
  if (!ship) {
    return { ok: false, message: "Ship not found." };
  }
  if (ship.status !== "idle") {
    return { ok: false, message: "Ship must be idle for upgrades." };
  }

  const validType = upgradeType === "speed" ? "speed" : upgradeType === "cargo" ? "cargo" : null;
  if (!validType) {
    return { ok: false, message: "Invalid upgrade type." };
  }

  const cost = validType === "cargo" ? getCargoUpgradeCost(ship) : getSpeedUpgradeCost(ship);
  if (state.credits < cost) {
    return { ok: false, message: `Need ${formatCredits(cost)}.` };
  }

  const durationSeconds = getUpgradeDurationSeconds(ship, validType);
  state.credits -= cost;
  ship.status = "upgrading";

  state.upgradeMissions.push({
    id: `um-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    shipId: ship.id,
    upgradeType: validType,
    remainingSeconds: durationSeconds,
    durationSeconds,
    cost,
    startedAt: nowIso()
  });

  pushLog(
    state,
    `${getShipDisplayName(ship)} started ${validType} upgrade (${formatSeconds(durationSeconds)}, cost ${formatCredits(cost)}).`
  );
  return { ok: true };
}

function resolveUpgradeMission(state, upgradeMission) {
  const ship = findMerchantShip(state, upgradeMission.shipId);
  if (!ship) {
    return;
  }

  if (upgradeMission.upgradeType === "speed") {
    ship.speedLevel += 1;
  } else {
    ship.cargoLevel += 1;
  }
  ship.status = "idle";

  pushLog(
    state,
    `${getShipDisplayName(ship)} ${upgradeMission.upgradeType} upgrade complete (L${
      upgradeMission.upgradeType === "speed" ? ship.speedLevel : ship.cargoLevel
    }).`
  );
}

function buyMerchantShip(state) {
  const cost = state.nextMerchantShipCost;
  if (state.credits < cost) {
    return { ok: false, message: `Need ${formatCredits(cost)}.` };
  }

  state.credits -= cost;
  const newIndex = state.merchantShips.length + 1;
  state.merchantShips.push({
    id: `m-${newIndex}`,
    name: `Merchant ${newIndex}`,
    nameColor: SHIP_NAME_COLORS[(newIndex - 1) % SHIP_NAME_COLORS.length],
    cargoLevel: 0,
    speedLevel: 0,
    status: "idle"
  });
  state.nextMerchantShipCost = clampPositiveInt(cost * BALANCE.MERCHANT_SHIP_COST_GROWTH);

  pushLog(
    state,
    `Purchased merchant ship M-${newIndex}. Fleet size is now ${state.merchantShips.length}.`
  );
  return { ok: true };
}

function buyScoutShip(state) {
  if (state.scoutShip.owned) {
    return { ok: false, message: "Scout ship already owned." };
  }
  if (state.credits < BALANCE.SCOUT_SHIP_COST) {
    return { ok: false, message: `Need ${formatCredits(BALANCE.SCOUT_SHIP_COST)}.` };
  }

  state.credits -= BALANCE.SCOUT_SHIP_COST;
  state.scoutShip = { owned: true, status: "idle" };

  pushLog(state, "Purchased scouting ship. Deep-space surveying is now available.");
  return { ok: true };
}

function launchScoutMission(state) {
  if (!state.scoutShip.owned) {
    return { ok: false, message: "No scout ship owned." };
  }
  if (state.scoutShip.status === "mission" || state.scoutMission) {
    return { ok: false, message: "Scout mission already in progress." };
  }

  const target = getUndiscoveredSystems(state).sort((a, b) => a.distance - b.distance)[0];
  if (!target) {
    return { ok: false, message: "All systems discovered." };
  }

  const durationSeconds = getScoutMissionDuration(state);

  state.scoutMission = {
    id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    targetSystemId: target.id,
    remainingSeconds: durationSeconds,
    durationSeconds,
    createdAt: nowIso()
  };
  state.scoutShip.status = "mission";
  state.scoutMissionsLaunched += 1;

  pushLog(
    state,
    `Scout mission launched toward unknown coordinates near ${target.name}. Duration ${formatSeconds(durationSeconds)}.`
  );
  return { ok: true };
}

function resolveScoutMission(state, mission) {
  const target = findSystem(state, mission.targetSystemId);
  if (target) {
    target.discovered = true;
    pushLog(
      state,
      `Scout mission complete. New system discovered: ${target.name} (distance ${formatDistanceLy(target.distance)}).`
    );
  } else {
    pushLog(state, "Scout mission complete, but no valid target was found.");
  }

  state.scoutMission = null;
  state.scoutShip.status = "idle";
}

function advanceGameBySeconds(state, elapsedSeconds) {
  const seconds = Math.max(0, Math.floor(elapsedSeconds || 0));
  let timersAdvanced = false;
  let majorStateChange = false;
  let marketChanged = false;
  let completedTradeMissions = 0;
  let completedScoutMissions = 0;
  let completedUpgradeMissions = 0;

  if (seconds <= 0) {
    return {
      timersAdvanced,
      majorStateChange,
      marketChanged,
      completedTradeMissions,
      completedScoutMissions,
      completedUpgradeMissions
    };
  }

  if (decayMarketPressure(state, seconds)) {
    marketChanged = true;
  }
  if (state.marketEvents.length > 0) {
    timersAdvanced = true;
  }
  if (advanceMarketEvents(state, seconds)) {
    marketChanged = true;
  }
  if (marketChanged) {
    recomputeAllSystemPrices(state);
  }

  for (const mission of state.tradeMissions) {
    mission.remainingSeconds -= seconds;
    timersAdvanced = true;
  }

  const completedTrades = state.tradeMissions
    .filter((m) => m.remainingSeconds <= 0)
    .sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  if (completedTrades.length > 0) {
    state.tradeMissions = state.tradeMissions.filter((m) => m.remainingSeconds > 0);
    for (const mission of completedTrades) {
      resolveTradeMission(state, mission);
    }
    completedTradeMissions += completedTrades.length;
    majorStateChange = true;
  }

  if (state.scoutMission) {
    state.scoutMission.remainingSeconds -= seconds;
    timersAdvanced = true;

    if (state.scoutMission.remainingSeconds <= 0) {
      resolveScoutMission(state, state.scoutMission);
      completedScoutMissions += 1;
      majorStateChange = true;
    }
  }

  for (const upgradeMission of state.upgradeMissions) {
    upgradeMission.remainingSeconds -= seconds;
    timersAdvanced = true;
  }

  const completedUpgrades = state.upgradeMissions
    .filter((u) => u.remainingSeconds <= 0)
    .sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  if (completedUpgrades.length > 0) {
    state.upgradeMissions = state.upgradeMissions.filter((u) => u.remainingSeconds > 0);
    for (const upgradeMission of completedUpgrades) {
      resolveUpgradeMission(state, upgradeMission);
    }
    completedUpgradeMissions += completedUpgrades.length;
    majorStateChange = true;
  }

  return {
    timersAdvanced,
    majorStateChange,
    marketChanged,
    completedTradeMissions,
    completedScoutMissions,
    completedUpgradeMissions
  };
}

function applyOfflineProgress(state) {
  const lastUpdateMs = Date.parse(state.lastUpdatedAt);
  if (!Number.isFinite(lastUpdateMs)) {
    return {
      timersAdvanced: false,
      majorStateChange: false,
      marketChanged: false,
      elapsedSeconds: 0,
      completedTradeMissions: 0,
      completedScoutMissions: 0,
      creditsDelta: 0,
      discoveredDelta: 0
    };
  }

  const nowMs = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastUpdateMs) / 1000));
  if (elapsedSeconds <= 0) {
    return {
      timersAdvanced: false,
      majorStateChange: false,
      marketChanged: false,
      elapsedSeconds: 0,
      completedTradeMissions: 0,
      completedScoutMissions: 0,
      creditsDelta: 0,
      discoveredDelta: 0
    };
  }

  const creditsBefore = state.credits;
  const discoveredBefore = state.systems.filter((s) => s.discovered).length;
  const result = advanceGameBySeconds(state, elapsedSeconds);
  const creditsDelta = state.credits - creditsBefore;
  const discoveredAfter = state.systems.filter((s) => s.discovered).length;
  const discoveredDelta = discoveredAfter - discoveredBefore;
  return { ...result, elapsedSeconds, creditsDelta, discoveredDelta };
}

const dom = {
  headerStats: document.getElementById("headerStats"),
  homeSystemName: document.getElementById("homeSystemName"),
  homeMarket: document.getElementById("homeMarket"),
  systemsList: document.getElementById("systemsList"),
  fleetContent: document.getElementById("fleetContent"),
  shipyardContent: document.getElementById("shipyardContent"),
  hangarContent: document.getElementById("hangarContent"),
  newsfeedContent: document.getElementById("newsfeedContent"),
  eventLog: document.getElementById("eventLog"),
  resetBtn: document.getElementById("resetBtn"),
  awayModal: document.getElementById("awayModal"),
  awaySummaryList: document.getElementById("awaySummaryList"),
  closeAwayModalBtn: document.getElementById("closeAwayModalBtn"),
  tradeModal: document.getElementById("tradeModal"),
  tradePlannerContent: document.getElementById("tradePlannerContent"),
  closeTradeModalBtn: document.getElementById("closeTradeModalBtn")
};

let gameState = loadGameState() || createNewGameState();
let tradePlannerState = null;
const offlineCatchUp = applyOfflineProgress(gameState);

if (offlineCatchUp.elapsedSeconds > 0) {
  pushLog(gameState, `Systems advanced ${formatSeconds(offlineCatchUp.elapsedSeconds)} while you were away.`);
}

function showAwaySummary(summary) {
  if (!dom.awayModal || !dom.awaySummaryList) {
    return;
  }

  const missionsCompleted = summary.completedTradeMissions + summary.completedScoutMissions;
  const creditsClass = summary.creditsDelta >= 0 ? "pos" : "neg";
  const creditsSign = summary.creditsDelta >= 0 ? "+" : "";

  dom.awaySummaryList.innerHTML = `
    <li><strong>Time away:</strong> ${formatSeconds(summary.elapsedSeconds)}</li>
    <li><strong>Missions completed:</strong> ${missionsCompleted} (Trade ${summary.completedTradeMissions}, Scout ${summary.completedScoutMissions})</li>
    <li><strong>Credits change:</strong> <span class="${creditsClass}">${creditsSign}${formatCredits(summary.creditsDelta)}</span></li>
    <li><strong>Systems discovered:</strong> ${summary.discoveredDelta}</li>
  `;
  dom.awayModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function openTradePlanner(systemId) {
  const system = findSystem(gameState, systemId);
  const idleShips = getIdleMerchantShips(gameState);
  if (!system || !system.discovered || system.id === gameState.homeSystemId) {
    return;
  }

  tradePlannerState = {
    systemId,
    outboundCommodityId: COMMODITIES[0].id,
    returnCommodityId: COMMODITIES[1]?.id || COMMODITIES[0].id,
    selectedShipIds: idleShips.length > 0 ? [idleShips[0].id] : []
  };
  renderTradePlanner();
  dom.tradeModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeTradePlanner() {
  if (!dom.tradeModal) {
    return;
  }
  dom.tradeModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  tradePlannerState = null;
}

function bestCommodityForSystem(system, home) {
  let best = null;
  for (const commodity of COMMODITIES) {
    const margin = system.prices[commodity.id] - home.prices[commodity.id];
    if (!best || margin > best.margin) {
      best = { commodityId: commodity.id, margin };
    }
  }
  return best;
}

function bestReturnCommodityForSystem(system, home) {
  let best = null;
  for (const commodity of COMMODITIES) {
    const margin = home.prices[commodity.id] - system.prices[commodity.id];
    if (!best || margin > best.margin) {
      best = { commodityId: commodity.id, margin };
    }
  }
  return best;
}

function renderHeader() {
  const idle = getIdleMerchantShips(gameState).length;
  const total = gameState.merchantShips.length;
  const scoutText = !gameState.scoutShip.owned
    ? "Not Owned"
    : gameState.scoutShip.status === "mission"
      ? "On Mission"
      : "Idle";

  dom.headerStats.innerHTML = `
    <article class="stat-chip">
      <span class="stat-label">Credits</span>
      <span class="stat-value">${formatCredits(gameState.credits)}</span>
    </article>
    <article class="stat-chip">
      <span class="stat-label">Escrow</span>
      <span class="stat-value">${formatCredits(gameState.escrowCredits || 0)}</span>
    </article>
    <article class="stat-chip">
      <span class="stat-label">Merchant Ships</span>
      <span class="stat-value">${idle} / ${total} Idle</span>
    </article>
    <article class="stat-chip">
      <span class="stat-label">Cargo Size</span>
      <span class="stat-value">${gameState.cargoSize} units</span>
    </article>
    <article class="stat-chip">
      <span class="stat-label">Scout Ship</span>
      <span class="stat-value">${scoutText}</span>
    </article>
  `;
}

function renderHomeMarket() {
  const home = getHomeSystem(gameState);
  dom.homeSystemName.textContent = `${home.name} - Buy prices`;

  const rows = COMMODITIES.map(
    (commodity) => `
    <tr>
      <td>${renderCommodityLabel(commodity.id, home)}</td>
      <td>${formatCredits(home.prices[commodity.id])}</td>
      <td>${formatCredits(commodity.basePrice)}</td>
    </tr>
  `
  ).join("");

  dom.homeMarket.innerHTML = `
    <table class="table" aria-label="Home market prices">
      <thead>
        <tr>
          <th>Commodity</th>
          <th>Home Buy Price</th>
          <th>Base Price</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderSystems() {
  const discovered = getDiscoveredRemoteSystems(gameState);
  const home = getHomeSystem(gameState);

  if (discovered.length === 0) {
    dom.systemsList.innerHTML = '<div class="empty">No remote systems discovered yet.</div>';
    return;
  }

  const cards = discovered
    .map((system) => {
      const bestOutbound = bestCommodityForSystem(system, home);
      const bestReturn = bestReturnCommodityForSystem(system, home);
      const bestOutboundTrip = bestOutbound.margin * gameState.cargoSize;
      const bestOutboundClass = bestOutboundTrip >= 0 ? "pos" : "neg";
      const bestReturnTrip = bestReturn.margin * gameState.cargoSize;
      const bestReturnClass = bestReturnTrip >= 0 ? "pos" : "neg";
      const totalBestTrip = bestOutboundTrip + bestReturnTrip;
      const totalBestClass = totalBestTrip >= 0 ? "pos" : "neg";

      return `
      <article class="system-simple-card">
        <div class="system-row">
          <h3 class="card-title">${system.name}</h3>
          <span class="badge">${formatDistanceLy(system.distance)}</span>
        </div>
        <p class="section-subtitle">Best Out: ${renderCommodityLabel(bestOutbound.commodityId, system)} <span class="${bestOutboundClass}">(${bestOutboundTrip >= 0 ? "+" : ""}${formatCredits(bestOutboundTrip)})</span></p>
        <p class="section-subtitle">Best Back: ${renderCommodityLabel(bestReturn.commodityId, system)} <span class="${bestReturnClass}">(${bestReturnTrip >= 0 ? "+" : ""}${formatCredits(bestReturnTrip)})</span></p>
        <div class="system-row">
          <p class="section-subtitle">Round-Trip ${formatSeconds(getTradeMissionDuration(system.distance))} | <span class="${totalBestClass}">${totalBestTrip >= 0 ? "+" : ""}${formatCredits(totalBestTrip)}</span></p>
          <button class="btn open-trade-planner-btn" data-system-id="${system.id}" type="button">Plan Trade</button>
        </div>
      </article>`;
    })
    .join("");

  dom.systemsList.innerHTML = `<div class="systems-simple-grid">${cards}</div>`;
}

function renderTradePlanner() {
  if (!dom.tradePlannerContent) {
    return;
  }

  if (!tradePlannerState) {
    dom.tradePlannerContent.innerHTML = '<div class="empty">Select a system to plan a trade mission.</div>';
    return;
  }

  const system = findSystem(gameState, tradePlannerState.systemId);
  const home = getHomeSystem(gameState);
  const idleShips = getIdleMerchantShips(gameState);
  if (!system || !home) {
    dom.tradePlannerContent.innerHTML = '<div class="empty">Selected system is no longer available.</div>';
    return;
  }

  const outboundId = tradePlannerState.outboundCommodityId;
  const returnId = tradePlannerState.returnCommodityId;
  const idleShipIds = new Set(idleShips.map((ship) => ship.id));
  tradePlannerState.selectedShipIds = (tradePlannerState.selectedShipIds || []).filter((shipId) =>
    idleShipIds.has(shipId)
  );
  const selectedShips = idleShips.filter((ship) => tradePlannerState.selectedShipIds.includes(ship.id));

  const outboundBuy = home.prices[outboundId];
  const outboundSell = system.prices[outboundId];
  const returnBuy = system.prices[returnId];
  const returnSell = home.prices[returnId];
  const totalMissionCost = selectedShips.reduce((sum, ship) => {
    const units = getShipCargoUnits(gameState, ship);
    return sum + (outboundBuy + returnBuy) * units;
  }, 0);
  const totalProfit = selectedShips.reduce((sum, ship) => {
    const units = getShipCargoUnits(gameState, ship);
    return sum + (outboundSell - outboundBuy + (returnSell - returnBuy)) * units;
  }, 0);
  const perShipMissionCost = selectedShips.length > 0 ? totalMissionCost / selectedShips.length : 0;
  const durations = selectedShips.map((ship) => getShipTradeDuration(system.distance, ship));
  const slowestDuration = durations.length > 0 ? Math.max(...durations) : getTradeMissionDuration(system.distance);
  const fastestDuration = durations.length > 0 ? Math.min(...durations) : getTradeMissionDuration(system.distance);
  const canLaunch = selectedShips.length > 0 && gameState.credits >= totalMissionCost;

  const outboundButtons = COMMODITIES.map((commodity) => {
    const active = outboundId === commodity.id ? "active" : "";
    return `
      <button type="button" class="commodity-btn ${active}" data-planner-role="outbound" data-commodity-id="${commodity.id}">
        <span class="commodity-icon">${COMMODITY_ICONS[commodity.id] || "⬡"}</span>
        <span class="commodity-name">${commodity.name}</span>
        <span class="commodity-tag ${getCommodityMarketLevel(system, commodity.id).className}">${getCommodityMarketLevel(system, commodity.id).label}</span>
      </button>
    `;
  }).join("");

  const returnButtons = COMMODITIES.map((commodity) => {
    const active = returnId === commodity.id ? "active" : "";
    return `
      <button type="button" class="commodity-btn ${active}" data-planner-role="return" data-commodity-id="${commodity.id}">
        <span class="commodity-icon">${COMMODITY_ICONS[commodity.id] || "⬡"}</span>
        <span class="commodity-name">${commodity.name}</span>
        <span class="commodity-tag ${getCommodityMarketLevel(system, commodity.id).className}">${getCommodityMarketLevel(system, commodity.id).label}</span>
      </button>
    `;
  }).join("");

  const shipButtons = idleShips.length === 0
    ? '<div class="empty">No idle merchant ships available.</div>'
    : idleShips
        .map((ship) => {
          const active = tradePlannerState.selectedShipIds.includes(ship.id) ? "active" : "";
          return `
      <button type="button" class="ship-select-btn ${active}" data-ship-id="${ship.id}">
        <span class="ship-select-name" style="color:${ship.nameColor}">${escapeHtml(getShipDisplayName(ship))}</span>
        <span class="section-subtitle">${ship.id.toUpperCase()} • ${getShipCargoUnits(gameState, ship)} units • ${(getShipSpeedMultiplier(ship) * 100).toFixed(0)}% time</span>
      </button>
    `;
        })
        .join("");

  dom.tradePlannerContent.innerHTML = `
    <div class="planner-grid">
      <p class="section-subtitle"><strong>${system.name}</strong> • ${formatDistanceLy(system.distance)} • Round-trip ${formatSeconds(getTradeMissionDuration(system.distance))}</p>
      <div>
        <p class="section-subtitle">Outbound Cargo</p>
        <div class="icon-grid">${outboundButtons}</div>
      </div>
      <div>
        <p class="section-subtitle">Return Cargo</p>
        <div class="icon-grid">${returnButtons}</div>
      </div>
      <div>
        <p class="section-subtitle">Ships to Send</p>
        <div class="ship-select-grid">${shipButtons}</div>
      </div>
      <p class="section-subtitle">Selected Ships: <strong>${selectedShips.length}</strong> / ${idleShips.length}</p>
      <p class="section-subtitle">Mission Duration Range: <strong>${formatSeconds(fastestDuration)} - ${formatSeconds(slowestDuration)}</strong></p>
      <p class="section-subtitle">Per-Ship Mission Cost: <strong>${formatCredits(perShipMissionCost)}</strong></p>
      <p class="section-subtitle">Total Mission Cost: <strong>${formatCredits(totalMissionCost)}</strong></p>
      <p class="section-subtitle">Estimated Result: <span class="${totalProfit >= 0 ? "pos" : "neg"}">${totalProfit >= 0 ? "+" : ""}${formatCredits(totalProfit)}</span></p>
      <button type="button" id="launchPlannedTradeBtn" class="btn" ${canLaunch ? "" : "disabled"}>
        ${selectedShips.length === 0 ? "Select At Least One Ship" : gameState.credits < totalMissionCost ? "Insufficient Credits" : "Launch Trade Mission"}
      </button>
    </div>
  `;
}

function renderFleet() {
  const idle = getIdleMerchantShips(gameState).length;
  const totalMissionEscrow = gameState.tradeMissions.reduce((sum, mission) => {
    const missionEscrow = Number.isFinite(mission.returnEscrow)
      ? mission.returnEscrow
      : mission.returnBuyPrice * mission.units;
    return sum + missionEscrow;
  }, 0);

  const tradeMissionMarkup =
    gameState.tradeMissions.length === 0
      ? '<div class="empty">No active trade missions.</div>'
      : gameState.tradeMissions
          .map((mission) => {
            const destination = findSystem(gameState, mission.destinationSystemId);
            const ship = findMerchantShip(gameState, mission.shipId);
            const potential = Number.isFinite(mission.estimatedProfit)
              ? mission.estimatedProfit
              : (mission.outboundSellPrice - mission.outboundBuyPrice + (mission.returnSellPrice - mission.returnBuyPrice)) *
                mission.units;
            const missionEscrow = Number.isFinite(mission.returnEscrow)
              ? mission.returnEscrow
              : mission.returnBuyPrice * mission.units;
            const halfDuration = Math.max(1, Math.floor(mission.durationSeconds / 2));
            const outboundRemaining = Math.max(0, mission.remainingSeconds - halfDuration);
            const returnRemaining = Math.max(0, Math.min(halfDuration, mission.remainingSeconds));
            const phase = mission.remainingSeconds > halfDuration ? "Outbound Leg" : "Return Leg";
            const phaseEta = mission.remainingSeconds > halfDuration ? outboundRemaining : returnRemaining;
            const elapsed = Math.max(0, mission.durationSeconds - mission.remainingSeconds);
            const progress = Math.min(100, Math.max(0, (elapsed / mission.durationSeconds) * 100));
            return `
          <article class="mission-item">
            <strong style="color:${ship?.nameColor || "#ffffff"}">${escapeHtml(ship ? getShipDisplayName(ship) : mission.shipId.toUpperCase())}</strong> <span class="section-subtitle">(${mission.shipId.toUpperCase()})</span> <-> ${destination ? destination.name : "Unknown"}<br />
            Outbound: ${renderCommodityLabel(mission.outboundCommodityId, destination)} (${mission.units} units)<br />
            Return: ${renderCommodityLabel(mission.returnCommodityId, destination)} (${mission.units} units)<br />
            Escrow Reserved: <strong>${formatCredits(missionEscrow)}</strong><br />
            Phase: <strong>${phase}</strong> (ETA ${formatSeconds(phaseEta)})<br />
            Outbound ETA: ${formatSeconds(outboundRemaining)} | Return ETA: ${formatSeconds(returnRemaining)}<br />
            Total ETA: <strong>${formatSeconds(mission.remainingSeconds)}</strong><br />
            <div class="progress-track"><div class="progress-fill" style="width:${progress.toFixed(1)}%"></div></div>
            Estimated: <span class="${potential >= 0 ? "pos" : "neg"}">${potential >= 0 ? "+" : ""}${formatCredits(
              potential
            )}</span>
          </article>
        `;
          })
          .join("");

  const upgradesMarkup =
    gameState.upgradeMissions.length === 0
      ? '<div class="empty">No active ship upgrades.</div>'
      : gameState.upgradeMissions
          .map((upgrade) => {
            const ship = findMerchantShip(gameState, upgrade.shipId);
            const progress = Math.min(
              100,
              Math.max(0, ((upgrade.durationSeconds - upgrade.remainingSeconds) / upgrade.durationSeconds) * 100)
            );
            return `
          <article class="mission-item">
            <strong style="color:${ship?.nameColor || "#ffffff"}">${escapeHtml(ship ? getShipDisplayName(ship) : upgrade.shipId.toUpperCase())}</strong> upgrading ${upgrade.upgradeType}<br />
            ETA: <strong>${formatSeconds(upgrade.remainingSeconds)}</strong><br />
            <div class="progress-track"><div class="progress-fill" style="width:${progress.toFixed(1)}%"></div></div>
          </article>
        `;
          })
          .join("");

  let scoutPanel = "";
  if (!gameState.scoutShip.owned) {
    scoutPanel = '<div class="empty">Scout ship not purchased.</div>';
  } else if (gameState.scoutMission) {
    const target = findSystem(gameState, gameState.scoutMission.targetSystemId);
    scoutPanel = `
      <article class="mission-item">
        <strong>Scout Mission Active</strong><br />
        Target region: ${target ? target.name : "Unknown"}<br />
        ETA: <strong>${formatSeconds(gameState.scoutMission.remainingSeconds)}</strong>
      </article>
    `;
  } else {
    const remaining = getUndiscoveredSystems(gameState).length;
    const nextDuration = formatSeconds(getScoutMissionDuration(gameState));
    scoutPanel = `
      <article class="mission-item">
        <strong>Scout Ship Idle</strong><br />
        Undiscovered systems: ${remaining}<br />
        Next mission duration: ${nextDuration}
      </article>
    `;
  }

  dom.fleetContent.innerHTML = `
    <div class="stack">
      <h3>Merchant Fleet</h3>
      <p class="section-subtitle">Idle ships: ${idle} / ${gameState.merchantShips.length}</p>
      <p class="section-subtitle">Total Mission Escrow Reserved: <strong>${formatCredits(totalMissionEscrow)}</strong></p>
      ${tradeMissionMarkup}
      <h3>Ship Upgrades</h3>
      ${upgradesMarkup}
    </div>
    <div class="stack">
      <h3>Scout Operations</h3>
      ${scoutPanel}
      <button type="button" id="launchScoutBtn" class="btn secondary" ${
        !gameState.scoutShip.owned || Boolean(gameState.scoutMission) || getUndiscoveredSystems(gameState).length === 0
          ? "disabled"
          : ""
      }>
        ${getUndiscoveredSystems(gameState).length === 0 ? "All Systems Mapped" : "Launch Scout Mission"}
      </button>
    </div>
  `;
}

function renderShipyard() {
  const merchantDisabled = gameState.credits < gameState.nextMerchantShipCost;
  const scoutDisabled = gameState.scoutShip.owned || gameState.credits < BALANCE.SCOUT_SHIP_COST;

  dom.shipyardContent.innerHTML = `
    <article class="action-row">
      <div>
        <h3>Merchant Ship</h3>
        <p>Increases max simultaneous trade missions by 1.</p>
      </div>
      <button id="buyMerchantBtn" type="button" class="btn" ${merchantDisabled ? "disabled" : ""}>
        Buy (${formatCredits(gameState.nextMerchantShipCost)})
      </button>
    </article>
    <article class="action-row">
      <div>
        <h3>Scouting Ship</h3>
        <p>One-time unlock for discovering new systems.</p>
      </div>
      <button id="buyScoutBtn" type="button" class="btn" ${scoutDisabled ? "disabled" : ""}>
        ${gameState.scoutShip.owned ? "Owned" : `Buy (${formatCredits(BALANCE.SCOUT_SHIP_COST)})`}
      </button>
    </article>
  `;
}

function renderHangar() {
  const shipCards = gameState.merchantShips
    .map((ship) => {
      const cargoUnits = getShipCargoUnits(gameState, ship);
      const speedMult = getShipSpeedMultiplier(ship);
      const cargoUpgradeCost = getCargoUpgradeCost(ship);
      const speedUpgradeCost = getSpeedUpgradeCost(ship);
      const cargoUpgradeDuration = getUpgradeDurationSeconds(ship, "cargo");
      const speedUpgradeDuration = getUpgradeDurationSeconds(ship, "speed");
      const canUpgrade = ship.status === "idle";
      const activeUpgrade = gameState.upgradeMissions.find((u) => u.shipId === ship.id) || null;

      const colorSwatches = SHIP_NAME_COLOR_OPTIONS.map((colorOption) => {
        const active = ship.nameColor === colorOption.value ? "active" : "";
        return `
          <button
            type="button"
            class="color-swatch-btn ${active}"
            data-ship-id="${ship.id}"
            data-color-value="${colorOption.value}"
            style="color:${colorOption.value}; border-color:${colorOption.value};"
          >
            ${escapeHtml(colorOption.label)}
          </button>
        `;
      }).join("");

      return `
    <article class="card">
      <div class="card-head">
        <h3 class="card-title" style="color:${ship.nameColor}">${escapeHtml(getShipDisplayName(ship))}</h3>
        <span class="badge">${ship.id.toUpperCase()} • ${ship.status}</span>
      </div>
      <p class="section-subtitle">Cargo: ${cargoUnits} units (L${ship.cargoLevel}) • Speed: ${(speedMult * 100).toFixed(0)}% travel time (L${ship.speedLevel})</p>
      ${activeUpgrade ? `<p class="section-subtitle">Upgrade in progress: ${activeUpgrade.upgradeType} • ETA ${formatSeconds(activeUpgrade.remainingSeconds)}</p>` : ""}
      <div class="form-row">
        <label class="section-subtitle" for="ship-name-${ship.id}">Ship Name</label>
        <input id="ship-name-${ship.id}" class="ship-input" type="text" maxlength="${SHIP_NAME_MAX_LENGTH}" value="${escapeHtml(ship.name)}" />
        <label class="section-subtitle">Name Color</label>
        <div class="color-swatch-grid">${colorSwatches}</div>
        <input id="ship-color-${ship.id}" type="hidden" value="${ship.nameColor}" />
        <button class="btn secondary save-ship-custom-btn" data-ship-id="${ship.id}" type="button">Save Name & Color</button>
      </div>
      <div class="form-row">
        <button class="btn upgrade-ship-btn" data-ship-id="${ship.id}" data-upgrade-type="cargo" ${canUpgrade && gameState.credits >= cargoUpgradeCost ? "" : "disabled"} type="button">
          Cargo Upgrade (Cost ${formatCredits(cargoUpgradeCost)}, ${formatSeconds(cargoUpgradeDuration)})
        </button>
        <button class="btn upgrade-ship-btn" data-ship-id="${ship.id}" data-upgrade-type="speed" ${canUpgrade && gameState.credits >= speedUpgradeCost ? "" : "disabled"} type="button">
          Speed Upgrade (Cost ${formatCredits(speedUpgradeCost)}, ${formatSeconds(speedUpgradeDuration)})
        </button>
      </div>
    </article>
  `;
    })
    .join("");

  dom.hangarContent.innerHTML =
    shipCards || '<div class="empty">No merchant ships available.</div>';
}

function renderNewsfeed() {
  if (!dom.newsfeedContent) {
    return;
  }

  const activeEvents = [...gameState.marketEvents].sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  if (activeEvents.length === 0) {
    dom.newsfeedContent.innerHTML = '<div class="empty">No active market events right now.</div>';
    return;
  }

  dom.newsfeedContent.innerHTML = activeEvents
    .map((event) => {
      const system = findSystem(gameState, event.systemId);
      const commodity = COMMODITY_INDEX[event.commodityId];
      const directionLabel = event.direction > 0 ? "Price Spike" : "Price Dip";
      return `
      <article class="news-item">
        <span class="news-kicker">${directionLabel} • ${escapeHtml(system ? system.name : "Unknown System")}</span>
        <strong>${escapeHtml(event.headline)}</strong>
        <p class="section-subtitle">${renderCommodityLabel(event.commodityId, system)} • ${escapeHtml(event.body)}</p>
        <p class="section-subtitle">Expires in ${formatSeconds(event.remainingSeconds)}</p>
      </article>
    `;
    })
    .join("");
}

function renderEventLog() {
  if (gameState.log.length === 0) {
    dom.eventLog.innerHTML = '<li class="empty">No events yet.</li>';
    return;
  }

  dom.eventLog.innerHTML = gameState.log
    .map((entry) => {
      const time = new Date(entry.timestamp);
      return `
      <li class="event-item">
        ${escapeHtml(entry.text)}<br />
        <time datetime="${entry.timestamp}">${time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })}</time>
      </li>
    `;
    })
    .join("");
}

function renderAll() {
  renderHeader();
  renderHomeMarket();
  renderSystems();
  renderFleet();
  renderShipyard();
  renderHangar();
  renderNewsfeed();
  renderEventLog();
  if (tradePlannerState) {
    renderTradePlanner();
  }
}

function saveAndRender() {
  saveGameState(gameState);
  renderAll();
}

function onRootClick(event) {
  const rawTarget = event.target;
  if (!(rawTarget instanceof HTMLElement)) {
    return;
  }

  const plannerOpenBtn = rawTarget.closest(".open-trade-planner-btn");
  if (plannerOpenBtn instanceof HTMLElement) {
    const systemId = plannerOpenBtn.dataset.systemId;
    if (!systemId) {
      return;
    }
    openTradePlanner(systemId);
    return;
  }

  const commodityBtn = rawTarget.closest(".commodity-btn");
  if (commodityBtn instanceof HTMLElement) {
    if (!tradePlannerState) {
      return;
    }
    const role = commodityBtn.dataset.plannerRole;
    const commodityId = commodityBtn.dataset.commodityId;
    if (!COMMODITY_INDEX[commodityId]) {
      return;
    }
    if (role === "return") {
      tradePlannerState.returnCommodityId = commodityId;
    } else {
      tradePlannerState.outboundCommodityId = commodityId;
    }
    renderTradePlanner();
    return;
  }

  const shipSelectBtn = rawTarget.closest(".ship-select-btn");
  if (shipSelectBtn instanceof HTMLElement) {
    if (!tradePlannerState) {
      return;
    }
    const shipId = shipSelectBtn.dataset.shipId;
    if (!shipId) {
      return;
    }
    const selectedIds = new Set(tradePlannerState.selectedShipIds || []);
    if (selectedIds.has(shipId)) {
      selectedIds.delete(shipId);
    } else {
      selectedIds.add(shipId);
    }
    tradePlannerState.selectedShipIds = Array.from(selectedIds);
    renderTradePlanner();
    return;
  }

  const launchPlannedBtn = rawTarget.closest("#launchPlannedTradeBtn");
  if (launchPlannedBtn instanceof HTMLElement) {
    if (!tradePlannerState) {
      return;
    }
    const systemId = tradePlannerState.systemId;
    const result = launchTradeMission(
      gameState,
      systemId,
      tradePlannerState.outboundCommodityId,
      tradePlannerState.returnCommodityId,
      tradePlannerState.selectedShipIds
    );
    if (!result.ok) {
      pushLog(gameState, `Trade launch failed: ${result.message}`);
    } else {
      closeTradePlanner();
    }
    saveAndRender();
    return;
  }

  const closeTradeBtn = rawTarget.closest("#closeTradeModalBtn");
  if (closeTradeBtn instanceof HTMLElement) {
    closeTradePlanner();
    return;
  }

  const legacyLaunchBtn = rawTarget.closest(".launch-trade-btn");
  if (legacyLaunchBtn instanceof HTMLElement) {
    // Legacy button fallback (unused in current UI).
    const systemId = legacyLaunchBtn.dataset.systemId;
    if (!systemId) {
      return;
    }

    const result = launchTradeMission(
      gameState,
      systemId,
      COMMODITIES[0].id,
      COMMODITIES[1]?.id || COMMODITIES[0].id,
      [getIdleMerchantShips(gameState)[0]?.id].filter(Boolean)
    );
    if (!result.ok) {
      pushLog(gameState, `Trade launch failed: ${result.message}`);
    }
    saveAndRender();
    return;
  }

  const buyMerchantBtn = rawTarget.closest("#buyMerchantBtn");
  if (buyMerchantBtn instanceof HTMLElement) {
    const result = buyMerchantShip(gameState);
    if (!result.ok) {
      pushLog(gameState, `Purchase failed: ${result.message}`);
    }
    saveAndRender();
    return;
  }

  const saveShipCustomBtn = rawTarget.closest(".save-ship-custom-btn");
  if (saveShipCustomBtn instanceof HTMLElement) {
    const shipId = saveShipCustomBtn.dataset.shipId;
    if (!shipId) {
      return;
    }
    const nameInput = document.getElementById(`ship-name-${shipId}`);
    const colorSelect = document.getElementById(`ship-color-${shipId}`);
    const nameValue = nameInput instanceof HTMLInputElement ? nameInput.value : "";
    const colorValue = colorSelect instanceof HTMLInputElement ? colorSelect.value : SHIP_NAME_COLORS[0];
    const result = updateMerchantShipStyle(gameState, shipId, nameValue, colorValue);
    if (!result.ok) {
      pushLog(gameState, `Ship update failed: ${result.message}`);
    }
    saveAndRender();
    return;
  }

  const colorSwatchBtn = rawTarget.closest(".color-swatch-btn");
  if (colorSwatchBtn instanceof HTMLElement) {
    const shipId = colorSwatchBtn.dataset.shipId;
    const colorValue = colorSwatchBtn.dataset.colorValue;
    if (!shipId || !colorValue) {
      return;
    }
    const hiddenInput = document.getElementById(`ship-color-${shipId}`);
    if (hiddenInput instanceof HTMLInputElement) {
      hiddenInput.value = colorValue;
    }
    const siblings = document.querySelectorAll(`.color-swatch-btn[data-ship-id="${shipId}"]`);
    siblings.forEach((button) => button.classList.remove("active"));
    colorSwatchBtn.classList.add("active");
    return;
  }

  const upgradeShipBtn = rawTarget.closest(".upgrade-ship-btn");
  if (upgradeShipBtn instanceof HTMLElement) {
    const shipId = upgradeShipBtn.dataset.shipId;
    const upgradeType = upgradeShipBtn.dataset.upgradeType;
    if (!shipId || !upgradeType) {
      return;
    }
    const result = startShipUpgrade(gameState, shipId, upgradeType);
    if (!result.ok) {
      pushLog(gameState, `Upgrade failed: ${result.message}`);
    }
    saveAndRender();
    return;
  }

  const buyScoutBtn = rawTarget.closest("#buyScoutBtn");
  if (buyScoutBtn instanceof HTMLElement) {
    const result = buyScoutShip(gameState);
    if (!result.ok) {
      pushLog(gameState, `Purchase failed: ${result.message}`);
    }
    saveAndRender();
    return;
  }

  const launchScoutBtn = rawTarget.closest("#launchScoutBtn");
  if (launchScoutBtn instanceof HTMLElement) {
    const result = launchScoutMission(gameState);
    if (!result.ok) {
      pushLog(gameState, `Scout launch failed: ${result.message}`);
    }
    saveAndRender();
  }
}

function resetGame() {
  const confirmed = window.confirm("Reset all progress and start a new trading post?");
  if (!confirmed) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  gameState = createNewGameState();
  closeTradePlanner();
  saveAndRender();
}

function closeAwaySummary() {
  if (!dom.awayModal) {
    return;
  }
  dom.awayModal.classList.add("hidden");
  if (dom.tradeModal?.classList.contains("hidden")) {
    document.body.classList.remove("modal-open");
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  if (window.location.protocol === "file:") {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

document.body.addEventListener("click", onRootClick);
dom.resetBtn.addEventListener("click", resetGame);
if (dom.closeAwayModalBtn) {
  dom.closeAwayModalBtn.addEventListener("click", closeAwaySummary);
}

registerServiceWorker();

let lastTickMs = Date.now();

setInterval(() => {
  const nowMs = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastTickMs) / 1000));
  if (elapsedSeconds <= 0) {
    return;
  }
  lastTickMs += elapsedSeconds * 1000;

  const tickResult = advanceGameBySeconds(gameState, elapsedSeconds);

  if (tickResult.timersAdvanced || tickResult.majorStateChange || tickResult.marketChanged) {
    saveGameState(gameState);
  }

  if (tickResult.majorStateChange) {
    renderAll();
  } else {
    if (tickResult.timersAdvanced || tickResult.marketChanged) {
      renderHeader();
    }
    if (tickResult.timersAdvanced) {
      renderFleet();
      renderNewsfeed();
    }
    if (tickResult.marketChanged) {
      renderHomeMarket();
      renderSystems();
      renderNewsfeed();
    }
  }
}, TICK_INTERVAL_MS);

saveAndRender();

if (offlineCatchUp.elapsedSeconds > 0) {
  showAwaySummary(offlineCatchUp);
}
