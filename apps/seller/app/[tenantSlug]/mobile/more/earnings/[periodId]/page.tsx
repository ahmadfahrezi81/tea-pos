"use client";

import { use } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayslip";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { parseISO, format, eachDayOfInterval, getISOWeek, getISOWeekYear } from "date-fns";
import Image from "next/image";
import { useState } from "react";

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

function Divider() {
    return <p className="text-gray-300 text-xs tracking-tighter font-mono">{DIVIDER}</p>;
}

function Row({
    left,
    right,
    bold,
    muted,
}: {
    left: string;
    right?: string;
    bold?: boolean;
    muted?: boolean;
}) {
    return (
        <div
            className={`flex justify-between text-sm font-mono ${bold ? "font-bold text-gray-900" : muted ? "text-gray-400" : "text-gray-700"}`}
        >
            <span>{left}</span>
            {right && <span>{right}</span>}
        </div>
    );
}

const STATUS_LABELS: Record<string, string> = {
    pending: "WAITING FOR PAYMENT",
    approved: "APPROVED — WILL BE PAID SOON",
    on_hold: "ON HOLD — BEING REVIEWED",
    paid: "PAID",
};

const STATUS_COLORS: Record<string, string> = {
    pending: "text-gray-500",
    approved: "text-blue-600",
    on_hold: "text-amber-600",
    paid: "text-green-600",
};

export default function PayslipPage({ params }: { params: Promise<{ periodId: string }> }) {
    const { periodId } = use(params);
    const { payslip, isLoading } = usePayslip(periodId);
    const { info: payrollInfo } = usePayrollUserInfo();
    const [showProof, setShowProof] = useState(false);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!payslip || !("period" in (payslip as object))) {
        return <p className="text-center text-gray-400 py-10">Period not found.</p>;
    }

    const ps = payslip as {
        period: { startDate: string; endDate: string };
        payout: { status: string; paidAt: string | null; paymentProofUrl: string | null } | null;
        commissions: Array<{ date: string; totalCups: number; grossPay: number; ratePerUnit: number }>;
        claims: Array<{ id: string; claimTypeName?: string | null; claimTypeId: string | null; amount: number; status: string }>;
        commissionsTotal: number;
        claimsTotal: number;
        totalPay: number;
        ratePerUnit: number;
    };

    const {
        period,
        payout,
        commissions,
        claims,
        commissionsTotal,
        claimsTotal,
        totalPay,
        ratePerUnit,
    } = ps;

    const weekNum = getISOWeek(parseISO(period.startDate));
    const weekYear = getISOWeekYear(parseISO(period.startDate));
    const days = eachDayOfInterval({
        start: parseISO(period.startDate),
        end: parseISO(period.endDate),
    });

    const commissionsByDate = commissions.reduce<Record<string, typeof commissions[0][]>>(
        (acc, e) => {
            if (!acc[e.date]) acc[e.date] = [];
            acc[e.date].push(e);
            return acc;
        },
        {},
    );

    const totalCups = commissions.reduce((s, e) => s + e.totalCups, 0);
    const status = payout?.status ?? "pending";
    const approvedClaims = claims.filter((c) => c.status === "approved" || c.status === "paid");

    const hasBankInfo = payrollInfo?.bankName || payrollInfo?.bankAccountNumber;

    return (
        <div className="space-y-3 pb-4">
            <div className="bg-white rounded-xl p-4 space-y-1 font-mono">
                {/* Header */}
                <div className="text-center space-y-0.5 mb-2">
                    <Divider />
                    <p className="text-base font-bold text-gray-900 tracking-widest pt-2">MY PAY</p>
                    <p className="text-sm text-gray-600">
                        Week {weekNum}, {weekYear}
                    </p>
                    <p className="text-sm text-gray-600">
                        {format(parseISO(period.startDate), "MMM d")} –{" "}
                        {format(parseISO(period.endDate), "MMM d")}
                    </p>
                    <div className="pb-2" />
                    <Divider />
                </div>

                {/* Day breakdown */}
                <div className="space-y-1 py-1">
                    {days.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const dayEntries = commissionsByDate[dateStr] ?? [];
                        if (dayEntries.length === 0) {
                            return <Row key={dateStr} left={format(day, "EEE d MMM")} right="—" muted />;
                        }
                        return dayEntries.map((e, i) => (
                            <Row
                                key={`${dateStr}-${i}`}
                                left={i === 0 ? format(day, "EEE d MMM") : ""}
                                right={`${e.totalCups} cups`}
                            />
                        ));
                    })}
                </div>

                <Divider />
                <Row
                    left={`${totalCups} cups × Rp ${ratePerUnit.toLocaleString("id-ID")}`}
                />
                <Row
                    left="Commissions"
                    right={`Rp ${commissionsTotal.toLocaleString("id-ID")}`}
                    bold
                />
                <Divider />

                {/* Claims */}
                {approvedClaims.length > 0 && (
                    <>
                        <Row left="CLAIMS" />
                        {approvedClaims.map((c) => (
                            <Row
                                key={c.id}
                                left={c.claimTypeName ?? c.claimTypeId ?? "—"}
                                right={`Rp ${c.amount.toLocaleString("id-ID")}`}
                            />
                        ))}
                        <Divider />
                    </>
                )}

                <Row left="TOTAL" right={`Rp ${totalPay.toLocaleString("id-ID")}`} bold />
                <Divider />

                {/* Status */}
                <div className="pt-3 text-center space-y-2">
                    <p
                        className={`text-sm font-bold tracking-wide font-mono ${STATUS_COLORS[status] ?? "text-gray-500"}`}
                    >
                        {STATUS_LABELS[status] ?? status.toUpperCase()}
                    </p>
                    {status === "paid" && payout?.paidAt && (
                        <p className="text-xs text-gray-500">
                            {format(new Date(payout.paidAt), "d MMM yyyy")}
                        </p>
                    )}
                    {status === "paid" && (
                        <>
                            {hasBankInfo && (
                                <p className="text-xs text-gray-500">
                                    {payrollInfo?.bankName} · {payrollInfo?.bankAccountNumber}
                                </p>
                            )}
                            {payout?.paymentProofUrl && (
                                <>
                                    <button
                                        onClick={() => setShowProof(true)}
                                        className="text-xs text-brand active:opacity-70 underline"
                                    >
                                        View transfer screenshot
                                    </button>
                                    {showProof && (
                                        <div
                                            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                                            onClick={() => setShowProof(false)}
                                        >
                                            <Image
                                                src={payout.paymentProofUrl}
                                                alt="Transfer proof"
                                                width={400}
                                                height={400}
                                                className="rounded-xl max-h-[80vh] w-auto object-contain"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    {!hasBankInfo && status !== "paid" && (
                        <p className="text-xs text-amber-600">
                            Add your bank details in Payroll Info so admin can pay you.
                        </p>
                    )}
                </div>
                <div className="pt-2">
                    <Divider />
                </div>
            </div>
        </div>
    );
}
