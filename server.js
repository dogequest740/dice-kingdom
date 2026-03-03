import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import express from "express";

import {
  BUILDINGS,
  BUILDING_BY_ID,
  applyProduction,
  createDefaultState,
  getUpgradeCost,
  hasEnoughResources,
  sanitizeState,
  spendResources,
  toClientState,
} from "./shared/game-config.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH === "true";
const AUTH_MAX_AGE_SEC = Number(process.env.TG_AUTH_MAX_AGE_SEC || 24 * 60 * 60);
const DB_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DB_DIR, "game-db.json");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/shared", express.static(path.join(__dirname, "shared")));
app.use(express.static(path.join(__dirname, "public")));

function ensureDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return { users: {} };
  if (!parsed.users || typeof parsed.users !== "object") parsed.users = {};
  return parsed;
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function safeEqualHex(a, b) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseInitData(initData) {
  if (!initData || typeof initData !== "string") {
    throw new Error("Missing initData");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("Missing hash in initData");
  }

  const dataPairs = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    dataPairs.push([key, value]);
  }

  dataPairs.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = dataPairs.map(([key, value]) => `${key}=${value}`).join("\n");
  const authDate = Number(params.get("auth_date") || 0);
  const userRaw = params.get("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  return { hash, dataCheckString, authDate, user };
}

function verifyInitData(initData) {
  if (!BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const parsed = parseInitData(initData);
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac("sha256", secret).update(parsed.dataCheckString).digest("hex");

  if (!safeEqualHex(calculatedHash, parsed.hash)) {
    throw new Error("Invalid initData hash");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (parsed.authDate && nowSec - parsed.authDate > AUTH_MAX_AGE_SEC) {
    throw new Error("initData expired");
  }

  if (!parsed.user || !parsed.user.id) {
    throw new Error("Missing user in initData");
  }

  return parsed.user;
}

function getAuthUser(req) {
  const initData = req.header("x-telegram-init-data") || req.body?.initData || "";
  if (initData) return verifyInitData(initData);

  if (ALLOW_DEV_AUTH) {
    const userId = req.header("x-dev-user-id");
    if (userId) {
      return {
        id: Number(userId),
        username: req.header("x-dev-username") || `dev_${userId}`,
        first_name: req.header("x-dev-first-name") || "Dev",
      };
    }
  }

  throw new Error("Unauthorized: Telegram initData required");
}

function getPlayerRecord(db, authUser) {
  const key = String(authUser.id);
  const existing = db.users[key];
  if (existing) {
    existing.username = authUser.username || existing.username || null;
    existing.firstName = authUser.first_name || existing.firstName || null;
    existing.lastSeenAt = Date.now();
    existing.state = sanitizeState(existing.state);
    return existing;
  }

  const state = createDefaultState();
  const created = {
    userId: Number(authUser.id),
    username: authUser.username || null,
    firstName: authUser.first_name || null,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    state,
  };
  db.users[key] = created;
  return created;
}

function serializeSnapshot(record) {
  return {
    profile: {
      userId: record.userId,
      username: record.username,
      firstName: record.firstName,
    },
    state: toClientState(record.state),
    buildings: BUILDINGS,
    serverTime: Date.now(),
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: Date.now() });
});

app.post("/api/session", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const db = readDb();
    const record = getPlayerRecord(db, authUser);
    applyProduction(record.state, Date.now());
    writeDb(db);
    res.json(serializeSnapshot(record));
  } catch (error) {
    res.status(401).json({ error: error.message || "Unauthorized" });
  }
});

app.post("/api/buildings/:buildingId/upgrade", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const buildingId = req.params.buildingId;
    if (!BUILDING_BY_ID[buildingId]) {
      return res.status(404).json({ error: "Building not found" });
    }

    const db = readDb();
    const record = getPlayerRecord(db, authUser);
    applyProduction(record.state, Date.now());

    const cost = getUpgradeCost(record.state, buildingId);
    if (!hasEnoughResources(record.state, cost)) {
      return res.status(400).json({ error: "Not enough resources", cost });
    }

    spendResources(record.state, cost);
    record.state.buildings[buildingId] = (record.state.buildings[buildingId] || 0) + 1;
    record.state.lastTick = Date.now();
    writeDb(db);

    return res.json({ ...serializeSnapshot(record), spent: cost });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Unauthorized" });
  }
});

app.post("/api/state/select-building", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const buildingId = String(req.body?.buildingId || "");
    if (!BUILDING_BY_ID[buildingId]) {
      return res.status(400).json({ error: "Unknown buildingId" });
    }

    const db = readDb();
    const record = getPlayerRecord(db, authUser);
    applyProduction(record.state, Date.now());
    record.state.selected = buildingId;
    writeDb(db);

    return res.json(serializeSnapshot(record));
  } catch (error) {
    return res.status(401).json({ error: error.message || "Unauthorized" });
  }
});

app.post("/api/dev/reset", (req, res) => {
  if (!ALLOW_DEV_AUTH) {
    return res.status(403).json({ error: "Dev reset is disabled" });
  }

  try {
    const authUser = getAuthUser(req);
    const db = readDb();
    const key = String(authUser.id);
    db.users[key] = {
      userId: Number(authUser.id),
      username: authUser.username || null,
      firstName: authUser.first_name || null,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      state: createDefaultState(),
    };
    writeDb(db);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Unauthorized" });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureDb();
app.listen(PORT, () => {
  console.log(`[mini-city] server started on http://localhost:${PORT}`);
});
