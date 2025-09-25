// // // // // app/dashboard/analytics/page.tsx
// // // // "use client";
// // // // import { useState } from "react";
// // // // import { createClient } from "@/lib/supabase/client";
// // // // import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";

// // // // interface DailySummary {
// // // //     id: string;
// // // //     store_id: string;
// // // //     seller_id: string;
// // // //     manager_id: string | null;
// // // //     date: string;
// // // //     opening_balance: number;
// // // //     total_sales: number;
// // // //     expected_cash: number;
// // // //     actual_cash: number | null;
// // // //     variance: number | null;
// // // //     closed_at: string | null;
// // // //     notes: string | null;
// // // //     created_at: string;
// // // //     stores?: { name: string };
// // // //     seller?: { full_name: string };
// // // // }

// // // // export default function AnalyticsPage() {
// // // //     const [selectedStore, setSelectedStore] = useState<string>("");
// // // //     const [selectedDate, setSelectedDate] = useState<string>(
// // // //         new Date().toISOString().split("T")[0]
// // // //     );
// // // //     const [showOpeningForm, setShowOpeningForm] = useState(false);
// // // //     const [showCloseForm, setShowCloseForm] = useState(false);
// // // //     const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(
// // // //         null
// // // //     );
// // // //     const [openingForm, setOpeningForm] = useState({
// // // //         store_id: "",
// // // //         seller_id: "",
// // // //         opening_balance: "",
// // // //         date: "",
// // // //     });
// // // //     const [closeForm, setCloseForm] = useState({
// // // //         actual_cash: "",
// // // //         notes: "",
// // // //     });
// // // //     const supabase = createClient();

// // // //     const {
// // // //         stores = [],
// // // //         sellers = [],
// // // //         summaries = [],
// // // //         isLoading,
// // // //         mutate,
// // // //     } = useAnalyticsData(selectedStore, selectedDate);

// // // //     const calculateTotalSales = async (storeId: string, date: string) => {
// // // //         const { data: orders } = await supabase
// // // //             .from("orders")
// // // //             .select("total_amount")
// // // //             .eq("store_id", storeId)
// // // //             .gte("created_at", `${date}T00:00:00`)
// // // //             .lt("created_at", `${date}T23:59:59`);

// // // //         return orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
// // // //     };

// // // //     const handleOpeningSubmit = async (e: React.FormEvent) => {
// // // //         e.preventDefault();

// // // //         try {
// // // //             const {
// // // //                 data: { user },
// // // //             } = await supabase.auth.getUser();
// // // //             if (!user) return;

// // // //             // Check if summary already exists for this store/date
// // // //             const { data: existing } = await supabase
// // // //                 .from("daily_summaries")
// // // //                 .select("id")
// // // //                 .eq("store_id", openingForm.store_id)
// // // //                 .eq("date", openingForm.date)
// // // //                 .single();

// // // //             if (existing) {
// // // //                 alert("Daily summary already exists for this store and date");
// // // //                 return;
// // // //             }

// // // //             const totalSales = await calculateTotalSales(
// // // //                 openingForm.store_id,
// // // //                 openingForm.date
// // // //             );
// // // //             const openingBalance = parseFloat(openingForm.opening_balance);
// // // //             const expectedCash = openingBalance + totalSales;

// // // //             const { error } = await supabase.from("daily_summaries").insert({
// // // //                 store_id: openingForm.store_id,
// // // //                 seller_id: openingForm.seller_id,
// // // //                 manager_id: user.id,
// // // //                 date: openingForm.date,
// // // //                 opening_balance: openingBalance,
// // // //                 total_sales: totalSales,
// // // //                 expected_cash: expectedCash,
// // // //             });

// // // //             if (error) throw error;

// // // //             setOpeningForm({
// // // //                 store_id: "",
// // // //                 seller_id: "",
// // // //                 opening_balance: "",
// // // //                 date: "",
// // // //             });
// // // //             setShowOpeningForm(false);
// // // //             mutate();
// // // //         } catch (error) {
// // // //             console.error("Error creating daily summary:", error);
// // // //             alert("Failed to create daily summary");
// // // //         }
// // // //     };

// // // //     const handleCloseDay = async (e: React.FormEvent) => {
// // // //         e.preventDefault();

// // // //         if (!selectedSummary) return;

// // // //         try {
// // // //             const actualCash = parseFloat(closeForm.actual_cash);
// // // //             const variance = actualCash - selectedSummary.expected_cash;

// // // //             const { error } = await supabase
// // // //                 .from("daily_summaries")
// // // //                 .update({
// // // //                     actual_cash: actualCash,
// // // //                     variance: variance,
// // // //                     notes: closeForm.notes || null,
// // // //                     closed_at: new Date().toISOString(),
// // // //                 })
// // // //                 .eq("id", selectedSummary.id);

// // // //             if (error) throw error;

// // // //             setCloseForm({ actual_cash: "", notes: "" });
// // // //             setShowCloseForm(false);
// // // //             setSelectedSummary(null);
// // // //             mutate();
// // // //         } catch (error) {
// // // //             console.error("Error closing day:", error);
// // // //             alert("Failed to close day");
// // // //         }
// // // //     };

// // // //     const refreshSales = async (summary: DailySummary) => {
// // // //         try {
// // // //             const totalSales = await calculateTotalSales(
// // // //                 summary.store_id,
// // // //                 summary.date
// // // //             );
// // // //             const expectedCash = summary.opening_balance + totalSales;

// // // //             const { error } = await supabase
// // // //                 .from("daily_summaries")
// // // //                 .update({
// // // //                     total_sales: totalSales,
// // // //                     expected_cash: expectedCash,
// // // //                 })
// // // //                 .eq("id", summary.id);

// // // //             if (error) throw error;

// // // //             mutate();
// // // //         } catch (error) {
// // // //             console.error("Error refreshing sales:", error);
// // // //             alert("Failed to refresh sales");
// // // //         }
// // // //     };

// // // //     // if (loading) return <div>Loading analytics...</div>;

// // // //     if (isLoading) return <div>Loading analytics...</div>;

// // // //     return (
// // // //         <div>
// // // //             <h1 className="text-3xl font-bold mb-8">Daily Analytics</h1>

// // // //             {/* Controls */}
// // // //             <div className="bg-white p-6 rounded-lg shadow mb-8">
// // // //                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
// // // //                     <div>
// // // //                         <label className="block text-sm font-medium mb-2">
// // // //                             Store
// // // //                         </label>
// // // //                         <select
// // // //                             value={selectedStore}
// // // //                             onChange={(e) => setSelectedStore(e.target.value)}
// // // //                             className="w-full p-2 border rounded"
// // // //                         >
// // // //                             <option value="">Select a store...</option>
// // // //                             {stores.map((store) => (
// // // //                                 <option key={store.id} value={store.id}>
// // // //                                     {store.name}
// // // //                                 </option>
// // // //                             ))}
// // // //                         </select>
// // // //                     </div>
// // // //                     <div>
// // // //                         <label className="block text-sm font-medium mb-2">
// // // //                             Date Range (Last 7 days from)
// // // //                         </label>
// // // //                         <input
// // // //                             type="date"
// // // //                             value={selectedDate}
// // // //                             onChange={(e) => setSelectedDate(e.target.value)}
// // // //                             className="w-full p-2 border rounded"
// // // //                         />
// // // //                     </div>
// // // //                     <div className="flex items-end">
// // // //                         <button
// // // //                             onClick={() => setShowOpeningForm(true)}
// // // //                             disabled={!selectedStore}
// // // //                             className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
// // // //                         >
// // // //                             Set Opening Balance
// // // //                         </button>
// // // //                     </div>
// // // //                 </div>
// // // //             </div>

// // // //             {/* Opening Balance Form Modal */}
// // // //             {showOpeningForm && (
// // // //                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
// // // //                     <div className="bg-white p-6 rounded-lg w-full max-w-md">
// // // //                         <h2 className="text-xl font-semibold mb-4">
// // // //                             Set Opening Balance
// // // //                         </h2>
// // // //                         <form
// // // //                             onSubmit={handleOpeningSubmit}
// // // //                             className="space-y-4"
// // // //                         >
// // // //                             <div>
// // // //                                 <label className="block text-sm font-medium mb-1">
// // // //                                     Store
// // // //                                 </label>
// // // //                                 <select
// // // //                                     value={openingForm.store_id}
// // // //                                     onChange={(e) =>
// // // //                                         setOpeningForm({
// // // //                                             ...openingForm,
// // // //                                             store_id: e.target.value,
// // // //                                         })
// // // //                                     }
// // // //                                     className="w-full p-2 border rounded"
// // // //                                     required
// // // //                                 >
// // // //                                     <option value="">Select store...</option>
// // // //                                     {stores.map((store) => (
// // // //                                         <option key={store.id} value={store.id}>
// // // //                                             {store.name}
// // // //                                         </option>
// // // //                                     ))}
// // // //                                 </select>
// // // //                             </div>
// // // //                             <div>
// // // //                                 <label className="block text-sm font-medium mb-1">
// // // //                                     Seller
// // // //                                 </label>
// // // //                                 <select
// // // //                                     value={openingForm.seller_id}
// // // //                                     onChange={(e) =>
// // // //                                         setOpeningForm({
// // // //                                             ...openingForm,
// // // //                                             seller_id: e.target.value,
// // // //                                         })
// // // //                                     }
// // // //                                     className="w-full p-2 border rounded"
// // // //                                     required
// // // //                                 >
// // // //                                     <option value="">Select seller...</option>
// // // //                                     {sellers.map((seller) => (
// // // //                                         <option
// // // //                                             key={seller.id}
// // // //                                             value={seller.id}
// // // //                                         >
// // // //                                             {seller.full_name}
// // // //                                         </option>
// // // //                                     ))}
// // // //                                 </select>
// // // //                             </div>
// // // //                             <div>
// // // //                                 <label className="block text-sm font-medium mb-1">
// // // //                                     Date
// // // //                                 </label>
// // // //                                 <input
// // // //                                     type="date"
// // // //                                     value={openingForm.date}
// // // //                                     onChange={(e) =>
// // // //                                         setOpeningForm({
// // // //                                             ...openingForm,
// // // //                                             date: e.target.value,
// // // //                                         })
// // // //                                     }
// // // //                                     className="w-full p-2 border rounded"
// // // //                                     required
// // // //                                 />
// // // //                             </div>
// // // //                             <div>
// // // //                                 <label className="block text-sm font-medium mb-1">
// // // //                                     Opening Balance
// // // //                                 </label>
// // // //                                 <input
// // // //                                     type="number"
// // // //                                     step="0.01"
// // // //                                     value={openingForm.opening_balance}
// // // //                                     onChange={(e) =>
// // // //                                         setOpeningForm({
// // // //                                             ...openingForm,
// // // //                                             opening_balance: e.target.value,
// // // //                                         })
// // // //                                     }
// // // //                                     className="w-full p-2 border rounded"
// // // //                                     placeholder="0.00"
// // // //                                     required
// // // //                                 />
// // // //                             </div>
// // // //                             <div className="flex space-x-4">
// // // //                                 <button
// // // //                                     type="submit"
// // // //                                     className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
// // // //                                 >
// // // //                                     Create
// // // //                                 </button>
// // // //                                 <button
// // // //                                     type="button"
// // // //                                     onClick={() => setShowOpeningForm(false)}
// // // //                                     className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
// // // //                                 >
// // // //                                     Cancel
// // // //                                 </button>
// // // //                             </div>
// // // //                         </form>
// // // //                     </div>
// // // //                 </div>
// // // //             )}

