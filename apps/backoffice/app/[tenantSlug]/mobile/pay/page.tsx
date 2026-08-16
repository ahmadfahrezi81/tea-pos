"use client";

import { useMemo } from "react";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { HandCoins, IdCard, Coins, Percent, ReceiptText, CalendarClock, CalendarFold } from "lucide-react";
import { SettingsRow, SettingsGroup } from "@tea-pos/ui/custom/SettingsRow";
import { parseISO, format, getISOWeek, differenceInCalendarDays } from "date-fns";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { getPayWindowBounds, getExpectedPayoutDate } from "@tea-pos/utils/week";
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

    const window = payFrequency ? getPayWindowBounds(getTodayLocalStr(), payFrequency) : null;
    const { payouts, isLoading: isLoadingPayouts } = usePayouts(window ?? undefined);

    const infoByUserId = useMemo(
        () => Object.fromEntries(infos.map((i) => [i.userId, i])),
        [infos],
    );

    /* Summed over selling staff only, tile for tile with the grid a single
       payout card renders — the period is the same shape as one person's
       payout, so it should read the same way. */
    const totals = useMemo(
        () =>
            payouts
                .filter((p) => !isNonSeller(infoByUserId[p.userId]))
                .reduce(
                    (acc, p) => ({
                        orders: acc.orders + p.totalOrders,
                        cups: acc.cups + p.totalCups,
                        commissions: acc.commissions + p.commissionsTotal,
                        claims: acc.claims + p.claimsTotal,
                        totalPay: acc.totalPay + p.totalPay,
                        approved: acc.approved + (p.approvedCount ?? 0),
                        reviewed: acc.reviewed + (p.approvedCount ?? 0) + (p.pendingCount ?? 0),
                    }),
                    { orders: 0, cups: 0, commissions: 0, claims: 0, totalPay: 0, approved: 0, reviewed: 0 },
                ),
        [payouts, infoByUserId],
    );

    // No cadence, no period — a totals card with an invented window would be
    // read as fact. The rest of the tab still works.
    if (!window) return null;

    if (isLoadingInfos || isLoadingPayouts) {
        return <div className="rounded-xl h-32 animate-pulse bg-white/60" />;
    }

    const { startDate, endDate } = window;
    const weekStart = getISOWeek(parseISO(startDate));
    const weekEnd = getISOWeek(parseISO(endDate));

    /* Counted in calendar days against the local today, so the pay date reads
       as a countdown rather than as a date to work out. */
    const daysLeft = differenceInCalendarDays(parseISO(endDate), parseISO(getTodayLocalStr()));
    const daysLeftLabel = daysLeft <= 0 ? "last day" : `${daysLeft}d left`;

    const allApproved = totals.reviewed > 0 && totals.approved === totals.reviewed;
    const missingApproval = totals.approved < totals.reviewed;

    /* One card: which period, when it pays, and what it costs. Split apart,
       these were two cards that only mean anything read together. */
    return (
        <div className="bg-white rounded-2xl p-2 space-y-2">
            <div className="flex items-center justify-between gap-2 px-2 pt-1">
                {/* "Week 32–35" rather than four spelled-out weeks: a four-weekly
                    period would wrap the line, and the word only needs saying once. */}
                <h1 className="flex items-center gap-1.5 text-xl font-bold text-gray-900">
                    <CalendarFold size={22} strokeWidth={3} className="text-gray-900 shrink-0" />
                    {weekStart === weekEnd ? `Week ${weekStart}` : `Week ${weekStart}–${weekEnd}`}
                </h1>
                {/* Kept even at 0 / 0, so an empty period reads as "nothing
                    approved yet" rather than as a missing line. Colour carries
                    the state — amber means someone still has to look at it. */}
                <span
                    className={`font-mono text-sm font-bold shrink-0 ${missingApproval ? "text-amber-600" : allApproved ? "text-green-600" : "text-brand"}`}
                >
                    {totals.approved}/{totals.reviewed} approved
                </span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-2">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <CalendarClock size={20} className="text-brand" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500">Next expected payout</p>
                    <p className="text-base font-bold text-gray-900">
                        {format(parseISO(getExpectedPayoutDate(endDate)), "EEE, d MMM yyyy")}{" "}
                        <span className="font-mono text-sm font-semibold text-gray-500">
                            ({daysLeftLabel})
                        </span>
                    </p>
                </div>
            </div>

            {/* Same tile grid a single payout card renders, so the period reads
                as one payout owed to everyone. */}
            <div className="bg-slate-50 rounded-xl p-2 grid grid-cols-4 gap-2">
                {/* Counts are neutral, money is warm, and the warmth deepens
                    towards what is owed: amber and yellow are the two halves,
                    red is the sum. Orders left orange would have read as a third
                    amount rather than as a count. */}
                <div className="bg-slate-200 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500">Orders</p>
                    <p className="text-lg font-bold text-slate-700">{totals.orders}</p>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500">Cups</p>
                    <p className="text-lg font-bold text-blue-600">{totals.cups}</p>
                </div>
                <div className="bg-amber-100 p-2 rounded-lg col-span-2">
                    <p className="text-xs font-semibold text-gray-500">Commission Owed</p>
                    <p className="text-lg font-bold text-amber-600">{`Rp ${totals.commissions.toLocaleString("id-ID")}`}</p>
                </div>
                <div className="bg-yellow-100 p-2 rounded-lg col-span-2">
                    <p className="text-xs font-semibold text-gray-500">Claims Owed</p>
                    <p className="text-lg font-bold text-yellow-700">{`Rp ${totals.claims.toLocaleString("id-ID")}`}</p>
                </div>
                {/* Red, not green: on a payout card the total is money a seller
                    has earned; here it is money the tenant still owes, and it
                    should not read as a win. */}
                <div className="bg-red-100 p-2 rounded-lg col-span-2">
                    <p className="text-xs font-semibold text-gray-500">Total Owed</p>
                    <p className="text-lg font-bold text-red-600">{`Rp ${totals.totalPay.toLocaleString("id-ID")}`}</p>
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
