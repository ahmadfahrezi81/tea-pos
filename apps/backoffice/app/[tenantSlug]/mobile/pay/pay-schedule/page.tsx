"use client";

import { useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Check, CalendarClock, AlertTriangle } from "lucide-react";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { getPayWindowBounds, getExpectedPayoutDate, PAY_FREQUENCIES } from "@tea-pos/utils/week";
import type { PayFrequency } from "@tea-pos/utils/week";
import { usePayFrequency } from "@/lib/context/PayFrequencyContext";
import { usePayFrequencyConfig } from "@/lib/hooks/tenant-config/usePayFrequencyConfig";
import { ConfirmationPopup } from "@/components/shared/ConfirmationPopup";
import { useToast } from "@/lib/context/ToastContext";
import { useErrorSheet } from "@/lib/context/ErrorSheetContext";

const LABELS: Record<PayFrequency, string> = {
    weekly: "Weekly",
    bi_weekly: "Bi-weekly",
    four_weekly: "Every 4 weeks",
};

const DESCRIPTIONS: Record<PayFrequency, string> = {
    weekly: "1 week per period · paid every Monday",
    bi_weekly: "2 weeks per period · 26 payouts a year",
    four_weekly: "4 weeks per period · 13 payouts a year",
};

function windowLabel(frequency: PayFrequency, today: string) {
    const { startDate, endDate } = getPayWindowBounds(today, frequency);
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const sameMonth = format(start, "MMM yyyy") === format(end, "MMM yyyy");
    return sameMonth
        ? `${format(start, "d")}–${format(end, "d MMM")}`
        : `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}

export default function PaySchedulePage() {
    const current = usePayFrequency();
    const { save, isSaving } = usePayFrequencyConfig();
    const { showToast } = useToast();
    const { showError } = useErrorSheet();
    const [pending, setPending] = useState<PayFrequency | null>(null);

    const today = getTodayLocalStr();
    const { endDate } = getPayWindowBounds(today, current);
    const daysLeft = differenceInCalendarDays(parseISO(endDate), parseISO(today));

    /* A period is only safe to leave on the day it ends: the payout rows are
       keyed by their start date, so switching mid-period rewrites the window
       money has already been counted into. */
    const isPeriodEnding = daysLeft === 0;

    const confirm = async () => {
        if (!pending) return;
        try {
            await save(pending);
            showToast(`Pay schedule set to ${LABELS[pending]}`, "success");
        } catch (error) {
            showError(error);
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white p-3 rounded-2xl flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <CalendarClock size={24} className="text-brand" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500">Current period · {LABELS[current]}</p>
                    <p className="font-mono text-sm font-semibold text-gray-600">
                        {windowLabel(current, today)}{" "}
                        <span className="text-gray-900 font-bold">
                            ({daysLeft <= 0 ? "last day" : `${daysLeft}d left`})
                        </span>
                    </p>
                    <p className="text-xs text-gray-500">
                        Next payout {format(parseISO(getExpectedPayoutDate(endDate)), "EEE, d MMM")}
                    </p>
                </div>
            </div>

            {/* The rule that keeps a switch safe, stated where the switch happens
                rather than in a task file nobody reads at 11pm. */}
            {!isPeriodEnding && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-2.5">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-900">Not the day to change this</p>
                        <p className="text-sm text-amber-800">
                            The current period still has {daysLeft} {daysLeft === 1 ? "day" : "days"} to run.
                            Changing now rewrites the window that this period&apos;s pay has already been
                            counted into. Wait until {format(parseISO(endDate), "EEE, d MMM")}, pay everyone,
                            let the last store close, then switch.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl overflow-hidden">
                {PAY_FREQUENCIES.map((frequency, index) => {
                    const isCurrent = frequency === current;
                    return (
                        <button
                            key={frequency}
                            disabled={isCurrent || isSaving}
                            onClick={() => setPending(frequency)}
                            className={`w-full flex items-center justify-between gap-3 p-4 text-left ${index > 0 ? "border-t border-gray-100" : ""} ${isCurrent ? "" : "active:bg-gray-50"}`}
                        >
                            <div className="min-w-0">
                                <p className={`text-base font-semibold ${isCurrent ? "text-brand" : "text-gray-900"}`}>
                                    {LABELS[frequency]}
                                </p>
                                <p className="text-xs text-gray-500">{DESCRIPTIONS[frequency]}</p>
                                <p className="font-mono text-xs text-gray-400 mt-0.5">
                                    {windowLabel(frequency, today)}
                                </p>
                            </div>
                            {isCurrent && <Check size={18} className="text-brand shrink-0" />}
                        </button>
                    );
                })}
            </div>

            <p className="text-xs text-gray-400 px-1">
                Applies to every staff member. Payouts already marked paid are never changed.
            </p>

            <ConfirmationPopup
                isOpen={pending !== null}
                type="warning"
                title={`Switch to ${pending ? LABELS[pending] : ""}?`}
                message={
                    pending
                        ? `From now on a pay period runs ${windowLabel(pending, today)}. ` +
                          (isPeriodEnding
                              ? "Today is the last day of the current period, so this is a clean handover — as long as everyone has been paid and every store has closed."
                              : `The current ${LABELS[current].toLowerCase()} period does not end for ${daysLeft} more ${daysLeft === 1 ? "day" : "days"}. Switching now rewrites a window that pay has already been counted into.`)
                        : ""
                }
                confirmText={isSaving ? "Saving..." : "Switch"}
                onConfirm={confirm}
                onCancel={() => setPending(null)}
            />
        </div>
    );
}
