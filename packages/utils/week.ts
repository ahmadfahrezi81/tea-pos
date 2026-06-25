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

// Pure date-string arithmetic (no TZ concerns — input is already a local date string).
function addDaysToStr(dateStr: string, n: number): string {
    const d = new Date(dateStr + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function isoMondayStr(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00Z");
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - dow + 1);
    return d.toISOString().slice(0, 10);
}

function isoWeekNumStr(dateStr: string): number {
    const d = new Date(dateStr + "T12:00:00Z");
    const thu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    thu.setUTCDate(thu.getUTCDate() + 4 - (thu.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
    return Math.ceil(((thu.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function getPayWindowBounds(
    dateStr: string,
    frequency: string,
): { startDate: string; endDate: string } {
    switch (frequency) {
        case "daily":
            return { startDate: dateStr, endDate: dateStr };
        case "weekly": {
            const mon = isoMondayStr(dateStr);
            return { startDate: mon, endDate: addDaysToStr(mon, 6) };
        }
        case "bi_weekly": {
            const mon = isoMondayStr(dateStr);
            const wn = isoWeekNumStr(dateStr);
            const start = wn % 2 === 0 ? mon : addDaysToStr(mon, -7);
            return { startDate: start, endDate: addDaysToStr(start, 13) };
        }
        case "monthly": {
            const month = dateStr.slice(0, 7);
            const lastDay = new Date(dateStr + "T12:00:00Z");
            lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
            return { startDate: month + "-01", endDate: lastDay.toISOString().slice(0, 10) };
        }
        default:
            return getPayWindowBounds(dateStr, "bi_weekly");
    }
}
