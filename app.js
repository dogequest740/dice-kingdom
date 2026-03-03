import {
  BUILDINGS,
  BUILDING_BY_ID,
  RESOURCE_META,
  applyProduction,
  getCapacity,
  getLevel,
  getUpgradeCost,
  hasEnoughResources,
} from "/shared/game-config.js";

const TICK_MS = 1000;

const mapEl = document.getElementById("map");
const panelEl = document.getElementById("buildingPanel");
const panelTitleEl = document.getElementById("panelTitle");
const panelLevelEl = document.getElementById("panelLevel");
const panelDescEl = document.getElementById("panelDesc");
const panelProductionEl = document.getElementById("panelProduction");
const panelCostEl = document.getElementById("panelCost");
const panelActionEl = document.getElementById("panelAction");
const statusLineEl = document.getElementById("statusLine");
const resourceBarEl = document.getElementById("resourceBar");
const closeBtnEl = document.querySelector(".close-btn");
const template = document.getElementById("buildingTemplate");

const mapButtons = new Map();
let state = null;
let requestInFlight = false;
let initData = "";
let devAuth = null;

function formatNumber(value) {
  return Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.floor(value));
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
  for (const [id, meta] of Object.entries(RESOURCE_META)) {
    const chip = document.createElement("div");
    chip.className = "resource-chip";
    chip.textContent = `${meta.icon} ${formatNumber(state.resources[id])}/${formatNumber(cap)}`;
    resourceBarEl.appendChild(chip);
  }
}

function productionLabelForLevel(building, level) {
  if (!building.productionPerLevel || level <= 0) return null;
  return Object.entries(building.productionPerLevel).map(([resource, amount]) => {
    const icon = RESOURCE_META[resource].icon;
    const perSec = (amount * level).toFixed(1).replace(".0", "");
    return `${icon} +${perSec}/с`;
  });
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

  panelEl.classList.remove("hidden");
  const level = getLevel(state, building.id);
  const cost = getUpgradeCost(state, building.id);
  const canAfford = hasEnoughResources(state, cost);
  const nextLabel = level === 0 ? "Построить" : "Улучшить";

  panelTitleEl.textContent = building.name;
  panelLevelEl.textContent = level === 0 ? "Не построено" : `Уровень ${level}`;
  panelDescEl.textContent = building.desc;

  panelProductionEl.innerHTML = "";
  const currentProd = productionLabelForLevel(building, level);
  if (currentProd?.length) {
    for (const text of currentProd) {
      const chip = document.createElement("span");
      chip.className = "stat-chip";
      chip.textContent = `Сейчас ${text}`;
      panelProductionEl.appendChild(chip);
    }
  }

  const nextProd = productionLabelForLevel(building, level + 1);
  if (nextProd?.length) {
    for (const text of nextProd) {
      const chip = document.createElement("span");
      chip.className = "stat-chip";
      chip.textContent = `После ${text}`;
      panelProductionEl.appendChild(chip);
    }
  }

  if (!currentProd && building.capacityPerLevel) {
    const chip = document.createElement("span");
    chip.className = "stat-chip";
    chip.textContent = `Вместимость +${formatNumber(building.capacityPerLevel * (level + 1))}`;
    panelProductionEl.appendChild(chip);
  }

  panelCostEl.innerHTML = "";
  for (const [resource, amount] of Object.entries(cost)) {
    const chip = document.createElement("span");
    const enough = state.resources[resource] >= amount;
    chip.className = `stat-chip${enough ? "" : " warn"}`;
    chip.textContent = `${RESOURCE_META[resource].icon} ${formatNumber(amount)}`;
    panelCostEl.appendChild(chip);
  }

  panelActionEl.textContent = `${nextLabel} до ${level + 1} ур.`;
  panelActionEl.disabled = !canAfford || requestInFlight;
  panelActionEl.dataset.buildingId = building.id;
}

function renderMap() {
  if (!state) return;
  for (const building of BUILDINGS) {
    const btn = mapButtons.get(building.id);
    if (!btn) continue;
    const level = getLevel(state, building.id);
    const built = level > 0;
    btn.dataset.built = String(built);
    btn.classList.toggle("selected", state.selected === building.id);

    const iconEl = btn.querySelector(".building-icon");
    const badgeEl = btn.querySelector(".building-badge");
    iconEl.textContent = built ? building.icon : "🏗️";
    badgeEl.textContent = built ? `${level} ${building.name}` : `Построить: ${building.name}`;
  }
}

function render() {
  renderResources();
  renderMap();
  renderPanel();
}

function buildMapNodes() {
  mapEl.innerHTML = "";
  for (const building of BUILDINGS) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.style.left = `${building.pos.x}%`;
    node.style.top = `${building.pos.y}%`;
    node.addEventListener("click", async () => {
      if (!state) return;
      state.selected = building.id;
      render();
      try {
        await api("/api/state/select-building", { body: { buildingId: building.id } });
      } catch {
        setStatus("Не удалось сохранить выбранное здание", true);
      }
    });
    mapButtons.set(building.id, node);
    mapEl.appendChild(node);
  }
}

async function loadSession() {
  const snapshot = await api("/api/session");
  state = snapshot.state;
  setStatus("Город синхронизирован с сервером");
  render();
}

async function onUpgrade() {
  if (requestInFlight || !state) return;
  const buildingId = panelActionEl.dataset.buildingId;
  if (!buildingId) return;

  requestInFlight = true;
  renderPanel();
  setStatus("Сохраняю улучшение...");

  try {
    const snapshot = await api(`/api/buildings/${buildingId}/upgrade`, { body: {} });
    state = snapshot.state;
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    setStatus("Улучшение завершено");
    render();
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
  setStatus("Подключение к серверу...");

  try {
    await loadSession();
  } catch (error) {
    const notInTelegram = "Unauthorized";
    if (String(error.message).includes(notInTelegram)) {
      setStatus("Запусти игру из Telegram. Для dev: ?devUserId=1", true);
      return;
    }
    setStatus(error.message, true);
    return;
  }

  setInterval(() => {
    if (!state) return;
    applyProduction(state, Date.now());
    renderResources();
    renderPanel();
  }, TICK_MS);
}

boot();