// // // //             {/* Close Day Form Modal */}
// // // //             {showCloseForm && selectedSummary && (
// // // //                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
// // // //                     <div className="bg-white p-6 rounded-lg w-full max-w-md">
// // // //                         <h2 className="text-xl font-semibold mb-4">
// // // //                             Close Day
// // // //                         </h2>
// // // //                         <div className="mb-4 p-4 bg-gray-50 rounded">
// // // //                             <p>
// // // //                                 <strong>Expected Cash:</strong> Rp{" "}
// // // //                                 {selectedSummary.expected_cash}
// // // //                             </p>
// // // //                             <p className="text-sm text-gray-600">
// // // //                                 Opening: Rp {selectedSummary.opening_balance} +
// // // //                                 Sales: Rp {selectedSummary.total_sales}
// // // //                             </p>
// // // //                         </div>
// // // //                         <form onSubmit={handleCloseDay} className="space-y-4">
// // // //                             <div>
// // // //                                 <label className="block text-sm font-medium mb-1">
// // // //                                     Actual Cash Count
// // // //                                 </label>
// // // //                                 <input
// // // //                                     type="number"
// // // //                                     step="0.01"
// // // //                                     value={closeForm.actual_cash}
// // // //                                     onChange={(e) =>
// // // //                                         setCloseForm({
// // // //                                             ...closeForm,
// // // //                                             actual_cash: e.target.value,
// // // //                                         })
// // // //                                     }
// // // //                                     className="w-full p-2 border rounded"
// // // //                                     placeholder="0.00"
// // // //                                     required
// // // //                                 />
// // // //                             </div>
// // // //                             <div>
// // // //                                 <label className="block text-sm font-medium mb-1">
// // // //                                     Notes (Optional)
// // // //                                 </label>
// // // //                                 <textarea
// // // //                                     value={closeForm.notes}
// // // //                                     onChange={(e) =>
// // // //                                         setCloseForm({
// // // //                                             ...closeForm,
// // // //                                             notes: e.target.value,
// // // //                                         })
// // // //                                     }
// // // //                                     className="w-full p-2 border rounded h-20"
// // // //                                     placeholder="Any notes about the day..."
// // // //                                 />
// // // //                             </div>
// // // //                             {closeForm.actual_cash && (
// // // //                                 <div className="p-3 bg-yellow-50 rounded">
// // // //                                     <p className="font-medium">
// // // //                                         Variance: Rp{" "}
// // // //                                         {parseFloat(closeForm.actual_cash) -
// // // //                                             selectedSummary.expected_cash}
// // // //                                     </p>
// // // //                                 </div>
// // // //                             )}
// // // //                             <div className="flex space-x-4">
// // // //                                 <button
// // // //                                     type="submit"
// // // //                                     className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
// // // //                                 >
// // // //                                     Close Day
// // // //                                 </button>
// // // //                                 <button
// // // //                                     type="button"
// // // //                                     onClick={() => {
// // // //                                         setShowCloseForm(false);
// // // //                                         setSelectedSummary(null);
// // // //                                         setCloseForm({
// // // //                                             actual_cash: "",
// // // //                                             notes: "",
// // // //                                         });
// // // //                                     }}
// // // //                                     className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
// // // //                                 >
// // // //                                     Cancel
// // // //                                 </button>
// // // //                             </div>
// // // //                         </form>
// // // //                     </div>
// // // //                 </div>
// // // //             )}

// // // //             {/* Summaries */}
// // // //             {selectedStore && (
// // // //                 <div className="space-y-4">
// // // //                     {summaries.length === 0 ? (
// // // //                         <div className="text-center py-8">
// // // //                             <p className="text-gray-500">
// // // //                                 No daily summaries found for the selected period
// // // //                             </p>
// // // //                         </div>
// // // //                     ) : (
// // // //                         summaries.map((summary) => (
// // // //                             <div
// // // //                                 key={summary.id}
// // // //                                 className="bg-white p-6 rounded-lg shadow"
// // // //                             >
// // // //                                 <div className="flex justify-between items-start mb-4">
// // // //                                     <div>
// // // //                                         <h3 className="text-lg font-semibold">
// // // //                                             {new Date(
// // // //                                                 summary.date
// // // //                                             ).toLocaleDateString()}
// // // //                                         </h3>
// // // //                                         <p className="text-gray-600">
// // // //                                             Seller: {summary.seller?.full_name}
// // // //                                         </p>
// // // //                                         <p className="text-gray-600">
// // // //                                             Store: {summary.stores?.name}
// // // //                                         </p>
// // // //                                     </div>
// // // //                                     <div className="text-right">
// // // //                                         {summary.closed_at ? (
// // // //                                             <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
// // // //                                                 Closed
// // // //                                             </span>
// // // //                                         ) : (
// // // //                                             <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
// // // //                                                 Open
// // // //                                             </span>
// // // //                                         )}
// // // //                                     </div>
// // // //                                 </div>

// // // //                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
// // // //                                     <div>
// // // //                                         <p className="text-sm text-gray-600">
// // // //                                             Opening Balance
// // // //                                         </p>
// // // //                                         <p className="text-xl font-bold">
// // // //                                             Rp {summary.opening_balance}
// // // //                                         </p>
// // // //                                     </div>
// // // //                                     <div>
// // // //                                         <p className="text-sm text-gray-600">
// // // //                                             Total Sales
// // // //                                         </p>
// // // //                                         <p className="text-xl font-bold text-green-600">
// // // //                                             Rp {summary.total_sales}
// // // //                                         </p>
// // // //                                     </div>
// // // //                                     <div>
// // // //                                         <p className="text-sm text-gray-600">
// // // //                                             Expected Cash
// // // //                                         </p>
// // // //                                         <p className="text-xl font-bold text-blue-600">
// // // //                                             Rp {summary.expected_cash}
// // // //                                         </p>
// // // //                                     </div>
// // // //                                     <div>
// // // //                                         <p className="text-sm text-gray-600">
// // // //                                             Actual Cash
// // // //                                         </p>
// // // //                                         {summary.actual_cash !== null ? (
// // // //                                             <p className="text-xl font-bold">
// // // //                                                 Rp {summary.actual_cash}
// // // //                                             </p>
// // // //                                         ) : (
// // // //                                             <p className="text-xl text-gray-400">
// // // //                                                 Not counted
// // // //                                             </p>
// // // //                                         )}
// // // //                                     </div>
// // // //                                 </div>

// // // //                                 {summary.variance !== null && (
// // // //                                     <div className="mb-4">
// // // //                                         <p className="text-sm text-gray-600">
// // // //                                             Variance
// // // //                                         </p>
// // // //                                         <p
// // // //                                             className={`text-lg font-bold ${
// // // //                                                 summary.variance >= 0
// // // //                                                     ? "text-green-600"
// // // //                                                     : "text-red-600"
// // // //                                             }`}
// // // //                                         >
// // // //                                             Rp{" "}
// // // //                                             {`${
// // // //                                                 summary.variance >= 0 ? "+" : ""
// // // //                                             }${summary.variance}`}
// // // //                                         </p>
// // // //                                     </div>
// // // //                                 )}

// // // //                                 {summary.notes && (
// // // //                                     <div className="mb-4">
// // // //                                         <p className="text-sm text-gray-600">
// // // //                                             Notes
// // // //                                         </p>
// // // //                                         <p className="text-gray-800">
// // // //                                             {summary.notes}
// // // //                                         </p>
// // // //                                     </div>
// // // //                                 )}

// // // //                                 <div className="flex space-x-2">
// // // //                                     {!summary.closed_at && (
// // // //                                         <>
// // // //                                             <button
// // // //                                                 onClick={() =>
// // // //                                                     refreshSales(summary)
// // // //                                                 }
// // // //                                                 className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
// // // //                                             >
// // // //                                                 Refresh Sales
// // // //                                             </button>
// // // //                                             <button
// // // //                                                 onClick={() => {
// // // //                                                     setSelectedSummary(summary);
// // // //                                                     setCloseForm({
// // // //                                                         actual_cash:
// // // //                                                             summary.expected_cash.toString(),
// // // //                                                         notes: "",
// // // //                                                     });
// // // //                                                     setShowCloseForm(true);
// // // //                                                 }}
// // // //                                                 className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
// // // //                                             >
// // // //                                                 Close Day
// // // //                                             </button>
// // // //                                         </>
// // // //                                     )}
// // // //                                 </div>

// // // //                                 {summary.closed_at && (
// // // //                                     <div className="text-xs text-gray-500 mt-2">
// // // //                                         Closed:{" "}
// // // //                                         {new Date(
// // // //                                             summary.closed_at
// // // //                                         ).toLocaleString()}
// // // //                                     </div>
// // // //                                 )}
// // // //                             </div>
// // // //                         ))
// // // //                     )}
// // // //                 </div>
// // // //             )}
// // // //         </div>
// // // //     );
// // // // }

// // // // dashboard/analytics/page.tsx
// // // "use client";
// // // import React, { useState, useEffect } from "react";
// // // import { createClient } from "@/lib/supabase/client";
// // // import {
// // //     DailySummary,
// // //     Store,
// // //     ProductBreakdown,
// // //     Expense,
// // // } from "./types/analytics";
// // // import { useAnalyticsFilters } from "./hooks/useAnalyticsFilters";
// // // import { useAnalyticsActions } from "./hooks/useAnalyticsActions";
// // // import { AnalyticsFilter } from "./components/AnalyticsFilter";
// // // import { AnalyticsList } from "./components/AnalyticsList";
// // // import { AnalyticsModal } from "./components/AnalyticsModal";
// // // import { BarChart3, Plus, Receipt } from "lucide-react";

// // // type ModalType = "balance" | "expense" | "close" | null;

// // // export default function AnalyticsPageComponent() {
// // //     const [summaries, setSummaries] = useState<DailySummary[]>([]);
// // //     const [stores, setStores] = useState<Store[]>([]);
// // //     const [loading, setLoading] = useState(true);
// // //     const [isSubmitting, setIsSubmitting] = useState(false);

// // //     // Modal state
// // //     const [modalState, setModalState] = useState<{
// // //         isOpen: boolean;
// // //         type: ModalType;
// // //         summary: DailySummary | null;
// // //     }>({ isOpen: false, type: null, summary: null });

// // //     // Additional data for analytics
// // //     const [productBreakdown, setProductBreakdown] = useState<{
// // //         [date: string]: ProductBreakdown;
// // //     }>({});
// // //     const [ordersByDate, setOrdersByDate] = useState<{
// // //         [date: string]: any[];
// // //     }>({});
// // //     const [expensesByDate, setExpensesByDate] = useState<{
// // //         [date: string]: Expense[];
// // //     }>({});

// // //     const supabase = createClient();

// // //     // Custom hooks
// // //     const analyticsFilters = useAnalyticsFilters(summaries);
// // //     const analyticsActions = useAnalyticsActions();

// // //     useEffect(() => {
// // //         loadStores();
// // //     }, []);

// // //     useEffect(() => {
// // //         if (stores.length > 0) {
// // //             loadAnalyticsData();
// // //         }
// // //     }, [
// // //         analyticsFilters.selectedMonth,
// // //         analyticsFilters.selectedStoreIds,
// // //         stores,
// // //     ]);

