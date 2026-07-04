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
        logger.error(`${route} → ${apiError.status}`, apiError);
    }
    return err(apiError.message, apiError.status);
}
