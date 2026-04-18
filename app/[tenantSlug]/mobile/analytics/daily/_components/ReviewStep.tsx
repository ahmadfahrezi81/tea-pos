"use client";

import {
    Camera,
    Banknote,
    FileText,
    CheckCircle,
    AlertCircle,
    Check,
} from "lucide-react";
import { formatRupiah } from "@/lib/shared/utils/formatCurrency";
import { DailySummary } from "@/lib/shared/schemas/daily-summaries";
import { SummaryPhotoThumbnail } from "./SummaryPhotoThumbnail";
import {
    SavedSlottedPhoto,
    SlottedPhoto,
} from "@/lib/shared/schemas/daily-summary-photos";
import { useState } from "react";

interface ReviewStepProps {
    summary: DailySummary;
    photos: SlottedPhoto[];
    savedPhotos: SavedSlottedPhoto[];
    notes: string;
    storeName: string;
    onConfirmChange: (confirmed: boolean) => void;
}

export function ReviewStep({
    summary,
    photos,
    savedPhotos,
    notes,
    storeName,
    onConfirmChange,
}: ReviewStepProps) {
    const [confirmed, setConfirmed] = useState(false);

    const actualCash = summary.actualCash ?? 0;
    const variance = summary.variance ?? actualCash - summary.expectedCash;
    const isExact = variance === 0;
    const isOver = variance > 0;

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
                        size={30}
                        className={`shrink-0 ${isOver ? "text-blue-500" : "text-red-500"}`}
                    />
                )}
                <div className="flex-1">
                    <p
                        className={`text-md font-semibold ${
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
                        className={`text-sm mt-0.5 ${
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
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
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
                <div className="flex items-center gap-0">
                    <Camera size={22} className="text-gray-900 mb-1" />
                    <p className="text-sm font-semibold text-gray-900 tracking-wide px-1">
                        Photos
                    </p>
                </div>
                {savedPhotos.length > 0 || photos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {savedPhotos.map((p) => (
                            <div key={p.id} className="aspect-square w-24">
                                <SummaryPhotoThumbnail
                                    url={p.url}
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

            {/* Cash */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Banknote size={22} className="text-gray-900" />
                        <p className="text-sm font-semibold text-gray-900 tracking-wide px-1">
                            Cash Count
                        </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        {formatRupiah(actualCash)}
                    </p>
                </div>
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

            {/* Confirmation checkbox */}
            <button
                onClick={() => {
                    const next = !confirmed;
                    setConfirmed(next);
                    onConfirmChange(next);
                }}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 w-full text-left"
            >
                <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        confirmed ? "bg-brand border-brand" : "border-gray-300"
                    }`}
                >
                    {confirmed && <Check size={12} className="text-white" />}
                </div>
                <p className="text-sm text-gray-700 font-medium">
                    I confirm all the information above is correct.
                </p>
            </button>

            <div className="h-4" />
        </div>
    );
}
