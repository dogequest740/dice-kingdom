import crypto from "node:crypto";

import { ApiError, getBody, getHeader } from "./api.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH === "true";
const AUTH_MAX_AGE_SEC = Number(process.env.TG_AUTH_MAX_AGE_SEC || 24 * 60 * 60);

function safeEqualHex(leftHex, rightHex) {
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseInitData(initData) {
  if (!initData || typeof initData !== "string") {
    throw new ApiError(401, "Missing initData");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new ApiError(401, "Missing hash in initData");

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
  return { hash, authDate, user, dataCheckString };
}

function verifyInitData(initData) {
  if (!BOT_TOKEN) {
    throw new ApiError(500, "TELEGRAM_BOT_TOKEN is not configured");
  }

  const parsed = parseInitData(initData);
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac("sha256", secret).update(parsed.dataCheckString).digest("hex");

  if (!safeEqualHex(calculatedHash, parsed.hash)) {
    throw new ApiError(401, "Invalid initData hash");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (parsed.authDate && nowSec - parsed.authDate > AUTH_MAX_AGE_SEC) {
    throw new ApiError(401, "initData expired");
  }

  if (!parsed.user || !parsed.user.id) {
    throw new ApiError(401, "Missing user in initData");
  }

  return parsed.user;
}

export function getAuthUser(req) {
  const body = getBody(req);
  const initData = getHeader(req, "x-telegram-init-data") || body?.initData || "";
  if (initData) return verifyInitData(initData);

  if (ALLOW_DEV_AUTH) {
    const userId = getHeader(req, "x-dev-user-id");
    if (userId) {
      return {
        id: Number(userId),
        username: getHeader(req, "x-dev-username") || `dev_${userId}`,
        first_name: getHeader(req, "x-dev-first-name") || "Dev",
      };
    }
  }

  throw new ApiError(401, "Unauthorized: Telegram initData required");
}

export function isDevAuthEnabled() {
  return ALLOW_DEV_AUTH;
}