// // //     const loadStores = async () => {
// // //         try {
// // //             const { data } = await supabase
// // //                 .from("stores")
// // //                 .select("id, name")
// // //                 .order("name");

// // //             setStores(data || []);
// // //         } catch (error) {
// // //             console.error("Error loading stores:", error);
// // //         }
// // //     };

// // //     const loadAnalyticsData = async () => {
// // //         setLoading(true);
// // //         try {
// // //             await Promise.all([
// // //                 loadSummaries(),
// // //                 loadProductBreakdown(),
// // //                 loadOrdersByDate(),
// // //                 loadExpensesByDate(),
// // //             ]);
// // //         } catch (error) {
// // //             console.error("Error loading analytics data:", error);
// // //         } finally {
// // //             setLoading(false);
// // //         }
// // //     };

// // //     const loadSummaries = async () => {
// // //         const startOfMonth = `${analyticsFilters.selectedMonth}-01`;
// // //         const endOfMonth = new Date(
// // //             new Date(startOfMonth).getFullYear(),
// // //             new Date(startOfMonth).getMonth() + 1,
// // //             0
// // //         )
// // //             .toISOString()
// // //             .split("T")[0];

// // //         const { data } = await supabase
// // //             .from("daily_summaries")
// // //             .select(
// // //                 `
// // //                 *,
// // //                 stores:store_id(name),
// // //                 seller:seller_id(full_name)
// // //             `
// // //             )
// // //             .gte("date", startOfMonth)
// // //             .lte("date", endOfMonth)
// // //             .in(
// // //                 "store_id",
// // //                 analyticsFilters.selectedStoreIds.length > 0
// // //                     ? analyticsFilters.selectedStoreIds
// // //                     : stores.map((s) => s.id)
// // //             )
// // //             .order("date", { ascending: false });

// // //         setSummaries(data || []);
// // //     };

// // //     const loadProductBreakdown = async () => {
// // //         const startOfMonth = `${analyticsFilters.selectedMonth}-01T00:00:00`;
// // //         const endOfMonth = `${analyticsFilters.selectedMonth}-31T23:59:59`;

// // //         const { data } = await supabase
// // //             .from("orders")
// // //             .select(
// // //                 `
// // //                 created_at,
// // //                 store_id,
// // //                 order_items(
// // //                     quantity,
// // //                     products(name)
// // //                 )
// // //             `
// // //             )
// // //             .gte("created_at", startOfMonth)
// // //             .lt("created_at", endOfMonth)
// // //             .in(
// // //                 "store_id",
// // //                 analyticsFilters.selectedStoreIds.length > 0
// // //                     ? analyticsFilters.selectedStoreIds
// // //                     : stores.map((s) => s.id)
// // //             );

// // //         const breakdown: { [date: string]: ProductBreakdown } = {};

// // //         data?.forEach((order) => {
// // //             const date = order.created_at.split("T")[0];
// // //             if (!breakdown[date]) {
// // //                 breakdown[date] = {};
// // //             }

// // //             order.order_items.forEach((item: any) => {
// // //                 const productName = item.products?.name || "Unknown";
// // //                 if (!breakdown[date][productName]) {
// // //                     breakdown[date][productName] = { quantity: 0, total: 0 };
// // //                 }
// // //                 breakdown[date][productName].quantity += item.quantity;
// // //             });
// // //         });

// // //         setProductBreakdown(breakdown);
// // //     };

// // //     const loadOrdersByDate = async () => {
// // //         const startOfMonth = `${analyticsFilters.selectedMonth}-01T00:00:00`;
// // //         const endOfMonth = `${analyticsFilters.selectedMonth}-31T23:59:59`;

// // //         const { data } = await supabase
// // //             .from("orders")
// // //             .select("id, created_at, total_amount, store_id")
// // //             .gte("created_at", startOfMonth)
// // //             .lt("created_at", endOfMonth)
// // //             .in(
// // //                 "store_id",
// // //                 analyticsFilters.selectedStoreIds.length > 0
// // //                     ? analyticsFilters.selectedStoreIds
// // //                     : stores.map((s) => s.id)
// // //             );

// // //         const ordersByDate: { [date: string]: any[] } = {};

// // //         data?.forEach((order) => {
// // //             const date = order.created_at.split("T")[0];
// // //             if (!ordersByDate[date]) {
// // //                 ordersByDate[date] = [];
// // //             }
// // //             ordersByDate[date].push(order);
// // //         });

// // //         setOrdersByDate(ordersByDate);
// // //     };

// // //     const loadExpensesByDate = async () => {
// // //         const startOfMonth = `${analyticsFilters.selectedMonth}-01`;
// // //         const endOfMonth = new Date(
// // //             new Date(startOfMonth).getFullYear(),
// // //             new Date(startOfMonth).getMonth() + 1,
// // //             0
// // //         )
// // //             .toISOString()
// // //             .split("T")[0];

// // //         const { data } = await supabase
// // //             .from("expenses")
// // //             .select(
// // //                 `
// // //                 *,
// // //                 daily_summaries!inner(date, store_id)
// // //             `
// // //             )
// // //             .gte("daily_summaries.date", startOfMonth)
// // //             .lte("daily_summaries.date", endOfMonth)
// // //             .in(
// // //                 "daily_summaries.store_id",
// // //                 analyticsFilters.selectedStoreIds.length > 0
// // //                     ? analyticsFilters.selectedStoreIds
// // //                     : stores.map((s) => s.id)
// // //             );

// // //         const expensesByDate: { [date: string]: Expense[] } = {};

// // //         data?.forEach((expense: any) => {
// // //             const date = expense.daily_summaries.date;
// // //             if (!expensesByDate[date]) {
// // //                 expensesByDate[date] = [];
// // //             }
// // //             expensesByDate[date].push(expense);
// // //         });

// // //         setExpensesByDate(expensesByDate);
// // //     };

// // //     const openModal = (type: ModalType, summary: DailySummary) => {
// // //         setModalState({
// // //             isOpen: true,
// // //             type,
// // //             summary,
// // //         });
// // //     };

// // //     const closeModal = () => {
// // //         setModalState({
// // //             isOpen: false,
// // //             type: null,
// // //             summary: null,
// // //         });
// // //     };

// // //     const handleCreateSummary = async () => {
// // //         // This could open a modal for creating new summaries
// // //         // For now, we'll implement basic creation
// // //         const today = new Date().toISOString().split("T")[0];

// // //         if (!analyticsFilters.selectedStoreIds.length) {
// // //             alert("Please select at least one store");
// // //             return;
// // //         }

// // //         setIsSubmitting(true);
// // //         try {
// // //             const {
// // //                 data: { user },
// // //             } = await supabase.auth.getUser();
// // //             if (!user) return;

// // //             await analyticsActions.createSummary({
// // //                 storeId: analyticsFilters.selectedStoreIds[0], // Use first selected store
// // //                 sellerId: user.id,
// // //                 managerId: user.id,
// // //                 date: today,
// // //                 openingBalance: 0,
// // //             });

// // //             await loadAnalyticsData();
// // //             alert("Daily summary created successfully!");
// // //         } catch (error: any) {
// // //             console.error("Error creating summary:", error);
// // //             alert(error.message || "Failed to create daily summary");
// // //         } finally {
// // //             setIsSubmitting(false);
// // //         }
// // //     };

// // //     const handleBalanceSubmit = async (balance: number) => {
// // //         if (!modalState.summary) return;

// // //         setIsSubmitting(true);
// // //         try {
// // //             await analyticsActions.updateSummary(modalState.summary.id, {
// // //                 opening_balance: balance,
// // //             });

// // //             await loadAnalyticsData();
// // //             closeModal();
// // //         } catch (error) {
// // //             console.error("Error updating balance:", error);
// // //             alert("Failed to update opening balance");
// // //         } finally {
// // //             setIsSubmitting(false);
// // //         }
// // //     };

// // //     const handleExpenseSubmit = async (
// // //         expenses: Array<{
// // //             label: string;
// // //             customLabel?: string;
// // //             amount: string;
// // //         }>
// // //     ) => {
// // //         if (!modalState.summary) return;

// // //         setIsSubmitting(true);
// // //         try {
// // //             await analyticsActions.createExpenses({
// // //                 dailySummaryId: modalState.summary.id,
// // //                 storeId: modalState.summary.store_id,
// // //                 expenses,
// // //             });

// // //             await loadAnalyticsData();
// // //             closeModal();
// // //         } catch (error) {
// // //             console.error("Error adding expenses:", error);
// // //             alert("Failed to add expenses");
// // //         } finally {
// // //             setIsSubmitting(false);
// // //         }
// // //     };

// // //     const handleCloseSubmit = async (
// // //         actualCash: number,
// // //         notes: string | null,
// // //         variance: number
// // //     ) => {
// // //         if (!modalState.summary) return;

// // //         setIsSubmitting(true);
// // //         try {
// // //             await analyticsActions.updateSummary(modalState.summary.id, {
// // //                 actual_cash: actualCash,
// // //                 variance,
// // //                 notes,
// // //                 closed_at: new Date().toISOString(),
// // //             });

// // //             await loadAnalyticsData();
// // //             closeModal();
// // //         } catch (error) {
// // //             console.error("Error closing day:", error);
// // //             alert("Failed to close day");
// // //         } finally {
// // //             setIsSubmitting(false);
// // //         }
// // //     };

// // //     const handleRefreshSales = async (summary: DailySummary) => {
// // //         setIsSubmitting(true);
// // //         try {
// // //             await analyticsActions.refreshSales(
// // //                 summary.id,
// // //                 summary.store_id,
// // //                 summary.date,
// // //                 summary.opening_balance
// // //             );

// // //             await loadAnalyticsData();
// // //         } catch (error) {
// // //             console.error("Error refreshing sales:", error);
// // //             alert("Failed to refresh sales");
// // //         } finally {
// // //             setIsSubmitting(false);
// // //         }
// // //     };

// // //     // Helper functions for child components
// // //     const getProductBreakdown = (date: string) => productBreakdown[date] || {};
// // //     const getOrdersCount = (date: string) => ordersByDate[date]?.length || 0;
// // //     const getExpenses = (date: string) => expensesByDate[date] || [];

// // //     // Calculate monthly totals
// // //     const monthlyTotals = {
// // //         totalSales: analyticsFilters.filteredSummaries.reduce(
// // //             (sum, s) => sum + s.total_sales,
// // //             0
// // //         ),
// // //         totalExpenses: analyticsFilters.filteredSummaries.reduce(
// // //             (sum, s) => sum + (s.total_expenses || 0),
// // //             0
// // //         ),
// // //         totalOrders: Object.values(ordersByDate).flat().length,
// // //         totalCups: Object.values(productBreakdown).reduce(
// // //             (total, dayBreakdown) =>
// // //                 total +
// // //                 Object.values(dayBreakdown).reduce(
// // //                     (dayTotal, product) => dayTotal + product.quantity,
// // //                     0
// // //                 ),
// // //             0
// // //         ),
// // //     };

// // //     const formatRupiah = (amount: number) => {
// // //         return new Intl.NumberFormat("id-ID", {
// // //             style: "currency",
// // //             currency: "IDR",
// // //             minimumFractionDigits: 0,
// // //             maximumFractionDigits: 0,
// // //         }).format(amount);
// // //     };

