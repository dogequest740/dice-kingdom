import { BUILDING_BY_ID, collectFromBuilding } from "../../../shared/game-config.js";
import { ApiError, assertMethod, json, sendError } from "../../../lib/api.js";
import { getAuthUser } from "../../../lib/telegram-auth.js";
import { applyProductionAndSync, getOrCreatePlayer, makeSnapshot, savePlayer } from "../../../lib/player-store.js";
export default async function handler(req, res) {
    try {
        if (!assertMethod(req, res, ["POST"]))
            return;
        const authUser = getAuthUser(req);
        const buildingId = String(req.query?.buildingId || "");
        const building = BUILDING_BY_ID[buildingId];
        if (!building) {
            throw new ApiError(404, "Building not found");
        }
        if (!building.productionPerLevel) {
            throw new ApiError(400, "This building does not produce collectible resources");
        }
        let player = await getOrCreatePlayer(authUser);
        player = applyProductionAndSync(player);
        const result = collectFromBuilding(player.state, buildingId);
        if (result.collectedTotal <= 0) {
            if (result.reason === "storage_full") {
                throw new ApiError(400, "Storage is full");
            }
            throw new ApiError(400, "Nothing to collect");
        }
        player = await savePlayer(player, authUser);
        return json(res, 200, {
            ...makeSnapshot(player),
            buildingId,
            collected: result.collected,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
}
