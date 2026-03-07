import { BUILDING_BY_ID, getUpgradeReadiness, startUpgrade } from "../../../shared/game-config.js";
import { ApiError, assertMethod, json, sendError } from "../../../lib/api.js";
import { getAuthUser } from "../../../lib/telegram-auth.js";
import { applyProductionAndSync, getOrCreatePlayer, makeSnapshot, savePlayer } from "../../../lib/player-store.js";
export default async function handler(req, res) {
    try {
        if (!assertMethod(req, res, ["POST"]))
            return;
        const authUser = getAuthUser(req);
        const buildingId = String(req.query?.buildingId || "");
        if (!BUILDING_BY_ID[buildingId]) {
            throw new ApiError(404, "Building not found");
        }
        let player = await getOrCreatePlayer(authUser);
        player = applyProductionAndSync(player);
        const readiness = getUpgradeReadiness(player.state, buildingId, Date.now());
        if (readiness.ruleIssues.length > 0) {
            throw new ApiError(400, readiness.ruleIssues[0], {
                nextLevel: readiness.nextLevel,
                ruleIssues: readiness.ruleIssues,
            });
        }
        if (!readiness.canAfford) {
            throw new ApiError(400, "Not enough resources", { cost: readiness.cost });
        }
        const startResult = startUpgrade(player.state, buildingId, Date.now());
        if (!startResult.ok) {
            throw new ApiError(400, startResult.readiness.ruleIssues[0] || "Cannot start upgrade");
        }
        player = await savePlayer(player, authUser);
        return json(res, 200, {
            ...makeSnapshot(player),
            started: true,
            upgrade: {
                buildingId,
                toLevel: startResult.task.toLevel,
                durationSec: startResult.task.durationSec,
                finishAt: startResult.task.finishAt,
            },
            spent: startResult.readiness.cost,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
}
