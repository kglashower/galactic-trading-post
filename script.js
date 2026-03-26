"use strict";

const STORAGE_KEY = "galacticTradingPostSave_v2";
const TICK_INTERVAL_MS = 1000;

const BALANCE = {
  STARTING_CREDITS: 500,
  STARTING_DISCOVERED_COUNT: 4,
  REMOTE_SYSTEM_COUNT: 100,
  STARTING_MERCHANT_SHIPS: 1,
  STARTING_MAX_MERCHANT_SHIPS: 3,
  MERCHANT_SHIP_BASE_COST: 2500,
  MERCHANT_SHIP_COST_GROWTH: 1.1,
  BASE_CARGO_SIZE: 10,
  CARGO_PER_LEVEL: 2,
  CARGO_UPGRADE_BASE_COST: 1300,
  CARGO_UPGRADE_COST_GROWTH: 1.45,
  SPEED_UPGRADE_BASE_COST: 1500,
  SPEED_UPGRADE_COST_GROWTH: 1.5,
  UPGRADE_BASE_SECONDS: 5 * 60,
  UPGRADE_DURATION_GROWTH: 1.45,
  SPEED_DURATION_MULT_PER_LEVEL: 0.9,
  SPEED_DURATION_MIN_MULTIPLIER: 0.55,
  SCOUT_SHIP_COST: 900,
  TRADE_TIME_PER_DISTANCE: 14,
  SCOUT_BASE_MISSION_SECONDS: 20 * 60,
  SCOUT_MISSION_INCREMENT_SECONDS: 5 * 60,
  CONTRACT_COUNT: 3,
  CONTRACT_BOUNTY_PER_UNIT_DISTANCE: 13,
  CONTRACT_DIFFICULTY_MULTIPLIER: { 1: 1, 2: 1.5, 3: 2.2 },
  CONTRACT_BASE_DEADLINE_SECONDS: { 1: 45 * 60, 2: 38 * 60, 3: 30 * 60 },
  CONTRACT_DEADLINE_DISTANCE_SECONDS: { 1: 5 * 60, 2: 4 * 60, 3: 3 * 60 },
  CONTRACT_DEADLINE_UNIT_SECONDS: { 1: 22, 2: 20, 3: 18 },
  ENVOY_LEVEL_XP_STEP: 25,
  ENVOY_BONUS_PER_LEVEL: 0.0125,
  ENVOY_MAX_BONUS: 0.1,
  FINANCE_RATE_PER_MINUTE: 0.01,
  FINANCE_MIN_BILLED_MINUTES: 5,
  MARKET_PRESSURE_STEP: 0.025,
  MARKET_PRESSURE_MAX: 0.2,
  MARKET_PRESSURE_DECAY_PER_SECOND: 0.9985,
  MARKET_EVENT_DURATION_SECONDS: 20 * 60,
  MARKET_EVENT_OFFSET_SECONDS: 10 * 60,
  STRUCTURAL_EVENT_MIN_SECONDS: 8 * 60 * 60,
  STRUCTURAL_EVENT_MAX_SECONDS: 12 * 60 * 60,
  GLOBAL_BASE_SHIFT_PERCENT: 0.1,
  MAX_LOG_ENTRIES: 60,
  MAX_TRADE_HISTORY: 180
};

const COMMODITIES = [
  { id: "food", name: "Food", basePrice: 10 },
  { id: "water", name: "Water", basePrice: 8 },
  { id: "ore", name: "Ore", basePrice: 15 },
  { id: "fuel", name: "Fuel", basePrice: 20 },
  { id: "electronics", name: "Electronics", basePrice: 35 },
  { id: "medicine", name: "Medicine", basePrice: 40 }
];

const COMMODITY_INDEX = Object.fromEntries(COMMODITIES.map((item) => [item.id, item]));
const COMMODITY_ICONS = {
  food: "🍞",
  water: "💧",
  ore: "⛏️",
  fuel: "⛽",
  electronics: "🔌",
  medicine: "🧪"
};
const GLOBAL_BASE_PRICES = Object.fromEntries(COMMODITIES.map((item) => [item.id, item.basePrice]));

const MARKET_TIER_DEFS = [
  { label: "Very Low", className: "tag-very-low", ratio: 0.68 },
  { label: "Low", className: "tag-low", ratio: 0.82 },
  { label: "Normal", className: "tag-normal", ratio: 1 },
  { label: "High", className: "tag-high", ratio: 1.18 },
  { label: "Very High", className: "tag-very-high", ratio: 1.36 }
];

const SHIP_NAME_MAX_LENGTH = 20;
const SHIP_NAME_COLOR_OPTIONS = [
  { value: "#40e5ff", label: "Cyan" },
  { value: "#53ffa8", label: "Emerald" },
  { value: "#ffd98f", label: "Amber" },
  { value: "#ffb3c7", label: "Rose" },
  { value: "#d2c1ff", label: "Violet" },
  { value: "#ffffff", label: "White" }
];
const SHIP_NAME_COLORS = SHIP_NAME_COLOR_OPTIONS.map((item) => item.value);

const SECTION_CONFIG = {
  trade: { title: "Trade Exchange", kicker: "Market Hall" },
  navigation: { title: "Navigation Office", kicker: "Astrogation Desk" },
  fleet: { title: "Merchant Fleet", kicker: "Operations Concourse" },
  shipyard: { title: "Shipyard", kicker: "Fabrication Ring" },
  hangar: { title: "Hangar", kicker: "Service Berths" },
  contracts: { title: "Corporate Contracts", kicker: "Brokerage Wing" },
  envoys: { title: "Trade Envoys", kicker: "Diplomatic Annex" },
  analytics: { title: "Trade Analytics", kicker: "Ledger Vault" },
  news: { title: "Newsfeed & History", kicker: "Comms Relay" }
};

const MARKET_EVENT_COPY = {
  food: {
    up: [
      { headline: "Crop Blight", body: "A fungal bloom wiped out hydroponic trays and food demand is surging." },
      { headline: "Refugee Intake", body: "Emergency arrivals have stretched station ration reserves beyond plan." }
    ],
    down: [
      { headline: "Harvest Surge", body: "A bumper harvest flooded cargo docks with cheap food stock." },
      { headline: "Relief Convoy", body: "Aid haulers dumped surplus food stores into the market." }
    ]
  },
  water: {
    up: [
      { headline: "Purifier Failure", body: "Water reclamation systems are offline and imports now command a premium." },
      { headline: "Reservoir Leak", body: "Storage losses cut available potable reserves across the system." }
    ],
    down: [
      { headline: "Ice Freighter Arrival", body: "Fresh ice haulers overfilled tanks and eased local demand." },
      { headline: "Filtration Upgrade", body: "New purifier arrays restored clean water output faster than forecast." }
    ]
  },
  ore: {
    up: [
      { headline: "Foundry Expansion", body: "Orbital foundries signed new intake contracts and ore bids are climbing." },
      { headline: "Construction Boom", body: "New hullworks projects are devouring raw ore around the clock." }
    ],
    down: [
      { headline: "Mining Glut", body: "A fresh wave of excavation runs left brokers sitting on excess ore." },
      { headline: "Bulk Dump", body: "Multiple haulers unloaded ore at once and crushed the spot market." }
    ]
  },
  fuel: {
    up: [
      { headline: "Patrol Surge", body: "Security flotillas are burning reserves and bidding hard for fuel." },
      { headline: "Lane Congestion", body: "Heavy jump traffic is draining refinery output faster than expected." }
    ],
    down: [
      { headline: "Refinery Overrun", body: "Refineries overshot the mark and depots are loaded with excess fuel." },
      { headline: "Traffic Slump", body: "A quiet travel window left fuel suppliers competing for buyers." }
    ]
  },
  electronics: {
    up: [
      { headline: "Relay Retrofit", body: "Comms relays are being rebuilt and electronics demand spiked overnight." },
      { headline: "Signal Blackout", body: "Emergency repairs are chewing through local electronics inventory." }
    ],
    down: [
      { headline: "Factory Oversupply", body: "A manufacturing wave produced far more boards than brokers can place." },
      { headline: "Warehouse Clearance", body: "Storage firms are liquidating electronics stock at discount." }
    ]
  },
  medicine: {
    up: [
      { headline: "Disease Outbreak", body: "Civilian clinics are urgently restocking medicine during an outbreak." },
      { headline: "Hospital Overflow", body: "Packed wards are paying a premium for fresh medical supplies." }
    ],
    down: [
      { headline: "Cure Shipment", body: "A major convoy delivered enough medicine to calm emergency demand." },
      { headline: "Clinical Recovery", body: "Case numbers are falling and medical buyers are backing off." }
    ]
  }
};

const STRUCTURAL_EVENT_COPY = {
  system: {
    up: [
      { headline: "Charter Refit", body: "A permanent industrial refit pushed local buyers into a more aggressive price tier." },
      { headline: "Colonial Expansion", body: "Long-term population growth structurally raised demand in this market." }
    ],
    down: [
      { headline: "Local Substitution", body: "New domestic production permanently reduced import dependence." },
      { headline: "Supply Corridor", body: "A stabilized freight corridor permanently softened procurement pressure." }
    ]
  },
  global: {
    up: [
      { headline: "Sector-Wide Shortage", body: "A broad supply squeeze reset baseline pricing across the trade network." },
      { headline: "Galactic Tariff Shift", body: "New interstellar tariffs permanently pushed the base market upward." }
    ],
    down: [
      { headline: "Process Breakthrough", body: "A production breakthrough permanently lowered baseline clearing prices." },
      { headline: "Distribution Reform", body: "Improved logistics permanently drove down the galactic baseline." }
    ]
  }
};

const CONTRACT_ISSUERS = [
  "Orion Procurement",
  "Helix Logistics",
  "Cinder Mercantile",
  "Spindle Brokerage",
  "Vastline Holdings",
  "Apex Transfer"
];
const CONTRACT_HEADLINES = [
  "Emergency Fulfillment",
  "Priority Requisition",
  "Expedited Supply Run",
  "Board-Level Delivery",
  "Deadline Freight",
  "Strategic Transfer"
];
const CONTRACT_BODIES = [
  "A premium buyer will pay well for dependable bulk delivery.",
  "This lane has boardroom attention. Miss the deadline and the contract goes cold.",
  "A remote client is paying aggressively for guaranteed supply.",
  "This contract rewards capacity, speed, and a steady hand under pressure."
];

const ENVOY_FIRST_NAMES = [
  "Cassian", "Lyra", "Tavian", "Mira", "Orin", "Selka", "Ivo", "Nera", "Dorian", "Vela", "Kestrel", "Soren",
  "Ari", "Kael", "Junia", "Riven", "Talia", "Bram", "Niko", "Soraya", "Pax", "Elio", "Maelin", "Corin"
];
const ENVOY_LAST_NAMES = [
  "Vale", "Quill", "Morrow", "Drake", "Voss", "Prynn", "Kade", "Rhex", "Solari", "Thorne", "Mercer", "Raine",
  "Lorr", "Vey", "Marek", "Sable", "Kellan", "Dax", "Norrin", "Taris", "Veyra", "Hale", "Corvus", "Lune"
];

const SYSTEM_NAME_A = [
  "Orion", "Cygnus", "Draco", "Vega", "Helios", "Nyx", "Talos", "Astra", "Nadir", "Erebus", "Nova", "Zenith",
  "Lumen", "Argon", "Selene", "Atlas", "Cinder", "Echo", "Kepler", "Vesper", "Quasar", "Aegis", "Sable", "Rhea"
];
const SYSTEM_NAME_B = [
  "Prime", "Gate", "Reach", "Bastion", "Harbor", "Station", "Frontier", "Spindle", "Junction", "Haven", "Array", "Crossing",
  "Drift", "Spur", "Anvil", "Vault", "Arc", "Port", "Node", "Ember", "Rise", "Mirror", "Bridge", "Beacon"
];

function combinations(arr, size) {
  const result = [];
  function walk(start, combo) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i += 1) {
      combo.push(arr[i]);
      walk(i + 1, combo);
      combo.pop();
    }
  }
  walk(0, []);
  return result;
}

function generateSystemTypes(ids) {
  const result = [];
  const highs = combinations(ids, 2);
  for (const high of highs) {
    const remaining = ids.filter((id) => !high.includes(id));
    for (const low of combinations(remaining, 2)) {
      result.push({
        id: `h:${[...high].sort().join("-")}|l:${[...low].sort().join("-")}`,
        high: [...high].sort(),
        low: [...low].sort()
      });
    }
  }
  return result;
}

const SYSTEM_TYPES = generateSystemTypes(COMMODITIES.map((item) => item.id));

function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFraction(seed) {
  return (hashString(seed) % 1000000) / 1000000;
}

