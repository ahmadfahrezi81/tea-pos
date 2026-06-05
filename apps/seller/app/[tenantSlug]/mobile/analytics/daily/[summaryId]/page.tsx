import { notFound } from "next/navigation";
import Image from "next/image";
import { getSSRClient } from "@/lib/supabase/ssr";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import {
    getSummaryById,
    getSummaryBreakdown,
    listSummaryPhotos,
} from "@tea-pos/services/summaries";
import { listExpenses } from "@tea-pos/services/expenses";
import { fetchSessionUsersForSummaries } from "@tea-pos/services/sessions";
import { PHOTO_SLOTS } from "@tea-pos/features/shared/photo-slots";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { formatFullIndonesiaTimestamp } from "@tea-pos/utils/server-config/timezone";
import { SummaryPhotoThumbnail } from "@/app/[tenantSlug]/mobile/home/manage/_components/daily/SummaryPhotoThumbnail";
import CopyableField from "@/components/shared/CopyableField";
import { UserCircle } from "lucide-react";

type SummaryShape = {
    id: string;
    date: string;
    storeId: string;
    stores?: { name: string } | null;
    openedByUser?: { fullName: string } | null;
    closedByUser?: { fullName: string } | null;
    createdAt?: string | null;
    closedAt?: string | null;
    openingBalance: number;
    totalSales: number;
    totalOrders: number;
    totalCups: number;
    totalExpenses: number;
    expectedCash: number;
    actualCash?: number | null;
    variance?: number | null;
    notes?: string | null;
};

type PhotoShape = {
    type: string;
    url: string;
    quantity?: { value: number; unit: string } | null;
};

type ExpenseShape = {
    id: string;
    type: string;
    amount: number;
    notes?: string | null;
};

