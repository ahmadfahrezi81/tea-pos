"use client";
import Image from "next/image";
import { Check, UserCircle } from "lucide-react";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { PHOTO_SLOTS } from "@tea-pos/features/shared/photo-slots";
import { SummaryPhotoThumbnail } from "@/app/[tenantSlug]/mobile/home/manage/_components/daily/SummaryPhotoThumbnail";
import CopyableField from "@/components/shared/CopyableField";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { useT } from "@/lib/hooks/useT";

export type SummaryShape = {
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

export type PhotoShape = {
    type: string;
    url: string;
    quantity?: { value: number; unit: string } | null;
};

export type ExpenseShape = {
    id: string;
    type: string;
    amount: number;
    notes?: string | null;
};

export type SessionUser = {
    userId: string;
    userName: string | null;
    userAvatarUrl: string | null;
};

function formatTimestamp(utc: string): string {
    return new Date(utc).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
    });
}

interface SummaryDetailsCardProps {
    summary: SummaryShape;
    breakdown: Record<string, { quantity: number; revenue: number }>;
    photos: PhotoShape[];
    expenses: ExpenseShape[];
    sessions: SessionUser[];
    dateLabel: string;
    showConfirmation?: boolean;
    confirmed?: boolean;
    onConfirmChange?: (confirmed: boolean) => void;
    actualCash?: number;
    onActualCashChange?: (amount: number) => void;
}