function randBetween(min, max, seed) {
  return min + (max - min) * seededFraction(seed);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTenths(value) {
  return Math.round(value * 10) / 10;
}

function clampPositiveInt(value) {
  return Math.max(1, Math.round(value));
}

function nowIso() {
  return new Date().toISOString();
}

function formatCredits(value) {
  return `${Math.round(value).toLocaleString()} cr`;
}

function formatSeconds(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rem = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rem).padStart(2, "0")}`;
}

function formatDistanceLy(distance) {
  return `${Number(distance).toFixed(1)} LY`;
}

function getPercent(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return clamp((part / total) * 100, 0, 100);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function combinationsKey(ids) {
  return [...ids].sort().join("+");
}

const PLAYER_LEVEL_THRESHOLDS = [0, 3, 5];

function getLevelThreshold(level) {
  if (level <= 1) {
    return 0;
  }
  while (PLAYER_LEVEL_THRESHOLDS.length < level) {
    const len = PLAYER_LEVEL_THRESHOLDS.length;
    PLAYER_LEVEL_THRESHOLDS.push(PLAYER_LEVEL_THRESHOLDS[len - 1] + PLAYER_LEVEL_THRESHOLDS[len - 2]);
  }
  return PLAYER_LEVEL_THRESHOLDS[level - 1];
}

function getLevelForReputation(xp) {
  let level = 1;
  while (xp >= getLevelThreshold(level + 1)) {
    level += 1;
  }
  return level;
}

function getReputationProgress(level, xp) {
  const current = getLevelThreshold(level);
  const next = getLevelThreshold(level + 1);
  const span = Math.max(1, next - current);
  return {
    current,
    next,
    inLevel: xp - current,
    span,
    pct: clamp(((xp - current) / span) * 100, 0, 100)
  };
}

function getNonEnvoyRewardCount(level) {
  let count = 0;
  for (let i = 2; i <= level; i += 1) {
    if (i % 3 !== 0) {
      count += 1;
    }
  }
  return count;
}

function getDerivedMaxMerchantShips(level, currentShips = 1) {
  return Math.max(currentShips, BALANCE.STARTING_MAX_MERCHANT_SHIPS + getNonEnvoyRewardCount(level));
}

function getTradeEnvoyLevel(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / BALANCE.ENVOY_LEVEL_XP_STEP)) + 1;
}

function getTradeEnvoyBonusRate(envoy) {
  return Math.min(BALANCE.ENVOY_MAX_BONUS, getTradeEnvoyLevel(envoy?.xp || 0) * BALANCE.ENVOY_BONUS_PER_LEVEL);
}

function getTradeEnvoyLevelProgress(envoy) {
  const level = getTradeEnvoyLevel(envoy?.xp || 0);
  const current = Math.pow(level - 1, 2) * BALANCE.ENVOY_LEVEL_XP_STEP;
  const next = Math.pow(level, 2) * BALANCE.ENVOY_LEVEL_XP_STEP;
  return {
    level,
    current,
    next,
    pct: getPercent((envoy?.xp || 0) - current, next - current)
  };
}

function getMerchantShipCostForCount(existingShips) {
  return clampPositiveInt(BALANCE.MERCHANT_SHIP_BASE_COST * Math.pow(BALANCE.MERCHANT_SHIP_COST_GROWTH, Math.max(0, existingShips - BALANCE.STARTING_MERCHANT_SHIPS)));
}

function getShipCargoUnits(ship) {
  return BALANCE.BASE_CARGO_SIZE + (ship.cargoLevel || 0) * BALANCE.CARGO_PER_LEVEL;
}

function getShipSpeedMultiplier(ship) {
  return Math.max(
    BALANCE.SPEED_DURATION_MIN_MULTIPLIER,
    Math.pow(BALANCE.SPEED_DURATION_MULT_PER_LEVEL, ship.speedLevel || 0)
  );
}

function getTradeDurationForShip(distance, ship) {
  return Math.max(6, Math.round(distance * BALANCE.TRADE_TIME_PER_DISTANCE * 2 * getShipSpeedMultiplier(ship)));
}

function getScoutMissionDuration(state) {
  return BALANCE.SCOUT_BASE_MISSION_SECONDS + (state.scoutMissionsLaunched || 0) * BALANCE.SCOUT_MISSION_INCREMENT_SECONDS;
}

function getUpgradeCost(ship, type) {
  if (type === "cargo") {
    return clampPositiveInt(BALANCE.CARGO_UPGRADE_BASE_COST * Math.pow(BALANCE.CARGO_UPGRADE_COST_GROWTH, ship.cargoLevel || 0));
  }
  return clampPositiveInt(BALANCE.SPEED_UPGRADE_BASE_COST * Math.pow(BALANCE.SPEED_UPGRADE_COST_GROWTH, ship.speedLevel || 0));
}

function getUpgradeDuration(ship, type) {
  const level = type === "cargo" ? ship.cargoLevel || 0 : ship.speedLevel || 0;
  return clampPositiveInt(BALANCE.UPGRADE_BASE_SECONDS * Math.pow(BALANCE.UPGRADE_DURATION_GROWTH, level));
}

function getMissionFinanceInterest(principal, durationSeconds) {
  const borrowed = Math.max(0, Number(principal) || 0);
  const billedMinutes = Math.max(BALANCE.FINANCE_MIN_BILLED_MINUTES, Math.ceil((durationSeconds || 0) / 60));
  return Math.round(borrowed * BALANCE.FINANCE_RATE_PER_MINUTE * billedMinutes);
}

function getTradeEscrowPerUnit(outboundSellEstimate, returnBuyEstimate) {
  return Math.max(0, returnBuyEstimate - outboundSellEstimate);
}

function getEnvoyBlueprints() {
  const singles = COMMODITIES
    .slice()
    .sort((a, b) => a.basePrice - b.basePrice || a.id.localeCompare(b.id))
    .map((commodity, index) => ({
      index,
      specialtyCommodityIds: [commodity.id],
      sortValue: commodity.basePrice,
      label: commodity.name
    }));

  const pairs = combinations(COMMODITIES.map((item) => item.id), 2)
    .map((pair) => ({
      specialtyCommodityIds: [...pair].sort(),
      sortValue: COMMODITY_INDEX[pair[0]].basePrice + COMMODITY_INDEX[pair[1]].basePrice,
      label: pair.map((id) => COMMODITY_INDEX[id].name).join(" / ")
    }))
    .sort((a, b) => a.sortValue - b.sortValue || combinationsKey(a.specialtyCommodityIds).localeCompare(combinationsKey(b.specialtyCommodityIds)));

  return [...singles, ...pairs];
}

const ENVOY_BLUEPRINTS = getEnvoyBlueprints();

function createZeroPressureMap() {
  const pressure = {};
  for (const commodity of COMMODITIES) {
    pressure[commodity.id] = 0;
  }
  return pressure;
}

function createZeroShiftMap() {
  const shift = {};
  for (const commodity of COMMODITIES) {
    shift[commodity.id] = 0;
  }
  return shift;
}

function pickUniqueSystemNames(count) {
  const names = [];
  const used = new Set(["Sol Nexus"]);
  for (let i = 0; names.length < count; i += 1) {
    const name = `${SYSTEM_NAME_A[i % SYSTEM_NAME_A.length]} ${SYSTEM_NAME_B[Math.floor(i / SYSTEM_NAME_A.length) % SYSTEM_NAME_B.length]}`;
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
  }
  return names;
}

function generateSystemDistanceLy(name, index) {
  const r1 = seededFraction(`distance-a:${name}:${index}`);
  const r2 = seededFraction(`distance-b:${name}:${index}`);
  const skewed = Math.pow(r1, 0.68);
  const mixed = clamp((skewed * 0.72) + (r2 * 0.28), 0, 1);
  return roundTenths(1.8 + mixed * 37.4);
}

function createSystemPriceProfile(name, type, isHome = false) {
  const baseTierIndex = {};
  const priceBias = {};
  for (const commodity of COMMODITIES) {
    let tier = 2;
    if (!isHome) {
      if (type.high.includes(commodity.id)) {
        tier = 3;
      } else if (type.low.includes(commodity.id)) {
        tier = 1;
      }
    }
    baseTierIndex[commodity.id] = tier;
    priceBias[commodity.id] = randBetween(-0.05, 0.05, `bias:${name}:${commodity.id}`);
  }
  return { baseTierIndex, priceBias };
}

function createStarSystems() {
  const systems = [];
  const homeProfile = createSystemPriceProfile("Sol Nexus", { high: [], low: [] }, true);
  systems.push({
    id: "sys-home",
    name: "Sol Nexus",
    discovered: true,
    distance: 0,
    typeHigh: [],
    typeLow: [],
    baseTierIndex: homeProfile.baseTierIndex,
    priceBias: homeProfile.priceBias,
    permanentTierShifts: createZeroShiftMap(),
    marketPressure: createZeroPressureMap(),
    prices: {}
  });

  const names = pickUniqueSystemNames(BALANCE.REMOTE_SYSTEM_COUNT);
  for (let i = 0; i < BALANCE.REMOTE_SYSTEM_COUNT; i += 1) {
    const type = SYSTEM_TYPES[i % SYSTEM_TYPES.length];
    const name = names[i];
    const profile = createSystemPriceProfile(name, type, false);
    systems.push({
      id: `sys-${i + 1}`,
      name,
      discovered: false,
      distance: generateSystemDistanceLy(name, i),
      typeHigh: [...type.high],
      typeLow: [...type.low],
      baseTierIndex: profile.baseTierIndex,
      priceBias: profile.priceBias,
      permanentTierShifts: createZeroShiftMap(),
      marketPressure: createZeroPressureMap(),
      prices: {}
    });
  }

  systems
    .filter((system) => system.id !== "sys-home")
    .sort((a, b) => a.distance - b.distance)
    .slice(0, BALANCE.STARTING_DISCOVERED_COUNT - 1)
    .forEach((system) => {
      system.discovered = true;
    });

  return systems;
}

function computeCommodityTier(system, commodityId, eventShift = 0) {
  const tier = (system.baseTierIndex?.[commodityId] ?? 2) + (system.permanentTierShifts?.[commodityId] ?? 0) + eventShift;
  return clamp(tier, 0, MARKET_TIER_DEFS.length - 1);
}

function getEventShiftForCommodity(state, systemId, commodityId) {
  return (state.marketEvents || []).reduce((sum, event) => {
    if (event.systemId === systemId && event.commodityId === commodityId) {
      return sum + event.direction;
    }
    return sum;
  }, 0);
}

function recomputeSystemPrices(state, system) {
  for (const commodity of COMMODITIES) {
    const tier = computeCommodityTier(system, commodity.id, getEventShiftForCommodity(state, system.id, commodity.id));
    const bias = (system.priceBias?.[commodity.id] || 0) * (tier === (system.baseTierIndex?.[commodity.id] ?? 2) ? 1 : 0.4);
    const pressure = system.marketPressure?.[commodity.id] || 0;
    const ratio = clamp(MARKET_TIER_DEFS[tier].ratio * (1 + bias) + pressure, 0.45, 1.85);
    system.prices[commodity.id] = clampPositiveInt((state.globalBasePrices?.[commodity.id] || GLOBAL_BASE_PRICES[commodity.id]) * ratio);
  }
}

function recomputeAllSystemPrices(state) {
  state.systems.forEach((system) => recomputeSystemPrices(state, system));
}

function getCommodityLevelForSystem(system, commodityId) {
  if (!system || !COMMODITY_INDEX[commodityId]) {
    return MARKET_TIER_DEFS[2];
  }
  const price = system.prices?.[commodityId];
  const base = COMMODITY_INDEX[commodityId].basePrice || 1;
  const ratio = price / base;
  if (ratio >= 1.28) return MARKET_TIER_DEFS[4];
  if (ratio >= 1.1) return MARKET_TIER_DEFS[3];
  if (ratio <= 0.72) return MARKET_TIER_DEFS[0];
  if (ratio <= 0.88) return MARKET_TIER_DEFS[1];
  return MARKET_TIER_DEFS[2];
}

function renderCommodityLabel(commodityId, system) {
  const commodity = COMMODITY_INDEX[commodityId];
  const tier = getCommodityLevelForSystem(system, commodityId);
  return `<span class="commodity-name"><span class="commodity-icon">${COMMODITY_ICONS[commodityId] || ""}</span>${escapeHtml(commodity.name)} <span class="commodity-tag ${tier.className}">${tier.label}</span></span>`;
}

function renderLocationSprite(key) {
  const common = `stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const sprites = {
    trade: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><path ${common} d="M11 21h42M16 21l4-8h24l4 8M18 29h28v18H18z"/><path ${common} d="M21 34h9M34 34h8M23 43h18"/><path ${common} d="M49 30l5 5-5 5"/><path ${common} d="M15 40l-5-5 5-5"/></svg>`,
    navigation: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><circle ${common} cx="32" cy="32" r="20"/><path ${common} d="M32 12v8M32 44v8M12 32h8M44 32h8"/><path ${common} d="M39 25l-11 5 7 6 4-11z"/></svg>`,
    fleet: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><path ${common} d="M10 36l22-17 22 17-22 9z"/><path ${common} d="M20 31h24M25 25h14"/><path ${common} d="M18 43l14 7 14-7"/></svg>`,
    shipyard: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><path ${common} d="M16 17h32v30H16z"/><path ${common} d="M24 17V9h16v8"/><path ${common} d="M24 30h16M24 38h10"/><path ${common} d="M46 42l6 6M52 42l-6 6"/></svg>`,
    hangar: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><path ${common} d="M12 24l20-12 20 12v24H12z"/><path ${common} d="M24 48V32h16v16"/><path ${common} d="M22 22h20"/></svg>`,
    contracts: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><rect ${common} x="16" y="11" width="32" height="42" rx="4"/><path ${common} d="M24 21h16M24 29h16M24 37h10"/><path ${common} d="M38 43l4 4 8-10"/></svg>`,
    envoys: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><circle ${common} cx="24" cy="24" r="8"/><circle ${common} cx="40" cy="20" r="6"/><path ${common} d="M15 46c2-7 8-11 17-11s15 4 17 11"/><path ${common} d="M34 44c1-4 5-7 10-7 4 0 8 2 10 6"/></svg>`,
    analytics: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><path ${common} d="M13 49h38"/><path ${common} d="M18 44V30M30 44V22M42 44V15"/><path ${common} d="M46 18l7-7M52 11h-6M52 11v6"/></svg>`,
    news: `<svg viewBox="0 0 64 64" class="location-sprite" aria-hidden="true"><path ${common} d="M16 18h28a4 4 0 0 1 4 4v24H20a4 4 0 0 1-4-4z"/><path ${common} d="M48 22h4v20a4 4 0 0 1-4 4"/><path ${common} d="M24 26h16M24 33h16M24 40h10"/></svg>`
  };
  return sprites[key] || "";
}

function pushLog(state, text) {
  state.log.unshift({ id: `log-${Date.now()}-${Math.random()}`, text, timestamp: nowIso() });
  state.log = state.log.slice(0, BALANCE.MAX_LOG_ENTRIES);
}

function addToast(state, title, body) {
  state.notifications.push({
    id: `toast-${Date.now()}-${Math.random()}`,
    title,
    body,
    remainingSeconds: 7
  });
}

