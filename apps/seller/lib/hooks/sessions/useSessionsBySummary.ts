import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";

export function useSessionsBySummary(summaryId: string | undefined) {
    return useSWR(
        summaryId ? ["sessions-by-summary", summaryId] : null,
        () => sessionsApi.getBySummary(summaryId!),
        { dedupingInterval: 30_000, revalidateOnFocus: false },
    );
}