export function SummaryDetailsCard({
    summary,
    breakdown,
    photos,
    expenses,
    sessions,
    dateLabel,
    showConfirmation = false,
    confirmed = false,
    onConfirmChange,
    actualCash,
    onActualCashChange,
}: SummaryDetailsCardProps) {
    const t = useT();

    const openingPhoto = photos.find((p) => p.type === "opening");
    const closingPhotos = photos.filter((p) => p.type.startsWith("closing:"));
    const hasPhotos = !!openingPhoto || closingPhotos.length > 0;

    // When editing (close-day review), the cash count above hasn't been saved to
    // summary.actualCash yet — reflect the live input value instead.
    const effectiveActualCash = showConfirmation
        ? (actualCash ?? null)
        : (summary.actualCash ?? null);
    const effectiveVariance = showConfirmation
        ? actualCash != null
            ? actualCash - summary.expectedCash
            : null
        : (summary.variance ?? null);

    const headerSection = (
        <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-xl text-gray-800 leading-tight">
                    {dateLabel}
                </h3>
                {summary.closedAt ? (
                    <span className="shrink-0 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-sm font-medium">
                        {t("analytics.statusClosed")}
                    </span>
                ) : (
                    <span className="shrink-0 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-sm font-medium">
                        {t("analytics.statusOpen")}
                    </span>
                )}
            </div>
            <div className="text-sm space-y-1.5">
                {summary.stores?.name && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">
                            {t("daily.store")}
                        </span>
                        <span className="font-medium text-gray-800">
                            {summary.stores.name}
                        </span>
                    </div>
                )}
                {summary.openedByUser?.fullName && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">
                            {t("daily.openedBy")}
                        </span>
                        <span className="font-medium text-gray-800">
                            {summary.openedByUser.fullName}
                        </span>
                    </div>
                )}
                {summary.closedAt && summary.closedByUser?.fullName && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">
                            {t("daily.closedBy")}
                        </span>
                        <span className="font-medium text-gray-800">
                            {summary.closedByUser.fullName}
                        </span>
                    </div>
                )}
                {summary.createdAt && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">
                            {t("daily.openedAt")}
                        </span>
                        <span className="font-medium text-gray-800">
                            {formatTimestamp(summary.createdAt)}
                        </span>
                    </div>
                )}
                {summary.closedAt && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">
                            {t("daily.closedAt")}
                        </span>
                        <span className="font-medium text-gray-800">
                            {formatTimestamp(summary.closedAt)}
                        </span>
                    </div>
                )}
                <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-gray-500">
                        {t("daily.summaryId")}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-gray-400">
                            {summary.id.slice(0, 8)}…
                        </span>
                        <CopyableField
                            label={t("daily.summaryId")}
                            value={summary.id}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const cashInputSection = showConfirmation && (
        <div className="bg-white rounded-2xl p-3 space-y-3">
            <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                    {t("manage.cashStep.actualCash")}
                </p>
                <NumberInput
                    value={actualCash ?? summary.expectedCash}
                    currency
                    onChange={(val) => onActualCashChange?.(val)}
                />
                <p className="text-sm text-gray-600">
                    {t("manage.cashStep.expected")}{" "}
                    {formatRupiah(summary.expectedCash)}
                </p>
            </div>
            {effectiveVariance !== null && (
                <div
                    className={`p-2 rounded-lg ${effectiveVariance >= 0 ? "bg-green-50" : "bg-red-50"}`}
                >
                    <p className="text-xs font-semibold text-gray-700">
                        {t("manage.cashStep.variance")}
                    </p>
                    <p
                        className={`text-xl font-bold ${effectiveVariance >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                        {effectiveVariance >= 0 ? "+" : ""}
                        {formatRupiah(effectiveVariance)}
                    </p>
                </div>
            )}
        </div>
    );

    const financialsSection = (
        <div className="bg-white rounded-2xl p-3 space-y-2">
            {/* Opening Balance - Full width */}
            <div className="bg-blue-100 p-2 rounded-lg">
                <p className="text-xs font-semibold text-gray-700">
                    {t("analytics.openingBalance")}
                </p>
                <p className="text-xl font-bold text-blue-900">
                    {formatRupiah(summary.openingBalance)}
                </p>
            </div>

            {/* Grid Layout - Sales (50%), Orders (25%), Cups (25%) */}
            <div className="grid grid-cols-4 gap-2">
                {/* Sales */}
                <div className="col-span-2 bg-green-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">
                        + {t("analytics.totalSales")}
                    </p>
                    <p className="text-xl font-bold text-green-900">
                        {formatRupiah(summary.totalSales)}
                    </p>
                </div>

                {/* Orders */}
                <div className="col-span-1 bg-violet-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">
                        {t("analytics.orders")}
                    </p>
                    <p className="text-xl font-bold text-violet-900">
                        {summary.totalOrders}
                    </p>
                </div>

                {/* Cups */}
                <div className="col-span-1 bg-orange-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">
                        {t("analytics.cups")}
                    </p>
                    <p className="text-xl font-bold text-orange-900">
                        {summary.totalCups}
                    </p>
                </div>
            </div>

            {/* Opening + Sales */}
            <div className="bg-blue-100 p-2 rounded-lg">
                <p className="text-xs font-semibold text-gray-700">
                    {t("analytics.openingBalance")} +{" "}
                    {t("analytics.totalSales")}
                </p>
                <p className="text-xl font-bold text-blue-900">
                    {formatRupiah(summary.openingBalance + summary.totalSales)}
                </p>
            </div>

            <hr className="border-gray-200" />

            {/* Expenses - Full width */}
            <div className="bg-red-100 p-2 rounded-lg">
                <p className="text-xs font-semibold text-gray-700">
                    − {t("daily.expenses")}
                </p>
                <p className="text-xl font-bold text-red-900">
                    {formatRupiah(summary.totalExpenses)}
                </p>
            </div>

            <hr className="border-gray-200 my-2" />

            {/* Expected Cash & Actual Cash - 50/50 */}
            <div className="grid grid-cols-2 gap-2">
                {/* Expected Cash */}
                <div className="bg-purple-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">
                        {t("analytics.expectedCash")}
                    </p>
                    <p className="text-xl font-bold text-purple-900">
                        {formatRupiah(summary.expectedCash)}
                    </p>
                </div>

                {/* Actual Cash */}
                <div className="bg-amber-100 p-2 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">
                        {t("analytics.actualCash")}
                    </p>
                    <p className="text-xl font-bold text-amber-900">
                        {effectiveActualCash !== null
                            ? formatRupiah(effectiveActualCash)
                            : "—"}
                    </p>
                </div>
            </div>

            {/* Variance - Bottom */}
            {effectiveVariance !== null && (
                <div
                    className={`p-2 rounded-lg ${effectiveVariance >= 0 ? "bg-green-100" : "bg-red-100"}`}
                >
                    <p className="text-xs font-semibold text-gray-700">
                        {t("analytics.variance")}
                    </p>
                    <p
                        className={`text-xl font-bold ${effectiveVariance >= 0 ? "text-green-900" : "text-red-900"}`}
                    >
                        {effectiveVariance >= 0 ? "+" : ""}
                        {formatRupiah(effectiveVariance)}
                    </p>
                </div>
            )}
        </div>
    );

    const expensesSection = expenses.length > 0 && (
        <div className="bg-white rounded-2xl p-3 space-y-2">
            <h4 className="text-sm font-semibold text-gray-800">
                {t("daily.expenses")}
            </h4>
            <div className="bg-red-100 p-2 rounded-xl space-y-1">
                {expenses.map((expense) => (
                    <div
                        key={expense.id}
                        className="flex justify-between text-sm"
                    >
                        <span className="text-red-800">{expense.type}</span>
                        <span className="font-bold text-red-800">
                            -{formatRupiah(expense.amount)}
                        </span>
                    </div>
                ))}
                <div className="border-t border-red-300 pt-1 flex justify-between text-sm font-semibold">
                    <span className="text-red-800">{t("manage.total")}</span>
                    <span className="text-red-800">
                        -{formatRupiah(summary.totalExpenses)}
                    </span>
                </div>
            </div>
        </div>
    );

    const sessionsSection = sessions.length > 0 && (
        <div className="bg-white rounded-2xl p-3 space-y-2">
            <h4 className="text-sm font-semibold text-gray-800">
                {t("daily.whoWorked")}
            </h4>
            <div className="flex flex-wrap gap-1.5">
                {sessions.map((s) => (
                    <div
                        key={s.userId}
                        className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5 pr-3.5 w-full"
                    >
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
                        <p className="text-base font-bold text-gray-900 truncate">
                            {s.userName ?? t("common.unknown")}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );

    const notesSection = summary.notes && (
        <div className="bg-white rounded-2xl p-3 space-y-1">
            <h4 className="text-sm font-semibold text-gray-800">
                {t("analytics.notes")}
            </h4>
            <p className="text-sm text-gray-700 bg-slate-100 p-2.5 rounded-xl">
                {summary.notes}
            </p>
        </div>
    );

    const photosSection = hasPhotos && (
        <div className="bg-white rounded-2xl p-3 space-y-4">
            <h4 className="text-sm font-semibold text-gray-800">
                {t("daily.photos")}
            </h4>

            {openingPhoto && (
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {t("daily.photoOpening")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-xl overflow-hidden">
                            <div className="aspect-square">
                                <SummaryPhotoThumbnail
                                    url={openingPhoto.url}
                                    alt={t("daily.photoOpening")}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {closingPhotos.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {t("daily.photoClosing")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {PHOTO_SLOTS.map((slot) => {
                            const photo = closingPhotos.find(
                                (p) => p.type === slot.type,
                            );
                            if (!photo) return null;
                            return (
                                <div
                                    key={slot.type}
                                    className="bg-slate-50 rounded-xl overflow-hidden"
                                >
                                    <div className="aspect-square">
                                        <SummaryPhotoThumbnail
                                            url={photo.url}
                                            alt={slot.label}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xs font-semibold text-gray-800">
                                            {slot.label}
                                        </p>
                                        {photo.quantity && (
                                            <p className="text-xs text-gray-500">
                                                {photo.quantity.value}{" "}
                                                {photo.quantity.unit}
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

    const breakdownSection = (
        <div className="bg-white rounded-2xl p-3 space-y-2">
            <h4 className="text-sm font-semibold text-gray-800">
                {t("daily.breakdown")}
            </h4>
            {Object.keys(breakdown).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                    {t("daily.noBreakdown")}
                </p>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(breakdown)
                        .sort(([, a], [, b]) => b.quantity - a.quantity)
                        .map(([productName, data]) => (
                            <div
                                key={productName}
                                className="bg-slate-100 p-2.5 rounded-xl"
                            >
                                <p className="font-semibold text-gray-800 text-sm truncate">
                                    {productName}
                                </p>
                                <p className="font-bold text-gray-800">
                                    {data.quantity} {t("analytics.cups")}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {formatRupiah(data.revenue)}
                                </p>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );

    const confirmationSection = showConfirmation && (
        <button
            onClick={() => onConfirmChange?.(!confirmed)}
            className="flex items-center gap-3 p-4 rounded-2xl w-full text-left bg-white"
        >
            <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    confirmed ? "bg-brand border-brand" : "border-gray-300"
                }`}
            >
                {confirmed && <Check size={14} className="text-white" />}
            </div>
            <p className="text-xs font-semibold text-gray-700">
                {t("manage.confirmSummary")}
            </p>
        </button>
    );

    return (
        <div className={`space-y-4 ${showConfirmation ? "pb-4" : "pb-24"}`}>
            {headerSection}
            {showConfirmation ? (
                <>
                    {cashInputSection}
                    {expensesSection}
                    {financialsSection}
                </>
            ) : (
                <>
                    {financialsSection}
                    {expensesSection}
                </>
            )}
            {sessionsSection}
            {notesSection}
            {photosSection}
            {breakdownSection}
            {confirmationSection}
            <div className="h-4" />
        </div>
    );
}