function buildHelpItems() {
  return [
    {
      title: "Spaceport Hub",
      body: "The home screen is a hub. Open a location card to work one part of your operation, then close it to return to the concourse."
    },
    {
      title: "Corporate Contracts",
      body: "Contracts award Credits and 1, 2, or 3 reputation XP based on difficulty. Reputation levels your station up instead of acting like a currency."
    },
    {
      title: "Level Rewards",
      body: "Most level-ups increase your merchant ship cap. Every third level automatically grants a Trade Envoy instead."
    },
    {
      title: "Trade Envoys",
      body: "Envoys improve pricing on their specialty commodities, level up from missions, and stay busy until their assigned trade mission batch returns."
    },
    {
      title: "Trade Missions",
      body: "Pick exact ships, outbound cargo, return cargo, and optionally one idle envoy. If funds are short, you can launch a partial load or finance the full mission."
    },
    {
      title: "Scouting",
      body: "Scouting reveals more systems over time. Discovery notifications summarize distance and the new market’s high and low commodities."
    },
    {
      title: "Markets",
      body: "Buying nudges local prices up, selling nudges them down, temporary news events move a commodity one tier, and structural events can permanently change a system or the galactic baseline."
    },
    {
      title: "Trade Analytics",
      body: "The Ledger Vault tracks your mission history, recent profit trend, commodity mix, and route leaders so you can spot what is actually making money."
    }
  ];
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

function getInitialMarketEvents(state) {
  const first = createMarketEvent(state, 0);
  const second = createMarketEvent(state, 1);
  if (second) {
    second.remainingSeconds = Math.max(1, BALANCE.MARKET_EVENT_DURATION_SECONDS - BALANCE.MARKET_EVENT_OFFSET_SECONDS);
  }
  return [first, second].filter(Boolean);
}

function createNewGameState() {
  const systems = createStarSystems();
  const state = {
    version: 2,
    credits: BALANCE.STARTING_CREDITS,
    escrowCredits: 0,
    playerReputationXp: 0,
    playerLevel: 1,
    maxMerchantShips: BALANCE.STARTING_MAX_MERCHANT_SHIPS,
    nextEnvoyGrantIndex: 0,
    merchantShips: createMerchantShips(BALANCE.STARTING_MERCHANT_SHIPS),
    scoutShip: { owned: false, status: "none" },
    scoutMission: null,
    scoutMissionsLaunched: 0,
    systems,
    marketEvents: [],
    marketEventSequence: 2,
    nextMarketEventIn: BALANCE.MARKET_EVENT_OFFSET_SECONDS,
    nextStructuralEventIn: getStructuralEventIntervalSeconds(0),
    structuralEventSequence: 0,
    structuralHistory: [],
    contracts: [],
    contractSequence: 0,
    tradeEnvoys: [],
    tradeMissions: [],
    tradeMissionBatches: {},
    upgradeMissions: [],
    globalBasePrices: { ...GLOBAL_BASE_PRICES },
    tradeHistory: [],
    notifications: [],
    log: [],
    lastUpdatedAt: nowIso()
  };
  state.marketEvents = getInitialMarketEvents(state);
  recomputeAllSystemPrices(state);
  fillContracts(state);
  pushLog(state, "Trading post established at Sol Nexus.");
  addToast(state, "Sol Nexus Online", "The docks are open and your first merchant ship is ready.");
  return state;
}

function getStructuralEventIntervalSeconds(sequence) {
  const span = BALANCE.STRUCTURAL_EVENT_MAX_SECONDS - BALANCE.STRUCTURAL_EVENT_MIN_SECONDS;
  const offset = Math.round(span * seededFraction(`structural-event:${sequence}`));
  return BALANCE.STRUCTURAL_EVENT_MIN_SECONDS + offset;
}

function findSystem(state, id) {
  return state.systems.find((system) => system.id === id) || null;
}

function getHomeSystem(state) {
  return findSystem(state, "sys-home");
}

function getDiscoveredSystems(state) {
  return state.systems.filter((system) => system.discovered);
}

function getRemoteSystems(state) {
  return state.systems.filter((system) => system.id !== "sys-home");
}

function getDiscoveredRemoteSystems(state) {
  return getRemoteSystems(state).filter((system) => system.discovered);
}

function getUndiscoveredSystems(state) {
  return getRemoteSystems(state).filter((system) => !system.discovered);
}

function findMerchantShip(state, shipId) {
  return state.merchantShips.find((ship) => ship.id === shipId) || null;
}

function findTradeEnvoy(state, envoyId) {
  return state.tradeEnvoys.find((envoy) => envoy.id === envoyId) || null;
}

function getIdleMerchantShips(state) {
  return state.merchantShips.filter((ship) => ship.status === "idle");
}

function getIdleTradeEnvoys(state) {
  return state.tradeEnvoys.filter((envoy) => envoy.status === "idle");
}

function syncTradeEnvoyAssignments(state) {
  const activeAssignments = new Map();
  for (const mission of state.tradeMissions) {
    if (!mission.envoyId) {
      continue;
    }
    if (!state.tradeMissionBatches[mission.batchId]) {
      continue;
    }
    activeAssignments.set(mission.envoyId, mission.batchId);
  }

  state.tradeEnvoys.forEach((envoy) => {
    const activeBatchId = activeAssignments.get(envoy.id) || null;
    envoy.status = activeBatchId ? "mission" : "idle";
    envoy.assignedBatchId = activeBatchId;
  });
}

function getShipDisplayName(ship) {
  return ship?.name || ship?.id?.toUpperCase() || "Ship";
}

function getCommoditySpecialtyMatch(envoy, commodityId) {
  return envoy && Array.isArray(envoy.specialtyCommodityIds) && envoy.specialtyCommodityIds.includes(commodityId);
}

function applyEnvoyPriceModifier(price, envoy, commodityId, mode) {
  if (!envoy || !getCommoditySpecialtyMatch(envoy, commodityId)) {
    return Math.max(1, Math.round(price));
  }
  const multiplier = mode === "sell" ? 1 + getTradeEnvoyBonusRate(envoy) : 1 - getTradeEnvoyBonusRate(envoy);
  return Math.max(1, Math.round(price * multiplier));
}

function getEnvoyMissionUnits(envoy, outboundCommodityId, returnCommodityId, outboundUnits, returnUnits) {
  if (!envoy) {
    return 0;
  }
  let total = 0;
  if (getCommoditySpecialtyMatch(envoy, outboundCommodityId)) {
    total += outboundUnits;
  }
  if (getCommoditySpecialtyMatch(envoy, returnCommodityId)) {
    total += returnUnits;
  }
  return total;
}

function getEnvoySpecialtyLabel(envoy) {
  return envoy.specialtyCommodityIds.map((id) => COMMODITY_INDEX[id].name).join(" / ");
}

function awardLevelRewards(state, previousLevel, newLevel) {
  for (let level = previousLevel + 1; level <= newLevel; level += 1) {
    if (level % 3 === 0) {
      const granted = grantNextTradeEnvoy(state);
      if (granted) {
        addToast(state, "Trade Envoy Granted", `${granted.name} joined your roster with a ${getEnvoySpecialtyLabel(granted)} specialty.`);
        pushLog(state, `${granted.name} joined your Trade Envoys roster (${getEnvoySpecialtyLabel(granted)}).`);
      } else {
        state.maxMerchantShips += 1;
        addToast(state, "Level Reward", "Envoy grants are exhausted. Your merchant ship cap increased instead.");
      }
    } else {
      state.maxMerchantShips += 1;
      addToast(state, "Ship Cap Increased", `Level ${level} unlocked room for one more merchant ship.`);
      pushLog(state, `Level ${level} increased max merchant ships to ${state.maxMerchantShips}.`);
    }
  }
}

function addReputationXp(state, amount, reason) {
  const gain = Math.max(0, Math.floor(amount));
  if (gain <= 0) {
    return;
  }
  const previousLevel = state.playerLevel;
  state.playerReputationXp += gain;
  state.playerLevel = getLevelForReputation(state.playerReputationXp);
  if (state.playerLevel > previousLevel) {
    addToast(state, "Level Up", `Your trading post reached level ${state.playerLevel}. ${reason}`);
    pushLog(state, `Trading post reached level ${state.playerLevel}.`);
    awardLevelRewards(state, previousLevel, state.playerLevel);
    state.maxMerchantShips = Math.max(state.maxMerchantShips, getDerivedMaxMerchantShips(state.playerLevel, state.merchantShips.length));
  }
}

function grantNextTradeEnvoy(state) {
  const blueprint = ENVOY_BLUEPRINTS[state.nextEnvoyGrantIndex];
  if (!blueprint) {
    return null;
  }
  const firstName = ENVOY_FIRST_NAMES[state.nextEnvoyGrantIndex];
  const lastName = ENVOY_LAST_NAMES[state.nextEnvoyGrantIndex];
  if (!firstName || !lastName) {
    return null;
  }
  const envoy = {
    id: `envoy-${state.nextEnvoyGrantIndex + 1}`,
    name: `${firstName} ${lastName}`,
    specialtyCommodityIds: [...blueprint.specialtyCommodityIds],
    xp: 0,
    status: "idle",
    assignedBatchId: null
  };
  state.tradeEnvoys.push(envoy);
  state.nextEnvoyGrantIndex += 1;
  return envoy;
}

function getContractDifficulty(system, sequence) {
  const burden = system.distance + (sequence % 3) * 4 + seededFraction(`contract-burden:${system.id}:${sequence}`) * 3;
  if (burden >= 26) return 3;
  if (burden >= 14) return 2;
  return 1;
}

function createCorporateContract(state, sequence) {
  const systems = getDiscoveredRemoteSystems(state).slice().sort((a, b) => a.distance - b.distance);
  if (systems.length === 0) {
    return null;
  }
  const system = systems[sequence % systems.length];
  const difficulty = getContractDifficulty(system, sequence);
  const commodityId = COMMODITIES[(sequence * 3 + Math.floor(seededFraction(`contract-c:${sequence}`) * COMMODITIES.length)) % COMMODITIES.length].id;
  const quantityBase = difficulty === 1 ? 30 : difficulty === 2 ? 55 : 85;
  const quantityVariance = difficulty === 1 ? 16 : difficulty === 2 ? 28 : 42;
  const targetUnits = quantityBase + Math.round(seededFraction(`contract-q:${sequence}:${system.id}`) * quantityVariance);
  const durationSeconds = Math.round(
    BALANCE.CONTRACT_BASE_DEADLINE_SECONDS[difficulty] +
    system.distance * BALANCE.CONTRACT_DEADLINE_DISTANCE_SECONDS[difficulty] +
    targetUnits * BALANCE.CONTRACT_DEADLINE_UNIT_SECONDS[difficulty]
  );
  const bounty = clampPositiveInt(system.distance * targetUnits * BALANCE.CONTRACT_BOUNTY_PER_UNIT_DISTANCE * BALANCE.CONTRACT_DIFFICULTY_MULTIPLIER[difficulty]);
  const copyIndex = sequence % CONTRACT_ISSUERS.length;
  return {
    id: `contract-${Date.now()}-${sequence}`,
    issuer: CONTRACT_ISSUERS[copyIndex],
    headline: CONTRACT_HEADLINES[sequence % CONTRACT_HEADLINES.length],
    body: CONTRACT_BODIES[sequence % CONTRACT_BODIES.length],
    difficulty,
    reputationReward: difficulty,
    systemId: system.id,
    commodityId,
    targetUnits,
    deliveredUnits: 0,
    remainingSeconds: durationSeconds,
    durationSeconds,
    bounty,
    createdAt: nowIso()
  };
}

function fillContracts(state) {
  const used = new Set((state.contracts || []).map((item) => `${item.systemId}:${item.commodityId}`));
  while (state.contracts.length < BALANCE.CONTRACT_COUNT) {
    const contract = createCorporateContract(state, state.contractSequence || 0);
    state.contractSequence = (state.contractSequence || 0) + 1;
    if (!contract) break;
    const key = `${contract.systemId}:${contract.commodityId}`;
    if (used.has(key)) {
      continue;
    }
    used.add(key);
    state.contracts.push(contract);
  }
}

function applyCorporateContractDelivery(state, systemId, commodityId, units) {
  if (units <= 0) {
    return 0;
  }
  let deliveredTotal = 0;
  const completed = [];
  for (const contract of state.contracts) {
    if (contract.systemId !== systemId || contract.commodityId !== commodityId || contract.remainingSeconds <= 0) {
      continue;
    }
    const need = Math.max(0, contract.targetUnits - contract.deliveredUnits);
    if (need <= 0) {
      continue;
    }
    const credit = Math.min(need, units - deliveredTotal);
    if (credit <= 0) {
      continue;
    }
    contract.deliveredUnits += credit;
    deliveredTotal += credit;
    if (contract.deliveredUnits >= contract.targetUnits) {
      completed.push(contract);
    }
    if (deliveredTotal >= units) {
      break;
    }
  }

  if (completed.length > 0) {
    for (const contract of completed) {
      const destination = findSystem(state, contract.systemId);
      state.credits += contract.bounty;
      addReputationXp(state, contract.reputationReward, "Corporate contracts are raising your standing.");
      addToast(state, "Contract Fulfilled", `${contract.issuer} paid ${formatCredits(contract.bounty)} for ${COMMODITY_INDEX[contract.commodityId].name} delivered to ${destination?.name || "unknown destination"}.`);
      pushLog(state, `${contract.issuer} contract fulfilled at ${destination?.name || "unknown destination"}: ${formatCredits(contract.bounty)} and ${contract.reputationReward} reputation earned.`);
    }
    const doneIds = new Set(completed.map((item) => item.id));
    state.contracts = state.contracts.filter((item) => !doneIds.has(item.id));
    fillContracts(state);
  }
  return deliveredTotal;
}

function advanceContracts(state, seconds) {
  let changed = false;
  for (const contract of state.contracts) {
    contract.remainingSeconds -= seconds;
  }
  const expired = state.contracts.filter((contract) => contract.remainingSeconds <= 0);
  if (expired.length > 0) {
    changed = true;
    for (const contract of expired) {
      const destination = findSystem(state, contract.systemId);
      pushLog(state, `${contract.issuer} contract expired for ${COMMODITY_INDEX[contract.commodityId].name} to ${destination?.name || "unknown destination"} (${contract.deliveredUnits}/${contract.targetUnits}).`);
    }
    state.contracts = state.contracts.filter((contract) => contract.remainingSeconds > 0);
    fillContracts(state);
  }
  return changed;
}

function createMarketEvent(state, sequence) {
  const systems = getDiscoveredRemoteSystems(state);
  if (systems.length === 0) {
    return null;
  }
  const system = systems[Math.floor(seededFraction(`event-system:${sequence}`) * systems.length) % systems.length];
  const commodity = COMMODITIES[Math.floor(seededFraction(`event-commodity:${sequence}`) * COMMODITIES.length) % COMMODITIES.length];
  const direction = seededFraction(`event-direction:${sequence}`) > 0.5 ? 1 : -1;
  const copyPool = MARKET_EVENT_COPY[commodity.id][direction > 0 ? "up" : "down"];
  const copy = copyPool[sequence % copyPool.length];
  return {
    id: `market-event-${sequence}`,
    systemId: system.id,
    commodityId: commodity.id,
    direction,
    headline: copy.headline,
    body: copy.body,
    remainingSeconds: BALANCE.MARKET_EVENT_DURATION_SECONDS,
    startedAt: nowIso()
  };
}

function spawnMarketEvent(state, ageSeconds = 0) {
  const sequence = state.marketEventSequence || 0;
  const event = createMarketEvent(state, sequence);
  state.marketEventSequence = sequence + 1;
  if (!event) {
    return null;
  }
  event.remainingSeconds = Math.max(0, event.remainingSeconds - Math.max(0, ageSeconds));
  return event.remainingSeconds > 0 ? event : null;
}

function normalizeMarketEvents(state) {
  const events = Array.isArray(state.marketEvents)
    ? state.marketEvents.filter((event) => event && event.remainingSeconds > 0)
    : [];
  const offset = BALANCE.MARKET_EVENT_OFFSET_SECONDS;
  const duration = BALANCE.MARKET_EVENT_DURATION_SECONDS;
  let changed = false;

  state.nextMarketEventIn = Number.isFinite(state.nextMarketEventIn)
    ? clamp(Math.floor(state.nextMarketEventIn), 1, offset)
    : offset;

  events.sort((a, b) => b.remainingSeconds - a.remainingSeconds);
  if (events.length > 2) {
    events.length = 2;
    changed = true;
  }

  while (events.length < 2) {
    const fallback = spawnMarketEvent(state);
    if (!fallback) {
      break;
    }
    events.push(fallback);
    changed = true;
  }

  if (events.length === 2) {
    events.sort((a, b) => b.remainingSeconds - a.remainingSeconds);
    const expectedOlderRemaining = state.nextMarketEventIn;
    const expectedYoungerRemaining = Math.min(duration, expectedOlderRemaining + offset);
    if (
      events[0].remainingSeconds !== expectedYoungerRemaining ||
      events[1].remainingSeconds !== expectedOlderRemaining
    ) {
      events[0].remainingSeconds = expectedYoungerRemaining;
      events[1].remainingSeconds = expectedOlderRemaining;
      changed = true;
    }
  }

  state.marketEvents = events;
  return changed;
}

function advanceMarketEvents(state, seconds) {
  let changed = false;
  state.marketEvents.forEach((event) => {
    event.remainingSeconds -= seconds;
  });
  const activeEvents = state.marketEvents.filter((event) => event.remainingSeconds > 0);
  if (activeEvents.length !== state.marketEvents.length) {
    changed = true;
    state.marketEvents = activeEvents;
  }
  state.nextMarketEventIn -= seconds;
  while (state.nextMarketEventIn <= 0) {
    const ageSeconds = Math.max(0, -state.nextMarketEventIn);
    const event = spawnMarketEvent(state, ageSeconds);
    state.nextMarketEventIn += BALANCE.MARKET_EVENT_OFFSET_SECONDS;
    if (event) {
      state.marketEvents.push(event);
      changed = true;
    }
  }
  return normalizeMarketEvents(state) || changed;
}

function createStructuralEvent(state) {
  const discovered = getDiscoveredRemoteSystems(state);
  const sequence = state.structuralEventSequence || 0;
  const systemChance = seededFraction(`structural-kind:${sequence}`);
  if (systemChance < 0.9 && discovered.length > 0) {
    const system = discovered[Math.floor(seededFraction(`structural-system:${sequence}`) * discovered.length) % discovered.length];
    const commodity = COMMODITIES[Math.floor(seededFraction(`structural-commodity:${sequence}`) * COMMODITIES.length) % COMMODITIES.length];
    const currentShift = system.permanentTierShifts[commodity.id] || 0;
    let direction = seededFraction(`structural-dir:${sequence}`) > 0.5 ? 1 : -1;
    const baseTier = system.baseTierIndex[commodity.id] ?? 2;
    if (baseTier + currentShift + direction < 0 || baseTier + currentShift + direction > 4) {
      direction *= -1;
    }
    if (baseTier + currentShift + direction < 0 || baseTier + currentShift + direction > 4) {
      direction = 0;
    }
    if (direction !== 0) {
      system.permanentTierShifts[commodity.id] = currentShift + direction;
      const copyPool = STRUCTURAL_EVENT_COPY.system[direction > 0 ? "up" : "down"];
      const copy = copyPool[sequence % copyPool.length];
      return {
        id: `struct-${sequence}`,
        type: "system",
        systemId: system.id,
        commodityId: commodity.id,
        direction,
        headline: copy.headline,
        body: copy.body,
        timestamp: nowIso()
      };
    }
  }

  const commodity = COMMODITIES[Math.floor(seededFraction(`structural-global:${sequence}`) * COMMODITIES.length) % COMMODITIES.length];
  const direction = seededFraction(`structural-global-dir:${sequence}`) > 0.5 ? 1 : -1;
  const current = state.globalBasePrices[commodity.id] || GLOBAL_BASE_PRICES[commodity.id];
  const next = Math.max(1, Math.round(current * (1 + direction * BALANCE.GLOBAL_BASE_SHIFT_PERCENT)));
  state.globalBasePrices[commodity.id] = next;
  COMMODITY_INDEX[commodity.id].basePrice = next;
  const copyPool = STRUCTURAL_EVENT_COPY.global[direction > 0 ? "up" : "down"];
  const copy = copyPool[sequence % copyPool.length];
  return {
    id: `struct-${sequence}`,
    type: "global",
    systemId: null,
    commodityId: commodity.id,
    direction,
    headline: copy.headline,
    body: copy.body,
    timestamp: nowIso()
  };
}

function advanceStructuralEvents(state, seconds) {
  let changed = false;
  state.nextStructuralEventIn -= seconds;
  while (state.nextStructuralEventIn <= 0) {
    const event = createStructuralEvent(state);
    state.structuralEventSequence = (state.structuralEventSequence || 0) + 1;
    state.nextStructuralEventIn += getStructuralEventIntervalSeconds(state.structuralEventSequence);
    if (event) {
      state.structuralHistory.unshift(event);
      state.structuralHistory = state.structuralHistory.slice(0, 80);
      addToast(state, event.type === "global" ? "Permanent Global Shift" : "Permanent Market Shift", `${event.headline}: ${COMMODITY_INDEX[event.commodityId].name}${event.systemId ? ` in ${findSystem(state, event.systemId)?.name || "unknown"}` : " across the network"}.`);
      pushLog(state, `${event.type === "global" ? "Global" : `${findSystem(state, event.systemId)?.name || "Unknown"}`} permanent shift: ${event.headline} (${COMMODITY_INDEX[event.commodityId].name}).`);
      changed = true;
    }
  }
  return changed;
}

function applyMarketPressure(system, commodityId, action) {
  if (!system || !system.marketPressure || !(commodityId in system.marketPressure)) {
    return;
  }
  const current = system.marketPressure[commodityId] || 0;
  const delta = action === "buy" ? BALANCE.MARKET_PRESSURE_STEP : -BALANCE.MARKET_PRESSURE_STEP;
  system.marketPressure[commodityId] = clamp(current + delta, -BALANCE.MARKET_PRESSURE_MAX, BALANCE.MARKET_PRESSURE_MAX);
}

function decayMarketPressure(state, seconds) {
  const factor = Math.pow(BALANCE.MARKET_PRESSURE_DECAY_PER_SECOND, seconds);
  let changed = false;
  for (const system of state.systems) {
    for (const commodity of COMMODITIES) {
      const next = (system.marketPressure[commodity.id] || 0) * factor;
      if (Math.abs(next) < 0.0001) {
        if (system.marketPressure[commodity.id] !== 0) {
          system.marketPressure[commodity.id] = 0;
          changed = true;
        }
      } else if (Math.abs(next - system.marketPressure[commodity.id]) > 0.0001) {
        system.marketPressure[commodity.id] = next;
        changed = true;
      }
    }
  }
  return changed;
}

function getRouteStats(state, system, envoy = null) {
  const home = getHomeSystem(state);
  let bestOutbound = null;
  let bestReturn = null;
  for (const commodity of COMMODITIES) {
    const homeBuy = applyEnvoyPriceModifier(home.prices[commodity.id], envoy, commodity.id, "buy");
    const destSell = applyEnvoyPriceModifier(system.prices[commodity.id], envoy, commodity.id, "sell");
    const outMargin = destSell - homeBuy;
    if (!bestOutbound || outMargin > bestOutbound.margin) {
      bestOutbound = { commodityId: commodity.id, margin: outMargin };
    }
    const destBuy = applyEnvoyPriceModifier(system.prices[commodity.id], envoy, commodity.id, "buy");
    const homeSell = applyEnvoyPriceModifier(home.prices[commodity.id], envoy, commodity.id, "sell");
    const backMargin = homeSell - destBuy;
    if (!bestReturn || backMargin > bestReturn.margin) {
      bestReturn = { commodityId: commodity.id, margin: backMargin };
    }
  }
  const roundTripProfit = (bestOutbound.margin + bestReturn.margin) * BALANCE.BASE_CARGO_SIZE;
  const profitPerDistance = roundTripProfit / Math.max(1, system.distance);
  return { bestOutbound, bestReturn, roundTripProfit, profitPerDistance };
}

function getFeaturedSystems(state) {
  const routes = getDiscoveredRemoteSystems(state).map((system) => ({ system, ...getRouteStats(state, system) }));
  if (routes.length === 0) {
    return [];
  }
  const byProfit = routes.slice().sort((a, b) => b.roundTripProfit - a.roundTripProfit || a.system.distance - b.system.distance);
  const byEfficiency = routes.slice().sort((a, b) => b.profitPerDistance - a.profitPerDistance || a.system.distance - b.system.distance);
  const first = byProfit[0];
  const second = byEfficiency.find((item) => item.system.id !== first.system.id) || byEfficiency[0];
  return [first, second].filter(Boolean);
}

function createTradeLoadPlan(state, ships, system, outboundCommodityId, returnCommodityId, envoy, availableCredits, allowPartial) {
  const home = getHomeSystem(state);
  const outboundBuyPrice = applyEnvoyPriceModifier(home.prices[outboundCommodityId], envoy, outboundCommodityId, "buy");
  const outboundSellEstimate = applyEnvoyPriceModifier(system.prices[outboundCommodityId], envoy, outboundCommodityId, "sell");
  const returnBuyEstimate = applyEnvoyPriceModifier(system.prices[returnCommodityId], envoy, returnCommodityId, "buy");
  const returnSellEstimate = applyEnvoyPriceModifier(home.prices[returnCommodityId], envoy, returnCommodityId, "sell");
  const escrowPerUnit = getTradeEscrowPerUnit(outboundSellEstimate, returnBuyEstimate);
  const perUnitUpfront = outboundBuyPrice + escrowPerUnit;
  const totalCapacity = ships.reduce((sum, ship) => sum + getShipCargoUnits(ship), 0);
  const affordableUnits = perUnitUpfront > 0 ? Math.min(totalCapacity, Math.floor(availableCredits / perUnitUpfront)) : totalCapacity;
  const targetUnits = allowPartial ? affordableUnits : totalCapacity;

  let remainingUnits = targetUnits;
  const plans = [];
  ships.forEach((ship) => {
    const capacity = getShipCargoUnits(ship);
    const units = Math.min(capacity, remainingUnits);
    remainingUnits -= units;
    if (units <= 0) {
      return;
    }
    const outboundCost = outboundBuyPrice * units;
    const estimatedOutboundRevenue = outboundSellEstimate * units;
    const estimatedReturnCost = returnBuyEstimate * units;
    const escrowReserved = escrowPerUnit * units;
    const durationSeconds = getTradeDurationForShip(system.distance, ship);
    plans.push({
      ship,
      units,
      capacity,
      outboundCost,
      estimatedOutboundRevenue,
      estimatedReturnCost,
      escrowReserved,
      durationSeconds,
      upfrontCost: outboundCost + escrowReserved,
      estimatedProfit: (outboundSellEstimate - outboundBuyPrice + returnSellEstimate - returnBuyEstimate) * units
    });
  });

  const totalUpfrontCost = plans.reduce((sum, plan) => sum + plan.upfrontCost, 0);
  const totalEstimatedOutboundRevenue = plans.reduce((sum, plan) => sum + plan.estimatedOutboundRevenue, 0);
  const totalEstimatedReturnCost = plans.reduce((sum, plan) => sum + plan.estimatedReturnCost, 0);
  const totalEstimatedProfit = plans.reduce((sum, plan) => sum + plan.estimatedProfit, 0);

  return {
    plans,
    totalCapacity,
    affordableUnits,
    loadedUnits: plans.reduce((sum, plan) => sum + plan.units, 0),
    totalUpfrontCost,
    totalEstimatedOutboundRevenue,
    totalEstimatedReturnCost,
    totalEstimatedProfit,
    outboundBuyPrice,
    outboundSellEstimate,
    returnBuyEstimate,
    returnSellEstimate
  };
}

function getTradePlanFinanceSummary(plan, availableCredits) {
  const borrowedAmount = Math.max(0, (plan?.totalUpfrontCost || 0) - Math.max(0, availableCredits || 0));
  const allocations = (plan?.plans || []).map(() => ({
    borrowedAmount: 0,
    financeInterest: 0,
    financeRepayment: 0
  }));
  if (!plan || borrowedAmount <= 0 || allocations.length === 0) {
    return {
      borrowedAmount,
      totalInterest: 0,
      allocations
    };
  }

  const totalUpfront = plan.totalUpfrontCost || 1;
  let totalInterest = 0;
  allocations.forEach((allocation, index) => {
    const borrowed = Math.round((borrowedAmount * plan.plans[index].upfrontCost) / totalUpfront);
    allocation.borrowedAmount = borrowed;
    allocation.financeInterest = getMissionFinanceInterest(borrowed, plan.plans[index].durationSeconds);
    allocation.financeRepayment = allocation.borrowedAmount + allocation.financeInterest;
    totalInterest += allocation.financeInterest;
  });

  const assignedBorrowed = allocations.reduce((sum, allocation) => sum + allocation.borrowedAmount, 0);
  const delta = borrowedAmount - assignedBorrowed;
  if (delta !== 0) {
    const last = allocations[allocations.length - 1];
    totalInterest -= last.financeInterest;
    last.borrowedAmount += delta;
    last.financeInterest = getMissionFinanceInterest(last.borrowedAmount, plan.plans[plan.plans.length - 1].durationSeconds);
    last.financeRepayment = last.borrowedAmount + last.financeInterest;
    totalInterest += last.financeInterest;
  }

  return {
    borrowedAmount,
    totalInterest,
    allocations
  };
}

function launchTradeMissionBatch(state, args) {
  const {
    systemId,
    outboundCommodityId,
    returnCommodityId,
    shipIds,
    envoyId,
    mode
  } = args;
  const system = findSystem(state, systemId);
  if (!system || !system.discovered || system.id === "sys-home") {
    return { ok: false, message: "Invalid destination." };
  }
  const ships = shipIds.map((id) => findMerchantShip(state, id)).filter(Boolean);
  if (ships.length === 0) {
    return { ok: false, message: "Select at least one idle ship." };
  }
  if (ships.some((ship) => ship.status !== "idle")) {
    return { ok: false, message: "All selected ships must be idle." };
  }
  const envoy = envoyId ? findTradeEnvoy(state, envoyId) : null;
  if (envoy && envoy.status !== "idle") {
    return { ok: false, message: "That Trade Envoy is already on assignment." };
  }

  const isPartial = mode === "partial";
  const useFinancing = mode === "finance";
  const plan = createTradeLoadPlan(state, ships, system, outboundCommodityId, returnCommodityId, envoy, state.credits, isPartial);
  const financeSummary = getTradePlanFinanceSummary(plan, state.credits);
  if (plan.loadedUnits <= 0) {
    return { ok: false, message: "Not enough Credits to fund any cargo for this mission." };
  }
  if (!useFinancing && !isPartial && plan.totalUpfrontCost > state.credits) {
    return { ok: false, message: "Not enough Credits for the full mission." };
  }

  const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const borrowedAmount = useFinancing ? financeSummary.borrowedAmount : 0;
  if (useFinancing) {
    state.credits += borrowedAmount;
  }
  state.credits -= plan.totalUpfrontCost;
  state.escrowCredits += plansEscrow(plan.plans);

  let totalFinanceInterest = 0;
  let batchDuration = 0;
  const created = [];
  for (let index = 0; index < plan.plans.length; index += 1) {
    const item = plan.plans[index];
    const ship = item.ship;
    ship.status = "mission";
    applyMarketPressure(getHomeSystem(state), outboundCommodityId, "buy");
    const mission = {
      id: `trade-${Date.now()}-${index}`,
      batchId,
      shipId: ship.id,
      destinationSystemId: systemId,
      outboundCommodityId,
      returnCommodityId,
      envoyId: envoy?.id || null,
      units: item.units,
      capacity: item.capacity,
      outboundCost: item.outboundCost,
      escrowReserved: item.escrowReserved,
      estimatedOutboundRevenue: item.estimatedOutboundRevenue,
      estimatedReturnCost: item.estimatedReturnCost,
      borrowedAmount: 0,
      financeInterest: 0,
      financeRepayment: 0,
      actualOutboundRevenue: 0,
      actualReturnCost: 0,
      returnUnits: 0,
      arrivalResolved: false,
      remainingSeconds: item.durationSeconds,
      durationSeconds: item.durationSeconds,
      createdAt: nowIso()
    };
    created.push(mission);
    batchDuration = Math.max(batchDuration, item.durationSeconds);
  }

  if (borrowedAmount > 0 && created.length > 0) {
    created.forEach((mission, index) => {
      const allocation = financeSummary.allocations[index] || { borrowedAmount: 0, financeInterest: 0, financeRepayment: 0 };
      mission.borrowedAmount = allocation.borrowedAmount;
      mission.financeInterest = allocation.financeInterest;
      mission.financeRepayment = allocation.financeRepayment;
      totalFinanceInterest += mission.financeInterest;
    });
  }

  state.tradeMissions.push(...created);
  state.tradeMissionBatches[batchId] = {
    id: batchId,
    destinationSystemId: systemId,
    outboundCommodityId,
    returnCommodityId,
    envoyId: envoy?.id || null,
    shipIds: created.map((mission) => mission.shipId),
    totalShips: created.length,
    completedShips: 0,
    totalProfit: 0,
    totalRevenue: 0,
    totalFinanceInterest: 0,
    totalFinanceRepayment: 0,
    totalOutboundUnits: created.reduce((sum, mission) => sum + mission.units, 0),
    totalReturnUnits: 0,
    partialReturnShips: 0,
    contractDeliveryUnits: 0,
    envoyCommodityUnits: 0,
    launchedAt: nowIso(),
    estimatedProfitAfterInterest: plan.totalEstimatedProfit - totalFinanceInterest,
    durationSeconds: batchDuration,
    financed: borrowedAmount > 0
  };

  if (envoy) {
    envoy.status = "mission";
    envoy.assignedBatchId = batchId;
  }

  recomputeAllSystemPrices(state);
  pushLog(state, `Trade mission launched to ${system.name}: ${created.length} ship${created.length > 1 ? "s" : ""}, ${COMMODITY_INDEX[outboundCommodityId].name} out, ${COMMODITY_INDEX[returnCommodityId].name} back${useFinancing ? `, financed ${formatCredits(borrowedAmount)}` : isPartial ? ", partial load" : ""}.`);
  return { ok: true };
}

function plansEscrow(plans) {
  return plans.reduce((sum, plan) => sum + plan.escrowReserved, 0);
}

function resolveTradeMissionArrival(state, mission) {
  if (mission.arrivalResolved) {
    return;
  }
  const destination = findSystem(state, mission.destinationSystemId);
  const envoy = mission.envoyId ? findTradeEnvoy(state, mission.envoyId) : null;
  if (!destination) {
    mission.arrivalResolved = true;
    return;
  }
  const outboundSellPrice = applyEnvoyPriceModifier(destination.prices[mission.outboundCommodityId], envoy, mission.outboundCommodityId, "sell");
  const revenue = outboundSellPrice * mission.units;
  state.credits += revenue;
  mission.actualOutboundRevenue = revenue;
  applyMarketPressure(destination, mission.outboundCommodityId, "sell");
  const delivered = applyCorporateContractDelivery(state, destination.id, mission.outboundCommodityId, mission.units);
  const batch = state.tradeMissionBatches[mission.batchId];
  if (batch) {
    batch.contractDeliveryUnits += delivered;
  }

  state.credits += mission.escrowReserved;
  state.escrowCredits = Math.max(0, state.escrowCredits - mission.escrowReserved);

  const returnBuyPrice = applyEnvoyPriceModifier(destination.prices[mission.returnCommodityId], envoy, mission.returnCommodityId, "buy");
  const returnUnits = Math.min(mission.units, Math.floor(state.credits / Math.max(1, returnBuyPrice)));
  const returnCost = returnBuyPrice * returnUnits;
  state.credits -= returnCost;
  mission.actualReturnCost = returnCost;
  mission.returnUnits = returnUnits;
  mission.arrivalResolved = true;
  if (returnUnits > 0) {
    applyMarketPressure(destination, mission.returnCommodityId, "buy");
  }
  recomputeAllSystemPrices(state);
}

function finalizeTradeMission(state, mission) {
  const ship = findMerchantShip(state, mission.shipId);
  const home = getHomeSystem(state);
  const destination = findSystem(state, mission.destinationSystemId);
  const envoy = mission.envoyId ? findTradeEnvoy(state, mission.envoyId) : null;
  if (ship) {
    ship.status = "idle";
  }

  const returnSellPrice = applyEnvoyPriceModifier(home.prices[mission.returnCommodityId], envoy, mission.returnCommodityId, "sell");
  const returnRevenue = returnSellPrice * (mission.returnUnits || 0);
  state.credits += returnRevenue;
  if (mission.financeRepayment > 0) {
    state.credits -= mission.financeRepayment;
  }
  if ((mission.returnUnits || 0) > 0) {
    applyMarketPressure(home, mission.returnCommodityId, "sell");
  }
  recomputeAllSystemPrices(state);

  const totalRevenue = (mission.actualOutboundRevenue || 0) + returnRevenue;
  const totalCost = (mission.outboundCost || 0) + (mission.actualReturnCost || 0);
  const profit = totalRevenue - totalCost - (mission.financeInterest || 0);
  const batch = state.tradeMissionBatches[mission.batchId];
  if (batch) {
    batch.completedShips += 1;
    batch.totalProfit += profit;
    batch.totalRevenue += totalRevenue;
    batch.totalFinanceInterest += mission.financeInterest || 0;
    batch.totalFinanceRepayment += mission.financeRepayment || 0;
    batch.totalReturnUnits += mission.returnUnits || 0;
    if ((mission.returnUnits || 0) < mission.units) {
      batch.partialReturnShips += 1;
    }
    batch.envoyCommodityUnits += getEnvoyMissionUnits(envoy, mission.outboundCommodityId, mission.returnCommodityId, mission.units, mission.returnUnits || 0);
  }
}

function completeBatchIfReady(state, batchId) {
  const batch = state.tradeMissionBatches[batchId];
  if (!batch || batch.completedShips < batch.totalShips) {
    return;
  }
  const envoy = batch.envoyId ? findTradeEnvoy(state, batch.envoyId) : null;
  let envoySummary = "";
  if (envoy) {
    if (batch.envoyCommodityUnits > 0) {
      const xpGain = Math.max(1, Math.floor(Math.sqrt(batch.envoyCommodityUnits)));
      const previousLevel = getTradeEnvoyLevel(envoy.xp);
      envoy.xp += xpGain;
      const newLevel = getTradeEnvoyLevel(envoy.xp);
      envoySummary = ` ${envoy.name} gained ${xpGain} envoy XP${newLevel > previousLevel ? ` and reached level ${newLevel}` : ""}.`;
    }
    envoy.status = "idle";
    envoy.assignedBatchId = null;
  }
  const system = findSystem(state, batch.destinationSystemId);
  const sign = batch.totalProfit >= 0 ? "+" : "";
  pushLog(state, `Trade mission completed at ${system?.name || "unknown destination"}: ${batch.totalShips} ship${batch.totalShips > 1 ? "s" : ""}, ${sign}${formatCredits(batch.totalProfit)}${batch.totalFinanceRepayment > 0 ? ` after repaying ${formatCredits(batch.totalFinanceRepayment)} (${formatCredits(batch.totalFinanceInterest)} interest)` : ""}.${envoySummary}`);
  state.tradeHistory.unshift({
    id: `history-${Date.now()}-${Math.random()}`,
    timestamp: nowIso(),
    systemId: batch.destinationSystemId,
    durationSeconds: batch.durationSeconds,
    shipsUsed: batch.totalShips,
    outboundCommodityId: batch.outboundCommodityId,
    returnCommodityId: batch.returnCommodityId,
    outboundUnits: batch.totalOutboundUnits,
    returnUnits: batch.totalReturnUnits,
    financed: batch.financed,
    profit: batch.totalProfit,
    revenue: batch.totalRevenue,
    envoyId: batch.envoyId,
    contractDeliveryUnits: batch.contractDeliveryUnits
  });
  state.tradeHistory = state.tradeHistory.slice(0, BALANCE.MAX_TRADE_HISTORY);
  delete state.tradeMissionBatches[batchId];
  syncTradeEnvoyAssignments(state);
}

function startShipUpgrade(state, shipId, type) {
  const ship = findMerchantShip(state, shipId);
  if (!ship) {
    return { ok: false, message: "Ship not found." };
  }
  if (ship.status !== "idle") {
    return { ok: false, message: "Ship must be idle to begin an upgrade." };
  }
  const cost = getUpgradeCost(ship, type);
  if (state.credits < cost) {
    return { ok: false, message: `Need ${formatCredits(cost)}.` };
  }
  state.credits -= cost;
  ship.status = "upgrading";
  state.upgradeMissions.push({
    id: `upgrade-${Date.now()}-${Math.random()}`,
    shipId,
    upgradeType: type,
    remainingSeconds: getUpgradeDuration(ship, type),
    durationSeconds: getUpgradeDuration(ship, type),
    createdAt: nowIso()
  });
  pushLog(state, `${getShipDisplayName(ship)} started a ${type} upgrade.`);
  return { ok: true };
}

function resolveUpgradeMission(state, mission) {
  const ship = findMerchantShip(state, mission.shipId);
  if (!ship) {
    return;
  }
  if (mission.upgradeType === "cargo") {
    ship.cargoLevel += 1;
  } else {
    ship.speedLevel += 1;
  }
  ship.status = "idle";
  pushLog(state, `${getShipDisplayName(ship)} completed a ${mission.upgradeType} upgrade.`);
}

function buyMerchantShip(state) {
  if (state.merchantShips.length >= state.maxMerchantShips) {
    return { ok: false, message: `Ship cap reached (${state.maxMerchantShips}).` };
  }
  const cost = getMerchantShipCostForCount(state.merchantShips.length);
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
  pushLog(state, `Purchased merchant ship M-${newIndex}. Fleet size: ${state.merchantShips.length}/${state.maxMerchantShips}.`);
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
  pushLog(state, "Purchased scouting ship.");
  return { ok: true };
}

function launchScoutMission(state) {
  if (!state.scoutShip.owned) {
    return { ok: false, message: "Purchase the scouting ship first." };
  }
  if (state.scoutShip.status !== "idle") {
    return { ok: false, message: "Scout ship is already on assignment." };
  }
  const target = getUndiscoveredSystems(state).sort((a, b) => a.distance - b.distance)[0];
  if (!target) {
    return { ok: false, message: "All systems have been discovered." };
  }
  const duration = getScoutMissionDuration(state);
  state.scoutMission = {
    id: `scout-${Date.now()}`,
    targetSystemId: target.id,
    remainingSeconds: duration,
    durationSeconds: duration,
    createdAt: nowIso()
  };
  state.scoutShip.status = "mission";
  state.scoutMissionsLaunched += 1;
  pushLog(state, `Scout mission launched toward ${target.name}.`);
  return { ok: true };
}

function resolveScoutMission(state) {
  const mission = state.scoutMission;
  const target = mission ? findSystem(state, mission.targetSystemId) : null;
  if (target) {
    target.discovered = true;
    fillContracts(state);
    const highs = target.typeHigh.map((id) => COMMODITY_INDEX[id].name).join(", ") || "None";
    const lows = target.typeLow.map((id) => COMMODITY_INDEX[id].name).join(", ") || "None";
    addToast(state, "System Discovered", `${target.name} charted at ${formatDistanceLy(target.distance)}. High: ${highs}. Low: ${lows}.`);
    pushLog(state, `Scout mission complete. ${target.name} discovered at ${formatDistanceLy(target.distance)}. High: ${highs}. Low: ${lows}.`);
  } else {
    pushLog(state, "Scout mission completed, but the target data was unavailable.");
  }
  state.scoutMission = null;
  state.scoutShip.status = state.scoutShip.owned ? "idle" : "none";
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
    return { ok: false, message: `Ship name must be ${SHIP_NAME_MAX_LENGTH} characters or fewer.` };
  }
  if (!SHIP_NAME_COLORS.includes(color)) {
    return { ok: false, message: "Invalid ship color." };
  }
  ship.name = trimmed;
  ship.nameColor = color;
  pushLog(state, `${ship.id.toUpperCase()} updated to callsign "${ship.name}".`);
  return { ok: true };
}

