import { assertMethod, json, sendError } from "../lib/api.js";

export default async function handler(req, res) {
  try {
    if (!assertMethod(req, res, ["GET"])) return;
    return json(res, 200, { ok: true, now: Date.now() });
  } catch (error) {
    return sendError(res, error);
  }
}
