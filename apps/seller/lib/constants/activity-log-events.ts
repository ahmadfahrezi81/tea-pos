import type { LucideIcon } from "lucide-react";
import { LockOpen, ArrowRightLeft, DollarSign, Lock, LogOut, Package, AlertTriangle } from "lucide-react";

export const EVENT_ICON: Record<string, LucideIcon> = {
    store_open: LockOpen,
    session_transferred: ArrowRightLeft,
    session_ended: LogOut,
    expense_created: DollarSign,
    daily_summary_closed: Lock,
    supply_request_created: Package,
    incident_report_created: AlertTriangle,
};

export const EVENT_COLOR: Record<string, string> = {
    store_open: "bg-green-500",
    session_transferred: "bg-blue-500",
    session_ended: "bg-slate-400",
    expense_created: "bg-orange-400",
    daily_summary_closed: "bg-gray-500",
    supply_request_created: "bg-purple-500",
    incident_report_created: "bg-red-500",
};

export const EVENT_LABEL: Record<string, string> = {
    store_open: "Store opened",
    session_transferred: "Session handed over",
    session_ended: "Session ended",
    expense_created: "Expense added",
    daily_summary_closed: "Store closed",
    supply_request_created: "Supply requested",
    incident_report_created: "Incident reported",
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
