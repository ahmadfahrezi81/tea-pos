// lib/hooks/useStoreOrders.ts
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/db.types";

type Order = Tables<"orders"> & {
    stores: { name: string } | null;
    profiles: { full_name: string } | null;
    order_items: Array<
        Tables<"order_items"> & {
            products: { name: string } | null;
        }
    >;
};

interface UseStoreOrdersParams {
    storeId: string | null;
    date: string; // Format: YYYY-MM-DD
}

const fetchStoreOrders = async ({
    storeId,
    date,
}: UseStoreOrdersParams): Promise<Order[]> => {
    if (!storeId) return [];

    const supabase = createClient();

    // Parse the date to get start and end of day in UTC
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;

    const { data, error } = await supabase
        .from("orders")
        .select(
            `
      *,
      stores(name),
      profiles(full_name),
      order_items(*, products(name))
    `
        )
        .eq("store_id", storeId)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error);
        return [];
    }

    return (data as Order[]) || [];
};

export default function useStoreOrders(storeId: string | null, date: string) {
    // Create a unique key that includes both storeId and date
    const key = storeId && date ? `orders-${storeId}-${date}` : null;

    return useSWR<Order[]>(key, () => fetchStoreOrders({ storeId, date }), {
        revalidateOnFocus: false,
        dedupingInterval: 30000, // Cache for 30 seconds
    });
}
