const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

export function getCurrentLocalHour(): number {
    return (new Date().getUTCHours() + TZ_OFFSET) % 24;
}

export function getTodayLocalStr(): string {
    return new Date(Date.now() + TZ_OFFSET * 3600 * 1000).toISOString().slice(0, 10);
}

export function getCurrentLocalMonth(): string {
    return new Date(Date.now() + TZ_OFFSET * 3600 * 1000).toISOString().slice(0, 7);
}
