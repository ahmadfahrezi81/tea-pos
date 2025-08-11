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

// --- Stores ---
const fetchStores = async (role: string, userId: string) => {
    if (role === "manager") {
        const { data } = await supabase
            .from("stores")
            .select("*")
            .order("name");
        return data || [];
    } else {
        const { data: assignments } = await supabase
            .from("user_store_assignments")
            .select("store_id, stores(id, name)")
            .eq("user_id", userId);
        return assignments?.map((a) => a.stores).filter(Boolean) || [];
    }
};

export const useStores = (role: string, userId: string) => {
    const shouldFetch = !!role && !!userId;
    return useSWR(shouldFetch ? ["stores", role, userId] : null, () =>
        fetchStores(role, userId)
    );
};
