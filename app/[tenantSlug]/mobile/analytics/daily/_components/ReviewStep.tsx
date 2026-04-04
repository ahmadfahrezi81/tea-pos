// app/[tenantSlug]/mobile/analytics/daily/_components/ReviewStep.tsx
"use client";

import {
    Camera,
    Banknote,
    FileText,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import { CashBreakdown } from "@/lib/schemas/daily-summaries";
import { DailySummary } from "@/lib/schemas/daily-summaries";
import { SummaryPhotoThumbnail } from "./SummaryPhotoThumbnail";
import { SavedSlottedPhoto, SlottedPhoto } from "./PhotoStep";

const DENOMINATIONS: { value: keyof CashBreakdown; label: string }[] = [
    { value: 100000, label: "Rp 100.000" },
    { value: 50000, label: "Rp 50.000" },
    { value: 20000, label: "Rp 20.000" },
    { value: 10000, label: "Rp 10.000" },
    { value: 5000, label: "Rp 5.000" },
    { value: 2000, label: "Rp 2.000" },
    { value: 1000, label: "Rp 1.000" },
    { value: 500, label: "Rp 500" },
    { value: 200, label: "Rp 200" },
    { value: 100, label: "Rp 100" },
];

function calculateTotal(breakdown: CashBreakdown): number {
    return Object.entries(breakdown).reduce((sum, [denom, count]) => {
        return sum + parseInt(denom) * (count ?? 0);
    }, 0);
}

interface ReviewStepProps {
    summary: DailySummary;
    photos: SlottedPhoto[]; // ← was File[]
    savedPhotos: SavedSlottedPhoto[]; // ← was savedPhotoUrls: string[]
    breakdown: CashBreakdown;
    notes: string;
    storeName: string;
}

export function ReviewStep({
    summary,
    photos,
    savedPhotos,
    breakdown,
    notes,
    storeName,
}: ReviewStepProps) {
    const actualCash = calculateTotal(breakdown);
    const variance = actualCash - summary.expectedCash;
    const isExact = variance === 0;
    const isOver = variance > 0;

    const filledDenominations = DENOMINATIONS.filter(
        ({ value }) => (breakdown[value] ?? 0) > 0,
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900">
                    Review & Confirm
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    Double check everything before closing the day.
                </p>
            </div>

            {/* Variance banner */}
            <div
                className={`p-4 rounded-2xl flex items-center gap-3 ${
                    isExact
                        ? "bg-green-50"
                        : isOver
                          ? "bg-blue-50"
                          : "bg-red-50"
                }`}
            >
                {isExact ? (
                    <CheckCircle
                        size={24}
                        className="text-green-500 shrink-0"
                    />
                ) : (
                    <AlertCircle
                        size={24}
                        className={`shrink-0 ${isOver ? "text-blue-500" : "text-red-500"}`}
                    />
                )}
                <div className="flex-1">
                    <p
                        className={`text-sm font-semibold ${
                            isExact
                                ? "text-green-700"
                                : isOver
                                  ? "text-blue-700"
                                  : "text-red-700"
                        }`}
                    >
                        {isExact
                            ? "Cash matches perfectly"
                            : isOver
                              ? `Cash is over by ${formatRupiah(Math.abs(variance))}`
                              : `Cash is short by ${formatRupiah(Math.abs(variance))}`}
                    </p>
                    <p
                        className={`text-xs mt-0.5 ${
                            isExact
                                ? "text-green-600"
                                : isOver
                                  ? "text-blue-600"
                                  : "text-red-600"
                        }`}
                    >
                        Expected {formatRupiah(summary.expectedCash)} · Counted{" "}
                        {formatRupiah(actualCash)}
                    </p>
                </div>
            </div>

            {/* Store + date */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Summary
                </p>
                <p className="text-base font-semibold text-gray-900">
                    {storeName}
                </p>
                <p className="text-sm text-gray-500">
                    {new Date(summary.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        },
                    )}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                        <p className="text-xs text-gray-400">Orders</p>
                        <p className="text-base font-bold text-gray-800">
                            {summary.totalOrders}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Cups</p>
                        <p className="text-base font-bold text-gray-800">
                            {summary.totalCups}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Sales</p>
                        <p className="text-base font-bold text-gray-800">
                            {formatRupiah(summary.totalSales)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Camera size={16} className="text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700">
                        Photos
                    </p>
                </div>
                {savedPhotos.length > 0 || photos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {savedPhotos.map((p) => (
                            <div key={p.id} className="aspect-square w-20">
                                <SummaryPhotoThumbnail
                                    url={p.url}
                                    alt={p.type}
                                    className="w-full h-full"
                                />
                            </div>
                        ))}
                        {photos.map((p, index) => (
                            <div key={index} className="aspect-square w-20">
                                <SummaryPhotoThumbnail
                                    url={p.preview}
                                    alt={p.type}
                                    className="w-full h-full"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">No photos added</p>
                )}
            </div>

            {/* Cash breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Banknote size={16} className="text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">
                            Cash Count
                        </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        {formatRupiah(actualCash)}
                    </p>
                </div>
                {filledDenominations.length > 0 ? (
                    <div className="space-y-1.5">
                        {filledDenominations.map(({ value, label }) => {
                            const count = breakdown[value] ?? 0;
                            return (
                                <div
                                    key={value}
                                    className="flex justify-between text-sm"
                                >
                                    <span className="text-gray-500">
                                        {label} × {count}
                                    </span>
                                    <span className="font-medium text-gray-800">
                                        {formatRupiah(value * count)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">No cash counted</p>
                )}
            </div>

            {/* Notes */}
            {notes.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">
                            Notes
                        </p>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {notes}
                    </p>
                </div>
            )}

            <div className="h-4" />
        </div>
    );
}
