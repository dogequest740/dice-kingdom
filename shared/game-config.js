const K = 1000;
const M = 1000000;
const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MAX_LEVEL = 50;

export const RESOURCE_META = {
  food: { label: "Food", icon: "🍖", capped: true },
  wood: { label: "Wood", icon: "🪵", capped: true },
  stone: { label: "Stone", icon: "🪨", capped: true },
  crystals: { label: "Crystals", icon: "💎", capped: false },
};

const CASTLE_LEVEL_ROWS = [
  { level: 1, power: 10, cost: { food: 10, wood: 10, stone: 0, crystals: 0 }, durationSec: 1, requires: {} },
  { level: 2, power: 18, cost: { food: 1.5 * K, wood: 1.5 * K, stone: 0, crystals: 0 }, durationSec: 2, requires: { sawmill: 1 } },
  { level: 3, power: 40, cost: { food: 5 * K, wood: 5 * K, stone: 0, crystals: 0 }, durationSec: 1 * MIN, requires: { storage: 1 } },
  { level: 4, power: 60, cost: { food: 6 * K, wood: 6 * K, stone: 0, crystals: 0 }, durationSec: 20 * MIN, requires: {} },
  { level: 5, power: 80, cost: { food: 7.5 * K, wood: 7.5 * K, stone: 0, crystals: 0 }, durationSec: 40 * MIN, requires: { storage: 4 } },
  { level: 6, power: 100, cost: { food: 9 * K, wood: 9 * K, stone: 0, crystals: 0 }, durationSec: 1 * HOUR, requires: {} },
  { level: 7, power: 140, cost: { food: 11 * K, wood: 11 * K, stone: 7.5 * K, crystals: 0 }, durationSec: 1 * HOUR + 30 * MIN, requires: { storage: 6, farm: 6 } },
  { level: 8, power: 180, cost: { food: 13 * K, wood: 13 * K, stone: 9 * K, crystals: 0 }, durationSec: 1 * HOUR + 45 * MIN, requires: {} },
  { level: 9, power: 220, cost: { food: 16 * K, wood: 16 * K, stone: 11 * K, crystals: 0 }, durationSec: 2 * HOUR, requires: { storage: 8, sawmill: 8 } },
  { level: 10, power: 270, cost: { food: 20 * K, wood: 20 * K, stone: 14 * K, crystals: 0 }, durationSec: 2 * HOUR + 30 * MIN, requires: {} },
  { level: 11, power: 320, cost: { food: 25 * K, wood: 25 * K, stone: 18 * K, crystals: 0 }, durationSec: 3 * HOUR + 30 * MIN, requires: { storage: 10, sawmill: 10, farm: 10 } },
  { level: 12, power: 380, cost: { food: 30 * K, wood: 30 * K, stone: 25 * K, crystals: 0 }, durationSec: 4 * HOUR, requires: { storage: 11 } },
  { level: 13, power: 440, cost: { food: 35 * K, wood: 35 * K, stone: 25 * K, crystals: 0 }, durationSec: 5 * HOUR, requires: {} },
  { level: 14, power: 520, cost: { food: 45 * K, wood: 45 * K, stone: 30 * K, crystals: 0 }, durationSec: 6 * HOUR + 30 * MIN, requires: { storage: 13 } },
  { level: 15, power: 620, cost: { food: 55 * K, wood: 55 * K, stone: 40 * K, crystals: 0 }, durationSec: 8 * HOUR, requires: { storage: 14, farm: 13 } },
  { level: 16, power: 720, cost: { food: 65 * K, wood: 65 * K, stone: 45 * K, crystals: 0 }, durationSec: 10 * HOUR, requires: {} },
  { level: 17, power: 850, cost: { food: 80 * K, wood: 80 * K, stone: 55 * K, crystals: 0 }, durationSec: 11 * HOUR, requires: { storage: 16 } },
  { level: 18, power: 1000, cost: { food: 100 * K, wood: 100 * K, stone: 70 * K, crystals: 0 }, durationSec: 13 * HOUR, requires: {} },
  { level: 19, power: 1150, cost: { food: 120 * K, wood: 120 * K, stone: 80 * K, crystals: 0 }, durationSec: 14 * HOUR, requires: { storage: 18, sawmill: 18 } },
  { level: 20, power: 1350, cost: { food: 150 * K, wood: 150 * K, stone: 110 * K, crystals: 0 }, durationSec: 16 * HOUR, requires: { storage: 19 } },
  { level: 21, power: 1600, cost: { food: 190 * K, wood: 190 * K, stone: 130 * K, crystals: 0 }, durationSec: 17 * HOUR, requires: { storage: 20, farm: 20 } },
  { level: 22, power: 1900, cost: { food: 240 * K, wood: 240 * K, stone: 170 * K, crystals: 0 }, durationSec: 19 * HOUR, requires: {} },
  { level: 23, power: 2250, cost: { food: 300 * K, wood: 300 * K, stone: 220 * K, crystals: 0 }, durationSec: 22 * HOUR, requires: { storage: 22 } },
  { level: 24, power: 2700, cost: { food: 380 * K, wood: 380 * K, stone: 260 * K, crystals: 0 }, durationSec: 1 * DAY, requires: {} },
  { level: 25, power: 3200, cost: { food: 480 * K, wood: 480 * K, stone: 340 * K, crystals: 0 }, durationSec: 1 * DAY + 3 * HOUR, requires: { storage: 24, quarry: 16 } },
  { level: 26, power: 3800, cost: { food: 600 * K, wood: 600 * K, stone: 420 * K, crystals: 0 }, durationSec: 1 * DAY + 6 * HOUR, requires: {} },
  { level: 27, power: 4600, cost: { food: 750 * K, wood: 750 * K, stone: 550 * K, crystals: 0 }, durationSec: 1 * DAY + 9 * HOUR, requires: { storage: 26 } },
  { level: 28, power: 5500, cost: { food: 950 * K, wood: 950 * K, stone: 650 * K, crystals: 0 }, durationSec: 1 * DAY + 12 * HOUR, requires: {} },
  { level: 29, power: 6600, cost: { food: 1.2 * M, wood: 1.2 * M, stone: 850 * K, crystals: 0 }, durationSec: 1 * DAY + 15 * HOUR, requires: { storage: 28 } },
  { level: 30, power: 8000, cost: { food: 1.5 * M, wood: 1.5 * M, stone: 1.1 * M, crystals: 0 }, durationSec: 2 * DAY + 9 * HOUR, requires: {} },
  { level: 31, power: 9500, cost: { food: 2.2 * M, wood: 2.2 * M, stone: 1.5 * M, crystals: 0 }, durationSec: 2 * DAY + 15 * HOUR, requires: { storage: 30, farm: 28 } },
  { level: 32, power: 11500, cost: { food: 2.6 * M, wood: 2.6 * M, stone: 1.8 * M, crystals: 0 }, durationSec: 3 * DAY, requires: { storage: 31 } },
  { level: 33, power: 13500, cost: { food: 3 * M, wood: 3 * M, stone: 2.2 * M, crystals: 0 }, durationSec: 3 * DAY + 12 * HOUR, requires: { storage: 32, sawmill: 30 } },
  { level: 34, power: 16000, cost: { food: 5 * M, wood: 5 * M, stone: 3.6 * M, crystals: 50 }, durationSec: 4 * DAY, requires: {} },
  { level: 35, power: 20000, cost: { food: 8.5 * M, wood: 8.5 * M, stone: 6 * M, crystals: 100 }, durationSec: 4 * DAY + 12 * HOUR, requires: { storage: 34 } },
  { level: 36, power: 27000, cost: { food: 14 * M, wood: 14 * M, stone: 10 * M, crystals: 150 }, durationSec: 5 * DAY, requires: {} },
  { level: 37, power: 38000, cost: { food: 22 * M, wood: 22 * M, stone: 15 * M, crystals: 200 }, durationSec: 5 * DAY + 12 * HOUR, requires: { storage: 36, farm: 34 } },
  { level: 38, power: 54000, cost: { food: 28 * M, wood: 28 * M, stone: 20 * M, crystals: 300 }, durationSec: 6 * DAY, requires: { storage: 37 } },
  { level: 39, power: 74000, cost: { food: 36 * M, wood: 36 * M, stone: 26 * M, crystals: 400 }, durationSec: 7 * DAY, requires: {} },
  { level: 40, power: 100000, cost: { food: 48 * M, wood: 48 * M, stone: 34 * M, crystals: 500 }, durationSec: 7 * DAY + 12 * HOUR, requires: { storage: 39 } },
  { level: 41, power: 135000, cost: { food: 60 * M, wood: 60 * M, stone: 42 * M, crystals: 600 }, durationSec: 8 * DAY + 12 * HOUR, requires: { storage: 40, farm: 37, quarry: 37 } },
  { level: 42, power: 175000, cost: { food: 70 * M, wood: 70 * M, stone: 50 * M, crystals: 700 }, durationSec: 9 * DAY + 12 * HOUR, requires: {} },
  { level: 43, power: 220000, cost: { food: 80 * M, wood: 80 * M, stone: 55 * M, crystals: 800 }, durationSec: 10 * DAY, requires: { storage: 42 } },
  { level: 44, power: 270000, cost: { food: 95 * M, wood: 95 * M, stone: 65 * M, crystals: 900 }, durationSec: 12 * DAY, requires: { storage: 43 } },
  { level: 45, power: 330000, cost: { food: 110 * M, wood: 110 * M, stone: 80 * M, crystals: 1000 }, durationSec: 13 * DAY, requires: {} },
  { level: 46, power: 400000, cost: { food: 130 * M, wood: 130 * M, stone: 95 * M, crystals: 1100 }, durationSec: 14 * DAY, requires: { storage: 45 } },
  { level: 47, power: 480000, cost: { food: 150 * M, wood: 150 * M, stone: 110 * M, crystals: 1200 }, durationSec: 16 * DAY, requires: {} },
  { level: 48, power: 560000, cost: { food: 170 * M, wood: 170 * M, stone: 120 * M, crystals: 1500 }, durationSec: 18 * DAY, requires: { storage: 47 } },
  { level: 49, power: 660000, cost: { food: 250 * M, wood: 250 * M, stone: 300 * M, crystals: 2000 }, durationSec: 20 * DAY, requires: {} },
  { level: 50, power: 840000, cost: { food: 300 * M, wood: 300 * M, stone: 400 * M, crystals: 20000 }, durationSec: 25 * DAY, requires: { storage: 49 } },
];

