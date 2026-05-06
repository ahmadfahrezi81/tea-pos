// lib/hooks/summaries/useSummaryBreakdown.ts
import useSWR from "swr";
import { summariesApi } from "@/lib/api/summaries";

type ProductBreakdown = Record<string, { quantity: number; revenue: number }>;

export const useSummaryBreakdown = (summaryId?: string | null) => {
    const key = summaryId ? `summary-breakdown-${summaryId}` : null;

    const { data, error } = useSWR<ProductBreakdown>(
        key,
        () => summariesApi.getBreakdown(summaryId!).then((r) => r.breakdown),
        {
            revalidateOnFocus: false,
            revalidateOnMount: true,
            revalidateIfStale: false,
            dedupingInterval: 30_000,
        },
    );

    return {
        breakdown: data ?? {},
        isLoading: !data && !error,
        error,
    };
};
