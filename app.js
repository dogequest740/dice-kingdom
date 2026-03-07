import {
  BUILDINGS,
  BUILDING_BY_ID,
  RESOURCE_META,
  applyProduction,
  getActiveUpgrade,
  getBuildingPowerAtLevel,
  getCapacity,
  getCharacterLevel,
  getClaimableForBuilding,
  getLevel,
  getPower,
  getUpgradeReadiness,
} from "/shared/game-config.js";

const TICK_MS = 1000;
const RESOURCE_ORDER = ["food", "wood", "stone", "crystals"];
const RESOURCE_ICONS = {
  food: "./assets/custom/resource-food.png",
  wood: "./assets/custom/resource-wood.png",
  stone: "./assets/custom/resource-stone.png",
  crystals: "./assets/custom/resource-crystals.png",
};
const CONSTRUCTION_SPRITE = { src: "./assets/custom/construction.png", width: 170, height: 170 };
const BUILDING_SPRITES = {
  castle: [
    { minLevel: 1, src: "./assets/custom/castle.png", width: 230, height: 230 },
  ],
  farm: [
    { minLevel: 1, src: "./assets/custom/farm.png", width: 170, height: 170 },
  ],
  sawmill: [
    { minLevel: 1, src: "./assets/custom/sawmill.png", width: 170, height: 170 },
  ],
  quarry: [
    { minLevel: 1, src: "./assets/custom/quarry.png", width: 170, height: 170 },
  ],
  storage: [
    { minLevel: 1, src: "./assets/custom/storage.png", width: 200, height: 200 },
  ],
};

const mapEl = document.getElementById("map");
const panelEl = document.getElementById("buildingPanel");
const panelTitleEl = document.getElementById("panelTitle");
const panelLevelEl = document.getElementById("panelLevel");
const panelDescEl = document.getElementById("panelDesc");
const panelProductionEl = document.getElementById("panelProduction");
const panelCostEl = document.getElementById("panelCost");
const panelRulesEl = document.getElementById("panelRules");
const panelActionEl = document.getElementById("panelAction");
const panelCloseEl = document.getElementById("panelClose");
const statusLineEl = document.getElementById("statusLine");
const heroLevelEl = document.getElementById("heroLevel");
const heroPowerEl = document.getElementById("heroPower");
const resourceBarEl = document.getElementById("resourceBar");
const closeBtnEl = document.querySelector(".close-btn");
const template = document.getElementById("buildingTemplate");

const mapNodes = new Map();
let state = null;
let requestInFlight = false;
let initData = "";
let devAuth = null;
let panelBuildingId = null;

function formatNumber(value) {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.floor(value));
}

function formatDuration(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec));
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getBuildingSprite(buildingId, level) {
  const variants = BUILDING_SPRITES[buildingId];
  if (!variants || variants.length === 0 || level <= 0) return null;

  let selected = variants[0];
  for (const variant of variants) {
    if (level >= variant.minLevel) {
      selected = variant;
    } else {
      break;
    }
  }
  return selected;
}

function setStatus(message, isError = false) {
  statusLineEl.textContent = message || "";
  statusLineEl.classList.toggle("error", Boolean(isError));
}

function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  initData = tg.initData || "";
}

function initDevAuth() {
  if (initData) return;
  const params = new URLSearchParams(window.location.search);
  const devUserId = params.get("devUserId");
  if (!devUserId) return;

  devAuth = {
    userId: devUserId,
    username: params.get("devUsername") || `dev_${devUserId}`,
    firstName: params.get("devFirstName") || "Dev",
  };
}

