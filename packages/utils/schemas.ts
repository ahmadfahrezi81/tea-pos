/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/utils/schemas.ts

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Converts snake_case keys to camelCase recursively
 * Usage: toCamelKeys(dbResult) before parsing with schema
 */

const toCamel = (str: string): string =>
    str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

export const toCamelKeys = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(toCamelKeys);
    if (obj !== null && typeof obj === "object") {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            acc[toCamel(key)] = toCamelKeys(value);
            return acc;
        }, {} as any);
    }
    return obj;
};

/**
 * Converts camelCase keys to snake_case recursively
 * Usage: toSnakeKeys(apiData) before inserting into database
 */
const toSnake = (str: string): string =>
    str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const toSnakeKeys = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(toSnakeKeys);
    if (obj !== null && typeof obj === "object") {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            acc[toSnake(key)] = toSnakeKeys(value);
            return acc;
        }, {} as any);
    }
    return obj;
};