const CASTLE_LEVELS = Object.fromEntries(
  CASTLE_LEVEL_ROWS.map((row) => [
    row.level,
    {
      power: Math.floor(row.power),
      cost: {
        food: Math.floor(row.cost.food || 0),
        wood: Math.floor(row.cost.wood || 0),
        stone: Math.floor(row.cost.stone || 0),
        crystals: Math.floor(row.cost.crystals || 0),
      },
      durationSec: Math.max(1, Math.floor(row.durationSec)),
      requires: row.requires || {},
    },
  ])
);

const NON_CASTLE_BALANCE = {
  farm: {
    costRatios: { food: 0.44, wood: 0.36, stone: 0.1 },
    buildDurationSec: 20,
    durationRatio: 0.35,
    powerBase: 7,
    powerPerLevel: 4,
    crystalRatio: 0.1,
  },
  sawmill: {
    costRatios: { food: 0.36, wood: 0.44, stone: 0.1 },
    buildDurationSec: 20,
    durationRatio: 0.35,
    powerBase: 7,
    powerPerLevel: 4,
    crystalRatio: 0.1,
  },
  quarry: {
    costRatios: { food: 0.34, wood: 0.28, stone: 0.52 },
    buildDurationSec: 30,
    durationRatio: 0.42,
    powerBase: 9,
    powerPerLevel: 5,
    crystalRatio: 0.12,
  },
  storage: {
    costRatios: { food: 0.28, wood: 0.32, stone: 0.38 },
    buildDurationSec: 40,
    durationRatio: 0.5,
    powerBase: 6,
    powerPerLevel: 3,
    crystalRatio: 0.15,
  },
};

