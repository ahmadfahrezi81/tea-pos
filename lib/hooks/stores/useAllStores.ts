// lib/hooks/stores/useAllStores.ts
import useSWR from "swr";
import { StoreListResponse } from "@/lib/schemas/stores";

const fetchAllStores = async (): Promise<StoreListResponse> => {
    const res = await fetch("/api/stores");
    if (!res.ok) {
        let errMsg = `Failed to fetch stores: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    // ✅ validate client-side
    const parsed = StoreListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "Invalid stores response on client:",
            parsed.error.format()
        );
        return { stores: [], users: [], assignments: {} };
    }

    return parsed.data;
};

/**
 * Hook to fetch ALL stores in the current tenant (admin view)
 * Does NOT filter by user assignments
 * Use this for admin pages like POS
 */
export function useAllStores() {
    return useSWR("all-stores", () => fetchAllStores(), {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });
}