// // //     if (loading) {
// // //         return (
// // //             <div className="flex items-center justify-center h-screen bg-white">
// // //                 <div className="flex flex-col items-center">
// // //                     <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
// // //                     <p className="mt-4 text-gray-600 text-sm">
// // //                         Loading analytics...
// // //                     </p>
// // //                 </div>
// // //             </div>
// // //         );
// // //     }

// // //     return (
// // //         <div>
// // //             {/* Header */}
// // //             <div className="sticky top-0 z-30 py-6 border-b border-gray-200 bg-white">
// // //                 <div className="flex justify-between items-center">
// // //                     <div>
// // //                         <h1 className="text-3xl font-bold">
// // //                             Daily Analytics Management
// // //                         </h1>
// // //                         <p className="text-gray-600">
// // //                             Monitor and manage daily store summaries and
// // //                             financial data
// // //                         </p>
// // //                     </div>
// // //                     <button
// // //                         onClick={handleCreateSummary}
// // //                         disabled={isSubmitting}
// // //                         className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex gap-2 items-center justify-center text-sm font-medium disabled:opacity-50"
// // //                     >
// // //                         <Plus size={18} />
// // //                         Create Summary
// // //                     </button>
// // //                 </div>

// // //                 {/* Monthly Summary */}
// // //                 {analyticsFilters.filteredSummaries.length > 0 && (
// // //                     <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
// // //                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
// // //                             <div className="flex items-center gap-2 mb-1">
// // //                                 <Receipt className="w-4 h-4 text-blue-600" />
// // //                                 <p className="text-sm text-blue-600 font-medium">
// // //                                     Orders
// // //                                 </p>
// // //                             </div>
// // //                             <p className="text-2xl font-bold text-blue-700">
// // //                                 {monthlyTotals.totalOrders}
// // //                             </p>
// // //                         </div>
// // //                         <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
// // //                             <div className="flex items-center gap-2 mb-1">
// // //                                 <BarChart3 className="w-4 h-4 text-orange-600" />
// // //                                 <p className="text-sm text-orange-600 font-medium">
// // //                                     Cups
// // //                                 </p>
// // //                             </div>
// // //                             <p className="text-2xl font-bold text-orange-700">
// // //                                 {monthlyTotals.totalCups}
// // //                             </p>
// // //                         </div>
// // //                         <div className="bg-green-50 p-4 rounded-lg border border-green-200">
// // //                             <div className="flex items-center gap-2 mb-1">
// // //                                 <BarChart3 className="w-4 h-4 text-green-600" />
// // //                                 <p className="text-sm text-green-600 font-medium">
// // //                                     Sales
// // //                                 </p>
// // //                             </div>
// // //                             <p className="text-2xl font-bold text-green-700">
// // //                                 {formatRupiah(monthlyTotals.totalSales)}
// // //                             </p>
// // //                         </div>
// // //                         <div className="bg-red-50 p-4 rounded-lg border border-red-200">
// // //                             <div className="flex items-center gap-2 mb-1">
// // //                                 <BarChart3 className="w-4 h-4 text-red-600" />
// // //                                 <p className="text-sm text-red-600 font-medium">
// // //                                     Expenses
// // //                                 </p>
// // //                             </div>
// // //                             <p className="text-2xl font-bold text-red-700">
// // //                                 {formatRupiah(monthlyTotals.totalExpenses)}
// // //                             </p>
// // //                         </div>
// // //                     </div>
// // //                 )}

// // //                 <div className="pt-4">
// // //                     <AnalyticsFilter
// // //                         selectedMonth={analyticsFilters.selectedMonth}
// // //                         onMonthChange={analyticsFilters.setSelectedMonth}
// // //                         selectedStoreIds={analyticsFilters.selectedStoreIds}
// // //                         onStoreSelectionChange={
// // //                             analyticsFilters.setSelectedStoreIds
// // //                         }
// // //                         summaryIdSearch={analyticsFilters.summaryIdSearch}
// // //                         onSummaryIdSearchChange={
// // //                             analyticsFilters.setSummaryIdSearch
// // //                         }
// // //                         stores={stores}
// // //                         totalSummaries={summaries.length}
// // //                         filteredSummariesCount={
// // //                             analyticsFilters.filteredSummaries.length
// // //                         }
// // //                         onClearFilters={analyticsFilters.clearFilters}
// // //                         hasActiveFilters={analyticsFilters.hasActiveFilters}
// // //                     />
// // //                 </div>
// // //             </div>

// // //             {/* Main Content */}
// // //             <div className="py-6">
// // //                 <AnalyticsList
// // //                     summaries={analyticsFilters.filteredSummaries}
// // //                     onEditBalance={(summary) => openModal("balance", summary)}
// // //                     onAddExpense={(summary) => openModal("expense", summary)}
// // //                     onCloseDay={(summary) => openModal("close", summary)}
// // //                     onRefreshSales={handleRefreshSales}
// // //                     getProductBreakdown={getProductBreakdown}
// // //                     getOrdersCount={getOrdersCount}
// // //                     getExpenses={getExpenses}
// // //                 />
// // //             </div>

// // //             {/* No Results State */}
// // //             {analyticsFilters.filteredSummaries.length === 0 &&
// // //                 summaries.length > 0 && (
// // //                     <div className="text-center py-12">
// // //                         <p className="text-gray-500 mb-4">
// // //                             No summaries match your current filters
// // //                         </p>
// // //                         <button
// // //                             onClick={analyticsFilters.clearFilters}
// // //                             className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
// // //                         >
// // //                             Clear Filters
// // //                         </button>
// // //                     </div>
// // //                 )}

// // //             {/* Modals */}
// // //             <AnalyticsModal
// // //                 isOpen={modalState.isOpen}
// // //                 modalType={modalState.type}
// // //                 summary={modalState.summary}
// // //                 onClose={closeModal}
// // //                 onBalanceSubmit={handleBalanceSubmit}
// // //                 onExpenseSubmit={handleExpenseSubmit}
// // //                 onCloseSubmit={handleCloseSubmit}
// // //                 isSubmitting={isSubmitting}
// // //             />
// // //         </div>
// // //     );
// // // }

// // // dashboard/analytics/page.tsx
// // "use client";
// // import React, { useState, useEffect } from "react";
// // import { createClient } from "@/lib/supabase/client";
// // import {
// //     DailySummary,
// //     Store,
// //     ProductBreakdown,
// //     Expense,
// // } from "./types/analytics";
// // import { useAnalyticsFilters } from "./hooks/useAnalyticsFilters";
// // import { useAnalyticsActions } from "./hooks/useAnalyticsActions";
// // import { AnalyticsFilter } from "./components/AnalyticsFilter";
// // import { AnalyticsList } from "./components/AnalyticsList";
// // import { AnalyticsModal } from "./components/AnalyticsModal";
// // import { BarChart3, Plus, Receipt } from "lucide-react";

// // type ModalType = "balance" | "expense" | "close" | null;

// // export default function AnalyticsPageComponent() {
// //     const [summaries, setSummaries] = useState<DailySummary[]>([]);
// //     const [stores, setStores] = useState<Store[]>([]);
// //     const [loading, setLoading] = useState(true);
// //     const [isSubmitting, setIsSubmitting] = useState(false);

// //     // Modal state
// //     const [modalState, setModalState] = useState<{
// //         isOpen: boolean;
// //         type: ModalType;
// //         summary: DailySummary | null;
// //     }>({ isOpen: false, type: null, summary: null });

// //     // Additional data for analytics
// //     const [productBreakdown, setProductBreakdown] = useState<{
// //         [date: string]: ProductBreakdown;
// //     }>({});
// //     const [ordersByDate, setOrdersByDate] = useState<{
// //         [date: string]: any[];
// //     }>({});
// //     const [expensesByDate, setExpensesByDate] = useState<{
// //         [date: string]: Expense[];
// //     }>({});

// //     const supabase = createClient();

// //     // Custom hooks
// //     const analyticsFilters = useAnalyticsFilters(summaries);
// //     const analyticsActions = useAnalyticsActions();

// //     useEffect(() => {
// //         loadStores();
// //     }, []);

// //     useEffect(() => {
// //         if (stores.length > 0 && analyticsFilters.selectedStoreId) {
// //             loadAnalyticsData();
// //         }
// //     }, [
// //         analyticsFilters.selectedMonth,
// //         analyticsFilters.selectedStoreId,
// //         stores,
// //     ]);

// //     const loadStores = async () => {
// //         try {
// //             const { data } = await supabase
// //                 .from("stores")
// //                 .select("id, name")
// //                 .order("name");

// //             setStores(data || []);
// //         } catch (error) {
// //             console.error("Error loading stores:", error);
// //         }
// //     };

// //     const loadAnalyticsData = async () => {
// //         setLoading(true);
// //         try {
// //             await Promise.all([
// //                 loadSummaries(),
// //                 loadProductBreakdown(),
// //                 loadOrdersByDate(),
// //                 loadExpensesByDate(),
// //             ]);
// //         } catch (error) {
// //             console.error("Error loading analytics data:", error);
// //         } finally {
// //             setLoading(false);
// //         }
// //     };

// //     const loadSummaries = async () => {
// //         if (!analyticsFilters.selectedStoreId) {
// //             setSummaries([]);
// //             return;
// //         }

// //         const startOfMonth = `${analyticsFilters.selectedMonth}-01`;
// //         const endOfMonth = new Date(
// //             new Date(startOfMonth).getFullYear(),
// //             new Date(startOfMonth).getMonth() + 1,
// //             0
// //         )
// //             .toISOString()
// //             .split("T")[0];

// //         const { data } = await supabase
// //             .from("daily_summaries")
// //             .select(
// //                 `
// //                 *,
// //                 stores:store_id(name),
// //                 seller:seller_id(full_name)
// //             `
// //             )
// //             .gte("date", startOfMonth)
// //             .lte("date", endOfMonth)
// //             .eq("store_id", analyticsFilters.selectedStoreId)
// //             .order("date", { ascending: false });

// //         setSummaries(data || []);
// //     };

// //     const loadProductBreakdown = async () => {
// //         if (!analyticsFilters.selectedStoreId) {
// //             setProductBreakdown({});
// //             return;
// //         }

// //         const startOfMonth = `${analyticsFilters.selectedMonth}-01T00:00:00`;
// //         const endOfMonth = `${analyticsFilters.selectedMonth}-31T23:59:59`;

// //         const { data } = await supabase
// //             .from("orders")
// //             .select(
// //                 `
// //                 created_at,
// //                 store_id,
// //                 order_items(
// //                     quantity,
// //                     products(name)
// //                 )
// //             `
// //             )
// //             .gte("created_at", startOfMonth)
// //             .lt("created_at", endOfMonth)
// //             .eq("store_id", analyticsFilters.selectedStoreId);

// //         const breakdown: { [date: string]: ProductBreakdown } = {};

// //         data?.forEach((order) => {
// //             const date = order.created_at.split("T")[0];
// //             if (!breakdown[date]) {
// //                 breakdown[date] = {};
// //             }

// //             order.order_items.forEach((item: any) => {
// //                 const productName = item.products?.name || "Unknown";
// //                 if (!breakdown[date][productName]) {
// //                     breakdown[date][productName] = { quantity: 0, total: 0 };
// //                 }
// //                 breakdown[date][productName].quantity += item.quantity;
// //             });
// //         });

// //         setProductBreakdown(breakdown);
// //     };

// //     const loadOrdersByDate = async () => {
// //         if (!analyticsFilters.selectedStoreId) {
// //             setOrdersByDate({});
// //             return;
// //         }

