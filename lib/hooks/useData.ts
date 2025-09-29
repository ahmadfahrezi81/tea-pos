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
import { useAuth } from "@/lib/context/AuthContext";

async function fetchStores(userId: string) {
    const res = await fetch(`/api/store?user_id=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch stores data");
    return res.json();
}

export function useStores() {
    const { profile } = useAuth();
    return useSWR(
        profile ? ["stores", profile.id] : null, // null disables fetch
        () => fetchStores(profile.id)
    );
}
