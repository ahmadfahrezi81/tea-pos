"use client";

import { usePayrollClaims, useClaimableTypes } from "@/lib/hooks/payroll-claims/usePayrollClaims";
import { useCurrentPayrollPeriod } from "@/lib/hooks/payroll/usePayroll";
import { ReceiptText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useT } from "@/lib/hooks/useT";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    approved: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-600",
    paid: "bg-green-100 text-green-700",
};

export default function ReimbursementsPage() {
    const { claims, isLoading: claimsLoading } = usePayrollClaims();
    const { period: currentPeriod, isLoading: periodLoading } = useCurrentPayrollPeriod();
    const { types, isLoading: typesLoading } = useClaimableTypes(
        currentPeriod ? { periodId: currentPeriod.id } : null,
    );
    const t = useT();

    return (
        <div className="space-y-3">
            {/* Entitlements */}
            <div className="bg-white rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t("claims.entitlements")}</p>
                {periodLoading || typesLoading ? (
                    <div className="flex gap-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="w-36 h-20 bg-gray-100 rounded-xl animate-pulse shrink-0" />
                        ))}
                    </div>
                ) : types.length === 0 ? (
                    <p className="text-sm text-gray-400">{t("claims.noEntitlements")}</p>
                ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                        {types.map((type: any) => (
                            <div
                                key={type.id}
                                className={`shrink-0 w-40 rounded-xl p-3 border space-y-1.5 ${type.claimable ? "border-brand/20 bg-brand/5" : "border-gray-100 bg-gray-50"}`}
                            >
                                <div className="flex items-start justify-between gap-1">
                                    <p className="text-sm font-semibold text-gray-800 leading-tight">{type.name}</p>
                                    {!type.claimable && <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />}
                                </div>
                                <p className="text-base font-bold text-gray-900">Rp {(type.amount ?? 0).toLocaleString("id-ID")}</p>
                                <p className={`text-xs font-medium ${type.claimable ? "text-brand" : "text-gray-400"}`}>
                                    {(type.frequency === "weekly" ? t("claims.freqWeekly") : type.frequency === "monthly" ? t("claims.freqMonthly") : type.frequency === "one_time" ? t("claims.freqOneTime") : type.frequency)} · {type.claimable ? t("claims.available") : type.frequency === "one_time" ? t("claims.used") : t("claims.claimed")}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Claims history */}
            <div className="bg-white rounded-2xl">
                {claimsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : claims.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12">
                        <ReceiptText size={40} className="text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">{t("claims.noClaims")}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {claims.map((claim: any) => (
                            <li key={claim.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="text-base font-medium text-gray-800">
                                        {claim.claimTypeName ?? claim.claimTypeId ?? "—"}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        {format(new Date(claim.date), "d MMM yyyy")}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <p className="text-base font-semibold text-gray-900">
                                        Rp {claim.amount.toLocaleString("id-ID")}
                                    </p>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[claim.status] ?? STATUS_STYLE.pending}`}>
                                        {claim.status === "pending" ? t("claims.statusPending") : claim.status === "approved" ? t("claims.statusApproved") : claim.status === "rejected" ? t("claims.statusRejected") : claim.status === "paid" ? t("claims.statusPaid") : claim.status}
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
