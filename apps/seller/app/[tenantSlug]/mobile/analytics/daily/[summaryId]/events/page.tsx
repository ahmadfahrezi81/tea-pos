"use client";

import { useSearchParams } from "next/navigation";
import { useStoreActivityLogs } from "@/lib/hooks/activity-logs/useStoreActivityLogs";
import { EVENT_COLOR, EVENT_LABEL, formatEventTime } from "@/lib/constants/activity-log-events";

export default function EventsPage() {
    const searchParams = useSearchParams();

    const storeId = searchParams.get("storeId") ?? undefined;
    const date = searchParams.get("date") ?? undefined;

    const { events, isLoading } = useStoreActivityLogs(storeId, date);

    return (
        <div className="flex flex-col gap-4 pb-24">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 text-sm">No events recorded for this day.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {events.map((event) => (
                            <li key={event.id} className="flex items-center gap-3 px-4 py-3.5">
                                <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${EVENT_COLOR[event.type] ?? "bg-gray-400"}`}
                                />
                                <span className="flex-1 text-sm font-medium text-gray-800">
                                    {EVENT_LABEL[event.type] ?? event.type}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">
                                    {formatEventTime(event.createdAt)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
