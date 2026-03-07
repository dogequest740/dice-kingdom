import { createClient } from "@supabase/supabase-js";

import {
  BUILDINGS,
  applyProduction,
  createDefaultState,
  getCharacterLevel,
  getPower,
  sanitizeState,
  toClientState,
} from "../shared/game-config.js";
import { ApiError } from "./api.js";

const TABLE_NAME = process.env.SUPABASE_PLAYERS_TABLE || "players";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseClient = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError(500, "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  }
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

function mapRowToPlayer(row) {
  return {
    userId: Number(row.user_id),
    username: row.username || null,
    firstName: row.first_name || null,
    state: sanitizeState(row.state),
  };
}

export async function getOrCreatePlayer(authUser) {
  const supabase = getSupabase();
  const userId = Number(authUser.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new ApiError(400, "Invalid Telegram user id");
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("user_id, username, first_name, state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Failed to load player", { code: error.code, details: error.message });
  }

  if (data) return mapRowToPlayer(data);

  const initialState = createDefaultState();
  const { data: inserted, error: insertError } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: userId,
      username: authUser.username || null,
      first_name: authUser.first_name || null,
      state: initialState,
    })
    .select("user_id, username, first_name, state")
    .single();

  if (insertError) {
    throw new ApiError(500, "Failed to create player", { code: insertError.code, details: insertError.message });
  }

  return mapRowToPlayer(inserted);
}

export async function savePlayer(player, authUser = null) {
  const supabase = getSupabase();
  const payload = {
    user_id: Number(player.userId),
    username: authUser?.username || player.username || null,
    first_name: authUser?.first_name || player.firstName || null,
    state: sanitizeState(player.state),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id, username, first_name, state")
    .single();

  if (error) {
    throw new ApiError(500, "Failed to save player", { code: error.code, details: error.message });
  }
  return mapRowToPlayer(data);
}

export function applyProductionAndSync(player) {
  applyProduction(player.state, Date.now());
  player.state = sanitizeState(player.state);
  return player;
}

export function makeSnapshot(player) {
  return {
    profile: {
      userId: Number(player.userId),
      username: player.username || null,
      firstName: player.firstName || null,
      level: getCharacterLevel(player.state),
      power: getPower(player.state),
    },
    state: toClientState(player.state),
    buildings: BUILDINGS,
    serverTime: Date.now(),
  };
}
