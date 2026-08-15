"use client";

import { useMemo } from "react";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { HandCoins, IdCard, Coins, Percent, ReceiptText, CalendarClock } from "lucide-react";
import { SettingsRow, SettingsGroup } from "@tea-pos/ui/custom/SettingsRow";
import { parseISO, format, getISOWeek, differenceInCalendarDays } from "date-fns";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { getPayWindowBounds } from "@tea-pos/utils/week";
import { usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useAllPayrollUserInfos } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayFrequency } from "@/lib/context/PayFrequencyContext";
import { isNonSeller } from "@/lib/utils/non-sellers";

/* The current pay window totalled across every selling staff member — the same
   card a single payout gets on the payouts list, minus the name plate, so the
   overview opens on how much this period owes before any drill-down. */
function CurrentPeriodTotals() {
    const { infos, isLoading: isLoadingInfos } = useAllPayrollUserInfos();
    const payFrequency = usePayFrequency();

    const { startDate, endDate } = getPayWindowBounds(getTodayLocalStr(), payFrequency);
    const { payouts, isLoading: isLoadingPayouts } = usePayouts({ startDate, endDate });

    const infoByUserId = useMemo(
        () => Object.fromEntries(infos.map((i) => [i.userId, i])),
        [infos],
    );

    const totals = useMemo(() => {
        const seller = payouts.filter((p) => !isNonSeller(infoByUserId[p.userId]));
        const summed = seller.reduce(
            (acc, p) => ({
                cups: acc.cups + p.totalCups,
                totalPay: acc.totalPay + p.totalPay,
                approved: acc.approved + (p.approvedCount ?? 0),
                reviewed: acc.reviewed + (p.approvedCount ?? 0) + (p.pendingCount ?? 0),
            }),
            { cups: 0, totalPay: 0, approved: 0, reviewed: 0 },
        );
        return { ...summed, staff: seller.length };
    }, [payouts, infoByUserId]);

    if (isLoadingInfos || isLoadingPayouts) {
        return <div className="rounded-xl h-32 animate-pulse bg-white/60" />;
    }

    const weekStart = getISOWeek(parseISO(startDate));
    const weekEnd = getISOWeek(parseISO(endDate));

    /* Counted in calendar days against the local today, so the closing date
       reads as a countdown rather than as a date to work out. */
    const daysLeft = differenceInCalendarDays(parseISO(endDate), parseISO(getTodayLocalStr()));
    const daysLeftLabel = daysLeft <= 0 ? "last day" : `${daysLeft}d left`;

    /* Weekdays and a repeated month cost a whole line on a phone and carry
       nothing — a window inside one month collapses to "3–16 Aug". */
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const sameMonth = format(start, "MMM yyyy") === format(end, "MMM yyyy");
    const rangeLabel = sameMonth
        ? `${format(start, "d")}–${format(end, "d MMM")}`
        : `${format(start, "d MMM")} – ${format(end, "d MMM")}`;

    const allApproved = totals.reviewed > 0 && totals.approved === totals.reviewed;
    const missingApproval = totals.approved < totals.reviewed;

    return (
        <div className="space-y-2">
            <div className="bg-white rounded-2xl p-3 flex items-start justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        {weekStart === weekEnd ? `Week ${weekStart}` : `Week ${weekStart} · Week ${weekEnd}`}
                    </h1>
                    {/* Mono and bold: these two lines are the glanceable state of
                        the period, and proportional text at label weight made
                        them read as captions. */}
                    <p className="font-mono text-sm font-semibold text-gray-600">
                        {rangeLabel} <span className="text-gray-900 font-bold">({daysLeftLabel})</span>
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        Ongoing
                    </span>
                    {/* Kept even at 0 / 0 — a fixed part of the header, so an
                        empty period reads as "nothing approved yet" rather than
                        as a missing line. The icon carries the state so the
                        ratio doesn't have to be read to know it needs work. */}
                    <span
                        className={`font-mono text-sm font-bold ${missingApproval ? "text-amber-600" : allApproved ? "text-green-600" : "text-brand"}`}
                    >
                        {missingApproval ? "⚠️" : allApproved ? "✅" : "⏳"} {totals.approved}/{totals.reviewed} approved
                    </span>
                </div>
            </div>

            {/* One row: the three numbers that answer "how big is this period".
                Commission/claims split is a per-person question, so it lives on
                the payout itself rather than here. */}
            <div className="bg-white rounded-2xl p-2 grid grid-cols-4 gap-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500">Cups</p>
                    <p className="text-lg font-bold text-blue-600">{totals.cups}</p>
                </div>
                <div className="bg-orange-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500">Staff</p>
                    <p className="text-lg font-bold text-orange-600">{totals.staff}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-lg col-span-2">
                    <p className="text-xs font-semibold text-gray-500">Total Owed</p>
                    <p className="text-lg font-bold text-green-600">{`Rp ${totals.totalPay.toLocaleString("id-ID")}`}</p>
                </div>
            </div>
        </div>
    );
}

export default function PayOverviewPage() {
    const { url } = useTenantSlug();

    return (
        <div className="space-y-4">
            <CurrentPeriodTotals />

            <SettingsGroup title="Operations">
                <SettingsRow
                    icon={<HandCoins size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Staff Payouts"
                    onClick={() => navigation.push(url("/mobile/pay/payouts"))}
                />
                <SettingsRow
                    icon={<IdCard size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Staff Payroll Info"
                    onClick={() => navigation.push(url("/mobile/pay/staff"))}
                />
            </SettingsGroup>

            <SettingsGroup title="Configuration">
                <SettingsRow
                    icon={<CalendarClock size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Pay Schedule"
                    onClick={() => navigation.push(url("/mobile/pay/pay-schedule"))}
                />
                <SettingsRow
                    icon={<Coins size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Commission Types"
                    onClick={() => navigation.push(url("/mobile/pay/commission-types"))}
                />
                <SettingsRow
                    icon={<Percent size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Staff Commissions"
                    onClick={() => navigation.push(url("/mobile/pay/staff-commissions"))}
                />
                <SettingsRow
                    icon={<ReceiptText size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Claim Types"
                    onClick={() => navigation.push(url("/mobile/pay/claim-types"))}
                />
            </SettingsGroup>
        </div>
    );
}
