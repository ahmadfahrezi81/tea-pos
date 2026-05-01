const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

export function getCurrentLocalHour(): number {
    return (new Date().getUTCHours() + TZ_OFFSET) % 24;
}
