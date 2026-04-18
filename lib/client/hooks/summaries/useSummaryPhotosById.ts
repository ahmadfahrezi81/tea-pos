// lib/hooks/summaries/useSummaryPhotosById.ts
import useSWR from "swr";
import { ListSummaryPhotosResponse } from "@/lib/shared/schemas/daily-summary-photos";

const fetchPhotos = async (url: string): Promise<ListSummaryPhotosResponse> => {
    const res = await fetch(url);
    if (!res.ok) {
        let errMsg = `Failed to fetch photos: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore
        }
        throw new Error(errMsg);
    }

    const json = await res.json();
    const parsed = ListSummaryPhotosResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "[useSummaryPhotosById] Invalid response:",
            parsed.error.format(),
        );
        throw new Error("Invalid photos response shape");
    }

    return parsed.data;
};

export const useSummaryPhotosById = (summaryId?: string | null) => {
    const key = summaryId
        ? `/api/summaries/photo?dailySummaryId=${summaryId}`
        : null;

    const { data, error, mutate } = useSWR<ListSummaryPhotosResponse>(
        key,
        fetchPhotos,
        {
            revalidateOnFocus: false,
            revalidateOnMount: true,
            revalidateIfStale: false,
            dedupingInterval: 5_000,
        },
    );

    return {
        photos: data?.photos ?? [],
        isLoading: !data && !error,
        error,
        mutate,
    };
};
