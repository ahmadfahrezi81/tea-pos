// lib/hooks/summaries/useSummaryPhotosById.ts
import useSWR from "swr";
import { summariesApi } from "@/lib/api/summaries";
import type { ListSummaryPhotosResponse } from "@tea-pos/features/summaries/photos-schema";

export const useSummaryPhotosById = (summaryId?: string | null) => {
    const key = summaryId ? `summary-photos-${summaryId}` : null;

    const { data, error, mutate } = useSWR<ListSummaryPhotosResponse>(
        key,
        () => summariesApi.listPhotos({ dailySummaryId: summaryId! }),
        {
            revalidateOnFocus: false,
            revalidateOnMount: true,
            revalidateIfStale: false,
            dedupingInterval: 30_000,
        },
    );

    return {
        photos: data?.photos ?? [],
        isLoading: !data && !error,
        error,
        mutate,
    };
};