export const BUILDINGS = [
  {
    id: "castle",
    name: "Castle",
    icon: "🏰",
    desc: "Main building. Unlocks higher levels for all structures.",
    pos: { x: 70, y: 67 },
    baseBuildCost: { wood: 500, stone: 400, food: 260 },
    baseUpgradeCost: { wood: 180, stone: 165, food: 120 },
    capacityPerLevel: 180,
    productionPerLevel: null,
  },
  {
    id: "farm",
    name: "Farm",
    icon: "🌾",
    desc: "Generates food over time. Tap bubble to collect.",
    pos: { x: 26, y: 31 },
    baseBuildCost: { food: 60, wood: 40, stone: 0, crystals: 0 },
    baseUpgradeCost: { wood: 70, food: 48 },
    productionPerLevel: { food: 2.4 },
  },
  {
    id: "sawmill",
    name: "Sawmill",
    icon: "🪵",
    desc: "Generates wood over time. Tap bubble to collect.",
    pos: { x: 72, y: 31 },
    baseBuildCost: { food: 55, wood: 30, stone: 0, crystals: 0 },
    baseUpgradeCost: { food: 58, wood: 44 },
    productionPerLevel: { wood: 2.1 },
  },
  {
    id: "quarry",
    name: "Quarry",
    icon: "🪨",
    desc: "Generates stone over time. Tap bubble to collect.",
    pos: { x: 23, y: 49 },
    baseBuildCost: { food: 90, wood: 70, stone: 0, crystals: 0 },
    baseUpgradeCost: { wood: 95, food: 64, stone: 48 },
    productionPerLevel: { stone: 1.7 },
  },
  {
    id: "storage",
    name: "Storage",
    icon: "📦",
    desc: "Increases storage capacity for food, wood and stone.",
    pos: { x: 23, y: 67 },
    baseBuildCost: { food: 80, wood: 70, stone: 0, crystals: 0 },
    baseUpgradeCost: { wood: 92, stone: 86, food: 62 },
    capacityPerLevel: 420,
    productionPerLevel: null,
  },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((building) => [building.id, building]));