// //         const startOfMonth = `${analyticsFilters.selectedMonth}-01T00:00:00`;
// //         const endOfMonth = `${analyticsFilters.selectedMonth}-31T23:59:59`;

// //         const { data } = await supabase
// //             .from("orders")
// //             .select("id, created_at, total_amount, store_id")
// //             .gte("created_at", startOfMonth)
// //             .lt("created_at", endOfMonth)
// //             .eq("store_id", analyticsFilters.selectedStoreId);

// //         const ordersByDate: { [date: string]: any[] } = {};

// //         data?.forEach((order) => {
// //             const date = order.created_at.split("T")[0];
// //             if (!ordersByDate[date]) {
// //                 ordersByDate[date] = [];
// //             }
// //             ordersByDate[date].push(order);
// //         });

// //         setOrdersByDate(ordersByDate);
// //     };

// //     const loadExpensesByDate = async () => {
// //         if (!analyticsFilters.selectedStoreId) {
// //             setExpensesByDate({});
// //             return;
// //         }

// //         const startOfMonth = `${analyticsFilters.selectedMonth}-01`;
// //         const endOfMonth = new Date(
// //             new Date(startOfMonth).getFullYear(),
// //             new Date(startOfMonth).getMonth() + 1,
// //             0
// //         )
// //             .toISOString()
// //             .split("T")[0];

// //         const { data } = await supabase
// //             .from("expenses")
// //             .select(
// //                 `
// //                 *,
// //                 daily_summaries!inner(date, store_id)
// //             `
// //             )
// //             .gte("daily_summaries.date", startOfMonth)
// //             .lte("daily_summaries.date", endOfMonth)
// //             .eq("daily_summaries.store_id", analyticsFilters.selectedStoreId);

// //         const expensesByDate: { [date: string]: Expense[] } = {};

// //         data?.forEach((expense: any) => {
// //             const date = expense.daily_summaries.date;
// //             if (!expensesByDate[date]) {
// //                 expensesByDate[date] = [];
// //             }
// //             expensesByDate[date].push(expense);
// //         });

// //         setExpensesByDate(expensesByDate);
// //     };

// //     const openModal = (type: ModalType, summary: DailySummary) => {
// //         setModalState({
// //             isOpen: true,
// //             type,
// //             summary,
// //         });
// //     };

// //     const closeModal = () => {
// //         setModalState({
// //             isOpen: false,
// //             type: null,
// //             summary: null,
// //         });
// //     };

// //     const handleCreateSummary = async () => {
// //         // This could open a modal for creating new summaries
// //         // For now, we'll implement basic creation
// //         const today = new Date().toISOString().split("T")[0];

// //         if (!analyticsFilters.selectedStoreId) {
// //             alert("Please select a store first");
// //             return;
// //         }

// //         setIsSubmitting(true);
// //         try {
// //             const {
// //                 data: { user },
// //             } = await supabase.auth.getUser();
// //             if (!user) return;

// //             await analyticsActions.createSummary({
// //                 storeId: analyticsFilters.selectedStoreId,
// //                 sellerId: user.id,
// //                 managerId: user.id,
// //                 date: today,
// //                 openingBalance: 0,
// //             });

// //             await loadAnalyticsData();
// //             alert("Daily summary created successfully!");
// //         } catch (error: any) {
// //             console.error("Error creating summary:", error);
// //             alert(error.message || "Failed to create daily summary");
// //         } finally {
// //             setIsSubmitting(false);
// //         }
// //     };

// //     const handleBalanceSubmit = async (balance: number) => {
// //         if (!modalState.summary) return;

// //         setIsSubmitting(true);
// //         try {
// //             await analyticsActions.updateSummary(modalState.summary.id, {
// //                 opening_balance: balance,
// //             });

// //             await loadAnalyticsData();
// //             closeModal();
// //         } catch (error) {
// //             console.error("Error updating balance:", error);
// //             alert("Failed to update opening balance");
// //         } finally {
// //             setIsSubmitting(false);
// //         }
// //     };

// //     const handleExpenseSubmit = async (
// //         expenses: Array<{
// //             label: string;
// //             customLabel?: string;
// //             amount: string;
// //         }>
// //     ) => {
// //         if (!modalState.summary) return;

// //         setIsSubmitting(true);
// //         try {
// //             await analyticsActions.createExpenses({
// //                 dailySummaryId: modalState.summary.id,
// //                 storeId: modalState.summary.store_id,
// //                 expenses,
// //             });

// //             await loadAnalyticsData();
// //             closeModal();
// //         } catch (error) {
// //             console.error("Error adding expenses:", error);
// //             alert("Failed to add expenses");
// //         } finally {
// //             setIsSubmitting(false);
// //         }
// //     };

// //     const handleCloseSubmit = async (
// //         actualCash: number,
// //         notes: string | null,
// //         variance: number
// //     ) => {
// //         if (!modalState.summary) return;

// //         setIsSubmitting(true);
// //         try {
// //             await analyticsActions.updateSummary(modalState.summary.id, {
// //                 actual_cash: actualCash,
// //                 variance,
// //                 notes,
// //                 closed_at: new Date().toISOString(),
// //             });

// //             await loadAnalyticsData();
// //             closeModal();
// //         } catch (error) {
// //             console.error("Error closing day:", error);
// //             alert("Failed to close day");
// //         } finally {
// //             setIsSubmitting(false);
// //         }
// //     };

// //     const handleRefreshSales = async (summary: DailySummary) => {
// //         setIsSubmitting(true);
// //         try {
// //             await analyticsActions.refreshSales(
// //                 summary.id,
// //                 summary.store_id,
// //                 summary.date,
// //                 summary.opening_balance
// //             );

// //             await loadAnalyticsData();
// //         } catch (error) {
// //             console.error("Error refreshing sales:", error);
// //             alert("Failed to refresh sales");
// //         } finally {
// //             setIsSubmitting(false);
// //         }
// //     };

// //     // Helper functions for child components
// //     const getProductBreakdown = (date: string) => productBreakdown[date] || {};
// //     const getOrdersCount = (date: string) => ordersByDate[date]?.length || 0;
// //     const getExpenses = (date: string) => expensesByDate[date] || [];

// //     // Calculate monthly totals
// //     const monthlyTotals = {
// //         totalSales: analyticsFilters.filteredSummaries.reduce(
// //             (sum, s) => sum + s.total_sales,
// //             0
// //         ),
// //         totalExpenses: analyticsFilters.filteredSummaries.reduce(
// //             (sum, s) => sum + (s.total_expenses || 0),
// //             0
// //         ),
// //         totalOrders: Object.values(ordersByDate).flat().length,
// //         totalCups: Object.values(productBreakdown).reduce(
// //             (total, dayBreakdown) =>
// //                 total +
// //                 Object.values(dayBreakdown).reduce(
// //                     (dayTotal, product) => dayTotal + product.quantity,
// //                     0
// //                 ),
// //             0
// //         ),
// //     };

// //     const formatRupiah = (amount: number) => {
// //         return new Intl.NumberFormat("id-ID", {
// //             style: "currency",
// //             currency: "IDR",
// //             minimumFractionDigits: 0,
// //             maximumFractionDigits: 0,
// //         }).format(amount);
// //     };

// //     if (loading) {
// //         return (
// //             <div className="flex items-center justify-center h-screen bg-white">
// //                 <div className="flex flex-col items-center">
// //                     <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
// //                     <p className="mt-4 text-gray-600 text-sm">
// //                         Loading analytics...
// //                     </p>
// //                 </div>
// //             </div>
// //         );
// //     }

// //     return (
// //         <div>
// //             {/* Header */}
// //             <div className="sticky top-0 z-30 py-6 border-b border-gray-200 bg-white">
// //                 <div className="flex justify-between items-center">
// //                     <div>
// //                         <h1 className="text-3xl font-bold">
// //                             Daily Analytics Management
// //                         </h1>
// //                         <p className="text-gray-600">
// //                             Monitor and manage daily store summaries and
// //                             financial data
// //                         </p>
// //                     </div>
// //                     <button
// //                         onClick={handleCreateSummary}
// //                         disabled={isSubmitting}
// //                         className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex gap-2 items-center justify-center text-sm font-medium disabled:opacity-50"
// //                     >
// //                         <Plus size={18} />
// //                         Create Summary
// //                     </button>
// //                 </div>

// //                 {/* Monthly Summary */}
// //                 {analyticsFilters.filteredSummaries.length > 0 && (
// //                     <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
// //                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
// //                             <div className="flex items-center gap-2 mb-1">
// //                                 <Receipt className="w-4 h-4 text-blue-600" />
// //                                 <p className="text-sm text-blue-600 font-medium">
// //                                     Orders
// //                                 </p>
// //                             </div>
// //                             <p className="text-2xl font-bold text-blue-700">
// //                                 {monthlyTotals.totalOrders}
// //                             </p>
// //                         </div>
// //                         <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
// //                             <div className="flex items-center gap-2 mb-1">
// //                                 <BarChart3 className="w-4 h-4 text-orange-600" />
// //                                 <p className="text-sm text-orange-600 font-medium">
// //                                     Cups
// //                                 </p>
// //                             </div>
// //                             <p className="text-2xl font-bold text-orange-700">
// //                                 {monthlyTotals.totalCups}
// //                             </p>
// //                         </div>
// //                         <div className="bg-green-50 p-4 rounded-lg border border-green-200">
// //                             <div className="flex items-center gap-2 mb-1">
// //                                 <BarChart3 className="w-4 h-4 text-green-600" />
// //                                 <p className="text-sm text-green-600 font-medium">
// //                                     Sales
// //                                 </p>
// //                             </div>
// //                             <p className="text-2xl font-bold text-green-700">
// //                                 {formatRupiah(monthlyTotals.totalSales)}
// //                             </p>
// //                         </div>
// //                         <div className="bg-red-50 p-4 rounded-lg border border-red-200">
// //                             <div className="flex items-center gap-2 mb-1">
// //                                 <BarChart3 className="w-4 h-4 text-red-600" />
// //                                 <p className="text-sm text-red-600 font-medium">
// //                                     Expenses
// //                                 </p>
// //                             </div>
// //                             <p className="text-2xl font-bold text-red-700">
// //                                 {formatRupiah(monthlyTotals.totalExpenses)}
// //                             </p>
// //                         </div>
// //                     </div>
// //                 )}

// //                 <div className="pt-4">
// //                     <AnalyticsFilter
// //                         selectedMonth={analyticsFilters.selectedMonth}
// //                         onMonthChange={analyticsFilters.setSelectedMonth}
// //                         selectedStoreId={analyticsFilters.selectedStoreId}
// //                         onStoreSelectionChange={
// //                             analyticsFilters.setSelectedStoreId
// //                         }
// //                         summaryIdSearch={analyticsFilters.summaryIdSearch}
// //                         onSummaryIdSearchChange={
// //                             analyticsFilters.setSummaryIdSearch
// //                         }
// //                         stores={stores}
// //                         totalSummaries={summaries.length}
// //                         filteredSummariesCount={
// //                             analyticsFilters.filteredSummaries.length
// //                         }
// //                         onClearFilters={analyticsFilters.clearFilters}
// //                         hasActiveFilters={analyticsFilters.hasActiveFilters}
// //                     />
// //                 </div>
// //             </div>

