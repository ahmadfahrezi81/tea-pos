// lib/utils/formatTimeAgo.ts

/**
 * Returns a short relative time string e.g. "1s", "4m", "2h", "3d"
 * Handles timestamps without timezone suffix (assumes UTC)
 */
export function formatTimeAgo(dateStr: string): string {
    try {
        // Ensure the string is treated as UTC by appending Z if missing
        const normalized = dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;
        const date = new Date(normalized);
        const now = new Date();

        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return `${diffSecs}s`;
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    } catch {
        return "";
    }
}
