// components/mobile/components/DetailsDrawer.tsx
import { Drawer } from "vaul";
import { X, Camera } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import { formatFullIndonesiaTimestamp } from "@/lib/timezone";
import CopyableField from "@/components/mobile/shared/CopyableField";
import { DailySummary } from "@/lib/schemas/daily-summaries";
import { Expense } from "@/lib/schemas/expenses";
import { SummaryPhotoThumbnail } from "@/app/[tenantSlug]/mobile/analytics/daily/_components/SummaryPhotoThumbnail";
import { PHOTO_SLOTS } from "@/app/[tenantSlug]/mobile/analytics/daily/_components/PhotoStep";

export type DailySummaryWithExpenses = DailySummary & {
    expenses: Expense[];
};

interface DetailsDrawerProps {
    isOpen: boolean;
    summary: DailySummaryWithExpenses;
    onClose: () => void;
    productBreakdown: Record<string, { quantity: number; revenue: number }>;
    storeName: string;
}

export const DetailsDrawer = ({
    isOpen,
    summary,
    onClose,
    productBreakdown,
    storeName,
}: DetailsDrawerProps) => {
    if (!isOpen || !summary) return null;

    // Group photos by type
    const closingPhotos =
        summary.photos?.filter((p) => p.type.startsWith("closing:")) ?? [];

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90dvh] flex flex-col focus:outline-none">
                    {/* Pull tab */}
                    <div className="absolute top-2 left-0 right-0 flex justify-center flex-shrink-0">
                        <div className="w-8 h-1 rounded-full bg-gray-300" />
                    </div>

                    {/* Fixed Header */}
                    <div className="flex-shrink-0 p-4 pt-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <Drawer.Title className="text-lg font-semibold">
                                Daily Summary Details
                            </Drawer.Title>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 space-y-4">
                            {/* Summary Header */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-lg mb-2">
                                    {new Date(summary.date).toLocaleDateString(
                                        "en-US",
                                        {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        },
                                    )}
                                </h3>
                                <div className="text-xs text-gray-700 space-y-1">
                                    <div>
                                        <strong>Summary ID:</strong>
                                        <br />
                                        <div className="flex justify-between items-start">
                                            <span>{summary.id}</span>
                                            <CopyableField
                                                label="Summary ID"
                                                value={summary.id}
                                            />
                                        </div>
                                    </div>
                                    <p>
                                        <strong>Store:</strong> {storeName}
                                    </p>
                                    <p>
                                        <strong>Seller:</strong>{" "}
                                        {summary.seller?.fullName}
                                    </p>
                                    {summary.manager?.fullName && (
                                        <p>
                                            <strong>Manager:</strong>{" "}
                                            {summary.manager.fullName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Store Open:
                                    </span>
                                    <span className="font-medium">
                                        {summary.createdAt
                                            ? formatFullIndonesiaTimestamp(
                                                  summary.createdAt,
                                              )
                                            : "Not set"}
                                    </span>
                                </div>
                                {summary.closedAt && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Store Closed:
                                        </span>
                                        <span className="font-medium">
                                            {formatFullIndonesiaTimestamp(
                                                summary.closedAt,
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Financial Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-xs text-blue-600 uppercase tracking-wide">
                                        Opening Balance
                                    </p>
                                    <p className="text-lg font-bold text-blue-800">
                                        {formatRupiah(summary.openingBalance)}
                                    </p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-xs text-green-600 uppercase tracking-wide">
                                        Total Sales
                                    </p>
                                    <p className="text-lg font-bold text-green-800">
                                        {formatRupiah(summary.totalSales)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-xs text-purple-600 uppercase tracking-wide">
                                        Opening + Sales
                                    </p>
                                    <p className="text-lg font-bold text-purple-800">
                                        {formatRupiah(
                                            summary.openingBalance +
                                                summary.totalSales,
                                        )}
                                    </p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <p className="text-xs text-red-600 uppercase tracking-wide">
                                        Expenses
                                    </p>
                                    <p className="text-lg font-bold text-red-800">
                                        {formatRupiah(summary.totalExpenses)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-xs text-purple-600 uppercase tracking-wide">
                                        Expected Cash
                                    </p>
                                    <p className="text-lg font-bold text-purple-800">
                                        {formatRupiah(summary.expectedCash)}
                                    </p>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg">
                                    <p className="text-xs text-orange-600 uppercase tracking-wide">
                                        Actual Cash
                                    </p>
                                    <p className="text-lg font-bold text-orange-800">
                                        {summary.actualCash !== null
                                            ? formatRupiah(summary.actualCash)
                                            : "Not counted"}
                                    </p>
                                </div>
                            </div>

                            {/* Variance */}
                            {summary.variance !== null && (
                                <div
                                    className={`p-4 rounded-lg ${summary.variance >= 0 ? "bg-green-50" : "bg-red-50"}`}
                                >
                                    <p
                                        className={`text-xs uppercase tracking-wide ${summary.variance >= 0 ? "text-green-600" : "text-red-600"}`}
                                    >
                                        Cash Variance
                                    </p>
                                    <p
                                        className={`text-lg font-bold ${summary.variance >= 0 ? "text-green-800" : "text-red-800"}`}
                                    >
                                        {summary.variance >= 0 ? "+" : ""}
                                        {formatRupiah(summary.variance)}
                                    </p>
                                </div>
                            )}

                            {/* Sales Statistics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {summary.totalOrders}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Total Orders
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <p className="text-2xl font-bold text-orange-600">
                                        {summary.totalCups}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Cups Sold
                                    </p>
                                </div>
                            </div>

                            {/* Closing Photos — grouped by slot */}
                            {closingPhotos.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-gray-800">
                                            Closing Photos
                                        </h4>
                                    </div>
                                    <div className="space-y-3">
                                        {PHOTO_SLOTS.map((slot) => {
                                            const photo = closingPhotos.find(
                                                (p) => p.type === slot.type,
                                            );
                                            if (!photo) return null;
                                            return (
                                                <div
                                                    key={slot.type}
                                                    className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl"
                                                >
                                                    {/* Square thumbnail */}
                                                    <div className="w-20 h-20 shrink-0">
                                                        <SummaryPhotoThumbnail
                                                            url={photo.url}
                                                            alt={slot.label}
                                                            className="w-full h-full"
                                                        />
                                                    </div>
                                                    {/* Label + notes */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {slot.label}
                                                        </p>
                                                        {photo.notes ? (
                                                            <p className="text-sm text-gray-500 mt-0.5">
                                                                {photo.notes}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-gray-300 mt-0.5">
                                                                No notes
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Product Breakdown */}
                            {Object.keys(productBreakdown).length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-800">
                                        Product Sales Breakdown
                                    </h4>
                                    <div className="space-y-2">
                                        {Object.entries(productBreakdown)
                                            .sort(
                                                ([, a], [, b]) =>
                                                    b.quantity - a.quantity,
                                            )
                                            .map(([productName, data]) => (
                                                <div
                                                    key={productName}
                                                    className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                                                >
                                                    <span className="font-medium">
                                                        {productName}
                                                    </span>
                                                    <div className="text-right">
                                                        <p className="font-medium">
                                                            {data.quantity} cups
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {formatRupiah(
                                                                data.revenue,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {summary.notes && (
                                <div className="space-y-2">
                                    <h4 className="font-medium text-gray-800">
                                        Notes
                                    </h4>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            {summary.notes}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="h-4" />
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};
