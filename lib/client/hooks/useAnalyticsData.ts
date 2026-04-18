// // hooks/useAnalyticsData.ts
// import useSWR from "swr";
// import { createClient } from "@/lib/client/supabase";

// export interface Store {
//     id: string;
//     name: string;
// }
// export interface Seller {
//     id: string;
//     full_name: string;
// }

// const supabase = createClient();

// const fetchAnalyticsData = async (storeId?: string, date?: string) => {
//     const storesPromise = supabase
//         .from("stores")
//         .select("id, name")
//         .order("name");
//     const sellersPromise = supabase
//         .from("profiles")
//         .select("id, full_name")
//         .eq("role", "seller")
//         .order("full_name");

//     let summaries = [];
//     if (storeId && date) {
//         const selected = new Date(date);
//         const start = new Date(selected);
//         start.setDate(selected.getDate() - 7);

//         const { data } = await supabase
//             .from("daily_summaries")
//             .select(
//                 `
//         *,
//         stores(name),
//         manager:profiles!daily_summaries_manager_id_fkey(full_name),
//         seller:profiles!daily_summaries_seller_id_fkey(full_name)
//       `
//             )
//             .eq("store_id", storeId)
//             .gte("date", start.toISOString().split("T")[0])
//             .lte("date", date)
//             .order("date", { ascending: false });
//         summaries = data || [];
//     }

//     const [storesRes, sellersRes] = await Promise.all([
//         storesPromise,
//         sellersPromise,
//     ]);
//     return {
//         stores: storesRes.data || [],
//         sellers: sellersRes.data || [],
//         summaries,
//     };
// };

// export const useAnalyticsData = (storeId?: string, date?: string) => {
//     const { data, error, mutate } = useSWR(
//         ["analyticsData", storeId, date],
//         () => fetchAnalyticsData(storeId, date)
//     );

//     return {
//         ...data,
//         isLoading: !data && !error,
//         error,
//         mutate,
//     };
// };
