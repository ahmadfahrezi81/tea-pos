import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { getPayslip } from "@tea-pos/services/payroll";
import { getSummaryById, getSummaryBreakdown, listSummaryPhotos } from "@tea-pos/services/summaries";
import { listExpenses } from "@tea-pos/services/expenses";
import { fetchSessionUsersForSummaries } from "@tea-pos/services/sessions";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";

function formatTimestamp(utc: string) {
    return new Date(utc).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
}

export default async function DaySummaryPage({
    params, searchParams,
}: {
    params: Promise<{ userId: string; payoutId: string; date: string }>;
    searchParams: Promise<{ summaryId?: string }>;
}) {
    const { userId, payoutId, date } = await params;
    const { summaryId: summaryIdParam } = await searchParams;
    const supabase = getServiceClient();
    const tenantId = await getCurrentTenantId();

    let dailySummaryId: string | null = summaryIdParam ?? null;

    if (!dailySummaryId) {
        try {
            const payslip = await getPayslip(supabase, { tenantId, userId, payoutId });
            const ps = payslip as unknown as { commissions: Array<{ date: string; dailySummaryId: string }> };
            dailySummaryId = ps.commissions.find((c) => c.date === date)?.dailySummaryId ?? null;
        } catch {
            notFound();
        }
    }

    if (!dailySummaryId) notFound();

    let summary: Record<string, unknown>;
    let breakdown: Record<string, { quantity: number; revenue: number }>;
    let expenses: Array<{ id: string; type: string; amount: number; notes?: string | null }>;
    let sessionsMap: Record<string, Array<{ userId: string; userName: string | null; userAvatarUrl: string | null; totalCups: number | null }>>;

    try {
        const [rawSummary, rawBreakdown, rawExpenses, rawSessions] = await Promise.all([
            getSummaryById(supabase, { tenantId, summaryId: dailySummaryId }),
            getSummaryBreakdown(supabase, { tenantId, summaryId: dailySummaryId }),
            listExpenses(supabase, { tenantId, dailySummaryId }),
            fetchSessionUsersForSummaries(supabase, { tenantId, summaryIds: [dailySummaryId] }),
        ]);
        summary = rawSummary as Record<string, unknown>;
        breakdown = rawBreakdown.breakdown;
        expenses = rawExpenses as typeof expenses;
        sessionsMap = rawSessions;
    } catch {
        notFound();
    }

    const sessions = sessionsMap[dailySummaryId] ?? [];
    const s = summary as {
        id: string; date: string; stores?: { name: string } | null;
        openedByUser?: { fullName: string } | null; closedByUser?: { fullName: string } | null;
        createdAt?: string | null; closedAt?: string | null;
        openingBalance: number; totalSales: number; totalOrders: number; totalCups: number;
        totalExpenses: number; expectedCash: number; actualCash?: number | null; variance?: number | null;
        notes?: string | null;
    };

    const dateLabel = new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    return (
        <div className="space-y-4 pb-24">
            {/* Header */}
            <div className="bg-white rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xl text-gray-800 leading-tight">{dateLabel}</h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-sm font-medium ${s.closedAt ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                        {s.closedAt ? "Closed" : "Open"}
                    </span>
                </div>
                <div className="text-sm space-y-1.5">
                    {s.stores?.name && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Store</span>
                            <span className="font-medium text-gray-800">{s.stores.name}</span>
                        </div>
                    )}
                    {s.openedByUser?.fullName && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Opened by</span>
                            <span className="font-medium text-gray-800">{s.openedByUser.fullName}</span>
                        </div>
                    )}
                    {s.closedAt && s.closedByUser?.fullName && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Closed by</span>
                            <span className="font-medium text-gray-800">{s.closedByUser.fullName}</span>
                        </div>
                    )}
                    {s.createdAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Opened at</span>
                            <span className="font-medium text-gray-800">{formatTimestamp(s.createdAt)}</span>
                        </div>
                    )}
                    {s.closedAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Closed at</span>
                            <span className="font-medium text-gray-800">{formatTimestamp(s.closedAt)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Financials */}
            <div className="bg-white rounded-2xl p-3 space-y-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">Opening Balance</p>
                    <p className="text-xl font-bold text-blue-900">{formatRupiah(s.openingBalance)}</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2 bg-green-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">+ Total Sales</p>
                        <p className="text-xl font-bold text-green-900">{formatRupiah(s.totalSales)}</p>
                    </div>
                    <div className="col-span-1 bg-violet-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">Orders</p>
                        <p className="text-xl font-bold text-violet-900">{s.totalOrders}</p>
                    </div>
                    <div className="col-span-1 bg-orange-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">Cups</p>
                        <p className="text-xl font-bold text-orange-900">{s.totalCups}</p>
                    </div>
                </div>
                <div className="bg-red-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">− Expenses</p>
                    <p className="text-xl font-bold text-red-900">{formatRupiah(s.totalExpenses)}</p>
                </div>
                <hr className="border-gray-200" />
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-purple-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">Expected Cash</p>
                        <p className="text-xl font-bold text-purple-900">{formatRupiah(s.expectedCash)}</p>
                    </div>
                    <div className="bg-amber-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">Actual Cash</p>
                        <p className="text-xl font-bold text-amber-900">{s.actualCash != null ? formatRupiah(s.actualCash) : "—"}</p>
                    </div>
                </div>
                {s.variance != null && (
                    <div className={`p-2 rounded-lg ${s.variance >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <p className="text-xs font-semibold text-gray-700">Variance</p>
                        <p className={`text-xl font-bold ${s.variance >= 0 ? "text-green-900" : "text-red-900"}`}>
                            {s.variance >= 0 ? "+" : ""}{formatRupiah(s.variance)}
                        </p>
                    </div>
                )}
            </div>

            {/* Expenses */}
            {expenses.length > 0 && (
                <div className="bg-white rounded-2xl p-3 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Expenses</h4>
                    <div className="bg-red-100 p-2 rounded-xl space-y-1">
                        {expenses.map((e) => (
                            <div key={e.id} className="flex justify-between text-sm">
                                <span className="text-red-800">{e.type}</span>
                                <span className="font-bold text-red-800">-{formatRupiah(e.amount)}</span>
                            </div>
                        ))}
                        <div className="border-t border-red-300 pt-1 flex justify-between text-sm font-semibold">
                            <span className="text-red-800">Total</span>
                            <span className="text-red-800">-{formatRupiah(s.totalExpenses)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Who worked */}
            {sessions.length > 0 && (
                <div className="bg-white rounded-2xl p-3 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Who Worked</h4>
                    <div className="space-y-1.5">
                        {sessions.map((session) => (
                            <div key={session.userId} className="flex items-center gap-2 bg-slate-100 rounded-xl p-2">
                                <p className="text-base font-bold text-gray-900 flex-1 truncate">{session.userName ?? "Unknown"}</p>
                                {session.totalCups != null && (
                                    <span className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg shrink-0">
                                        {session.totalCups} cups
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notes */}
            {s.notes && (
                <div className="bg-white rounded-2xl p-3 space-y-1">
                    <h4 className="text-sm font-semibold text-gray-800">Notes</h4>
                    <p className="text-sm text-gray-700 bg-slate-100 p-2.5 rounded-xl">{s.notes}</p>
                </div>
            )}

            {/* Breakdown */}
            <div className="bg-white rounded-2xl p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">Breakdown</h4>
                {Object.keys(breakdown).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No breakdown available.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(breakdown)
                            .sort(([, a], [, b]) => b.quantity - a.quantity)
                            .map(([productName, data]) => (
                                <div key={productName} className="bg-slate-100 p-2.5 rounded-xl">
                                    <p className="font-semibold text-gray-800 text-sm truncate">{productName}</p>
                                    <p className="font-bold text-gray-800">{data.quantity} cups</p>
                                    <p className="text-sm text-gray-500">{formatRupiah(data.revenue)}</p>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