export default async function SummaryDetailPage({
    params,
}: {
    params: Promise<{ summaryId: string }>;
}) {
    const { summaryId } = await params;
    const [supabase, serviceClient, tenantId] = await Promise.all([
        getSSRClient(),
        Promise.resolve(getServiceClient()),
        getCurrentTenantId(),
    ]);

    let summary: SummaryShape;
    let breakdown: Record<string, { quantity: number; revenue: number }>;
    let photos: PhotoShape[];
    let expenses: ExpenseShape[];
    let sessionsMap: Record<string, Array<{ userId: string; userName: string | null; userAvatarUrl: string | null }>>;

    try {
        const [rawSummary, rawBreakdown, rawPhotos, rawExpenses, rawSessions] = await Promise.all([
            getSummaryById(supabase, { tenantId, summaryId }),
            getSummaryBreakdown(supabase, { tenantId, summaryId }),
            listSummaryPhotos(supabase, { tenantId, dailySummaryId: summaryId }),
            listExpenses(supabase, { tenantId, dailySummaryId: summaryId }),
            fetchSessionUsersForSummaries(serviceClient, { tenantId, summaryIds: [summaryId] }),
        ]);
        summary = rawSummary as unknown as SummaryShape;
        breakdown = rawBreakdown.breakdown;
        photos = rawPhotos as unknown as PhotoShape[];
        expenses = rawExpenses as unknown as ExpenseShape[];
        sessionsMap = rawSessions;
    } catch {
        notFound();
    }

    const sessions = sessionsMap[summaryId] ?? [];
    const openingPhoto = photos.find((p) => p.type === "opening");
    const closingPhotos = photos.filter((p) => p.type.startsWith("closing:"));
    const hasPhotos = !!openingPhoto || closingPhotos.length > 0;

    const dateLabel = new Date(summary.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="space-y-4 pb-24">

            {/* ① Header */}
            <div className="bg-white rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xl text-gray-800 leading-tight">{dateLabel}</h3>
                    {summary.closedAt ? (
                        <span className="shrink-0 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-sm font-medium">Closed</span>
                    ) : (
                        <span className="shrink-0 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-sm font-medium">Open</span>
                    )}
                </div>
                <div className="text-sm space-y-1.5">
                    {summary.stores?.name && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Store</span>
                            <span className="font-medium text-gray-800">{summary.stores.name}</span>
                        </div>
                    )}
                    {summary.openedByUser?.fullName && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Opened by</span>
                            <span className="font-medium text-gray-800">{summary.openedByUser.fullName}</span>
                        </div>
                    )}
                    {summary.closedAt && summary.closedByUser?.fullName && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Closed by</span>
                            <span className="font-medium text-gray-800">{summary.closedByUser.fullName}</span>
                        </div>
                    )}
                    {summary.createdAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Opened at</span>
                            <span className="font-medium text-gray-800">{formatFullIndonesiaTimestamp(summary.createdAt)}</span>
                        </div>
                    )}
                    {summary.closedAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Closed at</span>
                            <span className="font-medium text-gray-800">{formatFullIndonesiaTimestamp(summary.closedAt)}</span>
                        </div>
                    )}
                    <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-gray-500">Summary ID</span>
                        <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-gray-400">{summary.id.slice(0, 8)}…</span>
                            <CopyableField label="Summary ID" value={summary.id} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ② Financials */}
            <div className="bg-white rounded-2xl p-4 space-y-4">

                {/* Hero row: Total Sales + Orders/Cups */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Total Sales</p>
                        <p className="text-3xl font-black text-green-600 leading-tight">{formatRupiah(summary.totalSales)}</p>
                    </div>
                    <div className="flex gap-5 pb-0.5">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-500">Orders</p>
                            <p className="text-2xl font-black text-blue-600 leading-tight">{summary.totalOrders}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-500">Cups</p>
                            <p className="text-2xl font-black text-orange-600 leading-tight">{summary.totalCups}</p>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Cash calculation */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500">Opening Balance</p>
                        <p className="text-base font-extrabold text-blue-600">{formatRupiah(summary.openingBalance)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500">Opening + Sales</p>
                        <p className="text-base font-extrabold text-purple-600">{formatRupiah(summary.openingBalance + summary.totalSales)}</p>
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Reconciliation */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500">Net Expected Cash</p>
                        <p className="text-base font-extrabold text-purple-600">{formatRupiah(summary.expectedCash)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500">Actual Cash</p>
                        <p className="text-base font-extrabold text-orange-600">
                            {summary.actualCash !== null && summary.actualCash !== undefined
                                ? formatRupiah(summary.actualCash)
                                : "—"}
                        </p>
                    </div>
                </div>

                {summary.variance !== null && summary.variance !== undefined && (
                    <>
                        <hr className="border-gray-100" />
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-semibold text-gray-500">Variance</p>
                            <p className={`text-xl font-extrabold ${summary.variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {summary.variance >= 0 ? "+" : ""}{formatRupiah(summary.variance)}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* ③ Sessions */}
            {sessions.length > 0 && (
                <div className="bg-white rounded-2xl p-3 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Who Worked</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {sessions.map((s) => (
                            <div key={s.userId} className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5 pr-3.5 w-full">
                                {s.userAvatarUrl ? (
                                    <Image
                                        src={s.userAvatarUrl}
                                        alt={s.userName ?? ""}
                                        width={28}
                                        height={28}
                                        className="rounded-lg object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                                        <UserCircle size={18} className="text-brand" />
                                    </div>
                                )}
                                <p className="text-base font-bold text-gray-900 truncate">{s.userName ?? "Unknown"}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ④ Product Breakdown */}
            <div className="bg-white rounded-2xl p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">Product Sales Breakdown</h4>
                {Object.keys(breakdown).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No sales recorded for this day</p>
                ) : (
                    <div className="space-y-2">
                        {Object.entries(breakdown)
                            .sort(([, a], [, b]) => b.quantity - a.quantity)
                            .map(([productName, data]) => (
                                <div key={productName} className="flex justify-between items-center bg-slate-100 p-3 rounded-xl">
                                    <span className="font-medium text-gray-800">{productName}</span>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-800">{data.quantity} cups</p>
                                        <p className="text-sm text-gray-500">{formatRupiah(data.revenue)}</p>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* ⑤ Expenses */}
            {expenses.length > 0 && (
                <div className="bg-white rounded-2xl p-3 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Expenses</h4>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-2 space-y-1">
                        {expenses.map((expense) => (
                            <div key={expense.id} className="flex justify-between text-sm">
                                <span className="text-red-700">{expense.type}</span>
                                <span className="font-medium text-red-800">-{formatRupiah(expense.amount)}</span>
                            </div>
                        ))}
                        <div className="border-t border-red-300 pt-1 flex justify-between text-sm font-semibold">
                            <span className="text-red-700">Total</span>
                            <span className="text-red-800">-{formatRupiah(summary.totalExpenses)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ⑥ Notes */}
            {summary.notes && (
                <div className="bg-white rounded-2xl p-3 space-y-1">
                    <h4 className="text-sm font-semibold text-gray-800">Notes</h4>
                    <p className="text-sm text-gray-700 bg-slate-100 p-2.5 rounded-xl">{summary.notes}</p>
                </div>
            )}

            {/* ⑦ Photos */}
            {hasPhotos && (
                <div className="bg-white rounded-2xl p-3 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-800">Photos</h4>

                    {openingPhoto && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Opening</p>
                            <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100">
                                <SummaryPhotoThumbnail
                                    url={openingPhoto.url}
                                    alt="Opening photo"
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    )}

                    {closingPhotos.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Closing Inventory</p>
                            <div className="grid grid-cols-2 gap-2">
                                {PHOTO_SLOTS.map((slot) => {
                                    const photo = closingPhotos.find((p) => p.type === slot.type);
                                    if (!photo) return null;
                                    return (
                                        <div key={slot.type} className="bg-slate-50 rounded-xl overflow-hidden">
                                            <div className="aspect-square">
                                                <SummaryPhotoThumbnail
                                                    url={photo.url}
                                                    alt={slot.label}
                                                    className="w-full h-full"
                                                />
                                            </div>
                                            <div className="p-2">
                                                <p className="text-xs font-semibold text-gray-800">{slot.label}</p>
                                                {photo.quantity && (
                                                    <p className="text-xs text-gray-500">{photo.quantity.value} {photo.quantity.unit}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
