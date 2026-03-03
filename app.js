import {
  BUILDINGS,
  BUILDING_BY_ID,
  RESOURCE_META,
  applyProduction,
  getCapacity,
  getCharacterLevel,
  getClaimableForBuilding,
  getLevel,
  getPower,
  getUpgradeReadiness,
} from "/shared/game-config.js";

const TICK_MS = 1000;
const RESOURCE_ORDER = ["food", "wood", "stone", "crystals"];

const mapEl = document.getElementById("map");
const panelEl = document.getElementById("buildingPanel");
const panelTitleEl = document.getElementById("panelTitle");
const panelLevelEl = document.getElementById("panelLevel");
const panelDescEl = document.getElementById("panelDesc");
const panelProductionEl = document.getElementById("panelProduction");
const panelCostEl = document.getElementById("panelCost");
const panelRulesEl = document.getElementById("panelRules");
const panelActionEl = document.getElementById("panelAction");
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

function formatNumber(value) {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.floor(value));
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
    chip.textContent = meta.capped
      ? `${meta.icon} ${meta.label}: ${formatNumber(value)}/${formatNumber(cap)}`
      : `${meta.icon} ${meta.label}: ${formatNumber(value)}`;
    resourceBarEl.appendChild(chip);
  }
}

function renderHero() {
  if (!state) return;
  heroLevelEl.textContent = `Lv. ${getCharacterLevel(state)}`;
  heroPowerEl.textContent = `Power ${formatNumber(getPower(state))}`;
}

function formatRate(value) {
  return value.toFixed(1).replace(".0", "");
}

function renderPanel() {
  if (!state) {
    panelEl.classList.add("hidden");
    return;
  }

  const building = BUILDING_BY_ID[state.selected];
  if (!building) {
    panelEl.classList.add("hidden");
    return;
  }

  const level = getLevel(state, building.id);
  const readiness = getUpgradeReadiness(state, building.id);
  const nextLabel = level === 0 ? "Build" : "Upgrade";

  panelEl.classList.remove("hidden");
  panelTitleEl.textContent = building.name;
  panelLevelEl.textContent = level === 0 ? "Not built" : `Level ${level}`;
  panelDescEl.textContent = building.desc;

  panelProductionEl.innerHTML = "";
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
      readyChip.textContent = `Ready to collect ${RESOURCE_META[resource].icon} ${formatNumber(claimable.collectible)}`;
      panelProductionEl.appendChild(readyChip);
    }

    if (level > 0) {
      const currentRateChip = document.createElement("span");
      currentRateChip.className = "stat-chip";
      currentRateChip.textContent = `Current +${formatRate(amount * level)}/s`;
      panelProductionEl.appendChild(currentRateChip);
    }

    const nextRateChip = document.createElement("span");
    nextRateChip.className = "stat-chip";
    nextRateChip.textContent = `After +${formatRate(amount * (level + 1))}/s`;
    panelProductionEl.appendChild(nextRateChip);
  }

  if (building.capacityPerLevel) {
    const capChip = document.createElement("span");
    capChip.className = "stat-chip";
    capChip.textContent = `Storage +${formatNumber(building.capacityPerLevel)} each level`;
    panelProductionEl.appendChild(capChip);
  }

  const currentPower = level > 0 ? (building.basePower || 0) + Math.max(0, level - 1) * (building.powerPerLevel || 0) : 0;
  const nextPower = (building.basePower || 0) + Math.max(0, level) * (building.powerPerLevel || 0);

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
  for (const [resource, amount] of Object.entries(readiness.cost)) {
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
  if (!readiness.canAfford) {
    const chip = document.createElement("span");
    chip.className = "stat-chip warn";
    chip.textContent = "Not enough resources";
    panelRulesEl.appendChild(chip);
  }

  panelActionEl.textContent = `${nextLabel} to Lv. ${readiness.nextLevel}`;
  panelActionEl.disabled = requestInFlight || !readiness.canUpgrade;
  panelActionEl.dataset.buildingId = building.id;
}

function renderMap() {
  if (!state) return;

  for (const building of BUILDINGS) {
    const nodeRefs = mapNodes.get(building.id);
    if (!nodeRefs) continue;

    const { buildingButton, collectButton } = nodeRefs;
    const level = getLevel(state, building.id);
    const built = level > 0;
    buildingButton.dataset.built = String(built);
    buildingButton.classList.toggle("selected", state.selected === building.id);

    const iconEl = buildingButton.querySelector(".building-icon");
    const badgeEl = buildingButton.querySelector(".building-badge");
    iconEl.textContent = built ? building.icon : "🏗️";
    badgeEl.textContent = built ? `${building.name} Lv.${level}` : `Build ${building.name}`;

    const claimable = getClaimableForBuilding(state, building.id);
    if (claimable && claimable.collectible > 0) {
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

    buildingButton.addEventListener("click", async () => {
      if (!state) return;
      state.selected = building.id;
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

    mapNodes.set(building.id, { node, buildingButton, collectButton });
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
  setStatus("Applying upgrade...");

  try {
    const snapshot = await api(`/api/buildings/${buildingId}/upgrade`, { body: {} });
    setStateFromSnapshot(snapshot);
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    setStatus("Upgrade completed");
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
    renderMap();
    renderPanel();
  }, TICK_MS);
}

boot();
