"use client";

import { useState } from "react";
import {
    usePayrollClaims,
    useClaimableTypes,
} from "@/lib/hooks/payroll-claims/usePayrollClaims";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { getPayWindowBounds } from "@tea-pos/utils/week";
import { getCurrentLocalMonth, getTodayLocalStr } from "@tea-pos/utils/time";
import { ReceiptText, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { useT } from "@/lib/hooks/useT";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";

const SHOW_ALL_ENTITLEMENTS = false; // dev flag: true = show all types, false = claimable only

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
};

export default function ReimbursementsPage() {
    const { claims, isLoading: claimsLoading } = usePayrollClaims();
    const { info, isLoading: infoLoading } = usePayrollUserInfo();
    const t = useT();

    const [selectedMonth, setSelectedMonth] = useState(getCurrentLocalMonth());

    const today = getTodayLocalStr();
    const window = info
        ? getPayWindowBounds(today, info.payFrequency ?? "bi_weekly")
        : null;

    const { types, isLoading: typesLoading } = useClaimableTypes(window);

    const filteredClaims = claims.filter((c: any) =>
        c.date?.startsWith(selectedMonth),
    );

    return (
        <div className="space-y-3">
            {/* Entitlements */}
            <div className="bg-white rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">
                    {t("claims.entitlements")}
                </p>
                {infoLoading || typesLoading ? (
                    <div className="space-y-2">
                        {[1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-12 bg-gray-100 rounded-xl animate-pulse"
                            />
                        ))}
                    </div>
                ) : (() => {
                    const displayTypes = SHOW_ALL_ENTITLEMENTS ? types : types.filter((type: any) => type.claimable);
                    if (displayTypes.length === 0) return (
                        <div className="py-1 space-y-0.5">
                            <p className="text-sm font-medium text-gray-700">All claims used for this period</p>
                            <p className="text-xs text-gray-500">You've already submitted all available claims.</p>
                        </div>
                    );
                    return (
                    <div className="divide-y divide-gray-100">
                        {displayTypes.map((type: any) => (
                            <div key={type.id} className="flex items-center justify-between py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{type.name}</p>
                                    <p className="text-xs text-gray-600 font-medium">
                                        {type.frequency === "daily" ? "Daily" : type.frequency === "weekly" ? t("claims.freqWeekly") : type.frequency === "monthly" ? t("claims.freqMonthly") : type.frequency === "one_time" ? t("claims.freqOneTime") : type.frequency}
                                        {" · "}
                                        {type.claimSource === "auto" ? t("claims.auto") : "Manual"}
                                    </p>
                                </div>
                                <p className="text-base font-bold text-gray-900">{formatRupiah(type.amount ?? 0)}</p>
                            </div>
                        ))}
                    </div>
                    );
                })()}
            </div>

            {/* Month selector */}
            <div className="bg-white p-4 rounded-2xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    {t("analytics.selectMonth")}
                </label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />
            </div>

            {/* Claims history */}
            <div className="bg-white rounded-2xl">
                {claimsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredClaims.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12">
                        <ReceiptText size={40} className="text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">
                            {t("claims.noClaims")}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {filteredClaims.map((claim: any) => (
                            <li
                                key={claim.id}
                                className="flex items-center justify-between px-4 py-3"
                            >
                                <div>
                                    <p className="text-base font-medium text-gray-800">
                                        {claim.claimTypeName ??
                                            claim.claimConfigId ??
                                            "—"}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        {format(
                                            new Date(claim.date),
                                            "d MMM yyyy",
                                        )}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <p className="text-base font-semibold text-gray-900">
                                        {formatRupiah(claim.amount)}
                                    </p>
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[claim.status] ?? STATUS_STYLE.pending}`}
                                    >
                                        {claim.status === "pending"
                                            ? t("claims.statusPending")
                                            : claim.status === "approved"
                                              ? t("claims.statusApproved")
                                              : claim.status === "rejected"
                                                ? t("claims.statusRejected")
                                                : claim.status}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
