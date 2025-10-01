// // lib/hooks/useStoreOrders.ts
// import useSWR from "swr";
// import { createClient } from "@/lib/supabase/client";
// import { Tables } from "@/lib/db.types";

// type Order = Tables<"orders"> & {
//     stores: { name: string } | null;
//     profiles: { full_name: string } | null;
//     order_items: Array<
//         Tables<"order_items"> & {
//             products: { name: string } | null;
//         }
//     >;
// };

// interface UseStoreOrdersParams {
//     storeId: string | null;
//     date: string; // Format: YYYY-MM-DD
// }

// const fetchStoreOrders = async ({
//     storeId,
//     date,
// }: UseStoreOrdersParams): Promise<Order[]> => {
//     if (!storeId) return [];

//     const supabase = createClient();

//     // Parse the date to get start and end of day in UTC
//     const startOfDay = `${date}T00:00:00Z`;
//     const endOfDay = `${date}T23:59:59Z`;

//     const { data, error } = await supabase
//         .from("orders")
//         .select(
//             `
//       *,
//       stores(name),
//       profiles(full_name),
//       order_items(*, products(name))
//     `
//         )
//         .eq("store_id", storeId)
//         .gte("created_at", startOfDay)
//         .lte("created_at", endOfDay)
//         .order("created_at", { ascending: false });

//     if (error) {
//         console.error("Error fetching orders:", error);
//         return [];
//     }

//     return (data as Order[]) || [];
// };

// export default function useStoreOrders(storeId: string | null, date: string) {
//     // Create a unique key that includes both storeId and date
//     const key = storeId && date ? `orders-${storeId}-${date}` : null;

//     return useSWR<Order[]>(key, () => fetchStoreOrders({ storeId, date }), {
//         revalidateOnFocus: false,
//         dedupingInterval: 30000, // Cache for 30 seconds
//     });
// }
// lib/hooks/orders/useStoreOrders.ts
import useSWR from "swr";
import { Order, OrderListResponse } from "@/lib/schemas/orders";

interface UseStoreOrdersParams {
    storeId: string | null;
    date: string; // Format: YYYY-MM-DD
}

const fetchStoreOrders = async ({
    storeId,
    date,
}: UseStoreOrdersParams): Promise<Order[]> => {
    if (!storeId) return [];

    const params = new URLSearchParams();
    params.append("storeId", storeId);
    if (date) params.append("date", date);

    const res = await fetch(`/api/orders?${params.toString()}`);
    if (!res.ok) {
        let errMsg = `Failed to fetch orders: ${res.status}`;
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
    const parsed = OrderListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "Invalid orders response on client:",
            parsed.error.format()
        );
        return [];
    }

    return parsed.data.orders;
};

export default function useStoreOrders(storeId: string | null, date: string) {
    const key = storeId && date ? `orders-${storeId}-${date}` : null;

    return useSWR<Order[]>(key, () => fetchStoreOrders({ storeId, date }), {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });
}
