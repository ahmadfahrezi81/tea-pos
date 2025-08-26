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

// // --- Stores ---
// const fetchStores = async (role: string, userId: string) => {
//     if (role === "manager") {
//         const { data } = await supabase
//             .from("stores")
//             .select("*")
//             .order("name");
//         return data || [];
//     } else {
//         const { data: assignments } = await supabase
//             .from("user_store_assignments")
//             .select("store_id, stores(id, name)")
//             .eq("user_id", userId);
//         return assignments?.map((a) => a.stores).filter(Boolean) || [];
//     }
// };

// export const useStores = (role: string, userId: string) => {
//     const shouldFetch = !!role && !!userId;
//     return useSWR(shouldFetch ? ["stores", role, userId] : null, () =>
//         fetchStores(role, userId)
//     );
// };

async function fetchStores(userId?: string) {
    const url = userId ? `/api/store?user_id=${userId}` : "/api/store";
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Failed to fetch stores data");
    }

    return response.json(); // { stores, users, assignments }
}

export function useStores(userId?: string) {
    return useSWR(userId ? ["stores", userId] : "stores", () =>
        fetchStores(userId)
    );
}

// interface Store {
//     id: string;
//     name: string;
//     address: string | null;
//     created_at: string;
//     updated_at?: string;
// }

// interface User {
//     id: string;
//     full_name: string;
//     email: string;
// }

// interface Assignment {
//     user_id: string;
//     role: "seller" | "manager";
//     is_default: boolean;
// }

// interface StoresData {
//     stores: Store[];
//     users: User[];
//     assignments: Record<string, Assignment[]>;
//     userRoles: Record<string, Assignment>; // Store ID -> User's assignment in that store
//     defaultStore?: Store;
// }

// async function fetchStoresData(userId: string): Promise<StoresData> {
//     const response = await fetch(`/api/store?userId=${userId}`);
//     if (!response.ok) {
//         throw new Error("Failed to fetch stores data");
//     }
//     return response.json();
// }

// export function useStores(userId: string) {
//     return useSWR<StoresData>(userId ? `stores-data-${userId}` : null, () =>
//         fetchStoresData(userId)
//     );
// }