export const PRODUCER_BUILDINGS = BUILDINGS.filter((building) => Boolean(building.productionPerLevel));
export const CORE_BUILDING_IDS = BUILDINGS.map((building) => building.id);

function normalizeUpgradeTask(rawTask) {
  if (!rawTask || typeof rawTask !== "object") return null;
  const buildingId = String(rawTask.buildingId || "");
  if (!BUILDING_BY_ID[buildingId]) return null;
  const fromLevel = Math.floor(Number(rawTask.fromLevel || 0));
  const toLevel = Math.floor(Number(rawTask.toLevel || 0));
  const startAt = Number(rawTask.startAt || 0);
  const finishAt = Number(rawTask.finishAt || 0);
  const durationSec = Math.floor(Number(rawTask.durationSec || 0));
  const cost = rawTask.cost && typeof rawTask.cost === "object" ? rawTask.cost : {};

  if (!Number.isFinite(startAt) || !Number.isFinite(finishAt) || finishAt <= startAt) return null;
  if (!Number.isFinite(fromLevel) || !Number.isFinite(toLevel) || toLevel <= fromLevel) return null;

  return {
    buildingId,
    fromLevel: Math.max(0, fromLevel),
    toLevel: Math.max(1, toLevel),
    startAt,
    finishAt,
    durationSec: Math.max(1, durationSec || Math.floor((finishAt - startAt) / 1000)),
    cost: {
      food: Math.max(0, Math.floor(Number(cost.food || 0))),
      wood: Math.max(0, Math.floor(Number(cost.wood || 0))),
      stone: Math.max(0, Math.floor(Number(cost.stone || 0))),
      crystals: Math.max(0, Math.floor(Number(cost.crystals || 0))),
    },
  };
}

