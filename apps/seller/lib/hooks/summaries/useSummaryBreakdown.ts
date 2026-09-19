// lib/hooks/summaries/useSummaryBreakdown.ts
import useSWR from "swr";
import { summariesApi } from "@/lib/api/summaries";

type ProductBreakdown = Record<string, { quantity: number; revenue: number }>;

export const useSummaryBreakdown = (summaryId?: string | null) => {
    const key = summaryId ? `summary-breakdown-${summaryId}` : null;

    /* No options. `revalidateOnMount: true` sat here with
       `revalidateIfStale: false`, and the pair cancelled out: SWR takes
       `revalidateOnMount` directly on first mount, so the second line was
       unreachable — and revalidating on mount is the default anyway, because
       `revalidateIfStale` defaults to true. Both lines described what the hook
       gets for free. See task 067. */
    const { data, error } = useSWR<ProductBreakdown>(
        key,
        () => summariesApi.getBreakdown(summaryId!).then((r) => r.breakdown),
    );

    return {
        breakdown: data ?? {},
        isLoading: !data && !error,
        error,
    };
};
