"use client";

import Image from "next/image";
import { Check, UserCircle } from "lucide-react";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { formatFullIndonesiaTimestamp } from "@tea-pos/utils/server-config/timezone";
import { DailySummary } from "@tea-pos/features/summaries/schema";
import { SummaryPhotoThumbnail } from "./SummaryPhotoThumbnail";
import { PHOTO_SLOTS } from "@tea-pos/features/shared/photo-slots";
import {
    SavedSlottedPhoto,
    SlottedPhoto,
} from "@tea-pos/features/summaries/photos-schema";
import { useSummaryBreakdown } from "@/lib/hooks/summaries/useSummaryBreakdown";
import CopyableField from "@/components/shared/CopyableField";

interface ReviewStepProps {
    summary: DailySummary;
    photos: SlottedPhoto[];
    savedPhotos: SavedSlottedPhoto[];
    notes: string;
    storeName: string;
    confirmed: boolean;
    onConfirmChange: (confirmed: boolean) => void;
}

export function ReviewStep({
    summary,
    photos,
    savedPhotos,
    notes,
    storeName,
    confirmed,
    onConfirmChange,
}: ReviewStepProps) {
    const { breakdown } = useSummaryBreakdown(summary.id);

    const actualCash = summary.actualCash ?? 0;
    const variance = summary.variance ?? actualCash - summary.expectedCash;

    const sessions = summary.sessions ?? [];
    const expenses = summary.expenses ?? [];

    const openingPhoto = savedPhotos.find((p) => p.type === "opening")
        ?? photos.find((p) => p.type === "opening");
    const closingPhotos = [
        ...savedPhotos.filter((p) => p.type.startsWith("closing:")),
        ...photos.filter((p) => p.type.startsWith("closing:")),
    ];
    const hasPhotos = !!openingPhoto || closingPhotos.length > 0;

    const dateLabel = new Date(summary.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    return (
        <div className="space-y-4 pb-4">

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
                    <div className="flex justify-between">
                        <span className="text-gray-500">Store</span>
                        <span className="font-medium text-gray-800">{storeName}</span>
                    </div>
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

                {variance !== 0 && (
                    <>
                        <hr className="border-gray-100" />
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-semibold text-gray-500">Variance</p>
                            <p className={`text-xl font-extrabold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {variance >= 0 ? "+" : ""}{formatRupiah(variance)}
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
            {(notes.length > 0 || summary.notes) && (
                <div className="bg-white rounded-2xl p-3 space-y-1">
                    <h4 className="text-sm font-semibold text-gray-800">Notes</h4>
                    <p className="text-sm text-gray-700 bg-slate-100 p-2.5 rounded-xl leading-relaxed">
                        {notes || summary.notes}
                    </p>
                </div>
            )}

            {/* ⑦ Photos */}
            {hasPhotos && (
                <div className="bg-white rounded-2xl p-3 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-800">Photos</h4>

                    {openingPhoto && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Opening</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 rounded-xl overflow-hidden">
                                    <div className="aspect-square">
                                        <SummaryPhotoThumbnail
                                            url={"url" in openingPhoto ? openingPhoto.url : openingPhoto.preview}
                                            alt="Opening"
                                            className="w-full h-full"
                                            isSaved={"url" in openingPhoto}
                                        />
                                    </div>
                                </div>
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
                                    const url = "url" in photo ? photo.url : photo.preview;
                                    const quantity = "quantity" in photo ? photo.quantity : null;
                                    return (
                                        <div key={slot.type} className="bg-slate-50 rounded-xl overflow-hidden">
                                            <div className="aspect-square">
                                                <SummaryPhotoThumbnail
                                                    url={url}
                                                    alt={slot.label}
                                                    className="w-full h-full"
                                                    isSaved={"url" in photo}
                                                />
                                            </div>
                                            <div className="p-2">
                                                <p className="text-xs font-semibold text-gray-800">{slot.label}</p>
                                                {quantity && (
                                                    <p className="text-xs text-gray-500">{quantity.value} {quantity.unit}</p>
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

            {/* Confirmation */}
            <button
                onClick={() => onConfirmChange(!confirmed)}
                className="flex items-center gap-3 p-4 rounded-2xl w-full text-left bg-white"
            >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    confirmed ? "bg-brand border-brand" : "border-gray-300"
                }`}>
                    {confirmed && <Check size={14} className="text-white" />}
                </div>
                <p className="text-sm font-semibold text-gray-700">
                    I confirm all the information above is correct.
                </p>
            </button>

            <div className="h-4" />
        </div>
    );
}