function advanceNotifications(state, seconds) {
  state.notifications.forEach((notification) => {
    notification.remainingSeconds -= seconds;
  });
  state.notifications = state.notifications.filter((notification) => notification.remainingSeconds > 0);
}

function advanceGameBySeconds(state, seconds) {
  const elapsed = Math.max(0, Math.floor(seconds || 0));
  if (elapsed <= 0) {
    return { majorStateChange: false, timersAdvanced: false };
  }

  let majorStateChange = false;
  let timersAdvanced = false;

  advanceNotifications(state, elapsed);
  if (decayMarketPressure(state, elapsed)) {
    recomputeAllSystemPrices(state);
    timersAdvanced = true;
  }
  if (advanceMarketEvents(state, elapsed)) {
    recomputeAllSystemPrices(state);
    majorStateChange = true;
  }
  if (advanceStructuralEvents(state, elapsed)) {
    recomputeAllSystemPrices(state);
    majorStateChange = true;
  }
  if (advanceContracts(state, elapsed)) {
    majorStateChange = true;
  }

  state.tradeMissions.forEach((mission) => {
    mission.remainingSeconds -= elapsed;
    timersAdvanced = true;
    const half = Math.max(1, Math.floor(mission.durationSeconds / 2));
    if (!mission.arrivalResolved && mission.remainingSeconds <= half) {
      resolveTradeMissionArrival(state, mission);
      majorStateChange = true;
    }
  });

  const completedMissions = state.tradeMissions.filter((mission) => mission.remainingSeconds <= 0);
  if (completedMissions.length > 0) {
    state.tradeMissions = state.tradeMissions.filter((mission) => mission.remainingSeconds > 0);
    completedMissions.forEach((mission) => {
      finalizeTradeMission(state, mission);
      completeBatchIfReady(state, mission.batchId);
    });
    majorStateChange = true;
  }

  if (state.scoutMission) {
    state.scoutMission.remainingSeconds -= elapsed;
    timersAdvanced = true;
    if (state.scoutMission.remainingSeconds <= 0) {
      resolveScoutMission(state);
      majorStateChange = true;
    }
  }

  state.upgradeMissions.forEach((mission) => {
    mission.remainingSeconds -= elapsed;
    timersAdvanced = true;
  });
  const completedUpgrades = state.upgradeMissions.filter((mission) => mission.remainingSeconds <= 0);
  if (completedUpgrades.length > 0) {
    state.upgradeMissions = state.upgradeMissions.filter((mission) => mission.remainingSeconds > 0);
    completedUpgrades.forEach((mission) => resolveUpgradeMission(state, mission));
    majorStateChange = true;
  }

  return { majorStateChange, timersAdvanced };
}

