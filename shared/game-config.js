export const RESOURCE_META = {
  wheat: { label: "Пшеница", icon: "🌾" },
  wood: { label: "Дерево", icon: "🪵" },
  stone: { label: "Камень", icon: "🧱" },
};

export const BUILDINGS = [
  {
    id: "castle",
    name: "Замок",
    icon: "🏰",
    desc: "Центр города. Дает бонус к вместимости ресурсов.",
    pos: { x: 50, y: 22 },
    baseBuildCost: { wood: 220, stone: 200, wheat: 120 },
    baseUpgradeCost: { wood: 160, stone: 170, wheat: 110 },
    capacityPerLevel: 180,
  },
  {
    id: "farm",
    name: "Ферма",
    icon: "🌾",
    desc: "Производит пшеницу каждую секунду.",
    pos: { x: 74, y: 30 },
    baseBuildCost: { wood: 90, wheat: 40 },
    baseUpgradeCost: { wood: 70, wheat: 34 },
    productionPerLevel: { wheat: 3.2 },
  },
  {
    id: "sawmill",
    name: "Лесопилка",
    icon: "🪵",
    desc: "Производит дерево каждую секунду.",
    pos: { x: 27, y: 36 },
    baseBuildCost: { wood: 70, wheat: 55 },
    baseUpgradeCost: { wood: 58, wheat: 48 },
    productionPerLevel: { wood: 2.7 },
  },
  {
    id: "quarry",
    name: "Каменоломня",
    icon: "🧱",
    desc: "Производит камень каждую секунду.",
    pos: { x: 67, y: 52 },
    baseBuildCost: { wood: 120, wheat: 70, stone: 35 },
    baseUpgradeCost: { wood: 105, wheat: 64, stone: 45 },
    productionPerLevel: { stone: 2.2 },
  },
  {
    id: "warehouse",
    name: "Хранилище",
    icon: "📦",
    desc: "Увеличивает лимит хранения всех ресурсов.",
    pos: { x: 45, y: 51 },
    baseBuildCost: { wood: 130, stone: 120, wheat: 80 },
    baseUpgradeCost: { wood: 100, stone: 95, wheat: 65 },
    capacityPerLevel: 420,
  },
  {
    id: "range",
    name: "Стрельбище",
    icon: "🏹",
    desc: "Военная постройка. Подготовка к боевому режиму.",
    pos: { x: 35, y: 60 },
    baseBuildCost: { wood: 140, stone: 70, wheat: 100 },
    baseUpgradeCost: { wood: 115, stone: 56, wheat: 80 },
  },
  {
    id: "scouts",
    name: "Лагерь разведчиков",
    icon: "⛺",
    desc: "Разведка окрестностей. Подготовка к PvE-механикам.",
    pos: { x: 20, y: 71 },
    baseBuildCost: { wood: 95, wheat: 95 },
    baseUpgradeCost: { wood: 76, wheat: 78 },
  },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((building) => [building.id, building]));

export function createDefaultState() {
  return {
    resources: { wheat: 230, wood: 210, stone: 150 },
    buildings: {
      castle: 1,
      farm: 1,
      sawmill: 1,
      quarry: 0,
      warehouse: 1,
      range: 0,
      scouts: 0,
    },
    selected: "castle",
    lastTick: Date.now(),
  };
}

export function sanitizeState(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== "object") return base;

  const selected = raw.selected && BUILDING_BY_ID[raw.selected] ? raw.selected : base.selected;
  const lastTick = Number.isFinite(raw.lastTick) ? raw.lastTick : Date.now();
  const resources = { ...base.resources, ...(raw.resources || {}) };
  const buildings = { ...base.buildings, ...(raw.buildings || {}) };

  for (const id of Object.keys(resources)) {
    const value = Number(resources[id]);
    resources[id] = Number.isFinite(value) && value >= 0 ? value : 0;
  }

  for (const id of Object.keys(buildings)) {
    const value = Number(buildings[id]);
    buildings[id] = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }

  return { resources, buildings, selected, lastTick };
}

export function getLevel(state, buildingId) {
  return Math.max(0, Math.floor(state.buildings?.[buildingId] || 0));
}

export function getUpgradeCost(state, buildingId) {
  const building = BUILDING_BY_ID[buildingId];
  if (!building) throw new Error(`Unknown building "${buildingId}"`);
  const level = getLevel(state, buildingId);
  const baseCost = level === 0 ? building.baseBuildCost : building.baseUpgradeCost || building.baseBuildCost;
  const multiplier = level === 0 ? 1 : Math.pow(1.55, level - 1);
  const cost = {};

  for (const [resource, amount] of Object.entries(baseCost)) {
    cost[resource] = Math.floor(amount * multiplier);
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

export function getCapacity(state) {
  let capacity = 500;
  for (const building of BUILDINGS) {
    const level = getLevel(state, building.id);
    if (level > 0 && building.capacityPerLevel) {
      capacity += building.capacityPerLevel * level;
    }
  }
  return capacity;
}

export function getProductionPerSec(state) {
  const total = { wheat: 0, wood: 0, stone: 0 };
  for (const building of BUILDINGS) {
    const level = getLevel(state, building.id);
    if (level <= 0 || !building.productionPerLevel) continue;
    for (const [resource, amount] of Object.entries(building.productionPerLevel)) {
      total[resource] += amount * level;
    }
  }
  return total;
}

export function applyProduction(state, nowTs = Date.now()) {
  const elapsed = Math.floor((nowTs - state.lastTick) / 1000);
  if (elapsed <= 0) return false;

  const capacity = getCapacity(state);
  const rates = getProductionPerSec(state);

  for (const resource of Object.keys(RESOURCE_META)) {
    const current = Number(state.resources[resource] || 0);
    const nextValue = current + rates[resource] * elapsed;
    state.resources[resource] = Math.min(capacity, nextValue);
  }

  state.lastTick += elapsed * 1000;
  return true;
}

export function toClientState(state) {
  return {
    resources: {
      wheat: Number(state.resources.wheat || 0),
      wood: Number(state.resources.wood || 0),
      stone: Number(state.resources.stone || 0),
    },
    buildings: { ...state.buildings },
    selected: state.selected,
    lastTick: state.lastTick,
  };
}
