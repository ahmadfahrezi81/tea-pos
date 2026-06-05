import useSWR from "swr";
import { summariesApi } from "@/lib/api/summaries";

export const useSummaryPhotoCount = (summaryId?: string | null) => {
    const key = summaryId ? `summary-photo-count-${summaryId}` : null;

    const { data, error, mutate } = useSWR<number>(
        key,
        () => summariesApi.getPhotoCount(summaryId!).then((r) => r.count),
        {
            revalidateOnFocus: false,
            revalidateOnMount: true,
            revalidateIfStale: false,
            dedupingInterval: 60_000,
        },
    );

    return {
        count: data ?? 0,
        isLoading: !data && !error,
        error,
        mutate,
    };
};
