"use client";

import { use, useState, useRef, useEffect } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayroll";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { payrollApi } from "@/lib/api/payroll";
import { apiFetch } from "@/lib/api/client";
import { parseISO, format, eachDayOfInterval, getISOWeek } from "date-fns";
import { getExpectedPayoutDate } from "@tea-pos/utils/week";
import { Check, X, Info, Copy, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_PILL: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
};


type Commission = {
    id: string; date: string; dailySummaryId: string; storeName?: string | null;
    totalCups: number; ratePerCup: number; totalCommission: number;
    status: "pending" | "approved" | "rejected";
};

type Claim = {
    id: string; date: string; claimTypeName?: string | null;
    amount: number; status: "pending" | "approved" | "rejected";
};

type ConfirmTarget = {
    type: "commission" | "claim";
    id: string; action: "approved" | "rejected";
    label: string; amount: number;
};


export default function UserPayslipPage({ params }: { params: Promise<{ userId: string; payoutId: string }> }) {
    const { userId, payoutId } = use(params);
    const { url } = useTenantSlug();
    const { payslip, isLoading: payslipLoading, mutate } = usePayslip(payoutId, userId);
    const { users } = useTenantUsers();
    const targetUser = users.find((u) => u.id === userId);
    const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [showProof, setShowProof] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [warningDismissed, setWarningDismissed] = useState(false);
    const upsertedRef = useRef(false);

    useEffect(() => {
        if (!payslip || !("payout" in (payslip as object))) return;
        if (upsertedRef.current) return;
        upsertedRef.current = true;
        const ps = payslip as { payout: { startDate: string; endDate: string } };
        payrollApi.upsertPayout({ startDate: ps.payout.startDate, endDate: ps.payout.endDate, userId })
            .then(() => mutate())
            .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payslip]);

    const handleConfirm = async () => {
        if (!confirmTarget) return;
        setBusyId(confirmTarget.id);
        try {
            if (confirmTarget.type === "commission") {
                await payrollApi.updateCommission(confirmTarget.id, { status: confirmTarget.action });
            } else {
                await apiFetch(`/api/payroll/claims/${encodeURIComponent(confirmTarget.id)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: confirmTarget.action }),
                });
            }
            await mutate();
            setConfirmTarget(null);
        } finally { setBusyId(null); }
    };

    if (payslipLoading) {
        return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse" />)}</div>;
    }

    if (!payslip || !("payout" in (payslip as object))) {
        return <p className="text-center text-gray-400 py-10">No payout found.</p>;
    }

    const ps = payslip as {
        payout: { id: string; startDate: string; endDate: string; status: string; paidAt: string | null; paymentProofUrl: string | null };
        commissions: Commission[];
        claims: Claim[];
        commissionsTotal: number;
        claimsTotal: number;
        totalPay: number;
        ratePerCup: number;
        totalOrders: number;
        paidByName: string | null;
    };

    const { payout, commissions, claims, totalPay, ratePerCup, totalOrders, paidByName } = ps;
    const status = payout.status;

    const weekStart = getISOWeek(parseISO(payout.startDate));
    const weekEnd = getISOWeek(parseISO(payout.endDate));
    const sameWeek = weekStart === weekEnd;
    const totalCups = commissions.filter((c) => c.status === "approved").reduce((s, c) => s + c.totalCups, 0);

    const periodDays = eachDayOfInterval({ start: parseISO(payout.startDate), end: parseISO(payout.endDate) });
    const week1 = periodDays.slice(0, 7);
    const week2 = periodDays.slice(7);
    const commissionDates = new Set(commissions.map((c) => c.date));

    const commissionsByDate = commissions.reduce<Record<string, Commission[]>>((acc, c) => {
        (acc[c.date] ??= []).push(c); return acc;
    }, {});
    const claimsByDate = claims.reduce<Record<string, Claim[]>>((acc, c) => {
        (acc[c.date] ??= []).push(c); return acc;
    }, {});
    const allDates = [...new Set([...Object.keys(commissionsByDate), ...Object.keys(claimsByDate)])].sort((a, b) => b.localeCompare(a));

    const pendingCount =
        commissions.filter((c) => c.status === "pending").length +
        claims.filter((c) => c.status === "pending").length;

    const pendingDates = allDates.filter((dateStr) => {
        const dc = commissionsByDate[dateStr] ?? [];
        const cl = claimsByDate[dateStr] ?? [];
        return [...dc, ...cl].some((c) => c.status === "pending");
    });

    return (
        <div className="space-y-3 pb-32">
            {/* Pending days warning */}
            {pendingDates.length > 0 && !warningDismissed && (
                <div className="bg-red-100 p-3.5 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                        <button
                            className="flex items-center gap-2 text-left active:opacity-60"
                            onClick={() => {
                                document.getElementById(`day-${pendingDates[pendingDates.length - 1]}`)
                                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                        >
                            <AlertTriangle size={20} className="text-red-600" />
                            <h3 className="font-semibold text-red-800">
                                {pendingDates.length} day{pendingDates.length !== 1 ? "s" : ""} pending review
                            </h3>
                        </button>
                        <button onClick={() => setWarningDismissed(true)} className="p-1 -mt-1 -mr-2 rounded-full text-red-600 active:opacity-60">
                            <X size={22} />
                        </button>
                    </div>
                    <p className="text-sm text-red-800">All commissions and claims must be reviewed before payment can be confirmed.</p>
                </div>
            )}

            {/* Totals */}
            <div className="bg-white p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">
                        {sameWeek ? `Week ${weekStart}` : `Week ${weekStart} · Week ${weekEnd}`}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${STATUS_PILL[status] ?? STATUS_PILL.pending}`}>
                        {status === "pending" ? "Ongoing" : status === "paid" ? "Paid" : status}
                    </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">{totalOrders}</p>
                        <p className="text-sm text-gray-600">Orders</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-blue-600">{totalCups}</p>
                        <p className="text-sm text-gray-600">Cups</p>
                    </div>
                    <div className="text-center col-span-2 border-l-2 border-gray-300">
                        <p className="text-sm text-gray-600">Total Pay</p>
                        <p className="text-xl font-bold text-green-600">{formatRupiah(totalPay)}</p>
                    </div>
                </div>
            </div>

            {/* Payout info */}
            <div className="bg-white p-4 rounded-2xl space-y-2 text-sm">
                {[
                    { label: "Staff", value: targetUser?.fullName ?? "—" },
                    { label: "Payroll From", value: format(parseISO(payout.startDate), "EEE, d MMM yyyy") },
                    { label: "Payroll To", value: format(parseISO(payout.endDate), "EEE, d MMM yyyy") },
                    { label: "Per Cup", value: ratePerCup > 0 ? formatRupiah(ratePerCup) : "—" },
                    { label: "Expected payout", value: (() => { const d = getExpectedPayoutDate(payout.endDate); return d ? format(parseISO(d), "EEE, d MMM yyyy") : "—"; })() },
                    { label: "Paid on", value: payout.paidAt ? format(new Date(payout.paidAt), "d MMM yyyy") : "—" },
                    { label: "Paid by", value: paidByName ?? "—" },
                ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium text-gray-800">{value}</span>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                    <span className="text-gray-500">Payslip ID</span>
                    <button
                        onClick={() => { navigator.clipboard.writeText(payout.id); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }}
                        className="flex items-center gap-1 active:opacity-70"
                    >
                        <span className="font-mono text-xs text-gray-400">{payout.id.slice(0, 8)}…</span>
                        {copiedId ? <Check size={13} className="text-green-500" /> : <Copy size={13} className="text-gray-400" />}
                    </button>
                </div>
                {payout.paymentProofUrl && (
                    <>
                        <button
                            onClick={() => setShowProof(true)}
                            className="w-full mt-1 py-2 rounded-xl bg-slate-100 text-sm font-medium text-gray-700 active:opacity-70"
                        >
                            View Transfer Proof
                        </button>
                        {showProof && (
                            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowProof(false)}>
                                <Image src={payout.paymentProofUrl} alt="Transfer proof" width={400} height={400} className="rounded-xl max-h-[80vh] w-auto object-contain" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl px-3 py-3 space-y-1.5">
                <div className="grid grid-cols-8 gap-1 mb-1">
                    <span />
                    {WEEKDAY_LABELS.map((d) => (
                        <span key={d} className="text-xs font-semibold text-gray-500 text-center">{d}</span>
                    ))}
                </div>
                {[week1, week2].filter((w) => w.length > 0).map((week, wi) => (
                    <div key={wi} className="grid grid-cols-8 gap-1 items-center">
                        <span className="text-xs font-semibold text-gray-500 text-center">W{getISOWeek(week[0])}</span>
                        {week.map((day) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const worked = commissionDates.has(dateKey);
                            return (
                                <div key={dateKey} className={`w-7 h-7 mx-auto flex items-center justify-center rounded-md text-xs font-medium ${worked ? "bg-blue-500 text-white font-semibold" : "bg-gray-100 text-gray-500"}`}>
                                    {format(day, "d")}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Per-day cards */}
            <div className="space-y-2">
                {allDates.map((dateStr) => {
                    const dayCommissions = commissionsByDate[dateStr] ?? [];
                    const dayClaims = claimsByDate[dateStr] ?? [];
                    const dayApprovedTotal =
                        dayCommissions.filter((c) => c.status === "approved").reduce((s, c) => s + c.totalCommission, 0) +
                        dayClaims.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);
                    const allReviewed = [...dayCommissions, ...dayClaims].every((c) => c.status !== "pending");
                    const day = parseISO(dateStr);

                    return (
                        <div key={dateStr} id={`day-${dateStr}`} className="bg-white rounded-xl overflow-hidden">
                            {/* Day header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <p className="text-base font-bold text-gray-900">{format(day, "EEE, d MMM")}</p>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allReviewed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                        {allReviewed ? "Done" : "Pending"}
                                    </span>
                                </div>
                                <p className="text-base font-bold text-gray-900">{formatRupiah(dayApprovedTotal)}</p>
                            </div>

                            {/* Commission rows */}
                            {dayCommissions.map((c) => (
                                <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-none">
                                    <div className="flex-1 min-w-0">
                                        {c.dailySummaryId ? (
                                            <button
                                                onClick={() => navigation.push(url(`/mobile/pay/payouts/${userId}/${payoutId}/day/${dateStr}/summary?summaryId=${c.dailySummaryId}`))}
                                                className="flex items-center gap-1 active:opacity-60"
                                            >
                                                <span className="text-sm font-medium text-gray-800 truncate">{c.storeName ?? "—"}</span>
                                                <Info size={13} className="shrink-0 text-gray-500" />
                                            </button>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-800 truncate">{c.storeName ?? "—"}</p>
                                        )}
                                        <p className="text-xs text-gray-600">
                                            {c.totalCups} cups × {formatRupiah(c.ratePerCup)} = <span className={c.status === "rejected" ? "line-through text-red-400" : ""}>{formatRupiah(c.totalCommission)}</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            disabled={!!busyId}
                                            onClick={() => setConfirmTarget({ type: "commission", id: c.id, action: "rejected", label: c.storeName ?? "commission", amount: c.totalCommission })}
                                            className={`p-2 rounded-lg ${c.status === "rejected" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"} disabled:opacity-40`}
                                        >
                                            <X size={15} />
                                        </button>
                                        <button
                                            disabled={!!busyId}
                                            onClick={() => setConfirmTarget({ type: "commission", id: c.id, action: "approved", label: c.storeName ?? "commission", amount: c.totalCommission })}
                                            className={`p-2 rounded-lg ${c.status === "approved" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"} disabled:opacity-40`}
                                        >
                                            <Check size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Claim rows */}
                            {dayClaims.map((c) => (
                                <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-none">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{c.claimTypeName ?? "Claim"}</p>
                                        <p className={`text-xs ${c.status === "rejected" ? "line-through text-red-400" : "text-gray-600"}`}>{formatRupiah(c.amount)}</p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            disabled={!!busyId}
                                            onClick={() => setConfirmTarget({ type: "claim", id: c.id, action: "rejected", label: c.claimTypeName ?? "claim", amount: c.amount })}
                                            className={`p-2 rounded-lg ${c.status === "rejected" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"} disabled:opacity-40`}
                                        >
                                            <X size={15} />
                                        </button>
                                        <button
                                            disabled={!!busyId}
                                            onClick={() => setConfirmTarget({ type: "claim", id: c.id, action: "approved", label: c.claimTypeName ?? "claim", amount: c.amount })}
                                            className={`p-2 rounded-lg ${c.status === "approved" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"} disabled:opacity-40`}
                                        >
                                            <Check size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Pay button */}
            {status === "pending" && pendingCount === 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-100">
                    <button
                        onClick={() => navigation.push(url(`/mobile/pay/payouts/${userId}/${payoutId}/pay`))}
                        className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl active:opacity-80"
                    >
                        Pay
                    </button>
                </div>
            )}

            {/* Confirm popup */}
            {confirmTarget && (
                <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setConfirmTarget(null)}>
                    <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-gray-900 capitalize">{confirmTarget.action} {confirmTarget.type}?</p>
                            <button onClick={() => setConfirmTarget(null)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-base font-medium text-gray-800">{confirmTarget.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{formatRupiah(confirmTarget.amount)}</p>
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={!!busyId}
                            className={`w-full py-3.5 font-bold rounded-xl text-white active:opacity-80 disabled:opacity-40 ${confirmTarget.action === "approved" ? "bg-green-600" : "bg-red-500"}`}
                        >
                            {busyId ? "Saving..." : confirmTarget.action === "approved" ? "Approve" : "Reject"}
                        </button>
                        <button onClick={() => setConfirmTarget(null)} className="w-full py-3 text-gray-500 text-sm font-medium">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