export function createDefaultState() {
  return {
    resources: { food: 120, wood: 90, stone: 65, crystals: 200 },
    buildings: {
      castle: 1,
      farm: 0,
      sawmill: 0,
      quarry: 0,
      storage: 0,
    },
    claimables: {
      farm: 0,
      sawmill: 0,
      quarry: 0,
    },
    upgradeTask: null,
    selected: "castle",
    lastTick: Date.now(),
  };
}

function toFinitePositiveNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeResources(rawResources, baseResources) {
  const resources = { ...baseResources, ...(rawResources || {}) };
  if (Number.isFinite(rawResources?.wheat) && !Number.isFinite(rawResources?.food)) {
    resources.food = Number(rawResources.wheat);
  }

  for (const id of Object.keys(baseResources)) {
    resources[id] = toFinitePositiveNumber(resources[id], baseResources[id]);
  }
  return resources;
}

function normalizeBuildings(rawBuildings, baseBuildings) {
  const buildings = { ...baseBuildings, ...(rawBuildings || {}) };
  if (Number.isFinite(rawBuildings?.warehouse) && !Number.isFinite(rawBuildings?.storage)) {
    buildings.storage = Number(rawBuildings.warehouse);
  }

  const normalized = {};
  for (const id of Object.keys(baseBuildings)) {
    normalized[id] = Math.floor(toFinitePositiveNumber(buildings[id], baseBuildings[id]));
  }
  return normalized;
}

function normalizeClaimables(rawClaimables, baseClaimables) {
  const claimables = { ...baseClaimables, ...(rawClaimables || {}) };
  const normalized = {};
  for (const id of Object.keys(baseClaimables)) {
    normalized[id] = toFinitePositiveNumber(claimables[id], baseClaimables[id]);
  }
  return normalized;
}

export function sanitizeState(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== "object") return base;

  const selected = raw.selected && BUILDING_BY_ID[raw.selected] ? raw.selected : base.selected;
  const lastTick = Number.isFinite(raw.lastTick) ? raw.lastTick : Date.now();
  const resources = normalizeResources(raw.resources, base.resources);
  const buildings = normalizeBuildings(raw.buildings, base.buildings);
  const claimables = normalizeClaimables(raw.claimables, base.claimables);
  const upgradeTask = normalizeUpgradeTask(raw.upgradeTask);

  return { resources, buildings, claimables, upgradeTask, selected, lastTick };
}

export function getLevel(state, buildingId) {
  return Math.max(0, Math.floor(state.buildings?.[buildingId] || 0));
}

function getCastleLevelPower(level) {
  return CASTLE_LEVELS[level]?.power || CASTLE_LEVELS[MAX_LEVEL].power;
}

export function getBuildingPowerAtLevel(buildingId, level) {
  if (level <= 0) return 0;
  if (buildingId === "castle") return getCastleLevelPower(level);

  const tune = NON_CASTLE_BALANCE[buildingId];
  if (!tune) return 0;
  return tune.powerBase + Math.max(0, level - 1) * tune.powerPerLevel;
}

export function getPower(state) {
  let power = 0;
  for (const building of BUILDINGS) {
    power += getBuildingPowerAtLevel(building.id, getLevel(state, building.id));
  }
  return Math.floor(power);
}

