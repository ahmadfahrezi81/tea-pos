// hooks/useData.ts
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

// Reuse Supabase client
const supabase = createClient();

// --- Profile ---
const fetchProfile = async () => {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
    if (error) throw error;
    return data;
};

export const useProfile = () => {
    return useSWR("profile", fetchProfile);
};

// --- Products (API Route Example) ---
const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const json = await res.json();
    return json.products || [];
};

export const useProducts = () => {
    return useSWR("products", fetchProducts);
};

// async function fetchStores(userId?: string) {
//     const url = userId ? `/api/store?user_id=${userId}` : "/api/store";
//     const response = await fetch(url);

//     if (!response.ok) {
//         throw new Error("Failed to fetch stores data");
//     }

//     return response.json(); // { stores, users, assignments }
// }

// export function useStores(userId?: string) {
//     return useSWR(userId ? ["stores", userId] : "stores", () =>
//         fetchStores(userId)
//     );
// }

// hooks/useStores.ts
// import useSWR from "swr";
// import { useAuth } from "@/lib/context/AuthContext";

// async function fetchStores(userId: string) {
//     const res = await fetch(`/api/store?user_id=${userId}`);
//     if (!res.ok) throw new Error("Failed to fetch stores data");
//     return res.json();
// }

// export function useStores() {
//     const { profile } = useAuth();
//     return useSWR(
//         profile ? ["stores", profile.id] : null, // null disables fetch
//         () => fetchStores(profile.id)
//     );
// }

// lib/hooks/useStores.ts
// import useSWR from "swr";
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

    return useSWR(
        key,
        async () => {
            if (!profile) return null;
            return fetchStores({ userId: profile.id });
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );
}
