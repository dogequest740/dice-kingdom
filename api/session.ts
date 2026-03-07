import { assertMethod, json, sendError } from "../lib/api.js";
import { getAuthUser } from "../lib/telegram-auth.js";
import { applyProductionAndSync, getOrCreatePlayer, makeSnapshot, savePlayer } from "../lib/player-store.js";

export default async function handler(req, res) {
  try {
    if (!assertMethod(req, res, ["POST"])) return;
    const authUser = getAuthUser(req);
    let player = await getOrCreatePlayer(authUser);
    player = applyProductionAndSync(player);
    player = await savePlayer(player, authUser);
    return json(res, 200, makeSnapshot(player));
  } catch (error) {
    return sendError(res, error);
  }
}