export function getCharacterLevel(state) {
  const power = getPower(state);
  return 1 + Math.floor(power / 30);
}

export function getCapacity(state) {
  let capacity = 320;
  for (const building of BUILDINGS) {
    const level = getLevel(state, building.id);
    if (level > 0 && building.capacityPerLevel) {
      capacity += building.capacityPerLevel * level;
    }
  }
  return capacity;
}

function clampDuration(durationSec) {
  return Math.max(1, Math.min(Math.floor(durationSec), 30 * DAY));
}

function normalizedCost(cost) {
  return {
    food: Math.max(0, Math.floor(cost.food || 0)),
    wood: Math.max(0, Math.floor(cost.wood || 0)),
    stone: Math.max(0, Math.floor(cost.stone || 0)),
    crystals: Math.max(0, Math.floor(cost.crystals || 0)),
  };
}

export function getUpgradeSpec(state, buildingId) {
  const building = BUILDING_BY_ID[buildingId];
  if (!building) return null;

  const currentLevel = getLevel(state, buildingId);
  const nextLevel = currentLevel + 1;
  if (nextLevel > MAX_LEVEL) return null;

  if (buildingId === "castle") {
    const row = CASTLE_LEVELS[nextLevel];
    if (!row) return null;
    return {
      nextLevel,
      durationSec: row.durationSec,
      cost: normalizedCost(row.cost),
      requirements: { ...row.requires },
    };
  }

  const tune = NON_CASTLE_BALANCE[buildingId];
  const castleRow = CASTLE_LEVELS[nextLevel] || CASTLE_LEVELS[MAX_LEVEL];
  if (!tune || !castleRow) return null;

  if (nextLevel === 1) {
    return {
      nextLevel,
      durationSec: tune.buildDurationSec,
      cost: normalizedCost(building.baseBuildCost),
      requirements: {},
    };
  }

  const cost = {
    food: Math.floor(castleRow.cost.food * tune.costRatios.food),
    wood: Math.floor(castleRow.cost.wood * tune.costRatios.wood),
    stone: Math.floor(castleRow.cost.stone * tune.costRatios.stone),
    crystals: Math.floor(castleRow.cost.crystals * tune.crystalRatio),
  };

  return {
    nextLevel,
    durationSec: clampDuration(castleRow.durationSec * tune.durationRatio),
    cost: normalizedCost(cost),
    requirements: {},
  };
}

export function hasEnoughResources(state, cost) {
  return Object.entries(cost).every(([resource, amount]) => (state.resources?.[resource] || 0) >= amount);
}

export function spendResources(state, cost) {
  for (const [resource, amount] of Object.entries(cost)) {
    state.resources[resource] = Math.max(0, (state.resources[resource] || 0) - amount);
  }
}

function getCastleRuleIssues(state, targetLevel) {
  const issues = [];
  const row = CASTLE_LEVELS[targetLevel];
  if (!row) {
    issues.push(`Castle max level is ${MAX_LEVEL}`);
    return issues;
  }

  for (const [buildingId, minLevel] of Object.entries(row.requires || {})) {
    if (getLevel(state, buildingId) < minLevel) {
      const name = BUILDING_BY_ID[buildingId]?.name || buildingId;
      issues.push(`Requires ${name} Lv.${minLevel}`);
    }
  }

  const minCharacterLevel = Math.max(1, targetLevel - 1);
  const currentCharacterLevel = getCharacterLevel(state);
  if (currentCharacterLevel < minCharacterLevel) {
    issues.push(`Requires character level ${minCharacterLevel}`);
  }
  return issues;
}

