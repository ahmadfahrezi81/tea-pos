// lib/hooks/summaries/useSummaryPhotosById.ts
import useSWR from "swr";
import { summariesApi } from "@/lib/api/summaries";
import type { ListSummaryPhotosResponse } from "@tea-pos/features/summaries/photos-schema";

export const useSummaryPhotosById = (summaryId?: string | null) => {
    const key = summaryId ? `summary-photos-${summaryId}` : null;

    /* No options. `revalidateOnMount: true` sat here with
       `revalidateIfStale: false`, and the pair cancelled out: SWR takes
       `revalidateOnMount` directly on first mount, so the second line was
       unreachable — and revalidating on mount is the default anyway, because
       `revalidateIfStale` defaults to true. Both lines described what the hook
       gets for free. See task 067. */
    const { data, error, mutate } = useSWR<ListSummaryPhotosResponse>(
        key,
        () => summariesApi.listPhotos({ dailySummaryId: summaryId! }),
    );

    return {
        photos: data?.photos ?? [],
        isLoading: !data && !error,
        error,
        mutate,
    };
};
