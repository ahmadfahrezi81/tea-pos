// // lib/hooks/useUserStores.ts
// import useSWR from "swr";
// import { createClient } from "@/lib/supabase/client";
// import { Tables } from "@/lib/db.types";

// type Store = Tables<"stores">;
// type Assignment = Tables<"user_store_assignments">;

// interface UserStoresData {
//     stores: Store[];
//     defaultStore: Store | null;
//     assignments: Record<string, Assignment[]>;
// }

// const fetchUserStores = async (): Promise<UserStoresData> => {
//     const supabase = createClient();

//     const {
//         data: { user },
//     } = await supabase.auth.getUser();
//     if (!user) return { stores: [], defaultStore: null, assignments: {} };

//     const { data: profile } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", user.id)
//         .single();

//     if (!profile) return { stores: [], defaultStore: null, assignments: {} };

//     // Fetch user's store assignments
//     const { data: assignments } = await supabase
//         .from("user_store_assignments")
//         .select("*, stores(*)")
//         .eq("user_id", user.id);

//     if (!assignments || assignments.length === 0) {
//         return { stores: [], defaultStore: null, assignments: {} };
//     }

//     // // Extract stores from assignments
//     // const stores = assignments
//     //     .map((a) => a.stores)
//     //     .filter((store): store is Store => store !== null);

//     // Extract unique stores from assignments
//     const storesMap = new Map<string, Store>();
//     assignments.forEach((a) => {
//         if (a.stores) {
//             storesMap.set(a.stores.id, a.stores as Store);
//         }
//     });
//     const stores = Array.from(storesMap.values());

//     // Find default store
//     const defaultAssignment = assignments.find((a) => a.is_default);
//     const defaultStore = defaultAssignment?.stores as Store | null;

//     // Group assignments by store_id
//     const assignmentsByStore = assignments.reduce((acc, assignment) => {
//         const storeId = assignment.store_id;
//         if (!acc[storeId]) acc[storeId] = [];
//         acc[storeId].push(assignment);
//         return acc;
//     }, {} as Record<string, Assignment[]>);

//     return {
//         stores,
//         defaultStore,
//         assignments: assignmentsByStore,
//     };
// };

// export default function useUserStores() {
//     return useSWR<UserStoresData>("user-stores", fetchUserStores, {
//         revalidateOnFocus: false,
//         dedupingInterval: 60000, // Cache for 1 minute
//     });
// }

// lib/hooks/useUserStores.ts
import useSWR from "swr";
import { StoreListResponse, Store } from "@/lib/schemas/stores";

interface UserStoresData {
    stores: Store[];
    defaultStore: Store | null;
}

const fetchUserStores = async (
    userId: string | null
): Promise<UserStoresData> => {
    if (!userId) return { stores: [], defaultStore: null };

    const params = new URLSearchParams();
    params.append("userId", userId);

    const res = await fetch(`/api/stores?${params.toString()}`);
    if (!res.ok) {
        let errMsg = `Failed to fetch user stores: ${res.status}`;
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
            "Invalid user stores response on client:",
            parsed.error.format()
        );
        return { stores: [], defaultStore: null };
    }

    const { stores, assignments } = parsed.data;

    // Find default store from assignments
    let defaultStore: Store | null = null;
    for (const [storeId, storeAssignments] of Object.entries(assignments)) {
        const hasDefault = storeAssignments.some((a) => a.isDefault);
        if (hasDefault) {
            defaultStore = stores.find((s) => s.id === storeId) || null;
            break;
        }
    }

    return {
        stores,
        defaultStore,
    };
};

export default function useUserStores(userId: string | null) {
    const key = userId ? `user-stores-${userId}` : null;

    return useSWR<UserStoresData>(key, () => fetchUserStores(userId), {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // Cache for 1 minute
    });
}
