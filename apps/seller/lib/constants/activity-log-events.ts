import type { LucideIcon } from "lucide-react";
import {
    LockOpen, ArrowRightLeft, DollarSign, Lock, LogOut, Package, AlertTriangle,
    Wallet, Image, Trash2, Hash, MessageSquare, Settings, ClipboardList,
    Calendar, RefreshCw, Banknote, ShoppingCart,
} from "lucide-react";

export const EVENT_ICON: Record<string, LucideIcon> = {
    order_created: ShoppingCart,
    store_open: LockOpen,
    daily_summary_closed: Lock,
    session_transferred: ArrowRightLeft,
    session_ended: LogOut,
    expense_created: DollarSign,
    expense_updated: DollarSign,
    expense_deleted: Trash2,
    balance_updated: Wallet,
    photo_uploaded: Image,
    photo_deleted: Trash2,
    photo_quantity_updated: Hash,
    customer_feedback_submitted: MessageSquare,
    commission_config_updated: Settings,
    payroll_entry_updated: ClipboardList,
    payroll_period_updated: Calendar,
    payroll_payout_updated: Banknote,
    supply_request_created: Package,
    incident_report_created: AlertTriangle,
    reimbursement_submitted: RefreshCw,
    reimbursement_status_updated: RefreshCw,
};

export const EVENT_COLOR: Record<string, string> = {
    order_created: "bg-blue-500",
    store_open: "bg-green-500",
    daily_summary_closed: "bg-gray-500",
    session_transferred: "bg-blue-500",
    session_ended: "bg-slate-400",
    expense_created: "bg-orange-400",
    expense_updated: "bg-orange-400",
    expense_deleted: "bg-red-400",
    balance_updated: "bg-blue-400",
    photo_uploaded: "bg-teal-400",
    photo_deleted: "bg-red-400",
    photo_quantity_updated: "bg-teal-400",
    customer_feedback_submitted: "bg-pink-400",
    commission_config_updated: "bg-violet-500",
    payroll_entry_updated: "bg-violet-400",
    payroll_period_updated: "bg-violet-400",
    payroll_payout_updated: "bg-green-600",
    supply_request_created: "bg-purple-500",
    incident_report_created: "bg-red-500",
    reimbursement_submitted: "bg-indigo-400",
    reimbursement_status_updated: "bg-indigo-400",
};

export const EVENT_LABEL: Record<string, string> = {
    order_created: "Order",
    store_open: "Store opened",
    daily_summary_closed: "Store closed",
    session_transferred: "Session handed over",
    session_ended: "Session ended",
    expense_created: "Expense added",
    expense_updated: "Expense updated",
    expense_deleted: "Expense deleted",
    balance_updated: "Balance updated",
    photo_uploaded: "Photo uploaded",
    photo_deleted: "Photo deleted",
    photo_quantity_updated: "Photo quantity updated",
    customer_feedback_submitted: "Customer feedback submitted",
    commission_config_updated: "Commission rate updated",
    payroll_entry_updated: "Payroll entry updated",
    payroll_period_updated: "Payroll period updated",
    payroll_payout_updated: "Payroll payout updated",
    supply_request_created: "Supply requested",
    incident_report_created: "Incident reported",
    reimbursement_submitted: "Reimbursement submitted",
    reimbursement_status_updated: "Reimbursement status updated",
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
