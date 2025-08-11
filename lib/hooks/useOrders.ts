import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const fetchOrders = async () => {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile) return [];

    if (profile.role === "seller") {
        const { data: assignments } = await supabase
            .from("user_store_assignments")
            .select("store_id")
            .eq("user_id", user.id);

        const storeIds = assignments?.map((a) => a.store_id) || [];
        if (storeIds.length === 0) return [];

        const { data } = await supabase
            .from("orders")
            .select(
                `
        *,
        stores(name),
        profiles(full_name),
        order_items(*, products(name))
      `
            )
            .in("store_id", storeIds)
            .order("created_at", { ascending: false });

        return data || [];
    }

    // Manager case
    const { data } = await supabase
        .from("orders")
        .select(
            `
      *,
      stores(name),
      profiles(full_name),
      order_items(*, products(name))
    `
        )
        .order("created_at", { ascending: false });

    return data || [];
};

export default function useOrders() {
    return useSWR("orders", fetchOrders);
}
