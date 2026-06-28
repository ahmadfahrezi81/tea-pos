"use client";

import { useParams } from "next/navigation";
import { useDayActivity } from "@/lib/hooks/activity-logs/useStoreActivityLogs";
import {
    EVENT_COLOR,
    EVENT_ICON,
    EVENT_LABEL,
    formatEventTime,
} from "@/lib/constants/activity-log-events";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { SummaryPhotoThumbnail } from "@/app/[tenantSlug]/mobile/home/manage/_components/daily/SummaryPhotoThumbnail";
import type { EventSegment } from "@tea-pos/features/activity-logs/schema";
import { useT } from "@/lib/hooks/useT";

// ─── Shared timeline row ──────────────────────────────────────────────────────

function TimelineRow({
    indicator,
    isLast,
    children,
}: {
    indicator: React.ReactNode;
    isLast: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-[2rem_1fr] gap-x-3">
            <div className="flex flex-col items-center pt-0.5">
                {indicator}
                {!isLast && (
                    <div className="w-px flex-1 border-l-2 border-dashed border-gray-200 mt-1" />
                )}
            </div>
            <div>{children}</div>
        </div>
    );
}

// ─── Compact row for order_created ───────────────────────────────────────────

function OrderRow({
    segment,
    isLast,
}: {
    segment: EventSegment;
    isLast: boolean;
}) {
    const t = useT();
    const amount =
        typeof segment.metadata?.total_amount === "number"
            ? (segment.metadata.total_amount as number)
            : null;
    const cups =
        typeof segment.metadata?.total_cups === "number"
            ? (segment.metadata.total_cups as number)
            : null;
    const method =
        typeof segment.metadata?.payment_method === "string"
            ? (segment.metadata.payment_method as string)
            : null;

    return (
        <TimelineRow
            isLast={isLast}
            indicator={
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                </div>
            }
        >
            <div className="flex items-center justify-between flex-1 py-2 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {amount !== null && (
                        <span className="text-sm font-bold text-gray-800">
                            {formatRupiah(amount)}
                        </span>
                    )}
                    {cups !== null && (
                        <span className="text-xs text-gray-400">
                            {cups} {t("orders.cups")}
                        </span>
                    )}
                    {method && (
                        <span className="text-xs bg-slate-100 text-gray-500 px-1.5 py-0.5 rounded-md capitalize">
                            {method}
                        </span>
                    )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                    {formatEventTime(segment.createdAt)}
                </span>
            </div>
        </TimelineRow>
    );
}

// ─── Full card for significant events ────────────────────────────────────────

function EventNode({
    segment,
    isLast,
}: {
    segment: EventSegment;
    isLast: boolean;
}) {
    const t = useT();
    const Icon = EVENT_ICON[segment.type];
    const colorClass = EVENT_COLOR[segment.type] ?? "bg-gray-400";
    const label = EVENT_LABEL[segment.type] ?? segment.type;

    const metaAmount =
        typeof segment.metadata?.amount === "number"
            ? (segment.metadata.amount as number)
            : null;
    const metaType =
        typeof segment.metadata?.type === "string"
            ? (segment.metadata.type as string)
            : null;
    const openingBalance =
        typeof segment.metadata?.opening_balance === "number"
            ? (segment.metadata.opening_balance as number)
            : null;
    const totalSales =
        typeof segment.metadata?.total_sales === "number"
            ? (segment.metadata.total_sales as number)
            : null;
    const variance =
        typeof segment.metadata?.variance === "number"
            ? (segment.metadata.variance as number)
            : null;
    const photoUrl =
        typeof segment.metadata?.photo_url === "string"
            ? (segment.metadata.photo_url as string)
            : null;
    const photoSlot =
        typeof segment.metadata?.slot === "string"
            ? (segment.metadata.slot as string)
            : undefined;

    return (
        <TimelineRow
            isLast={isLast}
            indicator={
                <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
                >
                    {Icon && (
                        <Icon
                            size={16}
                            strokeWidth={2.5}
                            className="text-white"
                        />
                    )}
                </div>
            }
        >
            <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="font-semibold text-gray-800 text-sm">
                        {label}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">
                        {formatEventTime(segment.createdAt)}
                    </span>
                </div>
                <p className="text-xs text-gray-500">{segment.userName}</p>

                {(metaAmount !== null || metaType) && (
                    <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center justify-between">
                        {metaType && (
                            <span className="text-sm text-gray-600">
                                {metaType}
                            </span>
                        )}
                        {metaAmount !== null && (
                            <span className="text-sm font-bold text-orange-600">
                                {formatRupiah(metaAmount)}
                            </span>
                        )}
                    </div>
                )}

                {openingBalance !== null && (
                    <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            {t("analytics.openingBalance")}
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                            {formatRupiah(openingBalance)}
                        </span>
                    </div>
                )}

                {totalSales !== null && (
                    <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            {t("analytics.totalSales")}
                        </span>
                        <span className="text-sm font-bold text-green-600">
                            {formatRupiah(totalSales)}
                        </span>
                    </div>
                )}

                {variance !== null && (
                    <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            {t("analytics.variance")}
                        </span>
                        <span className={`text-sm font-bold ${variance >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {variance >= 0 ? "+" : ""}{formatRupiah(variance)}
                        </span>
                    </div>
                )}

                {photoUrl && (
                    <SummaryPhotoThumbnail
                        url={photoUrl}
                        alt={photoSlot ?? "photo"}
                        className="w-16 h-16"
                        isSaved={false}
                    />
                )}
            </div>
        </TimelineRow>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EventsPage() {
    const { summaryId } = useParams<{ summaryId: string }>();
    const { segments, isLoading } = useDayActivity(summaryId);
    const t = useT();

    return (
        <div className="flex flex-col gap-3 pb-24">
            {isLoading ? (
                <>
                    <div className="bg-white rounded-2xl p-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 flex flex-col items-center shrink-0">
                                    <div className="w-8 h-8 rounded-xl bg-gray-200 shrink-0" />
                                    <div className="w-px h-10 border-l-2 border-dashed border-gray-200 mt-1" />
                                </div>
                                <div className="flex-1 mb-3 space-y-2 pt-1 animate-pulse">
                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                    <div className="h-3 w-20 bg-gray-100 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : segments.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">
                        {t("daily.noActivity")}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-3">
                        {segments.map((segment, i) =>
                            segment.type === "order_created" ? (
                                <OrderRow
                                    key={segment.id}
                                    segment={segment}
                                    isLast={i === segments.length - 1}
                                />
                            ) : (
                                <EventNode
                                    key={segment.id}
                                    segment={segment}
                                    isLast={i === segments.length - 1}
                                />
                            ),
                        )}
                </div>
            )}
        </div>
    );
}
