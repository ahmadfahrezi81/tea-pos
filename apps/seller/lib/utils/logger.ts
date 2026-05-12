const DEBUG = process.env.NODE_ENV === "development";

export const logger = {
    error: (message: string, error?: unknown) => {
        if (DEBUG) console.error(`[ERROR] ${message}`, error);
    },
    warn: (message: string, data?: unknown) => {
        if (DEBUG) console.warn(`[WARN] ${message}`, data);
    },
    info: (message: string, data?: unknown) => {
        if (DEBUG) console.log(`[INFO] ${message}`, data);
    },
};