// //             {/* Main Content */}
// //             <div className="py-6">
// //                 <AnalyticsList
// //                     summaries={analyticsFilters.filteredSummaries}
// //                     onEditBalance={(summary) => openModal("balance", summary)}
// //                     onAddExpense={(summary) => openModal("expense", summary)}
// //                     onCloseDay={(summary) => openModal("close", summary)}
// //                     onRefreshSales={handleRefreshSales}
// //                     getProductBreakdown={getProductBreakdown}
// //                     getOrdersCount={getOrdersCount}
// //                     getExpenses={getExpenses}
// //                 />
// //             </div>

// //             {/* No Results State */}
// //             {analyticsFilters.filteredSummaries.length === 0 &&
// //                 summaries.length > 0 && (
// //                     <div className="text-center py-12">
// //                         <p className="text-gray-500 mb-4">
// //                             No summaries match your current filters
// //                         </p>
// //                         <button
// //                             onClick={analyticsFilters.clearFilters}
// //                             className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
// //                         >
// //                             Clear Filters
// //                         </button>
// //                     </div>
// //                 )}

// //             {/* Modals */}
// //             <AnalyticsModal
// //                 isOpen={modalState.isOpen}
// //                 modalType={modalState.type}
// //                 summary={modalState.summary}
// //                 onClose={closeModal}
// //                 onBalanceSubmit={handleBalanceSubmit}
// //                 onExpenseSubmit={handleExpenseSubmit}
// //                 onCloseSubmit={handleCloseSubmit}
// //                 isSubmitting={isSubmitting}
// //             />
// //         </div>
// //     );
// // }

// // dashboard/analytics/page.tsx
// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import { createClient } from "@/lib/supabase/client";
// import {
//     DailySummary,
//     Store,
//     ProductBreakdown,
//     Expense,
// } from "./types/analytics";
// import { useAnalyticsFilters } from "./hooks/useAnalyticsFilters";
// import { useAnalyticsActions } from "./hooks/useAnalyticsActions";
// import { AnalyticsFilter } from "./components/AnalyticsFilter";
// import { AnalyticsList } from "./components/AnalyticsList";
// import { AnalyticsModal } from "./components/AnalyticsModal";
// import { BarChart3, Plus, Receipt } from "lucide-react";

// type ModalType = "balance" | "expense" | "close" | null;

// interface OrderItem {
//     quantity: number;
//     products: {
//         name: string;
//     };
// }

// interface Order {
//     id?: string;
//     created_at: string;
//     total_amount?: number;
//     store_id: string;
//     order_items: OrderItem[];
// }

// interface ExpenseWithSummary {
//     id: string;
//     daily_summary_id: string;
//     expense_type: string;
//     amount: number;
//     created_at: string;
//     daily_summaries: {
//         date: string;
//         store_id: string;
//     };
// }

// export default function AnalyticsPageComponent() {
//     const [summaries, setSummaries] = useState<DailySummary[]>([]);
//     const [stores, setStores] = useState<Store[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     // Modal state
//     const [modalState, setModalState] = useState<{
//         isOpen: boolean;
//         type: ModalType;
//         summary: DailySummary | null;
//     }>({ isOpen: false, type: null, summary: null });

//     // Additional data for analytics
//     const [productBreakdown, setProductBreakdown] = useState<{
//         [date: string]: ProductBreakdown;
//     }>({});
//     const [ordersByDate, setOrdersByDate] = useState<{
//         [date: string]: Order[];
//     }>({});
//     const [expensesByDate, setExpensesByDate] = useState<{
//         [date: string]: Expense[];
//     }>({});

//     const supabase = createClient();

//     // Custom hooks
//     const analyticsFilters = useAnalyticsFilters(summaries);
//     const analyticsActions = useAnalyticsActions();

//     const loadStores = useCallback(async () => {
//         try {
//             const { data } = await supabase
//                 .from("stores")
//                 .select("id, name")
//                 .order("name");

//             setStores(data || []);
//         } catch (error) {
//             console.error("Error loading stores:", error);
//         }
//     }, [supabase]);

//     const loadSummaries = useCallback(async () => {
//         if (!analyticsFilters.selectedStoreId) {
//             setSummaries([]);
//             return;
//         }

//         const startOfMonth = `${analyticsFilters.selectedMonth}-01`;
//         const endOfMonth = new Date(
//             new Date(startOfMonth).getFullYear(),
//             new Date(startOfMonth).getMonth() + 1,
//             0
//         )
//             .toISOString()
//             .split("T")[0];

//         const { data } = await supabase
//             .from("daily_summaries")
//             .select(
//                 `
//                 *,
//                 stores:store_id(name),
//                 seller:seller_id(full_name)
//             `
//             )
//             .gte("date", startOfMonth)
//             .lte("date", endOfMonth)
//             .eq("store_id", analyticsFilters.selectedStoreId)
//             .order("date", { ascending: false });

//         setSummaries(data || []);
//     }, [
//         supabase,
//         analyticsFilters.selectedMonth,
//         analyticsFilters.selectedStoreId,
//     ]);

//     const loadProductBreakdown = useCallback(async () => {
//         if (!analyticsFilters.selectedStoreId) {
//             setProductBreakdown({});
//             return;
//         }

//         const startOfMonth = `${analyticsFilters.selectedMonth}-01T00:00:00`;
//         const endOfMonth = `${analyticsFilters.selectedMonth}-31T23:59:59`;

//         const { data } = await supabase
//             .from("orders")
//             .select(
//                 `
//                 created_at,
//                 store_id,
//                 order_items(
//                     quantity,
//                     products(name)
//                 )
//             `
//             )
//             .gte("created_at", startOfMonth)
//             .lt("created_at", endOfMonth)
//             .eq("store_id", analyticsFilters.selectedStoreId);

//         const breakdown: { [date: string]: ProductBreakdown } = {};

//         data?.forEach((order: Order) => {
//             const date = order.created_at.split("T")[0];
//             if (!breakdown[date]) {
//                 breakdown[date] = {};
//             }

//             order.order_items.forEach((item) => {
//                 const productName = item.products?.name || "Unknown";
//                 if (!breakdown[date][productName]) {
//                     breakdown[date][productName] = { quantity: 0, total: 0 };
//                 }
//                 breakdown[date][productName].quantity += item.quantity;
//             });
//         });

//         setProductBreakdown(breakdown);
//     }, [
//         supabase,
//         analyticsFilters.selectedMonth,
//         analyticsFilters.selectedStoreId,
//     ]);

//     const loadOrdersByDate = useCallback(async () => {
//         if (!analyticsFilters.selectedStoreId) {
//             setOrdersByDate({});
//             return;
//         }

//         const startOfMonth = `${analyticsFilters.selectedMonth}-01T00:00:00`;
//         const endOfMonth = `${analyticsFilters.selectedMonth}-31T23:59:59`;

//         const { data } = await supabase
//             .from("orders")
//             .select("id, created_at, total_amount, store_id")
//             .gte("created_at", startOfMonth)
//             .lt("created_at", endOfMonth)
//             .eq("store_id", analyticsFilters.selectedStoreId);

//         const ordersByDate: { [date: string]: Order[] } = {};

//         data?.forEach((order: Order) => {
//             const date = order.created_at.split("T")[0];
//             if (!ordersByDate[date]) {
//                 ordersByDate[date] = [];
//             }
//             ordersByDate[date].push(order);
//         });

//         setOrdersByDate(ordersByDate);
//     }, [
//         supabase,
//         analyticsFilters.selectedMonth,
//         analyticsFilters.selectedStoreId,
//     ]);

//     const loadExpensesByDate = useCallback(async () => {
//         if (!analyticsFilters.selectedStoreId) {
//             setExpensesByDate({});
//             return;
//         }

//         const startOfMonth = `${analyticsFilters.selectedMonth}-01`;
//         const endOfMonth = new Date(
//             new Date(startOfMonth).getFullYear(),
//             new Date(startOfMonth).getMonth() + 1,
//             0
//         )
//             .toISOString()
//             .split("T")[0];

//         const { data } = await supabase
//             .from("expenses")
//             .select(
//                 `
//                 *,
//                 daily_summaries!inner(date, store_id)
//             `
//             )
//             .gte("daily_summaries.date", startOfMonth)
//             .lte("daily_summaries.date", endOfMonth)
//             .eq("daily_summaries.store_id", analyticsFilters.selectedStoreId);

//         const expensesByDate: { [date: string]: Expense[] } = {};

//         data?.forEach((expense: ExpenseWithSummary) => {
//             const date = expense.daily_summaries.date;
//             if (!expensesByDate[date]) {
//                 expensesByDate[date] = [];
//             }
//             expensesByDate[date].push(expense);
//         });

//         setExpensesByDate(expensesByDate);
//     }, [
//         supabase,
//         analyticsFilters.selectedMonth,
//         analyticsFilters.selectedStoreId,
//     ]);

//     const loadAnalyticsData = useCallback(async () => {
//         setLoading(true);
//         try {
//             await Promise.all([
//                 loadSummaries(),
//                 loadProductBreakdown(),
//                 loadOrdersByDate(),
//                 loadExpensesByDate(),
//             ]);
//         } catch (error) {
//             console.error("Error loading analytics data:", error);
//         } finally {
//             setLoading(false);
//         }
//     }, [
//         loadSummaries,
//         loadProductBreakdown,
//         loadOrdersByDate,
//         loadExpensesByDate,
//     ]);

//     useEffect(() => {
//         loadStores();
//     }, [loadStores]);

//     useEffect(() => {
//         if (stores.length > 0 && analyticsFilters.selectedStoreId) {
//             loadAnalyticsData();
//         }
//     }, [
//         analyticsFilters.selectedMonth,
//         analyticsFilters.selectedStoreId,
//         stores,
//         loadAnalyticsData,
//     ]);

//     const openModal = (type: ModalType, summary: DailySummary) => {
//         setModalState({
//             isOpen: true,
//             type,
//             summary,
//         });
//     };

//     const closeModal = () => {
//         setModalState({
//             isOpen: false,
//             type: null,
//             summary: null,
//         });
//     };

//     const handleCreateSummary = async () => {
//         // This could open a modal for creating new summaries
//         // For now, we'll implement basic creation
//         const today = new Date().toISOString().split("T")[0];

