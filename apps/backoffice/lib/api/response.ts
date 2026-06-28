import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";

export function ok<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}

export function err(message: string, status = 500) {
    return NextResponse.json({ error: message }, { status });
}

export function unauthorized() { return err("Unauthorized", 401); }
export function badRequest(message = "Invalid request") { return err(message, 400); }
export function forbidden(message = "Forbidden") { return err(message, 403); }

export function handleError(route: string, error: unknown) {
    logger.error(route, error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = (error as { status?: number }).status ?? 500;
    return err(message, status);
}
