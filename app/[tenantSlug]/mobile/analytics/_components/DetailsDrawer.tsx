// components/mobile/components/DetailsDrawer.tsx
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { formatFullIndonesiaTimestamp } from "@/lib/timezone";
import CopyableField from "@/components/mobile/shared/CopyableField";
import { DailySummary } from "@/lib/schemas/daily-summaries";
import { Expense } from "@/lib/schemas/expenses";
import { SummaryPhotoThumbnail } from "@/app/[tenantSlug]/mobile/analytics/daily/_components/SummaryPhotoThumbnail";
import { PHOTO_SLOTS } from "@/lib/frontend/constants/photo-slots";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import { useSummaryPhotosById } from "@/lib/hooks/summaries/useSummaryPhotosById";

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
    const { photos } = useSummaryPhotosById(isOpen ? summary?.id : null);

    if (!isOpen || !summary) return null;

    const closingPhotos = photos.filter((p) => p.type.startsWith("closing:"));

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

                            {/* Sales Stats */}
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

                            {/* Closing Photos */}
                            {closingPhotos.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-800">
                                        Closing Photos
                                    </h4>
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
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {slot.label}
                                                        </p>
                                                        {photo.quantity ? (
                                                            <p className="text-sm text-gray-500 mt-0.5">
                                                                {
                                                                    photo
                                                                        .quantity
                                                                        .value
                                                                }{" "}
                                                                {
                                                                    photo
                                                                        .quantity
                                                                        .unit
                                                                }
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-gray-300 mt-0.5">
                                                                No quantity
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

                            <div className="h-4" />
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};
