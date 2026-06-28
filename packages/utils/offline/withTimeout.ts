/**
 * Timeout wrappers for network operations
 * Prevents UI from freezing on slow/unreliable networks
 */

export interface TimeoutResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Execute async function with timeout
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param label - Label for logging
 * @returns {success, data} or {success: false, error}
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label: string = "Operation"
): Promise<TimeoutResult<T>> {
    return Promise.race([
        promise.then((data) => {
            console.log(`[withTimeout] ${label} completed in time`);
            return { success: true, data };
        }),
        new Promise<TimeoutResult<T>>((resolve) => {
            setTimeout(() => {
                console.warn(`[withTimeout] ${label} timed out after ${timeoutMs}ms`);
                resolve({ success: false, error: `${label} timeout` });
            }, timeoutMs);
        }),
    ]).catch((err) => {
        console.error(`[withTimeout] ${label} failed:`, err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    });
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
    if (typeof window === "undefined") return true;
    return navigator.onLine;
}

/**
 * Wait for online status
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
    if (isOnline()) return Promise.resolve(true);

    return new Promise((resolve) => {
        const handleOnline = () => {
            window.removeEventListener("online", handleOnline);
            resolve(true);
        };

        window.addEventListener("online", handleOnline);

        setTimeout(() => {
            window.removeEventListener("online", handleOnline);
            resolve(false);
        }, timeoutMs);
    });
}
