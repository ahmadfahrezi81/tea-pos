// lib/hooks/summaries/useSummaryBreakdown.ts
import useSWR from "swr";

type ProductBreakdown = Record<string, { quantity: number; revenue: number }>;

const fetchBreakdown = async (url: string): Promise<ProductBreakdown> => {
    const res = await fetch(url);
    if (!res.ok) {
        let errMsg = `Failed to fetch breakdown: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore
        }
        throw new Error(errMsg);
    }

    const json = await res.json();
    return json.breakdown as ProductBreakdown;
};

export const useSummaryBreakdown = (summaryId?: string | null) => {
    const key = summaryId
        ? `/api/summaries/breakdown?summaryId=${summaryId}`
        : null;

    const { data, error } = useSWR<ProductBreakdown>(key, fetchBreakdown, {
        revalidateOnFocus: false,
        revalidateOnMount: true,
        revalidateIfStale: false,
        dedupingInterval: 30_000, // breakdown won't change often
    });

    return {
        breakdown: data ?? {},
        isLoading: !data && !error,
        error,
    };
};
