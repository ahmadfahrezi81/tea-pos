import { getTodayLocalStr } from "./time";

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

export function getExpectedPayoutDate(endDate: string): string {
    return addDaysToStr(endDate, 1);
}

/* A payout may be settled from the last day of its own period — the Sunday —
   not from the Monday that getExpectedPayoutDate names. Stores close around
   23:00 on that Sunday and the transfer happens straight after; locking until
   Monday would block the hour the work actually gets done. */
export function getPayoutUnlockDate(endDate: string): string {
    return endDate;
}

/* Whole days from today until the payout unlocks. 0 means it is open now. */
export function getDaysUntilPayoutUnlock(endDate: string, today = getTodayLocalStr()): number {
    const unlock = getPayoutUnlockDate(endDate);
    if (today >= unlock) return 0;
    const diffMs =
        new Date(unlock + "T12:00:00Z").getTime() - new Date(today + "T12:00:00Z").getTime();
    return Math.round(diffMs / 86_400_000);
}

/* Every cadence is a whole number of weeks running Monday to Sunday. That is
   what lets one cadence hand over to another on any Monday without a period
   overlapping or falling short — a calendar month cannot end on a Sunday every
   time, which is why "monthly" here means four weeks. */
export const PAY_FREQUENCIES = ["weekly", "bi_weekly", "four_weekly"] as const;

export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

const WEEKS_PER_PERIOD: Record<PayFrequency, number> = {
    weekly: 1,
    bi_weekly: 2,
    four_weekly: 4,
};

export function isPayFrequency(value: unknown): value is PayFrequency {
    return typeof value === "string" && (PAY_FREQUENCIES as readonly string[]).includes(value);
}

/* Epoch = Monday of ISO Week 2, 2025. Multi-week periods are fixed blocks
   counted from this anchor — no ISO week parity, no year-boundary drift. */
const EPOCH = "2025-01-06";

export function getPayWindowBounds(
    dateStr: string,
    frequency: string,
): { startDate: string; endDate: string } {
    if (!isPayFrequency(frequency)) {
        // The value is validated where it is read from the database, so reaching
        // here means a cadence was added to the column's CHECK and not to this
        // module. Falling back would silently pay on the wrong calendar.
        throw new Error(`Unknown pay frequency: ${frequency}`);
    }

    const weeks = WEEKS_PER_PERIOD[frequency];
    if (weeks === 1) {
        const mon = isoMondayStr(dateStr);
        return { startDate: mon, endDate: addDaysToStr(mon, 6) };
    }

    const days = weeks * 7;
    const epochMs = new Date(EPOCH + "T12:00:00Z").getTime();
    const dateMs = new Date(dateStr + "T12:00:00Z").getTime();
    const blockIndex = Math.floor(Math.round((dateMs - epochMs) / 86_400_000) / days);
    const start = addDaysToStr(EPOCH, blockIndex * days);
    return { startDate: start, endDate: addDaysToStr(start, days - 1) };
}
