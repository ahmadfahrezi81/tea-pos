import useSWR from "swr";
import { StoreListResponse } from "@/lib/shared/schemas/stores";

const fetchStores = async (): Promise<StoreListResponse> => {
    const res = await fetch("/api/stores");

    if (!res.ok) {
        let errMsg = `Failed to fetch stores: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {}
        throw new Error(errMsg);
    }

    const json = await res.json();
    const parsed = StoreListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "Invalid stores response on client:",
            parsed.error.format(),
        );
        return { stores: [], users: [], assignments: {} };
    }

    return parsed.data;
};

/**
 * Fetch all stores for the current tenant.
 * Client-side filtering is handled by the consumer (e.g. StoreContext).
 */
export function useStores() {
    return useSWR("stores-all", fetchStores, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });
}
