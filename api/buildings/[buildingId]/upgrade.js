import { BUILDING_BY_ID, getUpgradeReadiness, spendResources } from "../../../shared/game-config.js";
import { ApiError, assertMethod, json, sendError } from "../../../lib/api.js";
import { getAuthUser } from "../../../lib/telegram-auth.js";
import { applyProductionAndSync, getOrCreatePlayer, makeSnapshot, savePlayer } from "../../../lib/player-store.js";

export default async function handler(req, res) {
  try {
    if (!assertMethod(req, res, ["POST"])) return;

    const authUser = getAuthUser(req);
    const buildingId = String(req.query?.buildingId || "");
    if (!BUILDING_BY_ID[buildingId]) {
      throw new ApiError(404, "Building not found");
    }

    let player = await getOrCreatePlayer(authUser);
    player = applyProductionAndSync(player);

    const readiness = getUpgradeReadiness(player.state, buildingId);
    if (readiness.ruleIssues.length > 0) {
      throw new ApiError(400, readiness.ruleIssues[0], {
        nextLevel: readiness.nextLevel,
        ruleIssues: readiness.ruleIssues,
      });
    }

    if (!readiness.canAfford) {
      throw new ApiError(400, "Not enough resources", { cost: readiness.cost });
    }

    spendResources(player.state, readiness.cost);
    player.state.buildings[buildingId] = (player.state.buildings[buildingId] || 0) + 1;
    player.state.lastTick = Date.now();

    player = await savePlayer(player, authUser);
    return json(res, 200, { ...makeSnapshot(player), spent: readiness.cost });
  } catch (error) {
    return sendError(res, error);
  }
}