function getNonCastleRuleIssues(state, buildingId, targetLevel) {
  const issues = [];
  if (targetLevel === 1) {
    if (buildingId === "sawmill" && getLevel(state, "farm") < 1) {
      issues.push("Requires Farm Lv.1");
    }
    if (buildingId === "quarry" && getLevel(state, "sawmill") < 1) {
      issues.push("Requires Sawmill Lv.1");
    }
    if (buildingId === "storage" && getLevel(state, "farm") < 1) {
      issues.push("Requires Farm Lv.1");
    }
  }

  const castleLevel = getLevel(state, "castle");
  if (targetLevel > castleLevel) {
    issues.push(`Upgrade Castle to Lv.${targetLevel} first`);
  }

  const minCharacterLevel = Math.max(1, Math.ceil(targetLevel * 0.35));
  if (getCharacterLevel(state) < minCharacterLevel) {
    issues.push(`Requires character level ${minCharacterLevel}`);
  }

  if (targetLevel > 1 && ["farm", "sawmill", "quarry"].includes(buildingId)) {
    const requiredStorage = Math.max(1, Math.floor(targetLevel / 2));
    if (getLevel(state, "storage") < requiredStorage) {
      issues.push(`Requires Storage Lv.${requiredStorage}`);
    }
  }

  return issues;
}

export function getActiveUpgrade(state, nowTs = Date.now()) {
  const task = normalizeUpgradeTask(state.upgradeTask);
  if (!task) return null;
  const remainingSec = Math.max(0, Math.ceil((task.finishAt - nowTs) / 1000));
  return {
    ...task,
    remainingSec,
    isComplete: remainingSec <= 0,
  };
}

export function getUpgradeReadiness(state, buildingId, nowTs = Date.now()) {
  const spec = getUpgradeSpec(state, buildingId);
  if (!spec) {
    return {
      cost: {},
      durationSec: 0,
      nextLevel: getLevel(state, buildingId) + 1,
      canAfford: false,
      ruleIssues: [`Max level ${MAX_LEVEL} reached`],
      canUpgrade: false,
    };
  }

  const nextLevel = spec.nextLevel;
  const ruleIssues = buildingId === "castle" ? getCastleRuleIssues(state, nextLevel) : getNonCastleRuleIssues(state, buildingId, nextLevel);
  const activeUpgrade = getActiveUpgrade(state, nowTs);
  if (activeUpgrade) {
    if (activeUpgrade.buildingId === buildingId) {
      ruleIssues.push("Upgrade already in progress");
    } else {
      const busyName = BUILDING_BY_ID[activeUpgrade.buildingId]?.name || activeUpgrade.buildingId;
      ruleIssues.push(`${busyName} upgrade is in progress`);
    }
  }

  const canAfford = hasEnoughResources(state, spec.cost);
  return {
    cost: spec.cost,
    durationSec: spec.durationSec,
    nextLevel,
    canAfford,
    ruleIssues,
    canUpgrade: canAfford && ruleIssues.length === 0,
  };
}

function isCappedResource(resource) {
  return RESOURCE_META[resource]?.capped === true;
}

export function getProductionPerSec(state) {
  const total = { food: 0, wood: 0, stone: 0, crystals: 0 };
  for (const building of PRODUCER_BUILDINGS) {
    const level = getLevel(state, building.id);
    if (level <= 0) continue;
    for (const [resource, amount] of Object.entries(building.productionPerLevel)) {
      total[resource] += amount * level;
    }
  }
  return total;
}

function completeUpgradeIfReady(state, nowTs) {
  const task = normalizeUpgradeTask(state.upgradeTask);
  if (!task) return false;
  if (nowTs < task.finishAt) {
    state.upgradeTask = task;
    return false;
  }

  const currentLevel = getLevel(state, task.buildingId);
  if (currentLevel < task.toLevel) {
    state.buildings[task.buildingId] = task.toLevel;
  }
  state.upgradeTask = null;
  return true;
}

