// // lib/hooks/useStores.ts
// import useSWR from "swr";
// import { createClient } from "@/lib/supabase/client";

// const supabase = createClient();

// async function fetchStoresData() {
//     // Load stores
//     const { data: storesData } = await supabase
//         .from("stores")
//         .select("*")
//         .order("name");

//     // Load sellers
//     const { data: usersData } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("role", "seller")
//         .order("full_name");

//     // Load store assignments
//     const { data: assignmentsData } = await supabase
//         .from("user_store_assignments")
//         .select("user_id, store_id");

//     const assignmentsByStore: Record<string, string[]> = {};
//     assignmentsData?.forEach((a) => {
//         if (!assignmentsByStore[a.store_id]) {
//             assignmentsByStore[a.store_id] = [];
//         }
//         assignmentsByStore[a.store_id].push(a.user_id);
//     });

//     return {
//         stores: storesData || [],
//         users: usersData || [],
//         assignments: assignmentsByStore,
//     };
// }

// export default function useStoresData() {
//     return useSWR("stores-data", fetchStoresData);
// }

import useSWR from "swr";

interface Store {
    id: string;
    name: string;
    address: string | null;
    created_at: string;
    updated_at?: string;
}

interface User {
    id: string;
    full_name: string;
    email: string;
}

interface Assignment {
    user_id: string;
    role: "seller" | "manager";
    is_default: boolean;
}

interface StoresData {
    stores: Store[];
    users: User[];
    assignments: Record<string, Assignment[]>;
}

// interface StoresData {
//     stores: Store[];
//     users: User[];
//     assignments: Record<string, Assignment[]>;
//     userRoles: Record<string, Assignment>; // Store ID -> User's assignment in that store
//     defaultStore?: Store;
// }

async function fetchStoresData(): Promise<StoresData> {
    const response = await fetch("/api/store");
    if (!response.ok) {
        throw new Error("Failed to fetch stores data");
    }
    return response.json();
}

export default function useStoresData() {
    return useSWR<StoresData>("stores-data", fetchStoresData);
}

// Hook for store CRUD operations
export function useStoreActions() {
    const createStore = async (name: string, address?: string) => {
        const response = await fetch("/api/store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, address }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create store");
        }

        return response.json();
    };

    const updateStore = async (id: string, name: string, address?: string) => {
        const response = await fetch("/api/store", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, name, address }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to update store");
        }

        return response.json();
    };

    const deleteStore = async (id: string) => {
        const response = await fetch(`/api/store?id=${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to delete store");
        }

        return response.json();
    };

    return { createStore, updateStore, deleteStore };
}

// Hook for assignment operations
export function useAssignmentActions() {
    const createAssignment = async (
        user_id: string,
        store_id: string,
        role: "seller" | "manager",
        is_default = false
    ) => {
        const response = await fetch("/api/store/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id, store_id, role, is_default }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create assignment");
        }

        return response.json();
    };

    const updateAssignment = async (
        user_id: string,
        store_id: string,
        role: "seller" | "manager",
        is_default: boolean
    ) => {
        const response = await fetch("/api/store/assignments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id, store_id, role, is_default }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to update assignment");
        }

        return response.json();
    };

    const deleteAssignment = async (
        user_id: string,
        store_id: string,
        role: "seller" | "manager"
    ) => {
        const response = await fetch(
            `/api/store/assignments?user_id=${user_id}&store_id=${store_id}&role=${role}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to delete assignment");
        }

        return response.json();
    };

    return { createAssignment, updateAssignment, deleteAssignment };
}
