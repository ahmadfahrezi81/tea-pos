const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

export interface WeekInfo {
    weekNum: number;
    year: number;
    startDate: Date;
    endDate: Date;
    label: string;
}

function resolveDate(input?: Date | string): Date {
    if (!input) return new Date(Date.now() + TZ_OFFSET * 3_600_000);
    if (typeof input === "string") return new Date(input);
    return input;
}

function isoWeekNum(d: Date): number {
    const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function isoWeekStart(d: Date): Date {
    const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() - day + 1);
    return new Date(utc.getTime() - TZ_OFFSET * 3_600_000);
}

export function getWeekInfo(date?: Date | string): WeekInfo {
    const d = resolveDate(date);
    const weekNum = isoWeekNum(d);
    const startDate = isoWeekStart(d);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
        weekNum,
        year: startDate.getFullYear(),
        startDate,
        endDate,
        label: `Week ${weekNum}`,
    };
}