export function applyProduction(state, nowTs = Date.now()) {
  const elapsed = Math.floor((nowTs - state.lastTick) / 1000);
  let changed = false;

  if (elapsed > 0) {
    for (const building of PRODUCER_BUILDINGS) {
      const level = getLevel(state, building.id);
      if (level <= 0) continue;
      for (const amount of Object.values(building.productionPerLevel)) {
        state.claimables[building.id] = toFinitePositiveNumber(state.claimables[building.id], 0) + amount * level * elapsed;
      }
    }
    state.lastTick += elapsed * 1000;
    changed = true;
  }

  if (completeUpgradeIfReady(state, nowTs)) {
    changed = true;
  }
  return changed;
}

export function startUpgrade(state, buildingId, nowTs = Date.now()) {
  const readiness = getUpgradeReadiness(state, buildingId, nowTs);
  if (!readiness.canUpgrade) {
    return { ok: false, readiness };
  }

  const currentLevel = getLevel(state, buildingId);
  spendResources(state, readiness.cost);
  state.upgradeTask = {
    buildingId,
    fromLevel: currentLevel,
    toLevel: readiness.nextLevel,
    startAt: nowTs,
    finishAt: nowTs + readiness.durationSec * 1000,
    durationSec: readiness.durationSec,
    cost: readiness.cost,
  };
  return { ok: true, readiness, task: state.upgradeTask };
}

export function getClaimableForBuilding(state, buildingId) {
  const building = BUILDING_BY_ID[buildingId];
  if (!building || !building.productionPerLevel) return null;
  const level = getLevel(state, building.id);
  if (level <= 0) return null;

  const storedRaw = toFinitePositiveNumber(state.claimables?.[buildingId], 0);
  const available = Math.floor(storedRaw);
  if (available <= 0) return null;

  const [resource] = Object.keys(building.productionPerLevel);
  let collectible = available;
  if (isCappedResource(resource)) {
    const capacity = getCapacity(state);
    const freeSpace = Math.max(0, capacity - toFinitePositiveNumber(state.resources[resource], 0));
    collectible = Math.min(collectible, freeSpace);
  }

  return {
    resource,
    available,
    collectible: Math.max(0, Math.floor(collectible)),
    storedRaw,
  };
}

export function getCollectables(state) {
  const collectables = {};
  for (const building of PRODUCER_BUILDINGS) {
    const info = getClaimableForBuilding(state, building.id);
    if (info && info.collectible > 0) {
      collectables[building.id] = info;
    }
  }
  return collectables;
}

export function collectFromBuilding(state, buildingId) {
  const info = getClaimableForBuilding(state, buildingId);
  if (!info) {
    return { collected: {}, collectedTotal: 0, reason: "nothing_to_collect" };
  }

  if (info.collectible <= 0) {
    return { collected: {}, collectedTotal: 0, reason: "storage_full" };
  }

  const collected = { [info.resource]: info.collectible };
  state.resources[info.resource] = toFinitePositiveNumber(state.resources[info.resource], 0) + info.collectible;
  state.claimables[buildingId] = Math.max(0, toFinitePositiveNumber(state.claimables[buildingId], 0) - info.collectible);

  return {
    collected,
    collectedTotal: info.collectible,
    reason: null,
  };
}

export function toClientState(state) {
  const activeUpgrade = getActiveUpgrade(state, Date.now());
  return {
    resources: {
      food: Number(state.resources.food || 0),
      wood: Number(state.resources.wood || 0),
      stone: Number(state.resources.stone || 0),
      crystals: Number(state.resources.crystals || 0),
    },
    buildings: { ...state.buildings },
    claimables: { ...state.claimables },
    upgradeTask: activeUpgrade
      ? {
          buildingId: activeUpgrade.buildingId,
          fromLevel: activeUpgrade.fromLevel,
          toLevel: activeUpgrade.toLevel,
          startAt: activeUpgrade.startAt,
          finishAt: activeUpgrade.finishAt,
          durationSec: activeUpgrade.durationSec,
          remainingSec: activeUpgrade.remainingSec,
        }
      : null,
    selected: state.selected,
    lastTick: state.lastTick,
  };
}
