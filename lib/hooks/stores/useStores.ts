// lib/hooks/useStores.ts
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { StoreListResponse } from "@/lib/schemas/stores";

interface FetchStoresParams {
    userId: string;
}

const fetchStores = async ({ userId }: FetchStoresParams) => {
    const params = new URLSearchParams();
    params.append("userId", userId);

    const res = await fetch(`/api/stores?${params.toString()}`);
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

    // ✅ validate client-side (optional, since backend already validates)
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

export function useStores() {
    const { profile } = useAuth();
    const key = profile ? `stores-${profile.id}` : null;

    return useSWR(key, () => fetchStores({ userId: profile.id }), {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });
}
