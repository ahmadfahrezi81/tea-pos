"use client";

import { useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Check, CalendarClock } from "lucide-react";
import { Callout } from "@tea-pos/ui/custom/Callout";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { getPayWindowBounds, getExpectedPayoutDate, PAY_FREQUENCIES } from "@tea-pos/utils/week";
import type { PayFrequency } from "@tea-pos/utils/week";
import { usePayFrequency } from "@/lib/context/PayFrequencyContext";
import { usePayFrequencyConfig } from "@/lib/hooks/tenant-config/usePayFrequencyConfig";
import { usePayouts } from "@/lib/hooks/payroll/usePayroll";
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

function rangeLabel(startDate: string, endDate: string) {
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
    const window = current ? getPayWindowBounds(today, current) : null;
    const { payouts } = usePayouts(window ?? undefined);

    if (!current || !window) {
        return (
            <div className="bg-white rounded-2xl p-4 text-center space-y-1">
                <p className="text-base font-semibold text-gray-900">Pay schedule unavailable</p>
                <p className="text-sm text-gray-500">
                    The tenant&apos;s pay frequency couldn&apos;t be read. Reload, and if it persists the
                    value is missing or invalid in the database.
                </p>
            </div>
        );
    }

    const { startDate: currentStart, endDate } = window;
    const daysLeft = differenceInCalendarDays(parseISO(endDate), parseISO(today));

    /* A change applies to the period after this one, so every option is priced
       from the day the current period ends — showing the window each cadence
       happens to be in *today* would quote a range the choice never produces. */
    const nextStart = getExpectedPayoutDate(endDate);

    const nextPeriod = (frequency: PayFrequency) => {
        const bounds = getPayWindowBounds(nextStart, frequency);
        // A cadence whose block is already running on that day would swallow days
        // the current period has counted — the one case the warning below is about.
        return { ...bounds, alignsWithHandover: bounds.startDate === nextStart };
    };

    /* Payout rows are keyed by their start date, so a switch rewrites the window
       of any payout already open in this period. Two ways for that to be safe:
       the period ends today, or nothing has been counted into it yet — which is
       exactly the state on a Monday morning before the first store closes, the
       moment a switch is most likely to be made. Asking the payouts is more
       honest than asking the calendar. */
    const nothingCountedYet = payouts.length === 0;
    const isSafeToSwitch = daysLeft === 0 || nothingCountedYet;

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
                        {rangeLabel(currentStart, endDate)}{" "}
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
            {!isSafeToSwitch && (
                <Callout title="Not the day to change this">
                    {payouts.length} {payouts.length === 1 ? "payout has" : "payouts have"} already
                    been counted into this period, and it still has {daysLeft}{" "}
                    {daysLeft === 1 ? "day" : "days"} to run. Changing now rewrites the window that
                    pay was counted into. Wait until {format(parseISO(endDate), "EEE, d MMM")}, pay
                    everyone, let the last store close, then switch.
                </Callout>
            )}

            <div className="bg-white rounded-2xl overflow-hidden">
                {PAY_FREQUENCIES.map((frequency, index) => {
                    const isCurrent = frequency === current;
                    const next = nextPeriod(frequency);
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
                                    Next: {rangeLabel(next.startDate, next.endDate)}
                                    {!next.alignsWithHandover && " ⚠"}
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
                        ? `The next pay period runs ${rangeLabel(nextPeriod(pending).startDate, nextPeriod(pending).endDate)}. ` +
                          (nothingCountedYet
                              ? "Nothing has been counted into the current period yet, so this is a clean handover."
                              : daysLeft === 0
                                ? "Today is the last day of the current period, so this is a clean handover — as long as everyone has been paid and every store has closed."
                                : `The current ${LABELS[current].toLowerCase()} period does not end for ${daysLeft} more ${daysLeft === 1 ? "day" : "days"}, and ${payouts.length} ${payouts.length === 1 ? "payout has" : "payouts have"} already been counted into it. Switching now rewrites the window that pay was counted into.`) +
                          (nextPeriod(pending).alignsWithHandover
                              ? ""
                              : ` Note: that period starts before ${format(parseISO(nextStart), "d MMM")}, so it covers days the current period already counted.`)
                        : ""
                }
                confirmText={isSaving ? "Saving..." : "Switch"}
                onConfirm={confirm}
                onCancel={() => setPending(null)}
            />
        </div>
    );
}