function buildAuthHeaders() {
  if (initData) {
    return { "x-telegram-init-data": initData };
  }

  if (devAuth?.userId) {
    return {
      "x-dev-user-id": devAuth.userId,
      "x-dev-username": devAuth.username,
      "x-dev-first-name": devAuth.firstName,
    };
  }

  return {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "POST",
    headers: {
      "content-type": "application/json",
      ...buildAuthHeaders(),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : "{}",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function renderResources() {
  if (!state) return;
  const cap = getCapacity(state);
  resourceBarEl.innerHTML = "";

  for (const resourceId of RESOURCE_ORDER) {
    const meta = RESOURCE_META[resourceId];
    const value = state.resources[resourceId] || 0;
    const chip = document.createElement("div");
    chip.className = "resource-chip";

    const icon = document.createElement("img");
    icon.className = "resource-icon";
    icon.alt = meta.label;
    icon.src = RESOURCE_ICONS[resourceId];

    const text = document.createElement("span");
    text.className = "resource-text";
    text.textContent = meta.capped
      ? `${meta.label}: ${formatNumber(value)}/${formatNumber(cap)}`
      : `${meta.label}: ${formatNumber(value)}`;

    chip.appendChild(icon);
    chip.appendChild(text);
    resourceBarEl.appendChild(chip);
  }
}

function renderHero() {
  if (!state) return;
  heroLevelEl.textContent = `Lv. ${getCharacterLevel(state)}`;
  heroPowerEl.textContent = `Power ${formatNumber(getPower(state))}`;
}

function renderPanel() {
  if (!state || !panelBuildingId) {
    panelEl.classList.add("hidden");
    return;
  }

  const building = BUILDING_BY_ID[panelBuildingId];
  if (!building) {
    panelEl.classList.add("hidden");
    return;
  }

  const nowTs = Date.now();
  const level = getLevel(state, building.id);
  const readiness = getUpgradeReadiness(state, building.id, nowTs);
  const activeUpgrade = getActiveUpgrade(state, nowTs);
  const nextLabel = level === 0 ? "Build" : "Upgrade";

  panelEl.classList.remove("hidden");
  panelTitleEl.textContent = building.name;
  panelLevelEl.textContent = level === 0 ? "Not built" : `Level ${level}`;
  panelDescEl.textContent = building.desc;

  panelProductionEl.innerHTML = "";

  const durationChip = document.createElement("span");
  durationChip.className = "stat-chip";
  durationChip.textContent = `Time: ${formatDuration(readiness.durationSec || 0)}`;
  panelProductionEl.appendChild(durationChip);

  if (building.productionPerLevel) {
    const [resource, amount] = Object.entries(building.productionPerLevel)[0];
    const claimable = getClaimableForBuilding(state, building.id);
    const storedRaw = Math.floor(state.claimables?.[building.id] || 0);

    const storedChip = document.createElement("span");
    storedChip.className = "stat-chip";
    storedChip.textContent = `${RESOURCE_META[resource].icon} Stored ${formatNumber(storedRaw)}`;
    panelProductionEl.appendChild(storedChip);

    if (claimable && claimable.collectible > 0) {
      const readyChip = document.createElement("span");
      readyChip.className = "stat-chip";
      readyChip.textContent = `Ready ${RESOURCE_META[resource].icon} ${formatNumber(claimable.collectible)}`;
      panelProductionEl.appendChild(readyChip);
    }

    if (level > 0) {
      const currentRateChip = document.createElement("span");
      currentRateChip.className = "stat-chip";
      currentRateChip.textContent = `Current +${(amount * level).toFixed(1).replace(".0", "")}/s`;
      panelProductionEl.appendChild(currentRateChip);
    }

    const nextRateChip = document.createElement("span");
    nextRateChip.className = "stat-chip";
    nextRateChip.textContent = `After +${(amount * (level + 1)).toFixed(1).replace(".0", "")}/s`;
    panelProductionEl.appendChild(nextRateChip);
  }

  if (building.capacityPerLevel) {
    const capChip = document.createElement("span");
    capChip.className = "stat-chip";
    capChip.textContent = `Storage +${formatNumber(building.capacityPerLevel)} each level`;
    panelProductionEl.appendChild(capChip);
  }

  const currentPower = getBuildingPowerAtLevel(building.id, level);
  const nextPower = getBuildingPowerAtLevel(building.id, level + 1);
  if (level > 0) {
    const currentPowerChip = document.createElement("span");
    currentPowerChip.className = "stat-chip";
    currentPowerChip.textContent = `Current power +${formatNumber(currentPower)}`;
    panelProductionEl.appendChild(currentPowerChip);
  }
  const nextPowerChip = document.createElement("span");
  nextPowerChip.className = "stat-chip";
  nextPowerChip.textContent = `After power +${formatNumber(nextPower)}`;
  panelProductionEl.appendChild(nextPowerChip);

  panelCostEl.innerHTML = "";
  for (const [resource, amount] of Object.entries(readiness.cost || {})) {
    const chip = document.createElement("span");
    const enough = (state.resources[resource] || 0) >= amount;
    chip.className = `stat-chip${enough ? "" : " warn"}`;
    chip.textContent = `${RESOURCE_META[resource].icon} ${formatNumber(amount)}`;
    panelCostEl.appendChild(chip);
  }

  panelRulesEl.innerHTML = "";
  for (const issue of readiness.ruleIssues) {
    const chip = document.createElement("span");
    chip.className = "stat-chip warn";
    chip.textContent = issue;
    panelRulesEl.appendChild(chip);
  }
  if (!readiness.canAfford && Object.keys(readiness.cost || {}).length > 0) {
    const chip = document.createElement("span");
    chip.className = "stat-chip warn";
    chip.textContent = "Not enough resources";
    panelRulesEl.appendChild(chip);
  }

  if (activeUpgrade) {
    const busyName = BUILDING_BY_ID[activeUpgrade.buildingId]?.name || activeUpgrade.buildingId;
    if (activeUpgrade.buildingId === building.id) {
      panelActionEl.textContent = `Upgrading... ${formatDuration(activeUpgrade.remainingSec)}`;
    } else {
      panelActionEl.textContent = `Busy: ${busyName} ${formatDuration(activeUpgrade.remainingSec)}`;
    }
    panelActionEl.disabled = true;
  } else {
    panelActionEl.textContent = `${nextLabel} to Lv. ${readiness.nextLevel}`;
    panelActionEl.disabled = requestInFlight || !readiness.canUpgrade;
  }
  panelActionEl.dataset.buildingId = building.id;
}

function renderMap() {
  if (!state) return;
  const activeUpgrade = getActiveUpgrade(state, Date.now());

  for (const building of BUILDINGS) {
    const nodeRefs = mapNodes.get(building.id);
    if (!nodeRefs) continue;

    const { buildingButton, collectButton, timerLabel, badgeEl, spriteEl, placeholderEl } = nodeRefs;
    const level = getLevel(state, building.id);
    const built = level > 0;
    const upgradingThis = activeUpgrade && activeUpgrade.buildingId === building.id;

    buildingButton.dataset.built = String(built);
    buildingButton.classList.toggle("selected", panelBuildingId === building.id);

    const sprite = built ? getBuildingSprite(building.id, level) : CONSTRUCTION_SPRITE;
    if (sprite) {
      spriteEl.src = sprite.src;
      if (sprite.width) {
        spriteEl.width = sprite.width;
      } else {
        spriteEl.removeAttribute("width");
      }
      if (sprite.height) {
        spriteEl.height = sprite.height;
      } else {
        spriteEl.removeAttribute("height");
      }
      spriteEl.style.transform = "";
      spriteEl.alt = `${building.name} level ${level}`;
      spriteEl.classList.remove("hidden");
      placeholderEl.classList.add("hidden");
    } else {
      spriteEl.removeAttribute("src");
      spriteEl.removeAttribute("width");
      spriteEl.removeAttribute("height");
      spriteEl.style.transform = "";
      spriteEl.alt = "";
      spriteEl.classList.add("hidden");
      placeholderEl.textContent = built ? building.icon : "🏗️";
      placeholderEl.classList.remove("hidden");
    }

    badgeEl.textContent = built ? `${building.name} Lv.${level}` : `Build ${building.name}`;

    if (upgradingThis) {
      timerLabel.classList.remove("hidden");
      timerLabel.textContent = `Lv.${activeUpgrade.toLevel} • ${formatDuration(activeUpgrade.remainingSec)}`;
    } else {
      timerLabel.classList.add("hidden");
      timerLabel.textContent = "";
    }

    const claimable = getClaimableForBuilding(state, building.id);
    if (!upgradingThis && claimable && claimable.collectible > 0) {
      collectButton.classList.remove("hidden");
      collectButton.textContent = `${RESOURCE_META[claimable.resource].icon} ${formatNumber(claimable.collectible)}`;
    } else {
      collectButton.classList.add("hidden");
      collectButton.textContent = "";
    }
  }
}

function render() {
  renderResources();
  renderHero();
  renderMap();
  renderPanel();
}

function setStateFromSnapshot(snapshot) {
  state = snapshot.state;
  render();
}

function buildMapNodes() {
  mapEl.innerHTML = "";
  mapNodes.clear();

  for (const building of BUILDINGS) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.style.left = `${building.pos.x}%`;
    node.style.top = `${building.pos.y}%`;

    const buildingButton = node.querySelector(".building");
    const collectButton = node.querySelector(".collect-btn");
    const timerLabel = node.querySelector(".upgrade-timer");
    const badgeEl = node.querySelector(".building-badge");
    const spriteEl = node.querySelector(".building-sprite");
    const placeholderEl = node.querySelector(".building-placeholder");

    buildingButton.addEventListener("click", async () => {
      if (!state) return;
      state.selected = building.id;
      panelBuildingId = building.id;
      render();
      try {
        await api("/api/state/select-building", { body: { buildingId: building.id } });
      } catch {
        setStatus("Failed to save selected building", true);
      }
    });

    collectButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      await onCollect(building.id);
    });

    mapNodes.set(building.id, { node, buildingButton, collectButton, timerLabel, badgeEl, spriteEl, placeholderEl });
    mapEl.appendChild(node);
  }
}

