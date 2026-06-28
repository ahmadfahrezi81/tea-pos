import useSWR from "swr";
import { summariesApi } from "@/lib/api/summaries";

export function useSummaryUsers(summaryId: string | null) {
    return useSWR(
        summaryId ? ["summary-users", summaryId] : null,
        () => summariesApi.getUsers(summaryId!),
        { dedupingInterval: 30000, revalidateOnFocus: false },
    );
}
