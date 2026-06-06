"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useSessionsBySummary } from "@/lib/hooks/sessions/useSessionsBySummary";
import type { SessionDetailItem } from "@tea-pos/features/sessions/schema";
import { UserCircle, ArrowRightLeft } from "lucide-react";

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
    });
}

function formatDuration(startedAt: string, endedAt: string | null): string {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

function SessionCard({
    session,
    previousUserName,
}: {
    session: SessionDetailItem;
    previousUserName: string | null;
}) {
    return (
        <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    {session.userAvatarUrl ? (
                        <Image
                            src={session.userAvatarUrl}
                            alt={session.userName ?? ""}
                            width={36}
                            height={36}
                            className="rounded-xl object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                            <UserCircle size={20} className="text-brand" />
                        </div>
                    )}
                    <p className="font-bold text-gray-900">{session.userName ?? "Unknown"}</p>
                </div>
                <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        session.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                    }`}
                >
                    {session.status === "active" ? "Active" : "Ended"}
                </span>
            </div>

            <div className="bg-slate-100 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <div className="text-sm">
                    <span className="font-semibold text-gray-800">{formatTime(session.startedAt)}</span>
                    <span className="text-gray-400 mx-1.5">→</span>
                    <span className="font-semibold text-gray-800">
                        {session.endedAt ? formatTime(session.endedAt) : "now"}
                    </span>
                </div>
                <span className="text-sm font-bold text-brand">
                    {formatDuration(session.startedAt, session.endedAt)}
                </span>
            </div>

            {previousUserName && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ArrowRightLeft size={12} className="shrink-0" />
                    <span>Taken over from <span className="font-semibold text-gray-700">{previousUserName}</span></span>
                </div>
            )}
        </div>
    );
}

export default function SessionsPage() {
    const { summaryId } = useParams<{ summaryId: string }>();
    const { data, isLoading } = useSessionsBySummary(summaryId);

    const sessions: SessionDetailItem[] = data?.sessions ?? [];
    const uniqueUsers = new Set(sessions.map((s) => s.userId)).size;
    const idToName = new Map<string, string | null>(
        sessions.map((s) => [s.id, s.userName] as [string, string | null]),
    );

    return (
        <div className="flex flex-col gap-3 pb-24">
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 animate-pulse space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
                                <div className="h-4 w-28 bg-gray-200 rounded" />
                            </div>
                            <div className="h-10 bg-gray-100 rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">No sessions recorded for this day.</p>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-4 text-sm">
                        <div>
                            <span className="font-bold text-gray-900">{sessions.length}</span>
                            <span className="text-gray-500 ml-1">{sessions.length === 1 ? "session" : "sessions"}</span>
                        </div>
                        <div className="w-px h-4 bg-gray-200" />
                        <div>
                            <span className="font-bold text-gray-900">{uniqueUsers}</span>
                            <span className="text-gray-500 ml-1">{uniqueUsers === 1 ? "person" : "people"}</span>
                        </div>
                    </div>

                    {sessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            previousUserName={
                                session.previousSessionId
                                    ? (idToName.get(session.previousSessionId) ?? null)
                                    : null
                            }
                        />
                    ))}
                </>
            )}
        </div>
    );
}