//         if (!analyticsFilters.selectedStoreId) {
//             alert("Please select a store first");
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             const {
//                 data: { user },
//             } = await supabase.auth.getUser();
//             if (!user) return;

//             await analyticsActions.createSummary({
//                 storeId: analyticsFilters.selectedStoreId,
//                 sellerId: user.id,
//                 managerId: user.id,
//                 date: today,
//                 openingBalance: 0,
//             });

//             await loadAnalyticsData();
//             alert("Daily summary created successfully!");
//         } catch (error: unknown) {
//             console.error("Error creating summary:", error);
//             const errorMessage =
//                 error instanceof Error
//                     ? error.message
//                     : "Failed to create daily summary";
//             alert(errorMessage);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleBalanceSubmit = async (balance: number) => {
//         if (!modalState.summary) return;

//         setIsSubmitting(true);
//         try {
//             await analyticsActions.updateSummary(modalState.summary.id, {
//                 opening_balance: balance,
//             });

//             await loadAnalyticsData();
//             closeModal();
//         } catch (error) {
//             console.error("Error updating balance:", error);
//             alert("Failed to update opening balance");
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleExpenseSubmit = async (
//         expenses: Array<{
//             label: string;
//             customLabel?: string;
//             amount: string;
//         }>
//     ) => {
//         if (!modalState.summary) return;

//         setIsSubmitting(true);
//         try {
//             await analyticsActions.createExpenses({
//                 dailySummaryId: modalState.summary.id,
//                 storeId: modalState.summary.store_id,
//                 expenses,
//             });

//             await loadAnalyticsData();
//             closeModal();
//         } catch (error) {
//             console.error("Error adding expenses:", error);
//             alert("Failed to add expenses");
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleCloseSubmit = async (
//         actualCash: number,
//         notes: string | null,
//         variance: number
//     ) => {
//         if (!modalState.summary) return;

//         setIsSubmitting(true);
//         try {
//             await analyticsActions.updateSummary(modalState.summary.id, {
//                 actual_cash: actualCash,
//                 variance,
//                 notes,
//                 closed_at: new Date().toISOString(),
//             });

//             await loadAnalyticsData();
//             closeModal();
//         } catch (error) {
//             console.error("Error closing day:", error);
//             alert("Failed to close day");
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleRefreshSales = async (summary: DailySummary) => {
//         setIsSubmitting(true);
//         try {
//             await analyticsActions.refreshSales(
//                 summary.id,
//                 summary.store_id,
//                 summary.date,
//                 summary.opening_balance
//             );

//             await loadAnalyticsData();
//         } catch (error) {
//             console.error("Error refreshing sales:", error);
//             alert("Failed to refresh sales");
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     // Helper functions for child components
//     const getProductBreakdown = (date: string) => productBreakdown[date] || {};
//     const getOrdersCount = (date: string) => ordersByDate[date]?.length || 0;
//     const getExpenses = (date: string) => expensesByDate[date] || [];

//     // Calculate monthly totals
//     const monthlyTotals = {
//         totalSales: analyticsFilters.filteredSummaries.reduce(
//             (sum, s) => sum + s.total_sales,
//             0
//         ),
//         totalExpenses: analyticsFilters.filteredSummaries.reduce(
//             (sum, s) => sum + (s.total_expenses || 0),
//             0
//         ),
//         totalOrders: Object.values(ordersByDate).flat().length,
//         totalCups: Object.values(productBreakdown).reduce(
//             (total, dayBreakdown) =>
//                 total +
//                 Object.values(dayBreakdown).reduce(
//                     (dayTotal, product) => dayTotal + product.quantity,
//                     0
//                 ),
//             0
//         ),
//     };

//     const formatRupiah = (amount: number) => {
//         return new Intl.NumberFormat("id-ID", {
//             style: "currency",
//             currency: "IDR",
//             minimumFractionDigits: 0,
//             maximumFractionDigits: 0,
//         }).format(amount);
//     };

//     if (loading) {
//         return (
//             <div className="flex items-center justify-center h-screen bg-white">
//                 <div className="flex flex-col items-center">
//                     <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//                     <p className="mt-4 text-gray-600 text-sm">
//                         Loading analytics...
//                     </p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div>
//             {/* Header */}
//             <div className="sticky top-0 z-30 py-6 border-b border-gray-200 bg-white">
//                 <div className="flex justify-between items-center">
//                     <div>
//                         <h1 className="text-3xl font-bold">
//                             Daily Analytics Management
//                         </h1>
//                         <p className="text-gray-600">
//                             Monitor and manage daily store summaries and
//                             financial data
//                         </p>
//                     </div>
//                     <button
//                         onClick={handleCreateSummary}
//                         disabled={isSubmitting}
//                         className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex gap-2 items-center justify-center text-sm font-medium disabled:opacity-50"
//                     >
//                         <Plus size={18} />
//                         Create Summary
//                     </button>
//                 </div>

//                 {/* Monthly Summary */}
//                 {analyticsFilters.filteredSummaries.length > 0 && (
//                     <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
//                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
//                             <div className="flex items-center gap-2 mb-1">
//                                 <Receipt className="w-4 h-4 text-blue-600" />
//                                 <p className="text-sm text-blue-600 font-medium">
//                                     Orders
//                                 </p>
//                             </div>
//                             <p className="text-2xl font-bold text-blue-700">
//                                 {monthlyTotals.totalOrders}
//                             </p>
//                         </div>
//                         <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
//                             <div className="flex items-center gap-2 mb-1">
//                                 <BarChart3 className="w-4 h-4 text-orange-600" />
//                                 <p className="text-sm text-orange-600 font-medium">
//                                     Cups
//                                 </p>
//                             </div>
//                             <p className="text-2xl font-bold text-orange-700">
//                                 {monthlyTotals.totalCups}
//                             </p>
//                         </div>
//                         <div className="bg-green-50 p-4 rounded-lg border border-green-200">
//                             <div className="flex items-center gap-2 mb-1">
//                                 <BarChart3 className="w-4 h-4 text-green-600" />
//                                 <p className="text-sm text-green-600 font-medium">
//                                     Sales
//                                 </p>
//                             </div>
//                             <p className="text-2xl font-bold text-green-700">
//                                 {formatRupiah(monthlyTotals.totalSales)}
//                             </p>
//                         </div>
//                         <div className="bg-red-50 p-4 rounded-lg border border-red-200">
//                             <div className="flex items-center gap-2 mb-1">
//                                 <BarChart3 className="w-4 h-4 text-red-600" />
//                                 <p className="text-sm text-red-600 font-medium">
//                                     Expenses
//                                 </p>
//                             </div>
//                             <p className="text-2xl font-bold text-red-700">
//                                 {formatRupiah(monthlyTotals.totalExpenses)}
//                             </p>
//                         </div>
//                     </div>
//                 )}

//                 <div className="pt-4">
//                     <AnalyticsFilter
//                         selectedMonth={analyticsFilters.selectedMonth}
//                         onMonthChange={analyticsFilters.setSelectedMonth}
//                         selectedStoreId={analyticsFilters.selectedStoreId}
//                         onStoreSelectionChange={
//                             analyticsFilters.setSelectedStoreId
//                         }
//                         summaryIdSearch={analyticsFilters.summaryIdSearch}
//                         onSummaryIdSearchChange={
//                             analyticsFilters.setSummaryIdSearch
//                         }
//                         stores={stores}
//                         totalSummaries={summaries.length}
//                         filteredSummariesCount={
//                             analyticsFilters.filteredSummaries.length
//                         }
//                         onClearFilters={analyticsFilters.clearFilters}
//                         hasActiveFilters={analyticsFilters.hasActiveFilters}
//                     />
//                 </div>
//             </div>

//             {/* Main Content */}
//             <div className="py-6">
//                 <AnalyticsList
//                     summaries={analyticsFilters.filteredSummaries}
//                     onEditBalance={(summary) => openModal("balance", summary)}
//                     onAddExpense={(summary) => openModal("expense", summary)}
//                     onCloseDay={(summary) => openModal("close", summary)}
//                     onRefreshSales={handleRefreshSales}
//                     getProductBreakdown={getProductBreakdown}
//                     getOrdersCount={getOrdersCount}
//                     getExpenses={getExpenses}
//                 />
//             </div>

//             {/* No Results State */}
//             {analyticsFilters.filteredSummaries.length === 0 &&
//                 summaries.length > 0 && (
//                     <div className="text-center py-12">
//                         <p className="text-gray-500 mb-4">
//                             No summaries match your current filters
//                         </p>
//                         <button
//                             onClick={analyticsFilters.clearFilters}
//                             className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
//                         >
//                             Clear Filters
//                         </button>
//                     </div>
//                 )}

//             {/* Modals */}
//             <AnalyticsModal
//                 isOpen={modalState.isOpen}
//                 modalType={modalState.type}
//                 summary={modalState.summary}
//                 onClose={closeModal}
//                 onBalanceSubmit={handleBalanceSubmit}
//                 onExpenseSubmit={handleExpenseSubmit}
//                 onCloseSubmit={handleCloseSubmit}
//                 isSubmitting={isSubmitting}
//             />
//         </div>
//     );
// }

// dashboard/analytics/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    DailySummary,
    Store,
    ProductBreakdown,
    Expense,
} from "./types/analytics";
import { useAnalyticsFilters } from "./hooks/useAnalyticsFilters";
import { useAnalyticsActions } from "./hooks/useAnalyticsActions";
import { AnalyticsFilter } from "./components/AnalyticsFilter";
import { AnalyticsList } from "./components/AnalyticsList";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { BarChart3, Plus, Receipt } from "lucide-react";

type ModalType = "balance" | "expense" | "close" | null;

interface OrderItem {
    quantity: number;
    products: {
        name: string;
    };
}

interface Order {
    id?: string;
    created_at: string;
    total_amount?: number;
    store_id: string;
    order_items: OrderItem[];
}

interface ExpenseWithSummary {
    id: string;
    daily_summary_id: string;
    expense_type: string;
    amount: number;
    created_at: string;
    daily_summaries: {
        date: string;
        store_id: string;
    };
}

export default function AnalyticsPageComponent() {
    const [summaries, setSummaries] = useState<DailySummary[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal state
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        type: ModalType;
        summary: DailySummary | null;
    }>({ isOpen: false, type: null, summary: null });

    // Additional data for analytics
    const [productBreakdown, setProductBreakdown] = useState<{
        [date: string]: ProductBreakdown;
    }>({});
    const [ordersByDate, setOrdersByDate] = useState<{
        [date: string]: Order[];
    }>({});
    const [expensesByDate, setExpensesByDate] = useState<{
        [date: string]: Expense[];
    }>({});

    const supabase = createClient();

    // Custom hooks
    const analyticsFilters = useAnalyticsFilters(summaries);
    const analyticsActions = useAnalyticsActions();

    const loadStores = useCallback(async () => {
        try {
            console.log("Loading stores...");
            const { data, error } = await supabase
                .from("stores")
                .select("id, name")
                .order("name");

            if (error) {
                console.error("Supabase error loading stores:", error);
                setLoading(false);
                return;
            }

            console.log("Stores loaded:", data);
            setStores(data || []);
        } catch (error) {
            console.error("Error loading stores:", error);
            setLoading(false);
        }
    }, [supabase]);

    const loadSummaries = useCallback(async () => {
        if (!analyticsFilters.selectedStoreId) {
            console.log("No store selected, clearing summaries");
            setSummaries([]);
            return;
        }

        console.log(
            "Loading summaries for store:",
            analyticsFilters.selectedStoreId,
            "month:",
            analyticsFilters.selectedMonth
        );

        const startOfMonth = `${analyticsFilters.selectedMonth}-01`;
        const endOfMonth = new Date(
            new Date(startOfMonth).getFullYear(),
            new Date(startOfMonth).getMonth() + 1,
            0
        )
            .toISOString()
            .split("T")[0];

        try {
            const { data, error } = await supabase
                .from("daily_summaries")
                .select(
                    `
                    *,
                    stores:store_id(name),
                    seller:seller_id(full_name)
                `
                )
                .gte("date", startOfMonth)
                .lte("date", endOfMonth)
                .eq("store_id", analyticsFilters.selectedStoreId)
                .order("date", { ascending: false });

            if (error) {
                console.error("Supabase error loading summaries:", error);
                return;
            }

            console.log("Summaries loaded:", data?.length || 0, "records");
            setSummaries(data || []);
        } catch (error) {
            console.error("Error loading summaries:", error);
        }
    }, [
        supabase,
        analyticsFilters.selectedMonth,
        analyticsFilters.selectedStoreId,
    ]);

    const loadProductBreakdown = useCallback(async () => {
        if (!analyticsFilters.selectedStoreId) {
            setProductBreakdown({});
            return;
        }

        const startOfMonth = `${analyticsFilters.selectedMonth}-01T00:00:00`;
        const endOfMonth = `${analyticsFilters.selectedMonth}-31T23:59:59`;

        const { data } = await supabase
            .from("orders")
            .select(
                `
                created_at,
                store_id,
                order_items(
                    quantity,
                    products(name)
                )
            `
            )
            .gte("created_at", startOfMonth)
            .lt("created_at", endOfMonth)
            .eq("store_id", analyticsFilters.selectedStoreId);

        const breakdown: { [date: string]: ProductBreakdown } = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.forEach((order: any) => {
            const date = order.created_at.split("T")[0];
            if (!breakdown[date]) {
                breakdown[date] = {};
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            order.order_items.forEach((item: any) => {
                const productName = item.products?.name || "Unknown";
                if (!breakdown[date][productName]) {
                    breakdown[date][productName] = { quantity: 0, total: 0 };
                }
                breakdown[date][productName].quantity += item.quantity;
            });
        });

        setProductBreakdown(breakdown);
    }, [
        supabase,
        analyticsFilters.selectedMonth,
        analyticsFilters.selectedStoreId,
    ]);

    const loadOrdersByDate = useCallback(async () => {
        if (!analyticsFilters.selectedStoreId) {
            setOrdersByDate({});
            return;
        }

        const startOfMonth = `${analyticsFilters.selectedMonth}-01T00:00:00`;
        const endOfMonth = `${analyticsFilters.selectedMonth}-31T23:59:59`;

        const { data } = await supabase
            .from("orders")
            .select("id, created_at, total_amount, store_id")
            .gte("created_at", startOfMonth)
            .lt("created_at", endOfMonth)
            .eq("store_id", analyticsFilters.selectedStoreId);

        const ordersByDate: { [date: string]: Order[] } = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.forEach((order: any) => {
            const date = order.created_at.split("T")[0];
            if (!ordersByDate[date]) {
                ordersByDate[date] = [];
            }
            ordersByDate[date].push(order);
        });

        setOrdersByDate(ordersByDate);
    }, [
        supabase,
        analyticsFilters.selectedMonth,
        analyticsFilters.selectedStoreId,
    ]);

    const loadExpensesByDate = useCallback(async () => {
        if (!analyticsFilters.selectedStoreId) {
            setExpensesByDate({});
            return;
        }

        const startOfMonth = `${analyticsFilters.selectedMonth}-01`;
        const endOfMonth = new Date(
            new Date(startOfMonth).getFullYear(),
            new Date(startOfMonth).getMonth() + 1,
            0
        )
            .toISOString()
            .split("T")[0];

        const { data } = await supabase
            .from("expenses")
            .select(
                `
                *,
                daily_summaries!inner(date, store_id)
            `
            )
            .gte("daily_summaries.date", startOfMonth)
            .lte("daily_summaries.date", endOfMonth)
            .eq("daily_summaries.store_id", analyticsFilters.selectedStoreId);

        const expensesByDate: { [date: string]: Expense[] } = {};

        data?.forEach((expense: ExpenseWithSummary) => {
            const date = expense.daily_summaries.date;
            if (!expensesByDate[date]) {
                expensesByDate[date] = [];
            }
            expensesByDate[date].push(expense);
        });

        setExpensesByDate(expensesByDate);
    }, [
        supabase,
        analyticsFilters.selectedMonth,
        analyticsFilters.selectedStoreId,
    ]);

    const loadAnalyticsData = useCallback(async () => {
        console.log("Starting loadAnalyticsData...");
        setLoading(true);
        try {
            await Promise.all([
                loadSummaries(),
                loadProductBreakdown(),
                loadOrdersByDate(),
                loadExpensesByDate(),
            ]);
            console.log("All analytics data loaded successfully");
        } catch (error) {
            console.error("Error loading analytics data:", error);
        } finally {
            console.log("Setting loading to false");
            setLoading(false);
        }
    }, [
        loadSummaries,
        loadProductBreakdown,
        loadOrdersByDate,
        loadExpensesByDate,
    ]);

    useEffect(() => {
        loadStores();
    }, [loadStores]);

    // Auto-select first store if none selected and stores are loaded
    useEffect(() => {
        if (stores.length > 0 && !analyticsFilters.selectedStoreId) {
            analyticsFilters.setSelectedStoreId(stores[0].id);
        }
    }, [stores, analyticsFilters]);

    useEffect(() => {
        if (analyticsFilters.selectedStoreId) {
            loadAnalyticsData();
        } else {
            // Clear loading state if no store is selected
            setLoading(false);
        }
    }, [
        analyticsFilters.selectedMonth,
        analyticsFilters.selectedStoreId,
        loadAnalyticsData,
    ]);

    const openModal = (type: ModalType, summary: DailySummary) => {
        setModalState({
            isOpen: true,
            type,
            summary,
        });
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            type: null,
            summary: null,
        });
    };

    const handleCreateSummary = async () => {
        // This could open a modal for creating new summaries
        // For now, we'll implement basic creation
        const today = new Date().toISOString().split("T")[0];

        if (!analyticsFilters.selectedStoreId) {
            alert("Please select a store first");
            return;
        }

        setIsSubmitting(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            await analyticsActions.createSummary({
                storeId: analyticsFilters.selectedStoreId,
                sellerId: user.id,
                managerId: user.id,
                date: today,
                openingBalance: 0,
            });

            await loadAnalyticsData();
            alert("Daily summary created successfully!");
        } catch (error: unknown) {
            console.error("Error creating summary:", error);
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to create daily summary";
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBalanceSubmit = async (balance: number) => {
        if (!modalState.summary) return;

        setIsSubmitting(true);
        try {
            await analyticsActions.updateSummary(modalState.summary.id, {
                opening_balance: balance,
            });

            await loadAnalyticsData();
            closeModal();
        } catch (error) {
            console.error("Error updating balance:", error);
            alert("Failed to update opening balance");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExpenseSubmit = async (
        expenses: Array<{
            label: string;
            customLabel?: string;
            amount: string;
        }>
    ) => {
        if (!modalState.summary) return;

        setIsSubmitting(true);
        try {
            await analyticsActions.createExpenses({
                dailySummaryId: modalState.summary.id,
                storeId: modalState.summary.store_id,
                expenses,
            });

            await loadAnalyticsData();
            closeModal();
        } catch (error) {
            console.error("Error adding expenses:", error);
            alert("Failed to add expenses");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseSubmit = async (
        actualCash: number,
        notes: string | null,
        variance: number
    ) => {
        if (!modalState.summary) return;

        setIsSubmitting(true);
        try {
            await analyticsActions.updateSummary(modalState.summary.id, {
                actual_cash: actualCash,
                variance,
                notes,
                closed_at: new Date().toISOString(),
            });

            await loadAnalyticsData();
            closeModal();
        } catch (error) {
            console.error("Error closing day:", error);
            alert("Failed to close day");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefreshSales = async (summary: DailySummary) => {
        setIsSubmitting(true);
        try {
            await analyticsActions.refreshSales(
                summary.id,
                summary.store_id,
                summary.date,
                summary.opening_balance
            );

            await loadAnalyticsData();
        } catch (error) {
            console.error("Error refreshing sales:", error);
            alert("Failed to refresh sales");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper functions for child components
    const getProductBreakdown = (date: string) => productBreakdown[date] || {};
    const getOrdersCount = (date: string) => ordersByDate[date]?.length || 0;
    const getExpenses = (date: string) => expensesByDate[date] || [];

    // Calculate monthly totals
    const monthlyTotals = {
        totalSales: analyticsFilters.filteredSummaries.reduce(
            (sum, s) => sum + s.total_sales,
            0
        ),
        totalExpenses: analyticsFilters.filteredSummaries.reduce(
            (sum, s) => sum + (s.total_expenses || 0),
            0
        ),
        totalOrders: Object.values(ordersByDate).flat().length,
        totalCups: Object.values(productBreakdown).reduce(
            (total, dayBreakdown) =>
                total +
                Object.values(dayBreakdown).reduce(
                    (dayTotal, product) => dayTotal + product.quantity,
                    0
                ),
            0
        ),
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 text-sm">
                        Loading analytics...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="sticky top-0 z-30 py-6 border-b border-gray-200 bg-white">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Daily Analytics Management
                        </h1>
                        <p className="text-gray-600">
                            Monitor and manage daily store summaries and
                            financial data
                        </p>
                    </div>
                    <button
                        onClick={handleCreateSummary}
                        disabled={isSubmitting}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex gap-2 items-center justify-center text-sm font-medium disabled:opacity-50"
                    >
                        <Plus size={18} />
                        Create Summary
                    </button>
                </div>

                {/* Monthly Summary */}
                {analyticsFilters.filteredSummaries.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                                <Receipt className="w-4 h-4 text-blue-600" />
                                <p className="text-sm text-blue-600 font-medium">
                                    Orders
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-blue-700">
                                {monthlyTotals.totalOrders}
                            </p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="w-4 h-4 text-orange-600" />
                                <p className="text-sm text-orange-600 font-medium">
                                    Cups
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-orange-700">
                                {monthlyTotals.totalCups}
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="w-4 h-4 text-green-600" />
                                <p className="text-sm text-green-600 font-medium">
                                    Sales
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-green-700">
                                {formatRupiah(monthlyTotals.totalSales)}
                            </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="w-4 h-4 text-red-600" />
                                <p className="text-sm text-red-600 font-medium">
                                    Expenses
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-red-700">
                                {formatRupiah(monthlyTotals.totalExpenses)}
                            </p>
                        </div>
                    </div>
                )}

                <div className="pt-4">
                    <AnalyticsFilter
                        selectedMonth={analyticsFilters.selectedMonth}
                        onMonthChange={analyticsFilters.setSelectedMonth}
                        selectedStoreId={analyticsFilters.selectedStoreId}
                        onStoreSelectionChange={
                            analyticsFilters.setSelectedStoreId
                        }
                        summaryIdSearch={analyticsFilters.summaryIdSearch}
                        onSummaryIdSearchChange={
                            analyticsFilters.setSummaryIdSearch
                        }
                        stores={stores}
                        totalSummaries={summaries.length}
                        filteredSummariesCount={
                            analyticsFilters.filteredSummaries.length
                        }
                        onClearFilters={analyticsFilters.clearFilters}
                        hasActiveFilters={analyticsFilters.hasActiveFilters}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="py-6">
                <AnalyticsList
                    summaries={analyticsFilters.filteredSummaries}
                    onEditBalance={(summary) => openModal("balance", summary)}
                    onAddExpense={(summary) => openModal("expense", summary)}
                    onCloseDay={(summary) => openModal("close", summary)}
                    onRefreshSales={handleRefreshSales}
                    getProductBreakdown={getProductBreakdown}
                    getOrdersCount={getOrdersCount}
                    getExpenses={getExpenses}
                />
            </div>

            {/* No Results State */}
            {analyticsFilters.filteredSummaries.length === 0 &&
                summaries.length > 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">
                            No summaries match your current filters
                        </p>
                        <button
                            onClick={analyticsFilters.clearFilters}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

            {/* Modals */}
            <AnalyticsModal
                isOpen={modalState.isOpen}
                modalType={modalState.type}
                summary={modalState.summary}
                onClose={closeModal}
                onBalanceSubmit={handleBalanceSubmit}
                onExpenseSubmit={handleExpenseSubmit}
                onCloseSubmit={handleCloseSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
