export class ApiError extends Error {
    status;
    details;
    constructor(status, message, details = null) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}
export function json(res, status, payload) {
    res.status(status).json(payload);
}
export function sendError(res, error) {
    if (error instanceof ApiError) {
        const payload = { error: error.message };
        if (error.details)
            payload.details = error.details;
        return json(res, error.status, payload);
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return json(res, 500, { error: message });
}
export function assertMethod(req, res, methods) {
    const allowed = Array.isArray(methods) ? methods : [methods];
    if (allowed.includes(req.method))
        return true;
    res.setHeader("allow", allowed.join(", "));
    json(res, 405, { error: `Method ${req.method} not allowed` });
    return false;
}
export function getBody(req) {
    if (!req.body)
        return {};
    if (typeof req.body === "string") {
        try {
            return JSON.parse(req.body);
        }
        catch {
            return {};
        }
    }
    if (typeof req.body === "object")
        return req.body;
    return {};
}
export function getHeader(req, name) {
    const key = name.toLowerCase();
    const value = req.headers?.[key];
    if (Array.isArray(value))
        return value[0];
    return typeof value === "string" ? value : "";
}
