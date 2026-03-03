export const RESOURCE_META = {
  food: { label: "Food", icon: "🍖", capped: true },
  wood: { label: "Wood", icon: "🪵", capped: true },
  stone: { label: "Stone", icon: "🪨", capped: true },
  crystals: { label: "Crystals", icon: "💎", capped: false },
};

export const BUILDINGS = [
  {
    id: "castle",
    name: "Castle",
    icon: "🏰",
    desc: "Main building. Unlocks higher upgrade levels for all buildings.",
    pos: { x: 50, y: 22 },
    baseBuildCost: { wood: 500, stone: 400, food: 260 },
    baseUpgradeCost: { wood: 180, stone: 165, food: 120 },
    capacityPerLevel: 180,
    basePower: 40,
    powerPerLevel: 18,
  },
  {
    id: "farm",
    name: "Farm",
    icon: "🌾",
    desc: "Generates food over time. Tap resource bubble to collect.",
    pos: { x: 74, y: 32 },
    baseBuildCost: { wood: 80, food: 60 },
    baseUpgradeCost: { wood: 70, food: 48 },
    productionPerLevel: { food: 2.4 },
    basePower: 8,
    powerPerLevel: 4,
  },
  {
    id: "sawmill",
    name: "Sawmill",
    icon: "🪵",
    desc: "Generates wood over time. Tap resource bubble to collect.",
    pos: { x: 27, y: 38 },
    baseBuildCost: { food: 70, wood: 55 },
    baseUpgradeCost: { food: 58, wood: 44 },
    productionPerLevel: { wood: 2.1 },
    basePower: 8,
    powerPerLevel: 4,
  },
  {
    id: "quarry",
    name: "Quarry",
    icon: "🪨",
    desc: "Generates stone over time. Tap resource bubble to collect.",
    pos: { x: 67, y: 52 },
    baseBuildCost: { wood: 120, food: 70, stone: 35 },
    baseUpgradeCost: { wood: 95, food: 64, stone: 48 },
    productionPerLevel: { stone: 1.7 },
    basePower: 10,
    powerPerLevel: 5,
  },
  {
    id: "storage",
    name: "Storage",
    icon: "📦",
    desc: "Increases the storage limit for food, wood and stone.",
    pos: { x: 46, y: 52 },
    baseBuildCost: { wood: 120, stone: 110, food: 80 },
    baseUpgradeCost: { wood: 92, stone: 86, food: 62 },
    capacityPerLevel: 420,
    basePower: 6,
    powerPerLevel: 3,
  },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((building) => [building.id, building]));
export const PRODUCER_BUILDINGS = BUILDINGS.filter((building) => Boolean(building.productionPerLevel));
export const CORE_BUILDING_IDS = BUILDINGS.map((building) => building.id);

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

  return { resources, buildings, claimables, selected, lastTick };
}

export function getLevel(state, buildingId) {
  return Math.max(0, Math.floor(state.buildings?.[buildingId] || 0));
}

export function getPower(state) {
  let power = 0;
  for (const building of BUILDINGS) {
    const level = getLevel(state, building.id);
    if (level <= 0) continue;
    power += (building.basePower || 0) + Math.max(0, level - 1) * (building.powerPerLevel || 0);
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

export function getUpgradeCost(state, buildingId) {
  const building = BUILDING_BY_ID[buildingId];
  if (!building) throw new Error(`Unknown building "${buildingId}"`);
  const level = getLevel(state, buildingId);
  const baseCost = level === 0 ? building.baseBuildCost : building.baseUpgradeCost || building.baseBuildCost;
  const multiplier = level === 0 ? 1 : Math.pow(1.52, level - 1);
  const cost = {};
  for (const [resource, amount] of Object.entries(baseCost)) {
    cost[resource] = Math.max(1, Math.floor(amount * multiplier));
  }
  return cost;
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
  const requiredOtherLevel = Math.max(1, targetLevel - 1);
  const lowBuildings = BUILDINGS.filter((building) => building.id !== "castle").filter(
    (building) => getLevel(state, building.id) < requiredOtherLevel
  );

  if (lowBuildings.length > 0) {
    const names = lowBuildings.map((building) => building.name).join(", ");
    issues.push(`Requires ${names} at level ${requiredOtherLevel}+`);
  }

  const minCharacterLevel = targetLevel + 1;
  const currentCharacterLevel = getCharacterLevel(state);
  if (currentCharacterLevel < minCharacterLevel) {
    issues.push(`Requires character level ${minCharacterLevel}`);
  }
  return issues;
}

function getGenericRuleIssues(state, buildingId, targetLevel) {
  if (buildingId === "castle") return getCastleRuleIssues(state, targetLevel);

  const castleLevel = getLevel(state, "castle");
  if (targetLevel > castleLevel) {
    return [`Upgrade Castle to level ${targetLevel} first`];
  }
  return [];
}

export function getUpgradeReadiness(state, buildingId) {
  const nextLevel = getLevel(state, buildingId) + 1;
  const cost = getUpgradeCost(state, buildingId);
  const canAfford = hasEnoughResources(state, cost);
  const ruleIssues = getGenericRuleIssues(state, buildingId, nextLevel);

  return {
    cost,
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

export function applyProduction(state, nowTs = Date.now()) {
  const elapsed = Math.floor((nowTs - state.lastTick) / 1000);
  if (elapsed <= 0) return false;

  for (const building of PRODUCER_BUILDINGS) {
    const level = getLevel(state, building.id);
    if (level <= 0) continue;
    for (const amount of Object.values(building.productionPerLevel)) {
      state.claimables[building.id] = toFinitePositiveNumber(state.claimables[building.id], 0) + amount * level * elapsed;
    }
  }

  state.lastTick += elapsed * 1000;
  return true;
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
  return {
    resources: {
      food: Number(state.resources.food || 0),
      wood: Number(state.resources.wood || 0),
      stone: Number(state.resources.stone || 0),
      crystals: Number(state.resources.crystals || 0),
    },
    buildings: { ...state.buildings },
    claimables: { ...state.claimables },
    selected: state.selected,
    lastTick: state.lastTick,
  };
}
