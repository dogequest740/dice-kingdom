import { createDefaultState } from "../../shared/game-config.js";
import { ApiError, assertMethod, json, sendError } from "../../lib/api.js";
import { getAuthUser, isDevAuthEnabled } from "../../lib/telegram-auth.js";
import { makeSnapshot, savePlayer } from "../../lib/player-store.js";

export default async function handler(req, res) {
  try {
    if (!assertMethod(req, res, ["POST"])) return;
    if (!isDevAuthEnabled()) {
      throw new ApiError(403, "Dev reset is disabled");
    }

    const authUser = getAuthUser(req);
    const player = await savePlayer(
      {
        userId: Number(authUser.id),
        username: authUser.username || null,
        firstName: authUser.first_name || null,
        state: createDefaultState(),
      },
      authUser
    );

    return json(res, 200, { ok: true, snapshot: makeSnapshot(player) });
  } catch (error) {
    return sendError(res, error);
  }
}
