import { notFound } from "next/navigation";
import { getSSRClient } from "@/lib/supabase/ssr";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import {
    getSummaryById,
    getSummaryBreakdown,
    listSummaryPhotos,
} from "@tea-pos/services/summaries";
import { PHOTO_SLOTS } from "@tea-pos/features/shared/photo-slots";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { formatFullIndonesiaTimestamp } from "@tea-pos/utils/server-config/timezone";
import { SummaryPhotoThumbnail } from "@/app/[tenantSlug]/mobile/home/manage/_components/daily/SummaryPhotoThumbnail";
import CopyableField from "@/components/shared/CopyableField";

export default async function SummaryDetailPage({
    params,
}: {
    params: Promise<{ summaryId: string }>;
}) {
    const { summaryId } = await params;
    const supabase = await getSSRClient();
    const tenantId = await getCurrentTenantId();

    let summary: Awaited<ReturnType<typeof getSummaryById>>;
    let breakdown: Record<string, { quantity: number; revenue: number }>;
    let photos: Awaited<ReturnType<typeof listSummaryPhotos>>;

    try {
        [summary, { breakdown }, photos] = await Promise.all([
            getSummaryById(supabase, { tenantId, summaryId }),
            getSummaryBreakdown(supabase, { tenantId, summaryId }),
            listSummaryPhotos(supabase, { tenantId, dailySummaryId: summaryId }),
        ]);
    } catch {
        notFound();
    }

    const s = summary as {
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

    const closingPhotos = (photos as Array<{ type: string; url: string; quantity?: { value: number; unit: string } | null }>)
        .filter((p) => p.type.startsWith("closing:"));

    const dateLabel = new Date(s.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="space-y-4 pb-24">
            {/* Header */}
            <div className="bg-gray-50 p-4 rounded-2xl">
                <h3 className="font-semibold text-lg mb-2">{dateLabel}</h3>
                <div className="text-xs text-gray-700 space-y-1">
                    <div>
                        <strong>Summary ID:</strong>
                        <br />
                        <div className="flex justify-between items-start">
                            <span>{s.id}</span>
                            <CopyableField label="Summary ID" value={s.id} />
                        </div>
                    </div>
                    {s.stores?.name && (
                        <p>
                            <strong>Store:</strong> {s.stores.name}
                        </p>
                    )}
                    {s.openedByUser?.fullName && (
                        <p>
                            <strong>Opened by:</strong> {s.openedByUser.fullName}
                        </p>
                    )}
                    {s.closedByUser?.fullName && (
                        <p>
                            <strong>Closed by:</strong> {s.closedByUser.fullName}
                        </p>
                    )}
                </div>
            </div>

            {/* Timestamps */}
            <div className="bg-gray-50 p-3 rounded-2xl text-sm space-y-2">
                {s.createdAt && (
                    <div className="flex justify-between">
                        <span className="text-gray-600">Store Open:</span>
                        <span className="font-medium">
                            {formatFullIndonesiaTimestamp(s.createdAt)}
                        </span>
                    </div>
                )}
                {s.closedAt && (
                    <div className="flex justify-between">
                        <span className="text-gray-600">Store Closed:</span>
                        <span className="font-medium">
                            {formatFullIndonesiaTimestamp(s.closedAt)}
                        </span>
                    </div>
                )}
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 gap-2 bg-white rounded-2xl p-3 text-gray-800">
                <div>
                    <p className="text-xs text-gray-500">Opening Balance</p>
                    <p className="text-lg font-extrabold text-blue-600">
                        {formatRupiah(s.openingBalance)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Total Sales</p>
                    <p className="text-lg font-extrabold text-green-600">
                        {formatRupiah(s.totalSales)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Opening + Sales</p>
                    <p className="text-lg font-extrabold text-purple-600">
                        {formatRupiah(s.openingBalance + s.totalSales)}
                    </p>
                </div>
                <div className="flex gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Orders</p>
                        <p className="text-lg font-extrabold text-blue-600">
                            {s.totalOrders}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Cups</p>
                        <p className="text-lg font-extrabold text-orange-600">
                            {s.totalCups}
                        </p>
                    </div>
                </div>
                <hr className="col-span-2 border-gray-200" />
                <div>
                    <p className="text-xs text-gray-500">Net Expected Cash</p>
                    <p className="text-lg font-extrabold text-purple-600">
                        {formatRupiah(s.expectedCash)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Actual Cash (Counted)</p>
                    <p className="text-lg font-extrabold text-orange-600">
                        {s.actualCash !== null && s.actualCash !== undefined
                            ? formatRupiah(s.actualCash)
                            : "Not counted"}
                    </p>
                </div>
                {s.variance !== null && s.variance !== undefined && (
                    <>
                        <hr className="col-span-2 border-gray-200" />
                        <div className="col-span-2">
                            <p className="text-xs text-gray-500 mb-1">Variance</p>
                            <p
                                className={`text-sm px-3 py-2 rounded-lg font-medium ${
                                    s.variance >= 0
                                        ? "bg-green-50 border border-green-200 text-green-700"
                                        : "bg-red-50 border border-red-200 text-red-700"
                                }`}
                            >
                                {s.variance >= 0 ? "+" : ""}
                                {formatRupiah(s.variance)}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Notes */}
            {s.notes && (
                <div className="bg-white rounded-2xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{s.notes}</p>
                </div>
            )}

            {/* Product Breakdown */}
            <div className="bg-white rounded-2xl p-3 space-y-3">
                <h4 className="font-medium text-gray-800">Product Sales Breakdown</h4>
                {Object.keys(breakdown).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                        No sales recorded for this day
                    </p>
                ) : (
                    <div className="space-y-2">
                        {Object.entries(breakdown)
                            .sort(([, a], [, b]) => b.quantity - a.quantity)
                            .map(([productName, data]) => (
                                <div
                                    key={productName}
                                    className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                                >
                                    <span className="font-medium">{productName}</span>
                                    <div className="text-right">
                                        <p className="font-medium">{data.quantity} cups</p>
                                        <p className="text-sm text-gray-600">
                                            {formatRupiah(data.revenue)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Closing Photos */}
            {closingPhotos.length > 0 && (
                <div className="bg-white rounded-2xl p-3 space-y-3">
                    <h4 className="font-medium text-gray-800">Closing Photos</h4>
                    <div className="space-y-3">
                        {PHOTO_SLOTS.map((slot) => {
                            const photo = closingPhotos.find(
                                (p) => p.type === slot.type,
                            );
                            if (!photo) return null;
                            return (
                                <div
                                    key={slot.type}
                                    className="flex items-start gap-3 bg-gray-50 p-2 rounded-xl"
                                >
                                    <div className="w-32 h-32 shrink-0">
                                        <SummaryPhotoThumbnail
                                            url={photo.url}
                                            alt={slot.label}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-md font-semibold text-gray-800">
                                            {slot.label}
                                        </p>
                                        {photo.quantity && (
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {photo.quantity.value} {photo.quantity.unit}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
