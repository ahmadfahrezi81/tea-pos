"use client";

import { use, useState } from "react";
import { usePayouts, usePayslip } from "@/lib/hooks/payroll/usePayroll";
import { payrollApi } from "@/lib/api/payroll";
import { apiFetch } from "@/lib/api/client";
import { format, parseISO } from "date-fns";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";

type Commission = {
    id: string;
    date: string;
    storeId: string;
    storeName?: string | null;
    dailySummaryId: string;
    totalCups: number;
    totalCommission: number;
    status: "pending" | "approved" | "rejected";
};

type Claim = {
    id: string;
    date: string;
    claimTypeName?: string | null;
    claimConfigId: string | null;
    amount: number;
    status: "pending" | "approved" | "rejected";
};

type SummaryDetail = {
    totalSales: number;
    totalCups: number;
    totalOrders: number;
    expectedCash: number;
    actualCash: number | null;
    variance: number | null;
};

type SessionDetail = {
    id: string;
    userName: string | null;
    startedAt: string;
    endedAt: string | null;
};

function DecisionButtons({
    status,
    onApprove,
    onReject,
    disabled,
}: {
    status: "pending" | "approved" | "rejected";
    onApprove: () => void;
    onReject: () => void;
    disabled: boolean;
}) {
    return (
        <div className="flex gap-2">
            <button
                onClick={onReject}
                disabled={disabled}
                className={`p-2 rounded-lg ${status === "rejected" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"} disabled:opacity-40`}
            >
                <X size={16} />
            </button>
            <button
                onClick={onApprove}
                disabled={disabled}
                className={`p-2 rounded-lg ${status === "approved" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"} disabled:opacity-40`}
            >
                <Check size={16} />
            </button>
        </div>
    );
}

function VerifyPanel({ dailySummaryId }: { dailySummaryId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<SummaryDetail | null>(null);
    const [sessions, setSessions] = useState<SessionDetail[]>([]);

    const handleToggle = async () => {
        if (open) {
            setOpen(false);
            return;
        }
        setOpen(true);
        if (summary) return;
        setLoading(true);
        try {
            const [summaryRes, sessionsRes] = await Promise.all([
                apiFetch<SummaryDetail>(`/api/summaries/${encodeURIComponent(dailySummaryId)}`),
                apiFetch<{ sessions: SessionDetail[] }>(`/api/sessions/summary/${encodeURIComponent(dailySummaryId)}`),
            ]);
            setSummary(summaryRes);
            setSessions(sessionsRes.sessions);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-t border-gray-100 mt-2 pt-2">
            <button
                onClick={handleToggle}
                className="flex items-center gap-1 text-xs text-gray-400 font-medium"
            >
                Verify against source data
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {open && (
                <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                    {loading ? (
                        <p className="text-gray-400">Loading...</p>
                    ) : (
                        <>
                            {summary && (
                                <div className="space-y-0.5">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total sales (summary)</span>
                                        <span className="font-medium text-gray-800">Rp {summary.totalSales.toLocaleString("id-ID")}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total cups (summary)</span>
                                        <span className="font-medium text-gray-800">{summary.totalCups}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Expected cash</span>
                                        <span className="font-medium text-gray-800">Rp {summary.expectedCash.toLocaleString("id-ID")}</span>
                                    </div>
                                    {summary.actualCash !== null && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Actual cash</span>
                                            <span className="font-medium text-gray-800">Rp {summary.actualCash.toLocaleString("id-ID")}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {sessions.length > 0 && (
                                <div className="pt-1 border-t border-gray-200 space-y-0.5">
                                    <p className="text-gray-500 mb-0.5">Sessions</p>
                                    {sessions.map((s) => (
                                        <div key={s.id} className="flex justify-between">
                                            <span className="text-gray-700">{s.userName ?? "—"}</span>
                                            <span className="text-gray-500">
                                                {format(new Date(s.startedAt), "HH:mm")} –{" "}
                                                {s.endedAt ? format(new Date(s.endedAt), "HH:mm") : "active"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function DayDecisionPage({
    params,
}: {
    params: Promise<{ periodId: string; userId: string; date: string }>;
}) {
    const { periodId: startDate, userId, date } = use(params);
    const { payouts } = usePayouts({ startDate, userId });
    const payoutId = payouts[0]?.id;
    const { payslip, isLoading, mutate } = usePayslip(payoutId, userId);
    const [busyId, setBusyId] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!payslip || !("commissions" in (payslip as object))) {
        return <p className="text-center text-gray-400 py-10">Not found.</p>;
    }

    const ps = payslip as { commissions: Commission[]; claims: Claim[] };
    const dayCommissions = ps.commissions.filter((c) => c.date === date);
    const dayClaims = ps.claims.filter((c) => c.date === date);

    const handleCommissionStatus = async (id: string, status: "approved" | "rejected") => {
        setBusyId(id);
        try {
            await payrollApi.updateCommission(id, { status });
            await mutate();
        } finally {
            setBusyId(null);
        }
    };

    const handleClaimStatus = async (id: string, status: "approved" | "rejected") => {
        setBusyId(id);
        try {
            await apiFetch(`/api/payroll/claims/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            await mutate();
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-xl p-4">
                <p className="text-base font-bold text-gray-900">{format(parseISO(date), "EEEE, d MMM yyyy")}</p>
            </div>

            {dayCommissions.length > 0 && (
                <div className="bg-white rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Commissions</p>
                    {dayCommissions.map((c) => (
                        <div key={c.id} className="border-b border-gray-50 last:border-none pb-3 last:pb-0">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{c.storeName ?? "—"}</p>
                                    <p className="text-xs text-gray-400">{c.totalCups} cups · Rp {c.totalCommission.toLocaleString("id-ID")}</p>
                                </div>
                                <DecisionButtons
                                    status={c.status}
                                    disabled={busyId === c.id}
                                    onApprove={() => handleCommissionStatus(c.id, "approved")}
                                    onReject={() => handleCommissionStatus(c.id, "rejected")}
                                />
                            </div>
                            <VerifyPanel dailySummaryId={c.dailySummaryId} />
                        </div>
                    ))}
                </div>
            )}

            {dayClaims.length > 0 && (
                <div className="bg-white rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Claims</p>
                    {dayClaims.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-none pb-3 last:pb-0">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{c.claimTypeName ?? c.claimConfigId ?? "—"}</p>
                                <p className="text-xs text-gray-400">Rp {c.amount.toLocaleString("id-ID")}</p>
                            </div>
                            <DecisionButtons
                                status={c.status}
                                disabled={busyId === c.id}
                                onApprove={() => handleClaimStatus(c.id, "approved")}
                                onReject={() => handleClaimStatus(c.id, "rejected")}
                            />
                        </div>
                    ))}
                </div>
            )}

            {dayCommissions.length === 0 && dayClaims.length === 0 && (
                <p className="text-center text-gray-400 py-10">No items for this day.</p>
            )}
        </div>
    );
}
