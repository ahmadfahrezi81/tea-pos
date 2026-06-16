"use client";

import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";

export function useSessionActivityByMonth(month: string) {
    const { data, isLoading } = useSWR(
        ["session-activity-by-month", month],
        () => sessionsApi.getActivityByMonth(month),
        { revalidateOnFocus: false, dedupingInterval: 60_000 },
    );

    return { dates: data?.dates ?? [], isLoading };
}
