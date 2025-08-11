import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

async function fetchStoresData() {
    // Load stores
    const { data: storesData } = await supabase
        .from("stores")
        .select("*")
        .order("name");

    // Load sellers
    const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "seller")
        .order("full_name");

    // Load store assignments
    const { data: assignmentsData } = await supabase
        .from("user_store_assignments")
        .select("user_id, store_id");

    const assignmentsByStore: Record<string, string[]> = {};
    assignmentsData?.forEach((a) => {
        if (!assignmentsByStore[a.store_id]) {
            assignmentsByStore[a.store_id] = [];
        }
        assignmentsByStore[a.store_id].push(a.user_id);
    });

    return {
        stores: storesData || [],
        users: usersData || [],
        assignments: assignmentsByStore,
    };
}

export default function useStoresData() {
    return useSWR("stores-data", fetchStoresData);
}
