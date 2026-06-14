"use client";
import Image from "next/image";
import { UserCircle } from "lucide-react";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { PHOTO_SLOTS } from "@tea-pos/features/shared/photo-slots";
import { SummaryPhotoThumbnail } from "@/app/[tenantSlug]/mobile/home/manage/_components/daily/SummaryPhotoThumbnail";
import CopyableField from "@/components/shared/CopyableField";
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

export function DaySummaryDetails({
    summary,
    breakdown,
    photos,
    expenses,
    sessions,
    dateLabel,
}: {
    summary: SummaryShape;
    breakdown: Record<string, { quantity: number; revenue: number }>;
    photos: PhotoShape[];
    expenses: ExpenseShape[];
    sessions: SessionUser[];
    dateLabel: string;
}) {
    const t = useT();

    const openingPhoto = photos.find((p) => p.type === "opening");
    const closingPhotos = photos.filter((p) => p.type.startsWith("closing:"));
    const hasPhotos = !!openingPhoto || closingPhotos.length > 0;

    return (
        <div className="space-y-4 pb-24">

            {/* ① Header */}
            <div className="bg-white rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xl text-gray-800 leading-tight">{dateLabel}</h3>
                    {summary.closedAt ? (
                        <span className="shrink-0 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-sm font-medium">{t("analytics.statusClosed")}</span>
                    ) : (
                        <span className="shrink-0 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-sm font-medium">{t("analytics.statusOpen")}</span>
                    )}
                </div>
                <div className="text-sm space-y-1.5">
                    {summary.stores?.name && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">{t("daily.store")}</span>
                            <span className="font-medium text-gray-800">{summary.stores.name}</span>
                        </div>
                    )}
                    {summary.openedByUser?.fullName && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">{t("daily.openedBy")}</span>
                            <span className="font-medium text-gray-800">{summary.openedByUser.fullName}</span>
                        </div>
                    )}
                    {summary.closedAt && summary.closedByUser?.fullName && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">{t("daily.closedBy")}</span>
                            <span className="font-medium text-gray-800">{summary.closedByUser.fullName}</span>
                        </div>
                    )}
                    {summary.createdAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">{t("daily.openedAt")}</span>
                            <span className="font-medium text-gray-800">{formatTimestamp(summary.createdAt)}</span>
                        </div>
                    )}
                    {summary.closedAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">{t("daily.closedAt")}</span>
                            <span className="font-medium text-gray-800">{formatTimestamp(summary.closedAt)}</span>
                        </div>
                    )}
                    <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-gray-500">{t("daily.summaryId")}</span>
                        <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-gray-400">{summary.id.slice(0, 8)}…</span>
                            <CopyableField label={t("daily.summaryId")} value={summary.id} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ② Financials */}
            <div className="bg-white rounded-2xl p-4 space-y-4">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500">{t("analytics.totalSales")}</p>
                        <p className="text-3xl font-black text-green-600 leading-tight">{formatRupiah(summary.totalSales)}</p>
                    </div>
                    <div className="flex gap-5 pb-0.5">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-500">{t("analytics.orders")}</p>
                            <p className="text-2xl font-black text-blue-600 leading-tight">{summary.totalOrders}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-500">{t("analytics.cups")}</p>
                            <p className="text-2xl font-black text-orange-600 leading-tight">{summary.totalCups}</p>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100" />

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500">{t("analytics.openingBalance")}</p>
                        <p className="text-base font-extrabold text-blue-600">{formatRupiah(summary.openingBalance)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500">{t("analytics.openingPlusSales")}</p>
                        <p className="text-base font-extrabold text-purple-600">{formatRupiah(summary.openingBalance + summary.totalSales)}</p>
                    </div>
                </div>

                <hr className="border-gray-100" />

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500">{t("analytics.expectedCash")}</p>
                        <p className="text-base font-extrabold text-purple-600">{formatRupiah(summary.expectedCash)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500">{t("analytics.actualCash")}</p>
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
                            <p className="text-sm font-semibold text-gray-500">{t("analytics.variance")}</p>
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
                    <h4 className="text-sm font-semibold text-gray-800">{t("daily.whoWorked")}</h4>
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
                                <p className="text-base font-bold text-gray-900 truncate">{s.userName ?? t("common.unknown")}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ④ Product Breakdown */}
            <div className="bg-white rounded-2xl p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">{t("daily.breakdown")}</h4>
                {Object.keys(breakdown).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">{t("daily.noBreakdown")}</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(breakdown)
                            .sort(([, a], [, b]) => b.quantity - a.quantity)
                            .map(([productName, data]) => (
                                <div key={productName} className="bg-slate-100 p-2.5 rounded-xl">
                                    <p className="font-semibold text-gray-800 text-sm truncate">{productName}</p>
                                    <p className="font-bold text-gray-800">{data.quantity} {t("earnings.cups")}</p>
                                    <p className="text-sm text-gray-500">{formatRupiah(data.revenue)}</p>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* ⑤ Expenses */}
            {expenses.length > 0 && (
                <div className="bg-white rounded-2xl p-3 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">{t("daily.expenses")}</h4>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-2 space-y-1">
                        {expenses.map((expense) => (
                            <div key={expense.id} className="flex justify-between text-sm">
                                <span className="text-red-700">{expense.type}</span>
                                <span className="font-medium text-red-800">-{formatRupiah(expense.amount)}</span>
                            </div>
                        ))}
                        <div className="border-t border-red-300 pt-1 flex justify-between text-sm font-semibold">
                            <span className="text-red-700">{t("manage.total")}</span>
                            <span className="text-red-800">-{formatRupiah(summary.totalExpenses)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ⑥ Notes */}
            {summary.notes && (
                <div className="bg-white rounded-2xl p-3 space-y-1">
                    <h4 className="text-sm font-semibold text-gray-800">{t("analytics.notes")}</h4>
                    <p className="text-sm text-gray-700 bg-slate-100 p-2.5 rounded-xl">{summary.notes}</p>
                </div>
            )}

            {/* ⑦ Photos */}
            {hasPhotos && (
                <div className="bg-white rounded-2xl p-3 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-800">{t("daily.photos")}</h4>

                    {openingPhoto && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("daily.photoOpening")}</p>
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
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("daily.photoClosing")}</p>
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
