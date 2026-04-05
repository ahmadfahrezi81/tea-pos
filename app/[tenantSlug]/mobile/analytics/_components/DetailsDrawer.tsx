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
import { useSummaryBreakdown } from "@/lib/hooks/summaries/useSummaryBreakdown";

export type DailySummaryWithExpenses = DailySummary & {
    expenses: Expense[];
};

interface DetailsDrawerProps {
    isOpen: boolean;
    summary: DailySummaryWithExpenses;
    onClose: () => void;
    storeName: string;
}

export const DetailsDrawer = ({
    isOpen,
    summary,
    onClose,
    storeName,
}: DetailsDrawerProps) => {
    const { photos } = useSummaryPhotosById(isOpen ? summary?.id : null);
    const { breakdown, isLoading: breakdownLoading } = useSummaryBreakdown(
        isOpen ? summary?.id : null,
    );

    if (!isOpen || !summary) return null;

    const closingPhotos = photos.filter((p) => p.type.startsWith("closing:"));

    return (
        <Drawer.Root
            open={isOpen}
            modal={false}
            onOpenChange={(open) => !open && onClose()}
        >
            <Drawer.Portal>
                {/* Custom overlay since modal={false} disables Drawer.Overlay */}
                {isOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 z-50"
                        onClick={onClose}
                    />
                )}
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

                            {/* Product Breakdown */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-800">
                                    Product Sales Breakdown
                                </h4>
                                {breakdownLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : Object.keys(breakdown).length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">
                                        No sales recorded for this day
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {Object.entries(breakdown)
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
                                )}
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
                                                        <p className="text-md font-semibold text-gray-800">
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
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
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