async function loadSession() {
  const snapshot = await api("/api/session");
  setStateFromSnapshot(snapshot);
  setStatus("City synced");
}

async function onUpgrade() {
  if (requestInFlight || !state) return;
  const buildingId = panelActionEl.dataset.buildingId;
  if (!buildingId) return;

  requestInFlight = true;
  renderPanel();
  setStatus("Starting upgrade...");

  try {
    const snapshot = await api(`/api/buildings/${buildingId}/upgrade`, { body: {} });
    setStateFromSnapshot(snapshot);
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    const timeLabel = snapshot.upgrade?.durationSec ? formatDuration(snapshot.upgrade.durationSec) : "";
    setStatus(timeLabel ? `Upgrade started (${timeLabel})` : "Upgrade started");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    requestInFlight = false;
    renderPanel();
  }
}

async function onCollect(buildingId) {
  if (requestInFlight || !state) return;

  requestInFlight = true;
  renderPanel();
  setStatus("Collecting...");

  try {
    const snapshot = await api(`/api/buildings/${buildingId}/collect`, { body: {} });
    setStateFromSnapshot(snapshot);
    const entry = Object.entries(snapshot.collected || {})[0];
    if (entry) {
      const [resource, amount] = entry;
      setStatus(`Collected ${RESOURCE_META[resource].label} +${formatNumber(amount)}`);
    } else {
      setStatus("Collected");
    }
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    requestInFlight = false;
    renderPanel();
  }
}

function setupEvents() {
  panelActionEl.addEventListener("click", onUpgrade);
  panelCloseEl.addEventListener("click", () => {
    panelBuildingId = null;
    render();
  });
  closeBtnEl.addEventListener("click", () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.close();
      return;
    }
    panelEl.classList.toggle("hidden");
  });
}

async function boot() {
  initTelegram();
  initDevAuth();
  buildMapNodes();
  setupEvents();
  setStatus("Connecting to server...");

  try {
    await loadSession();
    panelBuildingId = null;
    renderPanel();
  } catch (error) {
    if (String(error.message).includes("Unauthorized")) {
      setStatus("Open this Mini App from Telegram. Dev mode: ?devUserId=1", true);
      return;
    }
    setStatus(error.message, true);
    return;
  }

  setInterval(() => {
    if (!state) return;
    applyProduction(state, Date.now());
    render();
  }, TICK_MS);
}

boot();
