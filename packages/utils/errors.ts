export class ApiError extends Error {
    status: number;
    /** e.g. "PUT /api/payroll/commission-types/abc123" — set by apiFetch at throw time. */
    route?: string;

    constructor(message: string, status = 500, route?: string) {
        super(message);
        this.status = status;
        this.route = route;
    }
}

export function toApiError(err: unknown, fallbackMessage = "Something went wrong"): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof Error) {
        const status = (err as Error & { status?: number }).status ?? 500;
        return new ApiError(err.message, status);
    }
    if (typeof err === "string") return new ApiError(err);
    return new ApiError(fallbackMessage);
}

const FETCH_ERROR_COOLDOWN_MS = 10_000;

/** Returns a gate function: true if a fetch error for this key should be shown now, false if still in cooldown. */
export function createFetchErrorGate(cooldownMs = FETCH_ERROR_COOLDOWN_MS) {
    const lastShown = new Map<string, number>();
    return (key: string): boolean => {
        const now = Date.now();
        const last = lastShown.get(key) ?? 0;
        if (now - last < cooldownMs) return false;
        lastShown.set(key, now);
        return true;
    };
}