function applyOfflineProgress(state) {
  const lastUpdated = Date.parse(state.lastUpdatedAt || nowIso());
  if (!Number.isFinite(lastUpdated)) {
    return null;
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
  if (elapsed <= 0) {
    return null;
  }
  const creditsBefore = state.credits;
  const discoveredBefore = getDiscoveredSystems(state).length;
  const tradesBefore = state.tradeHistory.length;
  const result = advanceGameBySeconds(state, elapsed);
  return {
    elapsedSeconds: elapsed,
    creditsDelta: state.credits - creditsBefore,
    discoveredDelta: getDiscoveredSystems(state).length - discoveredBefore,
    completedTradeMissions: Math.max(0, state.tradeHistory.length - tradesBefore),
    result
  };
}

function normalizeLoadedState(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const state = createNewGameState();
  state.version = 2;
  state.credits = Number.isFinite(raw.credits) ? raw.credits : state.credits;
  state.escrowCredits = Number.isFinite(raw.escrowCredits) ? raw.escrowCredits : 0;
  state.playerReputationXp = Number.isFinite(raw.playerReputationXp)
    ? Math.max(0, Math.floor(raw.playerReputationXp))
    : Number.isFinite(raw.reputationPoints)
      ? Math.max(0, Math.floor(raw.reputationPoints))
      : 0;
  state.playerLevel = getLevelForReputation(state.playerReputationXp);

  state.systems = Array.isArray(raw.systems) && raw.systems.length > 0
    ? raw.systems.map((system, index) => {
        const fallbackType = SYSTEM_TYPES[index % SYSTEM_TYPES.length];
        const high = Array.isArray(system.typeHigh) ? system.typeHigh : fallbackType.high;
        const low = Array.isArray(system.typeLow) ? system.typeLow : fallbackType.low;
        const profile = createSystemPriceProfile(system.name || `System ${index + 1}`, { high, low }, system.id === "sys-home");
        return {
          id: system.id || `sys-${index}`,
          name: system.name || `System ${index + 1}`,
          discovered: Boolean(system.discovered || system.id === "sys-home"),
          distance: Number.isFinite(system.distance) ? Number(system.distance) : generateSystemDistanceLy(system.name || `System ${index + 1}`, index),
          typeHigh: [...high],
          typeLow: [...low],
          baseTierIndex: system.baseTierIndex || profile.baseTierIndex,
          priceBias: system.priceBias || profile.priceBias,
          permanentTierShifts: system.permanentTierShifts || createZeroShiftMap(),
          marketPressure: system.marketPressure || createZeroPressureMap(),
          prices: {}
        };
      })
    : state.systems;

  state.globalBasePrices = { ...GLOBAL_BASE_PRICES, ...(raw.globalBasePrices || {}) };
  for (const commodity of COMMODITIES) {
    COMMODITY_INDEX[commodity.id].basePrice = state.globalBasePrices[commodity.id] || GLOBAL_BASE_PRICES[commodity.id];
  }
  recomputeAllSystemPrices(state);

  state.merchantShips = Array.isArray(raw.merchantShips) && raw.merchantShips.length > 0
    ? raw.merchantShips.map((ship, index) => ({
        id: ship.id || `m-${index + 1}`,
        name: ship.name || `Merchant ${index + 1}`,
        nameColor: SHIP_NAME_COLORS.includes(ship.nameColor) ? ship.nameColor : SHIP_NAME_COLORS[index % SHIP_NAME_COLORS.length],
        cargoLevel: Number.isFinite(ship.cargoLevel) ? Math.max(0, Math.floor(ship.cargoLevel)) : 0,
        speedLevel: Number.isFinite(ship.speedLevel) ? Math.max(0, Math.floor(ship.speedLevel)) : 0,
        status: "idle"
      }))
    : state.merchantShips;

  state.maxMerchantShips = Number.isFinite(raw.maxMerchantShips)
    ? Math.max(raw.maxMerchantShips, state.merchantShips.length)
    : getDerivedMaxMerchantShips(state.playerLevel, state.merchantShips.length);

  state.scoutShip = {
    owned: Boolean(raw.scoutShip?.owned),
    status: Boolean(raw.scoutShip?.owned) ? "idle" : "none"
  };
  state.scoutMission = raw.scoutMission ? {
    id: raw.scoutMission.id || `scout-${Date.now()}`,
    targetSystemId: raw.scoutMission.targetSystemId,
    remainingSeconds: Math.max(0, Math.floor(raw.scoutMission.remainingSeconds || 0)),
    durationSeconds: Math.max(1, Math.floor(raw.scoutMission.durationSeconds || 1)),
    createdAt: raw.scoutMission.createdAt || nowIso()
  } : null;
  if (state.scoutMission) {
    state.scoutShip.status = "mission";
  }
  state.scoutMissionsLaunched = Number.isFinite(raw.scoutMissionsLaunched) ? Math.max(0, raw.scoutMissionsLaunched) : 0;

  state.marketEvents = Array.isArray(raw.marketEvents)
    ? raw.marketEvents.map((event, index) => ({
        id: event.id || `market-event-${index}`,
        systemId: event.systemId,
        commodityId: event.commodityId,
        direction: event.direction > 0 ? 1 : -1,
        headline: event.headline || "Market Shift",
        body: event.body || "A local market shock is moving prices.",
        remainingSeconds: Math.max(1, Math.floor(event.remainingSeconds || BALANCE.MARKET_EVENT_DURATION_SECONDS)),
        startedAt: event.startedAt || nowIso()
      }))
    : getInitialMarketEvents(state);
  if (state.marketEvents.length === 0) {
    state.marketEvents = getInitialMarketEvents(state);
  }
  state.marketEventSequence = Number.isFinite(raw.marketEventSequence) ? raw.marketEventSequence : state.marketEvents.length;
  state.nextMarketEventIn = Number.isFinite(raw.nextMarketEventIn) ? Math.max(1, raw.nextMarketEventIn) : BALANCE.MARKET_EVENT_OFFSET_SECONDS;
  normalizeMarketEvents(state);
  state.nextStructuralEventIn = Number.isFinite(raw.nextStructuralEventIn)
    ? Math.max(1, raw.nextStructuralEventIn)
    : getStructuralEventIntervalSeconds(raw.structuralEventSequence || 0);
  state.structuralEventSequence = Number.isFinite(raw.structuralEventSequence) ? raw.structuralEventSequence : 0;
  state.structuralHistory = Array.isArray(raw.structuralHistory) ? raw.structuralHistory : [];

  state.contracts = Array.isArray(raw.contracts || raw.corporateContracts)
    ? (raw.contracts || raw.corporateContracts).map((contract, index) => ({
        id: contract.id || `contract-${index}`,
        issuer: String(contract.issuer || "Corporate Board"),
        headline: String(contract.headline || "Priority Requisition"),
        body: String(contract.body || ""),
        difficulty: Number.isFinite(contract.difficulty)
          ? clamp(Math.floor(contract.difficulty), 1, 3)
          : clamp(Math.floor(contract.reputationReward || 1), 1, 3),
        reputationReward: Number.isFinite(contract.reputationReward)
          ? clamp(Math.floor(contract.reputationReward), 1, 3)
          : clamp(Math.floor(contract.difficulty || 1), 1, 3),
        systemId: contract.systemId,
        commodityId: contract.commodityId || COMMODITIES[0].id,
        targetUnits: Math.max(1, Math.floor(contract.targetUnits || 1)),
        deliveredUnits: Math.max(0, Math.floor(contract.deliveredUnits || 0)),
        remainingSeconds: Math.max(1, Math.floor(contract.remainingSeconds || 1)),
        durationSeconds: Math.max(1, Math.floor(contract.durationSeconds || 1)),
        bounty: Math.max(1, Math.round(contract.bounty || 1)),
        createdAt: contract.createdAt || nowIso()
      }))
    : [];
  state.contractSequence = Number.isFinite(raw.contractSequence) ? raw.contractSequence : 0;
  fillContracts(state);

  state.tradeEnvoys = Array.isArray(raw.tradeEnvoys)
    ? raw.tradeEnvoys.map((envoy, index) => ({
        id: envoy.id || `envoy-${index + 1}`,
        name: envoy.name || `${ENVOY_FIRST_NAMES[index]} ${ENVOY_LAST_NAMES[index]}`,
        specialtyCommodityIds: Array.isArray(envoy.specialtyCommodityIds)
          ? envoy.specialtyCommodityIds
          : envoy.commodityId
            ? [envoy.commodityId]
            : [COMMODITIES[0].id],
        xp: Math.max(0, Math.floor(envoy.xp || 0)),
        status: "idle",
        assignedBatchId: envoy.assignedBatchId || null
      }))
    : [];
  state.nextEnvoyGrantIndex = Number.isFinite(raw.nextEnvoyGrantIndex)
    ? raw.nextEnvoyGrantIndex
    : state.tradeEnvoys.length;

  state.tradeMissions = Array.isArray(raw.tradeMissions)
    ? raw.tradeMissions.map((mission, index) => ({
        id: mission.id || `trade-${index}`,
        batchId: mission.batchId || mission.id || `batch-legacy-${index}`,
        shipId: mission.shipId,
        destinationSystemId: mission.destinationSystemId,
        outboundCommodityId: mission.outboundCommodityId || mission.commodityId || COMMODITIES[0].id,
        returnCommodityId: mission.returnCommodityId || COMMODITIES[1].id,
        envoyId: mission.envoyId || null,
        units: Math.max(1, Math.floor(mission.units || 1)),
        capacity: Math.max(1, Math.floor(mission.capacity || mission.units || 1)),
        outboundCost: Math.max(0, Math.round(mission.outboundCost || (mission.buyPrice || 0) * (mission.units || 0))),
        escrowReserved: Math.max(0, Math.round(mission.escrowReserved || mission.returnEscrow || 0)),
        estimatedOutboundRevenue: Math.max(0, Math.round(mission.estimatedOutboundRevenue || mission.sellPrice * (mission.units || 0) || 0)),
        estimatedReturnCost: Math.max(0, Math.round(mission.estimatedReturnCost || 0)),
        borrowedAmount: Math.max(0, Math.round(mission.borrowedAmount || 0)),
        financeInterest: Math.max(0, Math.round(mission.financeInterest || 0)),
        financeRepayment: Math.max(0, Math.round(mission.financeRepayment || 0)),
        actualOutboundRevenue: Math.max(0, Math.round(mission.actualOutboundRevenue || 0)),
        actualReturnCost: Math.max(0, Math.round(mission.actualReturnCost || 0)),
        returnUnits: Math.max(0, Math.floor(mission.returnUnits || 0)),
        arrivalResolved: Boolean(mission.arrivalResolved),
        remainingSeconds: Math.max(0, Math.floor(mission.remainingSeconds || 0)),
        durationSeconds: Math.max(1, Math.floor(mission.durationSeconds || 1)),
        createdAt: mission.createdAt || nowIso()
      }))
    : [];

  state.tradeMissionBatches = raw.tradeMissionBatches || {};
  for (const mission of state.tradeMissions) {
    const ship = findMerchantShip(state, mission.shipId);
    if (ship) {
      ship.status = "mission";
    }
    if (!state.tradeMissionBatches[mission.batchId]) {
      state.tradeMissionBatches[mission.batchId] = {
        id: mission.batchId,
        destinationSystemId: mission.destinationSystemId,
        outboundCommodityId: mission.outboundCommodityId,
        returnCommodityId: mission.returnCommodityId,
        envoyId: mission.envoyId || null,
        shipIds: [mission.shipId],
        totalShips: 1,
        completedShips: 0,
        totalProfit: 0,
        totalRevenue: 0,
        totalFinanceInterest: 0,
        totalFinanceRepayment: 0,
        totalOutboundUnits: mission.units,
        totalReturnUnits: 0,
        partialReturnShips: 0,
        contractDeliveryUnits: 0,
        envoyCommodityUnits: 0,
        launchedAt: mission.createdAt,
        estimatedProfitAfterInterest: 0,
        durationSeconds: mission.durationSeconds,
        financed: mission.borrowedAmount > 0
      };
    } else {
      state.tradeMissionBatches[mission.batchId].shipIds.push(mission.shipId);
      state.tradeMissionBatches[mission.batchId].totalShips += 1;
      state.tradeMissionBatches[mission.batchId].totalOutboundUnits += mission.units;
      state.tradeMissionBatches[mission.batchId].durationSeconds = Math.max(state.tradeMissionBatches[mission.batchId].durationSeconds, mission.durationSeconds);
    }
  }

  syncTradeEnvoyAssignments(state);

  state.upgradeMissions = Array.isArray(raw.upgradeMissions)
    ? raw.upgradeMissions.map((mission, index) => ({
        id: mission.id || `upgrade-${index}`,
        shipId: mission.shipId,
        upgradeType: mission.upgradeType === "speed" ? "speed" : "cargo",
        remainingSeconds: Math.max(1, Math.floor(mission.remainingSeconds || 1)),
        durationSeconds: Math.max(1, Math.floor(mission.durationSeconds || 1)),
        createdAt: mission.createdAt || nowIso()
      }))
    : [];
  state.upgradeMissions.forEach((mission) => {
    const ship = findMerchantShip(state, mission.shipId);
    if (ship && ship.status === "idle") {
      ship.status = "upgrading";
    }
  });

  state.tradeHistory = Array.isArray(raw.tradeHistory) ? raw.tradeHistory : [];
  state.notifications = [];
  state.log = Array.isArray(raw.log) ? raw.log.slice(0, BALANCE.MAX_LOG_ENTRIES) : [];
  state.lastUpdatedAt = raw.lastUpdatedAt || nowIso();
  return state;
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeLoadedState(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to load save", error);
    return null;
  }
}

function saveGameState(state) {
  state.lastUpdatedAt = nowIso();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const dom = {
  headerStats: document.getElementById("headerStats"),
  hubLocations: document.getElementById("hubLocations"),
  toastStack: document.getElementById("toastStack"),
  openHelpBtn: document.getElementById("openHelpBtn"),
  helpModal: document.getElementById("helpModal"),
  helpContent: document.getElementById("helpContent"),
  closeHelpModalBtn: document.getElementById("closeHelpModalBtn"),
  awayModal: document.getElementById("awayModal"),
  awaySummaryList: document.getElementById("awaySummaryList"),
  closeAwayModalBtn: document.getElementById("closeAwayModalBtn"),
  sectionModal: document.getElementById("sectionModal"),
  sectionModalKicker: document.getElementById("sectionModalKicker"),
  sectionModalTitle: document.getElementById("sectionModalTitle"),
  sectionModalBody: document.getElementById("sectionModalBody"),
  closeSectionModalBtn: document.getElementById("closeSectionModalBtn"),
  tradeModal: document.getElementById("tradeModal"),
  tradePlannerContent: document.getElementById("tradePlannerContent"),
  closeTradeModalBtn: document.getElementById("closeTradeModalBtn")
};

let gameState = loadGameState() || createNewGameState();
let activeSection = null;
let navigationSort = "distance";
let tradePlannerState = null;
let hangarExpandedShipId = null;
let hangarDrafts = {};
let activeInputLock = false;
let lastTickMs = Date.now();

const offlineSummary = applyOfflineProgress(gameState);
if (offlineSummary && offlineSummary.elapsedSeconds > 0) {
  pushLog(gameState, `Systems advanced ${formatSeconds(offlineSummary.elapsedSeconds)} while you were away.`);
}

function modalIsOpen() {
  return !dom.sectionModal.classList.contains("hidden") || !dom.tradeModal.classList.contains("hidden") || !dom.helpModal.classList.contains("hidden") || !dom.awayModal.classList.contains("hidden");
}

function syncBodyLock() {
  document.body.classList.toggle("modal-open", modalIsOpen());
}

function renderToasts() {
  dom.toastStack.innerHTML = gameState.notifications.map((item) => `
    <article class="toast">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="section-subtitle">${escapeHtml(item.body)}</div>
    </article>
  `).join("");
}

function renderHeader() {
  const idleShips = getIdleMerchantShips(gameState).length;
  const totalShips = gameState.merchantShips.length;
  const rep = getReputationProgress(gameState.playerLevel, gameState.playerReputationXp);
  const discovered = getDiscoveredSystems(gameState).length - 1;
  const totalDiscoverable = BALANCE.REMOTE_SYSTEM_COUNT;
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
      <span class="stat-label">Level</span>
      <span class="stat-value">${gameState.playerLevel}</span>
      <div class="section-subtitle">${gameState.playerReputationXp} rep • next at ${rep.next}</div>
      <div class="progress-line progress-progression"><div class="progress-fill progression" style="width:${rep.pct}%"></div></div>
    </article>
    <article class="stat-chip">
      <span class="stat-label">Merchant Ships</span>
      <span class="stat-value">${idleShips} idle / ${totalShips} owned</span>
      <div class="section-subtitle">Cap ${gameState.maxMerchantShips}</div>
      <div class="progress-line progress-progression"><div class="progress-fill progression" style="width:${getPercent(totalShips, gameState.maxMerchantShips)}%"></div></div>
    </article>
    <article class="stat-chip">
      <span class="stat-label">Scout Ship</span>
      <span class="stat-value">${!gameState.scoutShip.owned ? "Not Owned" : gameState.scoutShip.status === "mission" ? "On Mission" : "Idle"}</span>
    </article>
    <article class="stat-chip">
      <span class="stat-label">Charts</span>
      <span class="stat-value">${discovered} / ${totalDiscoverable}</span>
      <div class="section-subtitle">Discovered systems</div>
      <div class="progress-line progress-scout"><div class="progress-fill scout" style="width:${getPercent(discovered, totalDiscoverable)}%"></div></div>
    </article>
  `;
}

function renderHub() {
  const featured = getFeaturedSystems(gameState);
  const latestPermanent = gameState.structuralHistory[0];
  const locations = [
    {
      key: "trade",
      title: "Trade Exchange",
      body: featured[0] ? `Top route: ${featured[0].system.name}` : "Review home prices and launch trade missions.",
      meta: `${getIdleMerchantShips(gameState).length} ships ready`
    },
    {
      key: "navigation",
      title: "Navigation Office",
      body: `${getDiscoveredRemoteSystems(gameState).length} systems discovered`,
      meta: `${getUndiscoveredSystems(gameState).length} still hidden`
    },
    {
      key: "fleet",
      title: "Merchant Fleet",
      body: `${gameState.tradeMissions.length} active ship assignments`,
      meta: `${gameState.upgradeMissions.length} ships in refit`
    },
    {
      key: "shipyard",
      title: "Shipyard",
      body: `Next hull: ${formatCredits(getMerchantShipCostForCount(gameState.merchantShips.length))}`,
      meta: `Cap ${gameState.maxMerchantShips}`
    },
    {
      key: "hangar",
      title: "Hangar",
      body: "Rename, recolor, and upgrade each merchant ship.",
      meta: `${gameState.merchantShips.length} merchant ships`
    },
    {
      key: "contracts",
      title: "Corporate Contracts",
      body: `${gameState.contracts.length} active premium deliveries`,
      meta: `${gameState.playerReputationXp} reputation`
    },
    {
      key: "envoys",
      title: "Trade Envoys",
      body: `${gameState.tradeEnvoys.length} envoys on roster`,
      meta: `${getIdleTradeEnvoys(gameState).length} idle`
    },
    {
      key: "analytics",
      title: "Trade Analytics",
      body: `${gameState.tradeHistory.length} completed mission batches tracked`,
      meta: "Profit trend and route leaders"
    },
    {
      key: "news",
      title: "Newsfeed & History",
      body: `${gameState.marketEvents.length} live market events`,
      meta: latestPermanent ? latestPermanent.headline : "No permanent shifts yet"
    }
  ];

  dom.hubLocations.innerHTML = locations.map((location) => `
    <button class="location-card open-section-btn" data-section="${location.key}" type="button">
      ${renderLocationSprite(location.key)}
      <strong>${escapeHtml(location.title)}</strong>
      <p class="section-subtitle">${escapeHtml(location.body)}</p>
      <div class="pill-row"><span class="legend-pill">${escapeHtml(location.meta)}</span></div>
    </button>
  `).join("");
}

function renderHelp() {
  dom.helpContent.innerHTML = buildHelpItems().map((item) => `
    <article class="news-item">
      <strong>${escapeHtml(item.title)}</strong>
      <p class="section-subtitle">${escapeHtml(item.body)}</p>
    </article>
  `).join("");
}

function renderHomeMarketTable() {
  const home = getHomeSystem(gameState);
  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr><th>Commodity</th><th>Buy Price</th><th>Base</th></tr>
        </thead>
        <tbody>
          ${COMMODITIES.map((commodity) => `
            <tr>
              <td>${renderCommodityLabel(commodity.id, home)}</td>
              <td>${formatCredits(home.prices[commodity.id])}</td>
              <td>${formatCredits(COMMODITY_INDEX[commodity.id].basePrice)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRouteCard(route, kicker, options = {}) {
  const system = route.system;
  const tripTime = formatSeconds(Math.round(system.distance * BALANCE.TRADE_TIME_PER_DISTANCE * 2));
  const bestOutProfit = route.bestOutbound.margin * BALANCE.BASE_CARGO_SIZE;
  const bestBackProfit = route.bestReturn.margin * BALANCE.BASE_CARGO_SIZE;
  const efficiencyPct = clamp(route.profitPerDistance * 8, 8, 100);
  const matchingContracts = gameState.contracts.filter((contract) => contract.systemId === system.id);
  const includeProgressBar = options.includeProgressBar !== false;
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <p class="eyebrow">${escapeHtml(kicker)}</p>
          <h3>${escapeHtml(system.name)}</h3>
        </div>
        <span class="badge">${formatDistanceLy(system.distance)}</span>
      </div>
      <p class="metric-line">Best outbound: ${renderCommodityLabel(route.bestOutbound.commodityId, system)} <span class="${bestOutProfit >= 0 ? "pos" : "neg"}">${bestOutProfit >= 0 ? "+" : ""}${formatCredits(bestOutProfit)}</span></p>
      <p class="metric-line">Best return: ${renderCommodityLabel(route.bestReturn.commodityId, system)} <span class="${bestBackProfit >= 0 ? "pos" : "neg"}">${bestBackProfit >= 0 ? "+" : ""}${formatCredits(bestBackProfit)}</span></p>
      <p class="metric-line">Round trip: <strong>${route.roundTripProfit >= 0 ? "+" : ""}${formatCredits(route.roundTripProfit)}</strong> • ${tripTime}</p>
      ${includeProgressBar ? `<div class="progress-line progress-analytics"><div class="progress-fill analytics" style="width:${efficiencyPct}%"></div></div>` : ""}
      ${matchingContracts.length > 0 ? matchingContracts.map((contract) => `<p class="metric-line"><strong>Contract:</strong> ${renderCommodityLabel(contract.commodityId, system)} • ${Math.max(0, contract.targetUnits - contract.deliveredUnits)}/${contract.targetUnits} units • ${formatCredits(contract.bounty)}</p>`).join("") : ""}
      <div class="inline-actions">
        <button class="btn plan-trade-btn" data-system-id="${system.id}" type="button">Plan Trade</button>
      </div>
    </article>
  `;
}

function renderTradeSection() {
  const featured = getFeaturedSystems(gameState);
  const featuredById = new Map(featured.map((route) => [route.system.id, route]));
  const contractRoutes = gameState.contracts
    .map((contract) => findSystem(gameState, contract.systemId))
    .filter(Boolean)
    .filter((system) => system.discovered)
    .filter((system) => !featuredById.has(system.id))
    .map((system) => ({ system, ...getRouteStats(gameState, system) }));
  const visibleRoutes = [...featured, ...contractRoutes];
  return `
    <section class="section-modal-body trade-exchange-layout">
      <article class="notice-box trade-exchange-intro">
        <p class="section-subtitle">Buy cargo at Sol Nexus, dispatch ships, and compare the two strongest routes on the board right now.</p>
      </article>
      <article class="card trade-exchange-market">
        <div class="section-head">
          <div>
            <h3>Sol Nexus Market</h3>
            <p class="section-subtitle">Current home buy prices.</p>
          </div>
        </div>
        ${renderHomeMarketTable()}
      </article>
      <article class="card trade-exchange-routes">
        <div class="section-head">
          <div>
            <h3>Exchange Routes</h3>
            <p class="section-subtitle">Featured routes plus every active Corporate Contract destination.</p>
          </div>
        </div>
        <div class="route-grid">
          ${visibleRoutes.length > 0 ? visibleRoutes.map((route, index) => renderRouteCard(route, index === 0 ? "Best Profit Route" : index === 1 ? "Best Profit / Distance" : "Contract Destination", { includeProgressBar: true })).join("") : '<div class="empty">No remote systems are available yet.</div>'}
        </div>
      </article>
    </section>
  `;
}

function renderNavigationSection() {
  const discovered = getDiscoveredRemoteSystems(gameState)
    .map((system) => ({ system, ...getRouteStats(gameState, system) }))
    .sort((a, b) => {
      if (navigationSort === "profit") {
        return b.roundTripProfit - a.roundTripProfit || a.system.distance - b.system.distance;
      }
      if (navigationSort === "ratio") {
        return b.profitPerDistance - a.profitPerDistance || a.system.distance - b.system.distance;
      }
      return a.system.distance - b.system.distance;
    });
  const totalDiscovered = getDiscoveredRemoteSystems(gameState).length;
  const scoutProgressPct = getPercent(totalDiscovered, BALANCE.REMOTE_SYSTEM_COUNT);
  return `
    <section class="section-modal-body">
      <article class="card">
        <div class="section-head">
          <div>
            <h3>Scout Operations</h3>
            <p class="section-subtitle">Discovery progress: ${totalDiscovered} / ${BALANCE.REMOTE_SYSTEM_COUNT} systems</p>
          </div>
          <button class="btn" data-action="launch-scout" type="button" ${!gameState.scoutShip.owned || gameState.scoutShip.status !== "idle" || getUndiscoveredSystems(gameState).length === 0 ? "disabled" : ""}>${!gameState.scoutShip.owned ? `Buy scout in Shipyard` : getUndiscoveredSystems(gameState).length === 0 ? "All Systems Mapped" : "Launch Scout Mission"}</button>
        </div>
        <p class="metric-line">Scout ship: <strong>${!gameState.scoutShip.owned ? "Not owned" : gameState.scoutShip.status === "mission" ? `On mission • ${formatSeconds(gameState.scoutMission?.remainingSeconds || 0)} remaining` : "Idle"}</strong></p>
        <div class="progress-line progress-scout"><div class="progress-fill scout" style="width:${scoutProgressPct}%"></div></div>
        ${gameState.scoutShip.owned ? `<p class="metric-line">Next mission duration: ${formatSeconds(getScoutMissionDuration(gameState))}</p>` : ""}
      </article>
      <article class="card">
        <div class="section-head">
          <div>
            <h3>All Discovered Systems</h3>
            <p class="section-subtitle">Sort by distance, raw profit, or profit efficiency.</p>
          </div>
          <div class="filter-row">
            <button class="pill-btn sort-systems-btn" data-sort="distance" type="button">Distance</button>
            <button class="pill-btn sort-systems-btn" data-sort="profit" type="button">Profit</button>
            <button class="pill-btn sort-systems-btn" data-sort="ratio" type="button">Profit / LY</button>
          </div>
        </div>
        <div class="cards-grid">
          ${discovered.map((route) => renderRouteCard(route, "Route Overview", { includeProgressBar: false })).join("") || '<div class="empty">No systems discovered yet.</div>'}
        </div>
      </article>
    </section>
  `;
}

function renderFleetMissionCard(batch) {
  const missions = gameState.tradeMissions.filter((mission) => mission.batchId === batch.id);
  if (missions.length === 0) {
    return "";
  }
  const destination = findSystem(gameState, batch.destinationSystemId);
  const lead = missions[0];
  const outboundEta = Math.max(0, ...missions.filter((mission) => !mission.arrivalResolved).map((mission) => mission.remainingSeconds - Math.floor(mission.durationSeconds / 2)), 0);
  const returnEta = Math.max(0, ...missions.map((mission) => mission.remainingSeconds), 0);
  const groupedBySpeed = Object.values(missions.reduce((acc, mission) => {
    const key = `${mission.durationSeconds}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(mission);
    return acc;
  }, {}));
  const envoy = batch.envoyId ? findTradeEnvoy(gameState, batch.envoyId) : null;
  const missionPct = getPercent((batch.durationSeconds || 0) - returnEta, batch.durationSeconds || 1);
  const totalCargoUnits = missions.reduce((sum, mission) => sum + (mission.units || 0), 0);
  return `
    <article class="mission-item">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(destination?.name || "Unknown Route")}</h3>
          <p class="section-subtitle">${renderCommodityLabel(batch.outboundCommodityId, destination || getHomeSystem(gameState))} out • ${renderCommodityLabel(batch.returnCommodityId, destination || getHomeSystem(gameState))} back</p>
        </div>
        <span class="badge">${batch.totalShips} ships</span>
      </div>
      <p class="mission-meta">Outbound ETA: ${formatSeconds(outboundEta)} • Return ETA: ${formatSeconds(returnEta)}</p>
      <div class="progress-line progress-timer"><div class="progress-fill timer" style="width:${missionPct}%"></div></div>
      <p class="mission-meta">Total outbound cargo: ${totalCargoUnits} units</p>
      <p class="mission-meta">Estimated ${batch.financed ? "(after interest)" : ""}: <span class="${batch.estimatedProfitAfterInterest >= 0 ? "pos" : "neg"}">${batch.estimatedProfitAfterInterest >= 0 ? "+" : ""}${formatCredits(batch.estimatedProfitAfterInterest)}</span></p>
      ${envoy ? `<p class="mission-meta">Envoy: ${escapeHtml(envoy.name)} • ${escapeHtml(getEnvoySpecialtyLabel(envoy))}</p>` : ""}
      ${groupedBySpeed.map((group) => `<div class="notice-box"><p class="mission-meta"><strong>Speed Group</strong> • ${formatSeconds(group[0].durationSeconds)} total</p><p class="mission-meta">${group.map((mission) => {
        const ship = findMerchantShip(gameState, mission.shipId);
        return `<span style="color:${ship?.nameColor || "#fff"}">${escapeHtml(getShipDisplayName(ship))}</span>`;
      }).join(", ")}</p></div>`).join("")}
    </article>
  `;
}

function renderFleetSection() {
  const batches = Object.values(gameState.tradeMissionBatches);
  const totalEscrow = gameState.tradeMissions.reduce((sum, mission) => sum + (mission.arrivalResolved ? 0 : mission.escrowReserved), 0);
  return `
    <section class="section-modal-body split-grid">
      <article class="card">
        <div class="section-head">
          <div>
            <h3>Active Trade Missions</h3>
            <p class="section-subtitle">Grouped by mission batch. Ships with different speeds stay grouped only when their duration matches.</p>
          </div>
        </div>
        <p class="metric-line">Total mission escrow reserved: ${formatCredits(totalEscrow)}</p>
        <div class="cards-grid">
          ${batches.length > 0 ? batches.map((batch) => renderFleetMissionCard(batch)).join("") : '<div class="empty">No active trade missions.</div>'}
        </div>
      </article>
      <article class="card">
        <div class="section-head">
          <div>
            <h3>Support Operations</h3>
            <p class="section-subtitle">Upgrades, scout work, and idle capacity.</p>
          </div>
        </div>
        <p class="mission-meta">Idle merchant ships: ${getIdleMerchantShips(gameState).length} / ${gameState.merchantShips.length}</p>
        <p class="mission-meta">Idle trade envoys: ${getIdleTradeEnvoys(gameState).length} / ${gameState.tradeEnvoys.length}</p>
        <p class="mission-meta">Scout status: ${!gameState.scoutShip.owned ? "Not owned" : gameState.scoutShip.status === "mission" ? `On mission • ${formatSeconds(gameState.scoutMission?.remainingSeconds || 0)}` : "Idle"}</p>
        <div class="cards-grid">
          ${gameState.upgradeMissions.length > 0 ? gameState.upgradeMissions.map((mission) => {
            const ship = findMerchantShip(gameState, mission.shipId);
            const progressPct = getPercent((mission.durationSeconds || 0) - (mission.remainingSeconds || 0), mission.durationSeconds || 1);
            return `<article class="mission-item"><h3>${escapeHtml(getShipDisplayName(ship))}</h3><p class="mission-meta">${mission.upgradeType} refit • ${formatSeconds(mission.remainingSeconds)} remaining</p><div class="progress-line progress-timer"><div class="progress-fill timer" style="width:${progressPct}%"></div></div></article>`;
          }).join("") : '<div class="empty">No ships are currently in refit.</div>'}
        </div>
      </article>
    </section>
  `;
}

function renderShipyardSection() {
  const nextShipCost = getMerchantShipCostForCount(gameState.merchantShips.length);
  const shipCapPct = getPercent(gameState.merchantShips.length, gameState.maxMerchantShips);
  return `
    <section class="section-modal-body split-grid">
      <article class="card">
        <div class="section-head">
          <div>
            <h3>Merchant Ship Procurement</h3>
            <p class="section-subtitle">Level progression increases your fleet cap. Ship purchases stop at the current cap.</p>
          </div>
          <button class="btn" data-action="buy-merchant-ship" type="button" ${gameState.credits < nextShipCost || gameState.merchantShips.length >= gameState.maxMerchantShips ? "disabled" : ""}>Buy Ship (${formatCredits(nextShipCost)})</button>
        </div>
        <p class="metric-line">Owned ships: ${gameState.merchantShips.length} / ${gameState.maxMerchantShips}</p>
        <div class="progress-line progress-progression"><div class="progress-fill progression" style="width:${shipCapPct}%"></div></div>
        <p class="metric-line">Next cap increase: every non-third level grants +1 max merchant ship.</p>
      </article>
      <article class="card">
        <div class="section-head">
          <div>
            <h3>Scout Procurement</h3>
            <p class="section-subtitle">Reveal more profitable systems over time.</p>
          </div>
          <button class="btn" data-action="buy-scout-ship" type="button" ${gameState.scoutShip.owned || gameState.credits < BALANCE.SCOUT_SHIP_COST ? "disabled" : ""}>${gameState.scoutShip.owned ? "Owned" : `Buy Scout (${formatCredits(BALANCE.SCOUT_SHIP_COST)})`}</button>
        </div>
        <p class="metric-line">Scout ship status: ${!gameState.scoutShip.owned ? "Not owned" : gameState.scoutShip.status === "mission" ? "On mission" : "Idle"}</p>
      </article>
    </section>
  `;
}

function getHangarDraft(ship) {
  return hangarDrafts[ship.id] || { name: ship.name, color: ship.nameColor };
}

function renderHangarSection() {
  return `
    <section class="section-modal-body">
      <div class="ship-grid">
        ${gameState.merchantShips.map((ship) => {
          const isOpen = hangarExpandedShipId === ship.id;
          const draft = getHangarDraft(ship);
          const activeUpgrade = gameState.upgradeMissions.find((mission) => mission.shipId === ship.id) || null;
          const upgradePct = activeUpgrade ? getPercent((activeUpgrade.durationSeconds || 0) - (activeUpgrade.remainingSeconds || 0), activeUpgrade.durationSeconds || 1) : 0;
          const speedPctOfNormal = Math.round(getShipSpeedMultiplier(ship) * 100);
          return `
            <article class="ship-card">
              <div class="ship-row">
                <div>
                  <h3 style="color:${ship.nameColor}">${escapeHtml(getShipDisplayName(ship))}</h3>
                  <p class="section-subtitle">Cargo Level ${ship.cargoLevel || 0} • ${getShipCargoUnits(ship)} units</p>
                  <p class="section-subtitle">Speed Level ${ship.speedLevel || 0} • ${speedPctOfNormal}% of normal time • ${escapeHtml(ship.status)}</p>
                </div>
                <button class="btn secondary toggle-hangar-btn" data-ship-id="${ship.id}" type="button">${isOpen ? "Hide Details" : "Customize / Upgrade"}</button>
              </div>
              ${activeUpgrade ? `<div class="progress-line progress-timer"><div class="progress-fill timer" style="width:${upgradePct}%"></div></div><p class="metric-line">${escapeHtml(activeUpgrade.upgradeType)} refit • ${formatSeconds(activeUpgrade.remainingSeconds)} remaining</p>` : ""}
              ${isOpen ? `
                <div class="form-grid">
                  <div class="field">
                    <label for="ship-name-${ship.id}">Ship Name</label>
                    <input id="ship-name-${ship.id}" class="text-input hangar-name-input" data-ship-id="${ship.id}" type="text" maxlength="${SHIP_NAME_MAX_LENGTH}" value="${escapeHtml(draft.name)}" />
                  </div>
                  <div>
                    <div class="field"><label>Ship Name Color</label></div>
                    <div class="color-swatch-grid">
                      ${SHIP_NAME_COLOR_OPTIONS.map((option) => `<button class="color-swatch choose-ship-color-btn ${draft.color === option.value ? "active" : ""}" data-ship-id="${ship.id}" data-color="${option.value}" type="button" style="color:${option.value}">${escapeHtml(option.label)}</button>`).join("")}
                    </div>
                  </div>
                  <div class="inline-actions">
                    <button class="btn save-ship-style-btn" data-ship-id="${ship.id}" type="button">Save Customization</button>
                    <button class="btn secondary start-upgrade-btn" data-upgrade-type="cargo" data-ship-id="${ship.id}" type="button" ${ship.status !== "idle" || gameState.credits < getUpgradeCost(ship, "cargo") ? "disabled" : ""}>Cargo Upgrade (${formatCredits(getUpgradeCost(ship, "cargo"))})</button>
                    <button class="btn secondary start-upgrade-btn" data-upgrade-type="speed" data-ship-id="${ship.id}" type="button" ${ship.status !== "idle" || gameState.credits < getUpgradeCost(ship, "speed") ? "disabled" : ""}>Speed Upgrade (${formatCredits(getUpgradeCost(ship, "speed"))})</button>
                  </div>
                  <p class="metric-line">Upgrade times: cargo ${formatSeconds(getUpgradeDuration(ship, "cargo"))} • speed ${formatSeconds(getUpgradeDuration(ship, "speed"))}</p>
                </div>
              ` : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderContractsSection() {
  return `
    <section class="section-modal-body">
      <article class="card">
        <div class="section-head">
          <div>
            <h3>Station Reputation</h3>
            <p class="section-subtitle">Reputation is XP. Level up to increase fleet cap and earn automatic Trade Envoys.</p>
          </div>
          <span class="badge">Level ${gameState.playerLevel}</span>
        </div>
        <p class="metric-line">Total reputation: ${gameState.playerReputationXp}</p>
        <div class="progress-line progress-progression"><div class="progress-fill progression" style="width:${getReputationProgress(gameState.playerLevel, gameState.playerReputationXp).pct}%"></div></div>
      </article>
      <div class="cards-grid">
        ${gameState.contracts.map((contract) => {
          const system = findSystem(gameState, contract.systemId);
          const remaining = Math.max(0, contract.targetUnits - contract.deliveredUnits);
          const progress = clamp((contract.deliveredUnits / Math.max(1, contract.targetUnits)) * 100, 0, 100);
          return `
            <article class="contract-card">
              <div class="card-head">
                <div>
                  <h3>${escapeHtml(contract.issuer)}</h3>
                  <p class="section-subtitle">${escapeHtml(contract.headline)}</p>
                </div>
                <span class="badge">${contract.difficulty === 1 ? "Easy" : contract.difficulty === 2 ? "Standard" : "Hard"}</span>
              </div>
              <p class="contract-meta">${renderCommodityLabel(contract.commodityId, system || getHomeSystem(gameState))} to <strong>${escapeHtml(system?.name || "Unknown")}</strong></p>
              <p class="contract-meta">${escapeHtml(contract.body)}</p>
              <p class="contract-meta">Need ${contract.targetUnits} units • Remaining ${remaining} • Deadline ${formatSeconds(contract.remainingSeconds)}</p>
              <p class="contract-meta">Reward: ${formatCredits(contract.bounty)} • ${contract.reputationReward} reputation</p>
              <div class="progress-line progress-contract"><div class="progress-fill contract" style="width:${progress}%"></div></div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderEnvoysSection() {
  return `
    <section class="section-modal-body">
      <article class="card">
        <div class="section-head">
          <div>
            <h3>Automatic Envoy Grants</h3>
            <p class="section-subtitle">Every third player level grants the next envoy in a fixed sector order: single-commodity envoys first, then two-commodity envoys.</p>
          </div>
          <span class="badge">Next Grant #${gameState.nextEnvoyGrantIndex + 1}</span>
        </div>
      </article>
      <div class="cards-grid">
        ${gameState.tradeEnvoys.length > 0 ? gameState.tradeEnvoys.map((envoy) => {
          const levelProgress = getTradeEnvoyLevelProgress(envoy);
          return `
          <article class="envoy-card">
            <div class="card-head">
              <div>
                <h3>${escapeHtml(envoy.name)}</h3>
                <p class="section-subtitle">${escapeHtml(getEnvoySpecialtyLabel(envoy))}</p>
              </div>
              <span class="badge">Level ${getTradeEnvoyLevel(envoy.xp)}</span>
            </div>
            <p class="envoy-meta">Bonus: ${(getTradeEnvoyBonusRate(envoy) * 100).toFixed(1)}% better pricing</p>
            <p class="envoy-meta">XP: ${envoy.xp} • Status: ${envoy.status === "idle" ? "Idle" : `On mission to ${findSystem(gameState, gameState.tradeMissionBatches[envoy.assignedBatchId]?.destinationSystemId)?.name || "route"}`}</p>
            <div class="progress-line progress-progression"><div class="progress-fill progression" style="width:${levelProgress.pct}%"></div></div>
          </article>
        `;
        }).join("") : '<div class="empty">No envoys on the roster yet. Reach level 3 for your first envoy.</div>'}
      </div>
    </section>
  `;
}

function buildProfitTrendSvg(entries) {
  if (entries.length === 0) {
    return '<div class="empty">Complete a few trade missions to build a profit trend.</div>';
  }
  const width = 320;
  const height = 140;
  const profits = entries.map((item) => item.profit);
  const min = Math.min(...profits, 0);
  const max = Math.max(...profits, 0, 1);
  const span = Math.max(1, max - min);
  const points = entries.map((item, index) => {
    const x = (index / Math.max(1, entries.length - 1)) * (width - 20) + 10;
    const y = height - 18 - (((item.profit - min) / span) * (height - 36));
    return `${x},${y}`;
  }).join(" ");
  const zeroY = height - 18 - (((0 - min) / span) * (height - 36));
  return `
    <div class="chart-box">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Profit trend">
        <line x1="10" y1="${zeroY}" x2="${width - 10}" y2="${zeroY}" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
        <polyline fill="none" stroke="#4fe4ff" stroke-width="3" points="${points}" />
      </svg>
    </div>
  `;
}

function buildCommodityMixSvg(history) {
  const totals = Object.fromEntries(COMMODITIES.map((commodity) => [commodity.id, 0]));
  history.forEach((item) => {
    totals[item.outboundCommodityId] += item.outboundUnits || 0;
    totals[item.returnCommodityId] += item.returnUnits || 0;
  });
  const max = Math.max(1, ...Object.values(totals));
  const width = 320;
  const height = 160;
  const barWidth = 36;
  const gap = 14;
  return `
    <div class="chart-box">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Commodity mix">
        ${COMMODITIES.map((commodity, index) => {
          const value = totals[commodity.id];
          const barHeight = ((height - 40) * value) / max;
          const x = 20 + index * (barWidth + gap);
          const y = height - 24 - barHeight;
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="8" fill="rgba(79,228,255,0.72)"></rect>
            <text x="${x + barWidth / 2}" y="${height - 8}" text-anchor="middle" fill="#dfe8ff" font-size="12">${COMMODITY_ICONS[commodity.id]}</text>
          `;
        }).join("")}
      </svg>
      <div class="legend-row">${COMMODITIES.map((commodity) => `<span class="legend-pill">${COMMODITY_ICONS[commodity.id]} ${commodity.name}: ${totals[commodity.id]}</span>`).join("")}</div>
    </div>
  `;
}

function renderAnalyticsSection() {
  const history = gameState.tradeHistory.slice().reverse();
  const totals = history.reduce((acc, item) => {
    acc.revenue += item.revenue || 0;
    acc.profit += item.profit || 0;
    acc.financed += item.financed ? 1 : 0;
    acc.contracts += item.contractDeliveryUnits > 0 ? 1 : 0;
    acc.cargo += (item.outboundUnits || 0) + (item.returnUnits || 0);
    return acc;
  }, { revenue: 0, profit: 0, financed: 0, contracts: 0, cargo: 0 });
  const topProfitRoutes = Object.values(history.reduce((acc, item) => {
    const key = item.systemId;
    if (!acc[key]) {
      acc[key] = { systemId: item.systemId, profit: 0, ratio: 0, trips: 0 };
    }
    acc[key].profit += item.profit || 0;
    acc[key].trips += 1;
    const distance = findSystem(gameState, item.systemId)?.distance || 1;
    acc[key].ratio += (item.profit || 0) / distance;
    return acc;
  }, {}))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);
  const topRatioRoutes = Object.values(history.reduce((acc, item) => {
    const key = item.systemId;
    if (!acc[key]) {
      acc[key] = { systemId: item.systemId, ratio: 0, trips: 0 };
    }
    const distance = findSystem(gameState, item.systemId)?.distance || 1;
    acc[key].ratio += (item.profit || 0) / distance;
    acc[key].trips += 1;
    return acc;
  }, {}))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5);
  const maxProfitRoute = Math.max(1, ...topProfitRoutes.map((item) => item.profit));
  const maxRatioRoute = Math.max(1, ...topRatioRoutes.map((item) => item.ratio));
  return `
    <section class="section-modal-body">
      <div class="analytics-grid">
        <article class="analytics-card"><h3>Lifetime Revenue</h3><p class="stat-value">${formatCredits(totals.revenue)}</p></article>
        <article class="analytics-card"><h3>Lifetime Profit</h3><p class="stat-value ${totals.profit >= 0 ? "pos" : "neg"}">${totals.profit >= 0 ? "+" : ""}${formatCredits(totals.profit)}</p></article>
        <article class="analytics-card"><h3>Financed Missions</h3><p class="stat-value">${totals.financed}</p></article>
        <article class="analytics-card"><h3>Contract Routes Served</h3><p class="stat-value">${totals.contracts}</p></article>
        <article class="analytics-card"><h3>Total Cargo Moved</h3><p class="stat-value">${totals.cargo}</p></article>
        <article class="analytics-card"><h3>Systems Discovered</h3><p class="stat-value">${getDiscoveredRemoteSystems(gameState).length}</p></article>
      </div>
      <article class="card">
        <div class="section-head"><div><h3>Recent Profit Trend</h3><p class="section-subtitle">Last 20 completed mission batches.</p></div></div>
        ${buildProfitTrendSvg(history.slice(-20))}
      </article>
      <article class="card">
        <div class="section-head"><div><h3>Commodity Mix</h3><p class="section-subtitle">Outbound and return cargo volume across all completed missions.</p></div></div>
        ${buildCommodityMixSvg(history)}
      </article>
      <div class="split-grid">
        <article class="card">
          <div class="section-head"><div><h3>Top Profit Routes</h3></div></div>
          ${topProfitRoutes.length > 0 ? topProfitRoutes.map((item) => `<div><p class="analytics-line"><strong>${escapeHtml(findSystem(gameState, item.systemId)?.name || "Unknown")}</strong> • ${formatCredits(item.profit)} • ${item.trips} trips</p><div class="progress-line progress-analytics"><div class="progress-fill analytics" style="width:${getPercent(item.profit, maxProfitRoute)}%"></div></div></div>`).join("") : '<div class="empty">No trade history yet.</div>'}
        </article>
        <article class="card">
          <div class="section-head"><div><h3>Best Profit / Distance</h3></div></div>
          ${topRatioRoutes.length > 0 ? topRatioRoutes.map((item) => `<div><p class="analytics-line"><strong>${escapeHtml(findSystem(gameState, item.systemId)?.name || "Unknown")}</strong> • ${formatCredits(item.ratio)} per LY • ${item.trips} trips</p><div class="progress-line progress-analytics"><div class="progress-fill analytics" style="width:${getPercent(item.ratio, maxRatioRoute)}%"></div></div></div>`).join("") : '<div class="empty">No trade history yet.</div>'}
        </article>
      </div>
    </section>
  `;
}

function renderNewsSection() {
  const latestPermanent = gameState.structuralHistory[0];
  return `
    <section class="section-modal-body split-grid">
      <article class="card">
        <div class="section-head"><div><h3>Live Newsfeed</h3><p class="section-subtitle">Temporary events plus the single most recent permanent shift.</p></div></div>
        <div class="cards-grid">
          ${gameState.marketEvents.map((event) => {
            const system = findSystem(gameState, event.systemId);
            const eventPct = getPercent((BALANCE.MARKET_EVENT_DURATION_SECONDS - event.remainingSeconds), BALANCE.MARKET_EVENT_DURATION_SECONDS);
            return `
              <article class="news-item">
                <div class="card-head">
                  <div>
                    <h3>${escapeHtml(event.headline)}</h3>
                    <p class="section-subtitle">${escapeHtml(system?.name || "Unknown system")}</p>
                  </div>
                  <span class="badge">${formatSeconds(event.remainingSeconds)}</span>
                </div>
                <p class="section-subtitle">${renderCommodityLabel(event.commodityId, system || getHomeSystem(gameState))}</p>
                <p class="section-subtitle">${escapeHtml(event.body)}</p>
                <div class="progress-line progress-timer"><div class="progress-fill timer" style="width:${eventPct}%"></div></div>
              </article>
            `;
          }).join("")}
          ${latestPermanent ? `
            <article class="news-item">
              <div class="card-head">
                <div>
                  <h3>${escapeHtml(latestPermanent.headline)}</h3>
                  <p class="section-subtitle">Most recent permanent shift</p>
                </div>
                <span class="badge">Permanent</span>
              </div>
              <p class="section-subtitle">${latestPermanent.type === "global" ? "Galaxy-wide" : escapeHtml(findSystem(gameState, latestPermanent.systemId)?.name || "Unknown system")}</p>
              <p class="section-subtitle">${renderCommodityLabel(latestPermanent.commodityId, latestPermanent.systemId ? findSystem(gameState, latestPermanent.systemId) : getHomeSystem(gameState))}</p>
              <p class="section-subtitle">${escapeHtml(latestPermanent.body)}</p>
            </article>
          ` : ""}
        </div>
      </article>
      <article class="card">
        <div class="section-head">
          <div><h3>Event Log</h3><p class="section-subtitle">Recent missions, scouting, contracts, and permanent shifts.</p></div>
          <button class="btn danger" data-action="reset-game" type="button">Reset Game</button>
        </div>
        <ul class="event-log scroll-log">
          ${gameState.log.length > 0 ? gameState.log.map((entry) => `<li class="event-item">${escapeHtml(entry.text)}<br /><span class="section-subtitle">${new Date(entry.timestamp).toLocaleString()}</span></li>`).join("") : '<li class="empty">No events logged yet.</li>'}
        </ul>
        <div class="section-head" style="margin-top:0.9rem"><div><h3>Economic History</h3><p class="section-subtitle">All permanent structural changes.</p></div></div>
        <div class="history-scroll">
          ${gameState.structuralHistory.length > 0 ? gameState.structuralHistory.map((item) => `<article class="history-item"><strong>${escapeHtml(item.headline)}</strong><p class="section-subtitle">${item.type === "global" ? "Galaxy-wide" : escapeHtml(findSystem(gameState, item.systemId)?.name || "Unknown system")}</p><p class="section-subtitle">${renderCommodityLabel(item.commodityId, item.systemId ? findSystem(gameState, item.systemId) : getHomeSystem(gameState))}</p><p class="section-subtitle">${escapeHtml(item.body)}</p><p class="section-subtitle">${new Date(item.timestamp).toLocaleString()}</p></article>`).join("") : '<div class="empty">No permanent market shifts yet.</div>'}
        </div>
      </article>
    </section>
  `;
}

function renderSection() {
  if (!activeSection) {
    return;
  }
  const config = SECTION_CONFIG[activeSection];
  dom.sectionModalKicker.textContent = config.kicker;
  dom.sectionModalTitle.textContent = config.title;
  let html = "";
  switch (activeSection) {
    case "trade":
      html = renderTradeSection();
      break;
    case "navigation":
      html = renderNavigationSection();
      break;
    case "fleet":
      html = renderFleetSection();
      break;
    case "shipyard":
      html = renderShipyardSection();
      break;
    case "hangar":
      html = renderHangarSection();
      break;
    case "contracts":
      html = renderContractsSection();
      break;
    case "envoys":
      html = renderEnvoysSection();
      break;
    case "analytics":
      html = renderAnalyticsSection();
      break;
    case "news":
      html = renderNewsSection();
      break;
    default:
      html = "";
  }
  dom.sectionModalBody.innerHTML = html;
}

function openSection(sectionKey) {
  activeSection = sectionKey;
  renderSection();
  dom.sectionModal.classList.remove("hidden");
  dom.sectionModalBody.scrollTop = 0;
  dom.sectionModal.scrollTop = 0;
  syncBodyLock();
}

function closeSection() {
  activeSection = null;
  dom.sectionModal.classList.add("hidden");
  syncBodyLock();
}

function renderTradePlanner() {
  if (!tradePlannerState) {
    dom.tradePlannerContent.innerHTML = "";
    return;
  }
  const system = findSystem(gameState, tradePlannerState.systemId);
  const ships = getIdleMerchantShips(gameState);
  const selectedShips = tradePlannerState.selectedShipIds.map((id) => findMerchantShip(gameState, id)).filter(Boolean);
  const envoy = tradePlannerState.selectedEnvoyId ? findTradeEnvoy(gameState, tradePlannerState.selectedEnvoyId) : null;
  const fullPlan = system ? createTradeLoadPlan(gameState, selectedShips, system, tradePlannerState.outboundCommodityId, tradePlannerState.returnCommodityId, envoy, gameState.credits, false) : null;
  const partialPlan = system ? createTradeLoadPlan(gameState, selectedShips, system, tradePlannerState.outboundCommodityId, tradePlannerState.returnCommodityId, envoy, gameState.credits, true) : null;
  const financeSummary = fullPlan ? getTradePlanFinanceSummary(fullPlan, gameState.credits) : { borrowedAmount: 0, totalInterest: 0 };
  const borrowedAmount = financeSummary.borrowedAmount;
  const estimatedInterest = financeSummary.totalInterest;
  const loadPct = fullPlan ? getPercent(fullPlan.loadedUnits, fullPlan.totalCapacity || 1) : 0;
  const partialPct = partialPlan ? getPercent(partialPlan.loadedUnits, partialPlan.totalCapacity || 1) : 0;
  const fundingPct = fullPlan ? getPercent(Math.min(gameState.credits, fullPlan.totalUpfrontCost), fullPlan.totalUpfrontCost || 1) : 0;
  const idleEnvoys = getIdleTradeEnvoys(gameState);
  dom.tradePlannerContent.innerHTML = !system ? '<div class="empty">Trade planner unavailable.</div>' : `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(system.name)}</h3>
          <p class="section-subtitle">${formatDistanceLy(system.distance)} from Sol Nexus</p>
        </div>
        <span class="badge">${formatSeconds(Math.round(system.distance * BALANCE.TRADE_TIME_PER_DISTANCE * 2))} base trip</span>
      </div>
      <div class="split-grid">
        <div class="form-grid">
          <div>
            <div class="field"><label>Outbound Cargo</label></div>
            <div class="selector-grid">
              ${COMMODITIES.map((commodity) => `<button class="selector-chip choose-outbound-btn ${tradePlannerState.outboundCommodityId === commodity.id ? "active" : ""}" data-commodity-id="${commodity.id}" type="button">${renderCommodityLabel(commodity.id, system)}</button>`).join("")}
            </div>
          </div>
          <div>
            <div class="field"><label>Return Cargo</label></div>
            <div class="selector-grid">
              ${COMMODITIES.map((commodity) => `<button class="selector-chip choose-return-btn ${tradePlannerState.returnCommodityId === commodity.id ? "active" : ""}" data-commodity-id="${commodity.id}" type="button">${renderCommodityLabel(commodity.id, system)}</button>`).join("")}
            </div>
          </div>
          <div>
            <div class="field"><label>Merchant Ships</label></div>
            <div class="inline-actions"><button class="pill-btn select-all-ships-btn" type="button" ${ships.length === 0 ? "disabled" : ""}>Select All Ships</button></div>
            <div class="ship-select-grid">
              ${ships.length > 0 ? ships.map((ship) => `<button class="ship-select-btn toggle-ship-btn ${tradePlannerState.selectedShipIds.includes(ship.id) ? "active" : ""}" data-ship-id="${ship.id}" type="button"><strong style="color:${ship.nameColor}">${escapeHtml(getShipDisplayName(ship))}</strong><div class="section-subtitle">Cargo ${getShipCargoUnits(ship)} • Trip ${formatSeconds(getTradeDurationForShip(system.distance, ship))}</div></button>`).join("") : '<div class="empty">No idle merchant ships available.</div>'}
            </div>
          </div>
          <div>
            <div class="field"><label>Trade Envoy</label></div>
            <div class="selector-grid">
              <button class="selector-chip choose-envoy-btn ${!tradePlannerState.selectedEnvoyId ? "active" : ""}" data-envoy-id="" type="button">No Envoy</button>
              ${idleEnvoys.map((item) => `<button class="selector-chip choose-envoy-btn ${tradePlannerState.selectedEnvoyId === item.id ? "active" : ""}" data-envoy-id="${item.id}" type="button"><strong>${escapeHtml(item.name)}</strong><div class="section-subtitle">${escapeHtml(getEnvoySpecialtyLabel(item))} • L${getTradeEnvoyLevel(item.xp)} • ${(getTradeEnvoyBonusRate(item) * 100).toFixed(1)}%</div></button>`).join("")}
            </div>
          </div>
        </div>
        <div class="form-grid">
          <article class="notice-box">
            <h3>Mission Cost</h3>
            <p class="metric-line">Selected ships: ${selectedShips.length}</p>
            <p class="metric-line">Loaded units: ${fullPlan?.loadedUnits || 0} / ${fullPlan?.totalCapacity || 0}</p>
            <div class="progress-line progress-analytics"><div class="progress-fill analytics" style="width:${loadPct}%"></div></div>
            <p class="metric-line">Full mission cost: ${formatCredits(fullPlan?.totalUpfrontCost || 0)}</p>
            <div class="progress-line ${borrowedAmount > 0 ? "progress-timer" : "progress-progression"}"><div class="progress-fill ${borrowedAmount > 0 ? "timer" : "progression"}" style="width:${fundingPct}%"></div></div>
            <p class="metric-line">Estimated outbound sale revenue: ${formatCredits(fullPlan?.totalEstimatedOutboundRevenue || 0)}</p>
            <p class="metric-line">Estimated return cost: ${formatCredits(fullPlan?.totalEstimatedReturnCost || 0)}</p>
            <p class="metric-line">Finance shortfall: ${borrowedAmount > 0 ? formatCredits(borrowedAmount) : "None"}</p>
            <p class="metric-line">Estimated interest: ${borrowedAmount > 0 ? formatCredits(estimatedInterest) : "0 cr"}</p>
            ${envoy ? `<p class="metric-line">Envoy pricing: <strong>${escapeHtml(envoy.name)}</strong> • ${escapeHtml(getEnvoySpecialtyLabel(envoy))} • ${(getTradeEnvoyBonusRate(envoy) * 100).toFixed(1)}% better pricing on matching cargo</p>` : ""}
            <p class="metric-line">Projected result ${borrowedAmount > 0 ? "(after interest)" : ""}: <span class="${(fullPlan?.totalEstimatedProfit || 0) - estimatedInterest >= 0 ? "pos" : "neg"}">${((fullPlan?.totalEstimatedProfit || 0) - estimatedInterest) >= 0 ? "+" : ""}${formatCredits((fullPlan?.totalEstimatedProfit || 0) - estimatedInterest)}</span></p>
            ${partialPlan && partialPlan.loadedUnits > 0 ? `<p class="metric-line">Partial-load coverage: ${partialPlan.loadedUnits} / ${partialPlan.totalCapacity}</p><div class="progress-line progress-timer"><div class="progress-fill timer" style="width:${partialPct}%"></div></div>` : ""}
          </article>
          <div class="inline-actions">
            <button class="btn launch-mission-btn" data-mode="full" type="button" ${(selectedShips.length === 0 || !fullPlan || fullPlan.totalUpfrontCost > gameState.credits || fullPlan.loadedUnits <= 0) ? "disabled" : ""}>Launch Full Mission</button>
            <button class="btn secondary launch-mission-btn" data-mode="partial" type="button" ${(selectedShips.length === 0 || !partialPlan || partialPlan.loadedUnits <= 0 || partialPlan.loadedUnits >= (fullPlan?.loadedUnits || 0)) ? "disabled" : ""}>Launch Partial Load (${partialPlan?.loadedUnits || 0} units)</button>
            <button class="btn secondary launch-mission-btn" data-mode="finance" type="button" ${(selectedShips.length === 0 || !fullPlan || fullPlan.loadedUnits <= 0 || borrowedAmount <= 0) ? "disabled" : ""}>Finance Trade Mission</button>
          </div>
          <p class="section-subtitle">Escrow = estimated return cost minus estimated outbound sale revenue, never below zero.</p>
        </div>
      </div>
    </article>
  `;
}

function openTradePlanner(systemId) {
  const firstShip = getIdleMerchantShips(gameState)[0];
  tradePlannerState = {
    systemId,
    outboundCommodityId: COMMODITIES[0].id,
    returnCommodityId: COMMODITIES[1].id,
    selectedShipIds: firstShip ? [firstShip.id] : [],
    selectedEnvoyId: null
  };
  renderTradePlanner();
  dom.tradeModal.classList.remove("hidden");
  dom.tradePlannerContent.scrollTop = 0;
  syncBodyLock();
}

function closeTradePlanner() {
  tradePlannerState = null;
  dom.tradeModal.classList.add("hidden");
  syncBodyLock();
}

function renderAwaySummary(summary) {
  dom.awaySummaryList.innerHTML = `
    <li><strong>Time away:</strong> ${formatSeconds(summary.elapsedSeconds)}</li>
    <li><strong>Trade missions completed:</strong> ${summary.completedTradeMissions}</li>
    <li><strong>Credit change:</strong> <span class="${summary.creditsDelta >= 0 ? "pos" : "neg"}">${summary.creditsDelta >= 0 ? "+" : ""}${formatCredits(summary.creditsDelta)}</span></li>
    <li><strong>Systems discovered:</strong> ${summary.discoveredDelta}</li>
  `;
  dom.awayModal.classList.remove("hidden");
  syncBodyLock();
}

function renderAll() {
  syncTradeEnvoyAssignments(gameState);
  renderHeader();
  renderHub();
  renderHelp();
  renderToasts();
  if (activeSection && !(activeSection === "hangar" && activeInputLock)) {
    renderSection();
  }
  if (tradePlannerState) {
    renderTradePlanner();
  }
}

function saveAndRender() {
  syncTradeEnvoyAssignments(gameState);
  saveGameState(gameState);
  renderAll();
}

function maybeRerenderActiveSectionOnTick() {
  syncTradeEnvoyAssignments(gameState);
  renderHeader();
  renderHub();
  renderToasts();
  if (activeSection && (activeSection !== "hangar" || !activeInputLock)) {
    renderSection();
  }
}

function resetGame() {
  if (!window.confirm("Reset all progress and start a new trading post?")) {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  gameState = createNewGameState();
  activeSection = null;
  tradePlannerState = null;
  hangarExpandedShipId = null;
  hangarDrafts = {};
  saveAndRender();
}

document.body.addEventListener("click", (event) => {
  const rawTarget = event.target;
  if (!(rawTarget instanceof Element)) {
    return;
  }

  const openSectionBtn = rawTarget.closest(".open-section-btn");
  if (openSectionBtn instanceof HTMLElement) {
    openSection(openSectionBtn.dataset.section);
    return;
  }

  if (rawTarget.id === "closeSectionModalBtn") {
    closeSection();
    return;
  }
  if (rawTarget.id === "closeTradeModalBtn") {
    closeTradePlanner();
    return;
  }
  if (rawTarget.id === "openHelpBtn") {
    dom.helpModal.classList.remove("hidden");
    syncBodyLock();
    return;
  }
  if (rawTarget.id === "closeHelpModalBtn") {
    dom.helpModal.classList.add("hidden");
    syncBodyLock();
    return;
  }
  if (rawTarget.id === "closeAwayModalBtn") {
    dom.awayModal.classList.add("hidden");
    syncBodyLock();
    return;
  }

  const planTradeBtn = rawTarget.closest(".plan-trade-btn");
  if (planTradeBtn instanceof HTMLElement) {
    openTradePlanner(planTradeBtn.dataset.systemId);
    return;
  }

  const sortBtn = rawTarget.closest(".sort-systems-btn");
  if (sortBtn instanceof HTMLElement) {
    navigationSort = sortBtn.dataset.sort || "distance";
    if (activeSection === "navigation") {
      renderSection();
    }
    return;
  }

  const launchScoutBtn = rawTarget.closest('[data-action="launch-scout"]');
  if (launchScoutBtn instanceof HTMLElement) {
    const result = launchScoutMission(gameState);
    if (!result.ok) {
      addToast(gameState, "Scout Mission Blocked", result.message);
    }
    saveAndRender();
    return;
  }

  const buyShipBtn = rawTarget.closest('[data-action="buy-merchant-ship"]');
  if (buyShipBtn instanceof HTMLElement) {
    const result = buyMerchantShip(gameState);
    if (!result.ok) addToast(gameState, "Purchase Blocked", result.message);
    saveAndRender();
    return;
  }

  const buyScoutBtn = rawTarget.closest('[data-action="buy-scout-ship"]');
  if (buyScoutBtn instanceof HTMLElement) {
    const result = buyScoutShip(gameState);
    if (!result.ok) addToast(gameState, "Purchase Blocked", result.message);
    saveAndRender();
    return;
  }

  const resetBtn = rawTarget.closest('[data-action="reset-game"]');
  if (resetBtn instanceof HTMLElement) {
    resetGame();
    return;
  }

  const toggleHangarBtn = rawTarget.closest(".toggle-hangar-btn");
  if (toggleHangarBtn instanceof HTMLElement) {
    const shipId = toggleHangarBtn.dataset.shipId;
    hangarExpandedShipId = hangarExpandedShipId === shipId ? null : shipId;
    renderSection();
    return;
  }

  const shipColorBtn = rawTarget.closest(".choose-ship-color-btn");
  if (shipColorBtn instanceof HTMLElement) {
    const shipId = shipColorBtn.dataset.shipId;
    hangarDrafts[shipId] = { ...(hangarDrafts[shipId] || { name: findMerchantShip(gameState, shipId)?.name || "", color: findMerchantShip(gameState, shipId)?.nameColor || SHIP_NAME_COLORS[0] }), color: shipColorBtn.dataset.color };
    renderSection();
    return;
  }

  const saveShipStyleBtn = rawTarget.closest(".save-ship-style-btn");
  if (saveShipStyleBtn instanceof HTMLElement) {
    const shipId = saveShipStyleBtn.dataset.shipId;
    const draft = hangarDrafts[shipId] || { name: findMerchantShip(gameState, shipId)?.name || "", color: findMerchantShip(gameState, shipId)?.nameColor || SHIP_NAME_COLORS[0] };
    const result = updateMerchantShipStyle(gameState, shipId, draft.name, draft.color);
    if (!result.ok) addToast(gameState, "Customization Blocked", result.message);
    saveAndRender();
    return;
  }

  const upgradeBtn = rawTarget.closest(".start-upgrade-btn");
  if (upgradeBtn instanceof HTMLElement) {
    const result = startShipUpgrade(gameState, upgradeBtn.dataset.shipId, upgradeBtn.dataset.upgradeType);
    if (!result.ok) addToast(gameState, "Upgrade Blocked", result.message);
    saveAndRender();
    return;
  }

  if (tradePlannerState) {
    const outboundBtn = rawTarget.closest(".choose-outbound-btn");
    if (outboundBtn instanceof HTMLElement) {
      tradePlannerState.outboundCommodityId = outboundBtn.dataset.commodityId;
      renderTradePlanner();
      return;
    }
    const returnBtn = rawTarget.closest(".choose-return-btn");
    if (returnBtn instanceof HTMLElement) {
      tradePlannerState.returnCommodityId = returnBtn.dataset.commodityId;
      renderTradePlanner();
      return;
    }
    const shipBtn = rawTarget.closest(".toggle-ship-btn");
    if (shipBtn instanceof HTMLElement) {
      const shipId = shipBtn.dataset.shipId;
      const set = new Set(tradePlannerState.selectedShipIds);
      if (set.has(shipId)) set.delete(shipId); else set.add(shipId);
      tradePlannerState.selectedShipIds = [...set];
      renderTradePlanner();
      return;
    }
    const selectAllBtn = rawTarget.closest(".select-all-ships-btn");
    if (selectAllBtn instanceof HTMLElement) {
      tradePlannerState.selectedShipIds = getIdleMerchantShips(gameState).map((ship) => ship.id);
      renderTradePlanner();
      return;
    }
    const envoyBtn = rawTarget.closest(".choose-envoy-btn");
    if (envoyBtn instanceof HTMLElement) {
      tradePlannerState.selectedEnvoyId = envoyBtn.dataset.envoyId || null;
      renderTradePlanner();
      return;
    }
    const launchBtn = rawTarget.closest(".launch-mission-btn");
    if (launchBtn instanceof HTMLElement) {
      const result = launchTradeMissionBatch(gameState, {
        systemId: tradePlannerState.systemId,
        outboundCommodityId: tradePlannerState.outboundCommodityId,
        returnCommodityId: tradePlannerState.returnCommodityId,
        shipIds: tradePlannerState.selectedShipIds,
        envoyId: tradePlannerState.selectedEnvoyId,
        mode: launchBtn.dataset.mode
      });
      if (!result.ok) {
        addToast(gameState, "Mission Blocked", result.message);
      } else {
        closeTradePlanner();
      }
      saveAndRender();
      return;
    }
  }
});

document.body.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.classList.contains("hangar-name-input")) {
    const input = target;
    const shipId = input.dataset.shipId;
    const ship = findMerchantShip(gameState, shipId);
    hangarDrafts[shipId] = {
      ...(hangarDrafts[shipId] || { color: ship?.nameColor || SHIP_NAME_COLORS[0] }),
      name: input.value,
      color: (hangarDrafts[shipId] && hangarDrafts[shipId].color) || ship?.nameColor || SHIP_NAME_COLORS[0]
    };
  }
});

document.body.addEventListener("focusin", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.classList.contains("hangar-name-input")) {
    activeInputLock = true;
  }
});

document.body.addEventListener("focusout", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.classList.contains("hangar-name-input")) {
    activeInputLock = false;
  }
});

setInterval(() => {
  const now = Date.now();
  const elapsed = Math.max(1, Math.floor((now - lastTickMs) / 1000));
  lastTickMs = now;
  const result = advanceGameBySeconds(gameState, elapsed);
  saveGameState(gameState);
  if (result.majorStateChange) {
    renderAll();
  } else {
    maybeRerenderActiveSectionOnTick();
  }
}, TICK_INTERVAL_MS);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
      registration.update();
    } catch (error) {
      console.warn("Service worker registration failed", error);
    }
  });
}

renderAll();
saveGameState(gameState);
if (offlineSummary) {
  renderAwaySummary(offlineSummary);
}
