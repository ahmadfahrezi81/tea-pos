import type { LucideIcon } from "lucide-react";
import { LockOpen, ArrowRightLeft, DollarSign, Lock } from "lucide-react";

export const EVENT_ICON: Record<string, LucideIcon> = {
    store_open: LockOpen,
    session_transferred: ArrowRightLeft,
    expense_created: DollarSign,
    daily_summary_closed: Lock,
};

export const EVENT_COLOR: Record<string, string> = {
    store_open: "bg-green-500",
    session_transferred: "bg-blue-500",
    expense_created: "bg-orange-400",
    daily_summary_closed: "bg-gray-500",
};

export const EVENT_LABEL: Record<string, string> = {
    store_open: "Store opened",
    session_transferred: "Session handed over",
    expense_created: "Expense added",
    daily_summary_closed: "Store closed",
};

export function formatEventTime(createdAt: string): string {
    const tz = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);
    const localMs = new Date(createdAt).getTime() + tz * 3600 * 1000;
    const d = new Date(localMs);
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:${String(m).padStart(2, "0")} ${ampm}`;
}
