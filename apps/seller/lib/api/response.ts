import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { toApiError } from "@tea-pos/utils/errors";

export function ok<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}

export function err(message: string, status = 500) {
    return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
    return err("Unauthorized", 401);
}

export function badRequest(message = "Invalid request") {
    return err(message, 400);
}

export function forbidden(message = "Forbidden") {
    return err(message, 403);
}

export function handleError(route: string, error: unknown) {
    const apiError = toApiError(error, "Internal server error");
    if (apiError.status >= 500) {
        // The raw throwable goes to the log as well as the ApiError. Supabase
        // reports failures as a plain object, not an Error, so `toApiError`
        // cannot preserve its message and replaces it with the generic
        // fallback — logging only the ApiError leaves a 500 with no code, no
        // hint, and a stack pointing at where the ApiError was constructed.
        // The response body stays generic; the detail is for the log.
        logger.error(`${route} → ${apiError.status}`, { apiError, cause: error });
    }
    return err(apiError.message, apiError.status);
}
