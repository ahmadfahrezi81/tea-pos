import useSWR from "swr";

const fetchPhotoCount = async (url: string): Promise<number> => {
    const res = await fetch(url);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
            body?.error ?? `Failed to fetch photo count: ${res.status}`,
        );
    }
    const json = await res.json();
    return json.count as number;
};

export const useSummaryPhotoCount = (summaryId?: string | null) => {
    const key = summaryId
        ? `/api/summaries/photo/count?dailySummaryId=${summaryId}`
        : null;

    const { data, error, mutate } = useSWR<number>(key, fetchPhotoCount, {
        revalidateOnFocus: false,
        revalidateOnMount: true,
        revalidateIfStale: false,
        dedupingInterval: 5_000,
    });

    return {
        count: data ?? 0,
        isLoading: !data && !error,
        error,
        mutate,
    };
};
