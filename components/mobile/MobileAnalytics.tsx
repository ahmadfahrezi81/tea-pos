// //components/mobile/MobileAnalytics.tsx
// "use client";
// import { useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";
// import { Profile } from "@/lib/types";
// import {
//     Plus,
//     RefreshCw,
//     X,
//     Calendar,
//     DollarSign,
//     TrendingUp,
//     AlertCircle,
// } from "lucide-react";
// import { formatRupiah } from "@/lib/utils/formatCurrency";

// interface DailySummary {
//     id: string;
//     store_id: string;
//     seller_id: string;
//     manager_id: string | null;
//     date: string;
//     opening_balance: number;
//     total_sales: number;
//     expected_cash: number;
//     actual_cash: number | null;
//     variance: number | null;
//     closed_at: string | null;
//     notes: string | null;
//     created_at: string;
//     stores?: { name: string };
//     seller?: { full_name: string };
// }

// interface MobileAnalyticsProps {
//     profile: Profile | null;
// }

// export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
//     const [selectedStore, setSelectedStore] = useState<string>("");
//     const [selectedDate, setSelectedDate] = useState<string>(
//         new Date().toISOString().split("T")[0]
//     );
//     const [showOpeningForm, setShowOpeningForm] = useState(false);
//     const [showCloseForm, setShowCloseForm] = useState(false);
//     const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(
//         null
//     );
//     const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
//     const [toast, setToast] = useState<{
//         message: string;
//         type: "success" | "error";
//     } | null>(null);

//     const [openingForm, setOpeningForm] = useState({
//         store_id: "",
//         seller_id: "",
//         opening_balance: "",
//         date: "",
//     });
//     const [closeForm, setCloseForm] = useState({
//         actual_cash: "",
//         notes: "",
//     });

//     const supabase = createClient();
//     const {
//         stores = [],
//         sellers = [],
//         summaries = [],
//         isLoading,
//         mutate,
//     } = useAnalyticsData(selectedStore, selectedDate);

//     const showToast = (message: string, type: "success" | "error") => {
//         setToast({ message, type });
//         setTimeout(() => setToast(null), 3000);
//     };

//     const calculateTotalSales = async (storeId: string, date: string) => {
//         const { data: orders } = await supabase
//             .from("orders")
//             .select("total_amount")
//             .eq("store_id", storeId)
//             .gte("created_at", `${date}T00:00:00`)
//             .lt("created_at", `${date}T23:59:59`);

//         return orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
//     };

//     const handleOpeningSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();

//         try {
//             const {
//                 data: { user },
//             } = await supabase.auth.getUser();
//             if (!user) return;

//             const { data: existing } = await supabase
//                 .from("daily_summaries")
//                 .select("id")
//                 .eq("store_id", openingForm.store_id)
//                 .eq("date", openingForm.date)
//                 .single();

//             if (existing) {
//                 showToast(
//                     "Daily summary already exists for this store and date",
//                     "error"
//                 );
//                 return;
//             }

//             const totalSales = await calculateTotalSales(
//                 openingForm.store_id,
//                 openingForm.date
//             );
//             const openingBalance = parseFloat(openingForm.opening_balance);
//             const expectedCash = openingBalance + totalSales;

//             const { error } = await supabase.from("daily_summaries").insert({
//                 store_id: openingForm.store_id,
//                 seller_id: openingForm.seller_id,
//                 manager_id: user.id,
//                 date: openingForm.date,
//                 opening_balance: openingBalance,
//                 total_sales: totalSales,
//                 expected_cash: expectedCash,
//             });

//             if (error) throw error;

//             showToast("Daily summary created successfully", "success");
//             setOpeningForm({
//                 store_id: "",
//                 seller_id: "",
//                 opening_balance: "",
//                 date: "",
//             });
//             setShowOpeningForm(false);
//             mutate();
//         } catch (error) {
//             showToast("Failed to create daily summary", "error");
//             console.error(error);
//         }
//     };

//     const handleCloseDay = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!selectedSummary) return;

//         try {
//             const actualCash = parseFloat(closeForm.actual_cash);
//             const variance = actualCash - selectedSummary.expected_cash;

//             const { error } = await supabase
//                 .from("daily_summaries")
//                 .update({
//                     actual_cash: actualCash,
//                     variance: variance,
//                     notes: closeForm.notes || null,
//                     closed_at: new Date().toISOString(),
//                 })
//                 .eq("id", selectedSummary.id);

//             if (error) throw error;

//             showToast("Day closed successfully", "success");
//             setCloseForm({ actual_cash: "", notes: "" });
//             setShowCloseForm(false);
//             setSelectedSummary(null);
//             mutate();
//         } catch (error) {
//             showToast("Failed to close day", "error");
//             console.error(error);
//         }
//     };

//     const refreshSales = async (summary: DailySummary) => {
//         try {
//             const totalSales = await calculateTotalSales(
//                 summary.store_id,
//                 summary.date
//             );
//             const expectedCash = summary.opening_balance + totalSales;

//             const { error } = await supabase
//                 .from("daily_summaries")
//                 .update({
//                     total_sales: totalSales,
//                     expected_cash: expectedCash,
//                 })
//                 .eq("id", summary.id);

//             if (error) throw error;

//             showToast("Sales refreshed successfully", "success");
//             mutate();
//         } catch (error) {
//             showToast("Failed to refresh sales", "error");
//             console.error(error);
//         }
//     };

//     const formatDate = (dateStr: string) => {
//         const date = new Date(dateStr);
//         const today = new Date();
//         const yesterday = new Date(today);
//         yesterday.setDate(yesterday.getDate() - 1);

//         if (date.toDateString() === today.toDateString()) {
//             return "Today";
//         } else if (date.toDateString() === yesterday.toDateString()) {
//             return "Yesterday";
//         } else {
//             return date.toLocaleDateString("en-US", {
//                 month: "short",
//                 day: "numeric",
//                 year:
//                     date.getFullYear() !== today.getFullYear()
//                         ? "numeric"
//                         : undefined,
//             });
//         }
//     };

//     if (isLoading) {
//         return (
//             <div className="text-center py-8">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
//                 <p className="text-gray-600">Loading analytics...</p>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-4">
//             {/* Store and Date Selection */}
//             <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Store
//                     </label>
//                     <select
//                         value={selectedStore}
//                         onChange={(e) => setSelectedStore(e.target.value)}
//                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                     >
//                         <option value="">Select a store...</option>
//                         {stores.map((store) => (
//                             <option key={store.id} value={store.id}>
//                                 {store.name}
//                             </option>
//                         ))}
//                     </select>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Date (Last 7 days from)
//                     </label>
//                     <input
//                         type="date"
//                         value={selectedDate}
//                         onChange={(e) => setSelectedDate(e.target.value)}
//                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                     />
//                 </div>

//                 <button
//                     onClick={() => setShowOpeningForm(true)}
//                     disabled={!selectedStore}
//                     className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
//                 >
//                     <Plus size={20} className="mr-2" />
//                     Set Opening Balance
//                 </button>
//             </div>

//             {/* Daily Summaries */}
//             {selectedStore && (
//                 <div className="space-y-3">
//                     {summaries.length === 0 ? (
//                         <div className="bg-white p-8 rounded-lg shadow-sm text-center">
//                             <Calendar
//                                 size={48}
//                                 className="mx-auto text-gray-400 mb-4"
//                             />
//                             <p className="text-gray-600">
//                                 No daily summaries found
//                             </p>
//                             <p className="text-sm text-gray-500 mt-1">
//                                 Create an opening balance to get started
//                             </p>
//                         </div>
//                     ) : (
//                         summaries.map((summary) => (
//                             <div
//                                 key={summary.id}
//                                 className="bg-white rounded-lg shadow-sm overflow-hidden"
//                             >
//                                 <div
//                                     className="p-4 cursor-pointer"
//                                     onClick={() =>
//                                         setExpandedSummary(
//                                             expandedSummary === summary.id
//                                                 ? null
//                                                 : summary.id
//                                         )
//                                     }
//                                 >
//                                     <div className="flex justify-between items-start mb-2">
//                                         <div>
//                                             <h3 className="font-semibold text-gray-800">
//                                                 {formatDate(summary.date)}
//                                             </h3>
//                                             <p className="text-sm text-gray-600">
//                                                 {summary.seller?.full_name}
//                                             </p>
//                                         </div>
//                                         <div className="text-right">
//                                             {summary.closed_at ? (
//                                                 <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
//                                                     Closed
//                                                 </span>
//                                             ) : (
//                                                 <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
//                                                     Open
//                                                 </span>
//                                             )}
//                                         </div>
//                                     </div>

//                                     <div className="grid grid-cols-2 gap-4">
//                                         <div>
//                                             <p className="text-xs text-gray-500">
//                                                 Sales
//                                             </p>
//                                             <p className="text-lg font-bold text-green-600">
//                                                 {formatRupiah(
//                                                     summary.total_sales
//                                                 )}
//                                             </p>
//                                         </div>
//                                         <div>
//                                             <p className="text-xs text-gray-500">
//                                                 Expected
//                                             </p>
//                                             <p className="text-lg font-bold text-blue-600">
//                                                 {formatRupiah(
//                                                     summary.expected_cash
//                                                 )}
//                                             </p>
//                                         </div>
//                                     </div>

//                                     {summary.variance !== null && (
//                                         <div className="mt-2">
//                                             <p
//                                                 className={`text-sm font-medium ${
//                                                     summary.variance >= 0
//                                                         ? "text-green-600"
//                                                         : "text-red-600"
//                                                 }`}
//                                             >
//                                                 Variance:
//                                                 {summary.variance >= 0
//                                                     ? "+"
//                                                     : ""}
//                                                 {formatRupiah(summary.variance)}
//                                             </p>
//                                         </div>
//                                     )}
//                                 </div>

//                                 {/* Expanded Details */}
//                                 {expandedSummary === summary.id && (
//                                     <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
//                                         <div className="grid grid-cols-2 gap-4">
//                                             <div>
//                                                 <p className="text-xs text-gray-500 mb-1">
//                                                     Opening Balance
//                                                 </p>
//                                                 <p className="font-semibold">
//                                                     {formatRupiah(
//                                                         summary.opening_balance
//                                                     )}
//                                                 </p>
//                                             </div>
//                                             <div>
//                                                 <p className="text-xs text-gray-500 mb-1">
//                                                     Actual Cash
//                                                 </p>
//                                                 <p className="font-semibold">
//                                                     {summary.actual_cash !==
//                                                     null
//                                                         ? `${formatRupiah(
//                                                               summary.actual_cash
//                                                           )}`
//                                                         : "Not counted"}
//                                                 </p>
//                                             </div>
//                                         </div>

//                                         {summary.notes && (
//                                             <div>
//                                                 <p className="text-xs text-gray-500 mb-1">
//                                                     Notes
//                                                 </p>
//                                                 <p className="text-sm text-gray-700 bg-white p-2 rounded">
//                                                     {summary.notes}
//                                                 </p>
//                                             </div>
//                                         )}

//                                         {summary.closed_at && (
//                                             <div className="text-xs text-gray-500">
//                                                 Closed:{" "}
//                                                 {new Date(
//                                                     summary.closed_at
//                                                 ).toLocaleString()}
//                                             </div>
//                                         )}

//                                         {!summary.closed_at && (
//                                             <div className="flex space-x-2">
//                                                 <button
//                                                     onClick={(e) => {
//                                                         e.stopPropagation();
//                                                         refreshSales(summary);
//                                                     }}
//                                                     className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center"
//                                                 >
//                                                     <RefreshCw
//                                                         size={16}
//                                                         className="mr-1"
//                                                     />
//                                                     Refresh
//                                                 </button>
//                                                 <button
//                                                     onClick={(e) => {
//                                                         e.stopPropagation();
//                                                         setSelectedSummary(
//                                                             summary
//                                                         );
//                                                         setCloseForm({
//                                                             actual_cash:
//                                                                 summary.expected_cash.toString(),
//                                                             notes: "",
//                                                         });
//                                                         setShowCloseForm(true);
//                                                     }}
//                                                     className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
//                                                 >
//                                                     Close Day
//                                                 </button>
//                                             </div>
//                                         )}
//                                     </div>
//                                 )}
//                             </div>
//                         ))
//                     )}
//                 </div>
//             )}

//             {/* Opening Balance Modal */}
//             {showOpeningForm && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                     onClick={() => setShowOpeningForm(false)}
//                 >
//                     <div
//                         className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//                             <h2 className="text-lg font-semibold">
//                                 Set Opening Balance
//                             </h2>
//                             <button
//                                 onClick={() => setShowOpeningForm(false)}
//                                 className="p-1 hover:bg-gray-100 rounded"
//                             >
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         <form
//                             onSubmit={handleOpeningSubmit}
//                             className="p-4 space-y-4"
//                         >
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     Store
//                                 </label>
//                                 <select
//                                     value={openingForm.store_id}
//                                     onChange={(e) =>
//                                         setOpeningForm({
//                                             ...openingForm,
//                                             store_id: e.target.value,
//                                         })
//                                     }
//                                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                     required
//                                 >
//                                     <option value="">Select store...</option>
//                                     {stores.map((store) => (
//                                         <option key={store.id} value={store.id}>
//                                             {store.name}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>

//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     Seller
//                                 </label>
//                                 <select
//                                     value={openingForm.seller_id}
//                                     onChange={(e) =>
//                                         setOpeningForm({
//                                             ...openingForm,
//                                             seller_id: e.target.value,
//                                         })
//                                     }
//                                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                     required
//                                 >
//                                     <option value="">Select seller...</option>
//                                     {sellers.map((seller) => (
//                                         <option
//                                             key={seller.id}
//                                             value={seller.id}
//                                         >
//                                             {seller.full_name}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>

//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     Date
//                                 </label>
//                                 <input
//                                     type="date"
//                                     value={openingForm.date}
//                                     onChange={(e) =>
//                                         setOpeningForm({
//                                             ...openingForm,
//                                             date: e.target.value,
//                                         })
//                                     }
//                                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                     required
//                                 />
//                             </div>

//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     Opening Balance
//                                 </label>
//                                 <input
//                                     type="number"
//                                     step="100"
//                                     min={0}
//                                     value={openingForm.opening_balance}
//                                     onChange={(e) =>
//                                         setOpeningForm({
//                                             ...openingForm,
//                                             opening_balance: e.target.value,
//                                         })
//                                     }
//                                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                     placeholder="0.00"
//                                     required
//                                 />
//                             </div>

//                             <button
//                                 type="submit"
//                                 className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600"
//                             >
//                                 Create Opening Balance
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             )}

//             {/* Close Day Modal */}
//             {showCloseForm && selectedSummary && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                     onClick={() => setShowCloseForm(false)}
//                 >
//                     <div
//                         className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//                             <h2 className="text-lg font-semibold">Close Day</h2>
//                             <button
//                                 onClick={() => setShowCloseForm(false)}
//                                 className="p-1 hover:bg-gray-100 rounded"
//                             >
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         <div className="p-4 space-y-4">
//                             <div className="bg-blue-50 p-4 rounded-lg">
//                                 <p className="font-medium text-blue-800">
//                                     Expected Cash
//                                 </p>
//                                 <p className="text-2xl font-bold text-blue-600">
//                                     {formatRupiah(
//                                         selectedSummary.expected_cash
//                                     )}
//                                 </p>
//                                 <p className="text-sm text-blue-600">
//                                     Opening:
//                                     {formatRupiah(
//                                         selectedSummary.opening_balance
//                                     )}{" "}
//                                     + Sales:
//                                     {formatRupiah(selectedSummary.total_sales)}
//                                 </p>
//                             </div>

//                             <form
//                                 onSubmit={handleCloseDay}
//                                 className="space-y-4"
//                             >
//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         Actual Cash Count
//                                     </label>
//                                     <input
//                                         type="number"
//                                         step="100"
//                                         min={0}
//                                         value={closeForm.actual_cash}
//                                         onChange={(e) =>
//                                             setCloseForm({
//                                                 ...closeForm,
//                                                 actual_cash: e.target.value,
//                                             })
//                                         }
//                                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                         placeholder="0.00"
//                                         required
//                                     />
//                                 </div>

//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         Notes (Optional)
//                                     </label>
//                                     <textarea
//                                         value={closeForm.notes}
//                                         onChange={(e) =>
//                                             setCloseForm({
//                                                 ...closeForm,
//                                                 notes: e.target.value,
//                                             })
//                                         }
//                                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20"
//                                         placeholder="Any notes about the day..."
//                                     />
//                                 </div>

//                                 {closeForm.actual_cash && (
//                                     <div
//                                         className={`p-4 rounded-lg ${
//                                             parseFloat(closeForm.actual_cash) -
//                                                 selectedSummary.expected_cash >=
//                                             0
//                                                 ? "bg-green-50"
//                                                 : "bg-red-50"
//                                         }`}
//                                     >
//                                         <p className="font-medium">
//                                             Variance:{" "}
//                                             {formatRupiah(
//                                                 parseInt(
//                                                     closeForm.actual_cash
//                                                 ) -
//                                                     selectedSummary.expected_cash
//                                             )}
//                                         </p>
//                                     </div>
//                                 )}

//                                 <button
//                                     type="submit"
//                                     className="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600"
//                                 >
//                                     Close Day
//                                 </button>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Toast Notification */}
//             {toast && (
//                 <div
//                     className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
//                         toast.type === "success"
//                             ? "bg-green-500 text-white"
//                             : "bg-red-500 text-white"
//                     }`}
//                 >
//                     <div className="flex justify-between items-center">
//                         <span className="font-medium">{toast.message}</span>
//                         <button
//                             onClick={() => setToast(null)}
//                             className="ml-4 text-white hover:opacity-75"
//                         >
//                             ×
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// //components/mobile/MobileAnalytics.tsx
// "use client";
// import { useState, useEffect } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";
// import { Profile } from "@/lib/types";
// import {
//     RefreshCw,
//     X,
//     Calendar,
//     Edit3,
//     ChevronDown,
//     ChevronUp,
// } from "lucide-react";
// import { formatRupiah } from "@/lib/utils/formatCurrency";

// interface DailySummary {
//     id: string;
//     store_id: string;
//     seller_id: string;
//     manager_id: string | null;
//     date: string;
//     opening_balance: number;
//     total_sales: number;
//     expected_cash: number;
//     actual_cash: number | null;
//     variance: number | null;
//     closed_at: string | null;
//     notes: string | null;
//     created_at: string;
//     stores?: { name: string };
//     seller?: { full_name: string };
// }

// interface MobileAnalyticsProps {
//     profile: Profile | null;
// }

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
//     const [selectedStore, setSelectedStore] = useState<string>("");
//     const [selectedDate, setSelectedDate] = useState<string>(
//         new Date().toISOString().split("T")[0]
//     );
//     const [showEditForm, setShowEditForm] = useState(false);
//     const [showCloseForm, setShowCloseForm] = useState(false);
//     const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(
//         null
//     );
//     const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
//     const [toast, setToast] = useState<{
//         message: string;
//         type: "success" | "error";
//     } | null>(null);

//     const [editForm, setEditForm] = useState({
//         seller_id: "",
//         opening_balance: "",
//     });
//     const [closeForm, setCloseForm] = useState({
//         actual_cash: "",
//         notes: "",
//     });
//     const [hasOpenToday, setHasOpenToday] = useState(false);

//     const todayStr = new Date().toISOString().split("T")[0];

//     const checkHasOpenToday = async () => {
//         if (!selectedStore) {
//             setHasOpenToday(false);
//             return;
//         }
//         try {
//             const { count, error } = await supabase
//                 .from("daily_summaries")
//                 .select("id", { count: "exact", head: true })
//                 .eq("store_id", selectedStore)
//                 .eq("date", todayStr);

//             if (error) throw error;
//             setHasOpenToday((count ?? 0) > 0);
//         } catch (err) {
//             console.error(err);
//             setHasOpenToday(false);
//         }
//     };

//     const supabase = createClient();
//     const {
//         stores = [],
//         sellers = [],
//         summaries = [],
//         isLoading,
//         mutate,
//     } = useAnalyticsData(selectedStore, selectedDate);

//     const showToast = (message: string, type: "success" | "error") => {
//         setToast({ message, type });
//         setTimeout(() => setToast(null), 3000);
//     };

//     // Auto-select first store when stores are loaded
//     useEffect(() => {
//         if (stores && stores.length > 0 && !selectedStore) {
//             setSelectedStore(stores[0].id);
//         }
//     }, [stores, selectedStore]);

//     // useEffect(() => {
//     //     if (!selectedStore) return;

//     //     const channel = supabase
//     //         .channel("orders_changes")
//     //         .on(
//     //             "postgres_changes",
//     //             {
//     //                 event: "*",
//     //                 schema: "public",
//     //                 table: "orders",
//     //                 filter: `store_id=eq.${selectedStore}`,
//     //             },
//     //             () => {
//     //                 mutate(); // revalidate when orders change too
//     //             }
//     //         )
//     //         .subscribe();

//     //     return () => {
//     //         supabase.removeChannel(channel);
//     //     };
//     // }, [selectedStore, supabase, mutate]);

//     const calculateTotalSales = async (storeId: string, date: string) => {
//         const { data: orders } = await supabase
//             .from("orders")
//             .select("total_amount")
//             .eq("store_id", storeId)
//             .gte("created_at", `${date}T00:00:00`)
//             .lt("created_at", `${date}T23:59:59`);

//         return orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
//     };

//     const handleOpenStoreToday = async () => {
//         if (!selectedStore) return;

//         try {
//             const {
//                 data: { user },
//             } = await supabase.auth.getUser();
//             if (!user) return;

//             // If already opened, bail (prevents race taps)
//             const { count, error: existsErr } = await supabase
//                 .from("daily_summaries")
//                 .select("id", { count: "exact", head: true })
//                 .eq("store_id", selectedStore)
//                 .eq("date", todayStr);

//             if (existsErr) throw existsErr;
//             if ((count ?? 0) > 0) {
//                 showToast("Daily summary already exists for today", "error");
//                 setHasOpenToday(true);
//                 return;
//             }

//             const defaultSeller = sellers.length > 0 ? sellers[0].id : user.id;

//             const { error } = await supabase.from("daily_summaries").insert({
//                 store_id: selectedStore,
//                 seller_id: defaultSeller,
//                 manager_id: user.id,
//                 date: todayStr,
//                 opening_balance: 0,
//                 total_sales: 0,
//                 expected_cash: 0,
//             });

//             if (error) throw error;

//             showToast("Store opened for today", "success");
//             setHasOpenToday(true);
//             mutate(); // keep your list fresh
//         } catch (error) {
//             showToast("Failed to open store", "error");
//             console.error(error);
//         }
//     };

//     const handleEditSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!selectedSummary) return;

//         try {
//             const openingBalance = parseFloat(editForm.opening_balance);
//             const expectedCash = openingBalance + selectedSummary.total_sales;

//             const { error } = await supabase
//                 .from("daily_summaries")
//                 .update({
//                     seller_id: editForm.seller_id,
//                     opening_balance: openingBalance,
//                     expected_cash: expectedCash,
//                 })
//                 .eq("id", selectedSummary.id);

//             if (error) throw error;

//             showToast("Daily summary updated successfully", "success");
//             setEditForm({ seller_id: "", opening_balance: "" });
//             setShowEditForm(false);
//             setSelectedSummary(null);
//             mutate();
//         } catch (error) {
//             showToast("Failed to update daily summary", "error");
//             console.error(error);
//         }
//     };

//     const handleCloseDay = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!selectedSummary) return;

//         try {
//             const actualCash = parseFloat(closeForm.actual_cash);
//             const variance = actualCash - selectedSummary.expected_cash;

//             const { error } = await supabase
//                 .from("daily_summaries")
//                 .update({
//                     actual_cash: actualCash,
//                     variance: variance,
//                     notes: closeForm.notes || null,
//                     closed_at: new Date().toISOString(),
//                 })
//                 .eq("id", selectedSummary.id);

//             if (error) throw error;

//             showToast("Day closed successfully", "success");
//             setCloseForm({ actual_cash: "", notes: "" });
//             setShowCloseForm(false);
//             setSelectedSummary(null);
//             mutate();
//         } catch (error) {
//             showToast("Failed to close day", "error");
//             console.error(error);
//         }
//     };

//     const refreshSales = async (summary: DailySummary) => {
//         try {
//             const totalSales = await calculateTotalSales(
//                 summary.store_id,
//                 summary.date
//             );
//             const expectedCash = summary.opening_balance + totalSales;

//             const { error } = await supabase
//                 .from("daily_summaries")
//                 .update({
//                     total_sales: totalSales,
//                     expected_cash: expectedCash,
//                 })
//                 .eq("id", summary.id);

//             if (error) throw error;

//             showToast("Sales refreshed successfully", "success");
//             mutate();
//         } catch (error) {
//             showToast("Failed to refresh sales", "error");
//             console.error(error);
//         }
//     };

//     const formatDate = (dateStr: string) => {
//         const date = new Date(dateStr);
//         const today = new Date();
//         const yesterday = new Date(today);
//         yesterday.setDate(yesterday.getDate() - 1);

//         if (date.toDateString() === today.toDateString()) {
//             return "Today";
//         } else if (date.toDateString() === yesterday.toDateString()) {
//             return "Yesterday";
//         } else {
//             return date.toLocaleDateString("en-US", {
//                 month: "short",
//                 day: "numeric",
//                 year:
//                     date.getFullYear() !== today.getFullYear()
//                         ? "numeric"
//                         : undefined,
//             });
//         }
//     };

//     useEffect(() => {
//         checkHasOpenToday();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [selectedStore, summaries.length]); // length changes on mutate -> recheck

//     if (isLoading) {
//         return (
//             <div className="text-center py-8">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
//                 <p className="text-gray-600">Loading analytics...</p>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-4">
//             {/* Store and Date Selection */}
//             <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
//                 {stores.length > 1 && (
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Store
//                         </label>
//                         <select
//                             value={selectedStore}
//                             onChange={(e) => setSelectedStore(e.target.value)}
//                             className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         >
//                             {stores.map((store) => (
//                                 <option key={store.id} value={store.id}>
//                                     {store.name}
//                                 </option>
//                             ))}
//                         </select>
//                     </div>
//                 )}

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Date (Last 7 days from)
//                     </label>
//                     <input
//                         type="date"
//                         value={selectedDate}
//                         onChange={(e) => setSelectedDate(e.target.value)}
//                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                     />
//                 </div>
//             </div>

//             {selectedStore && (
//                 <div className="space-y-3">
//                     {!hasOpenToday && (
//                         <div className="w-full bg-white rounded-lg shadow-md p-6 cursor-pointer hover:bg-gray-50 transition">
//                             <h3 className="font-semibold text-gray-800">
//                                 Open store Today for{' "'}
//                                 {
//                                     stores.find((s) => s.id === selectedStore)
//                                         ?.name
//                                 }
//                                 {'" '}
//                             </h3>
//                             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
//                                 <p className="text-sm text-gray-600">
//                                     Opening the store will initialize a summary
//                                     with zero balances.
//                                 </p>
//                                 <button
//                                     className="bg-blue-600 text-white text-sm font-medium py-2.5 px-5 rounded-lg hover:bg-blue-700 transition"
//                                     onClick={handleOpenStoreToday}
//                                 >
//                                     Open Store on{" "}
//                                     {new Date().toLocaleDateString("en-US", {
//                                         weekday: "long",
//                                         day: "numeric",
//                                         month: "short",
//                                     })}
//                                 </button>
//                             </div>
//                         </div>
//                     )}

//                     {summaries.length === 0 ? (
//                         <div className="bg-white p-8 rounded-lg shadow-sm text-center">
//                             <Calendar
//                                 size={48}
//                                 className="mx-auto text-gray-400 mb-4"
//                             />
//                             <p className="text-gray-600">
//                                 No daily summary found for selected dates
//                             </p>
//                         </div>
//                     ) : (
//                         summaries.map((summary) => (
//                             <div
//                                 key={summary.id}
//                                 className="bg-white rounded-lg shadow-sm overflow-hidden"
//                             >
//                                 <div
//                                     className="p-4 cursor-pointer"
//                                     onClick={() =>
//                                         setExpandedSummary(
//                                             expandedSummary === summary.id
//                                                 ? null
//                                                 : summary.id
//                                         )
//                                     }
//                                 >
//                                     <div className="flex justify-between items-start mb-2">
//                                         <div className="flex-1">
//                                             <h3 className="text-sm font-medium text-gray-600">
//                                                 {formatDate(summary.date)}
//                                             </h3>
//                                             <p className="text-sm text-gray-500">
//                                                 {summary.seller?.full_name}
//                                             </p>
//                                             <div className="flex gap-4 mt-2">
//                                                 <div>
//                                                     <p className="text-xs text-gray-500">
//                                                         Sales
//                                                     </p>
//                                                     <p className="text-lg font-bold text-green-600">
//                                                         {formatRupiah(
//                                                             summary.total_sales
//                                                         )}
//                                                     </p>
//                                                 </div>
//                                                 <div>
//                                                     <p className="text-xs text-gray-500">
//                                                         Expected
//                                                     </p>
//                                                     <p className="text-lg font-bold text-blue-600">
//                                                         {formatRupiah(
//                                                             summary.expected_cash
//                                                         )}
//                                                     </p>
//                                                 </div>
//                                             </div>

//                                             {summary.variance !== null && (
//                                                 <div className="mt-2">
//                                                     <p
//                                                         className={`text-sm font-medium ${
//                                                             summary.variance >=
//                                                             0
//                                                                 ? "text-green-600"
//                                                                 : "text-red-600"
//                                                         }`}
//                                                     >
//                                                         Variance:{" "}
//                                                         {summary.variance >= 0
//                                                             ? "+"
//                                                             : ""}
//                                                         {formatRupiah(
//                                                             summary.variance
//                                                         )}
//                                                     </p>
//                                                 </div>
//                                             )}
//                                         </div>

//                                         <div className="text-right flex items-center space-x-2">
//                                             <div>
//                                                 {summary.closed_at ? (
//                                                     <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
//                                                         Closed
//                                                     </span>
//                                                 ) : (
//                                                     <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
//                                                         Open
//                                                     </span>
//                                                 )}
//                                             </div>
//                                             {expandedSummary === summary.id ? (
//                                                 <ChevronUp
//                                                     size={20}
//                                                     className="text-gray-400"
//                                                 />
//                                             ) : (
//                                                 <ChevronDown
//                                                     size={20}
//                                                     className="text-gray-400"
//                                                 />
//                                             )}
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Expanded Details */}
//                                 {expandedSummary === summary.id && (
//                                     <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
//                                         <div className="grid grid-cols-2 gap-4">
//                                             <div>
//                                                 <p className="text-xs text-gray-500 mb-1">
//                                                     Opening Balance
//                                                 </p>
//                                                 <p className="font-semibold">
//                                                     {formatRupiah(
//                                                         summary.opening_balance
//                                                     )}
//                                                 </p>
//                                             </div>
//                                             <div>
//                                                 <p className="text-xs text-gray-500 mb-1">
//                                                     Actual Cash
//                                                 </p>
//                                                 <p className="font-semibold">
//                                                     {summary.actual_cash !==
//                                                     null
//                                                         ? formatRupiah(
//                                                               summary.actual_cash
//                                                           )
//                                                         : "Not counted"}
//                                                 </p>
//                                             </div>
//                                         </div>

//                                         {summary.notes && (
//                                             <div>
//                                                 <p className="text-xs text-gray-500 mb-1">
//                                                     Notes
//                                                 </p>
//                                                 <p className="text-sm text-gray-700 bg-white p-2 rounded">
//                                                     {summary.notes}
//                                                 </p>
//                                             </div>
//                                         )}

//                                         {summary.closed_at && (
//                                             <div className="text-xs text-gray-500">
//                                                 Closed:{" "}
//                                                 {new Date(
//                                                     summary.closed_at
//                                                 ).toLocaleString()}
//                                             </div>
//                                         )}

//                                         {!summary.closed_at && (
//                                             <div className="flex space-x-2">
//                                                 <button
//                                                     onClick={(e) => {
//                                                         e.stopPropagation();
//                                                         setSelectedSummary(
//                                                             summary
//                                                         );
//                                                         setEditForm({
//                                                             seller_id:
//                                                                 summary.seller_id,
//                                                             opening_balance:
//                                                                 summary.opening_balance.toString(),
//                                                         });
//                                                         setShowEditForm(true);
//                                                     }}
//                                                     className="flex-1 bg-gray-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center justify-center"
//                                                 >
//                                                     <Edit3
//                                                         size={16}
//                                                         className="mr-1"
//                                                     />
//                                                     Edit
//                                                 </button>

//                                                 <button
//                                                     onClick={(e) => {
//                                                         e.stopPropagation();
//                                                         refreshSales(summary);
//                                                     }}
//                                                     className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center"
//                                                 >
//                                                     <RefreshCw
//                                                         size={16}
//                                                         className="mr-1"
//                                                     />
//                                                     Refresh
//                                                 </button>

//                                                 <button
//                                                     onClick={(e) => {
//                                                         e.stopPropagation();
//                                                         setSelectedSummary(
//                                                             summary
//                                                         );
//                                                         setCloseForm({
//                                                             actual_cash:
//                                                                 summary.expected_cash.toString(),
//                                                             notes: "",
//                                                         });
//                                                         setShowCloseForm(true);
//                                                     }}
//                                                     className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
//                                                 >
//                                                     Close Day
//                                                 </button>
//                                             </div>
//                                         )}
//                                     </div>
//                                 )}
//                             </div>
//                         ))
//                     )}
//                 </div>
//             )}

//             {/* Edit Daily Summary Modal */}
//             {showEditForm && selectedSummary && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                     onClick={() => setShowEditForm(false)}
//                 >
//                     <div
//                         className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//                             <h2 className="text-lg font-semibold">
//                                 Edit Daily Summary
//                             </h2>
//                             <button
//                                 onClick={() => setShowEditForm(false)}
//                                 className="p-1 hover:bg-gray-100 rounded"
//                             >
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         <form
//                             onSubmit={handleEditSubmit}
//                             className="p-4 space-y-4"
//                         >
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     Seller
//                                 </label>
//                                 <select
//                                     value={editForm.seller_id}
//                                     onChange={(e) =>
//                                         setEditForm({
//                                             ...editForm,
//                                             seller_id: e.target.value,
//                                         })
//                                     }
//                                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                     required
//                                 >
//                                     {sellers.map((seller) => (
//                                         <option
//                                             key={seller.id}
//                                             value={seller.id}
//                                         >
//                                             {seller.full_name}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>

//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     Opening Balance
//                                 </label>
//                                 <input
//                                     type="number"
//                                     step="100"
//                                     min={0}
//                                     value={editForm.opening_balance}
//                                     onChange={(e) =>
//                                         setEditForm({
//                                             ...editForm,
//                                             opening_balance: e.target.value,
//                                         })
//                                     }
//                                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                     placeholder="0"
//                                     required
//                                 />
//                             </div>

//                             <button
//                                 type="submit"
//                                 className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600"
//                             >
//                                 Update Summary
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             )}

//             {/* Close Day Modal */}
//             {showCloseForm && selectedSummary && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                     onClick={() => setShowCloseForm(false)}
//                 >
//                     <div
//                         className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//                             <h2 className="text-lg font-semibold">Close Day</h2>
//                             <button
//                                 onClick={() => setShowCloseForm(false)}
//                                 className="p-1 hover:bg-gray-100 rounded"
//                             >
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         <div className="p-4 space-y-4">
//                             <div className="bg-blue-50 p-4 rounded-lg">
//                                 <p className="font-medium text-blue-800">
//                                     Expected Cash
//                                 </p>
//                                 <p className="text-2xl font-bold text-blue-600">
//                                     {formatRupiah(
//                                         selectedSummary.expected_cash
//                                     )}
//                                 </p>
//                                 <p className="text-sm text-blue-600">
//                                     Opening:{" "}
//                                     {formatRupiah(
//                                         selectedSummary.opening_balance
//                                     )}{" "}
//                                     + Sales:{" "}
//                                     {formatRupiah(selectedSummary.total_sales)}
//                                 </p>
//                             </div>

//                             <form
//                                 onSubmit={handleCloseDay}
//                                 className="space-y-4"
//                             >
//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         Actual Cash Count
//                                     </label>
//                                     <input
//                                         type="number"
//                                         step="100"
//                                         min={0}
//                                         value={closeForm.actual_cash}
//                                         onChange={(e) =>
//                                             setCloseForm({
//                                                 ...closeForm,
//                                                 actual_cash: e.target.value,
//                                             })
//                                         }
//                                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                         placeholder="0"
//                                         required
//                                     />
//                                 </div>

//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         Notes (Optional)
//                                     </label>
//                                     <textarea
//                                         value={closeForm.notes}
//                                         onChange={(e) =>
//                                             setCloseForm({
//                                                 ...closeForm,
//                                                 notes: e.target.value,
//                                             })
//                                         }
//                                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20"
//                                         placeholder="Any notes about the day..."
//                                     />
//                                 </div>

//                                 {closeForm.actual_cash && (
//                                     <div
//                                         className={`p-4 rounded-lg ${
//                                             parseFloat(closeForm.actual_cash) -
//                                                 selectedSummary.expected_cash >=
//                                             0
//                                                 ? "bg-green-50"
//                                                 : "bg-red-50"
//                                         }`}
//                                     >
//                                         <p className="font-medium">
//                                             Variance:{" "}
//                                             {formatRupiah(
//                                                 parseInt(
//                                                     closeForm.actual_cash
//                                                 ) -
//                                                     selectedSummary.expected_cash
//                                             )}
//                                         </p>
//                                     </div>
//                                 )}

//                                 <button
//                                     type="submit"
//                                     className="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600"
//                                 >
//                                     Close Day
//                                 </button>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Toast Notification */}
//             {toast && (
//                 <div
//                     className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
//                         toast.type === "success"
//                             ? "bg-green-500 text-white"
//                             : "bg-red-500 text-white"
//                     }`}
//                 >
//                     <div className="flex justify-between items-center">
//                         <span className="font-medium">{toast.message}</span>
//                         <button
//                             onClick={() => setToast(null)}
//                             className="ml-4 text-white hover:opacity-75"
//                         >
//                             ×
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// //LAST DECENT FINAL.
// "use client";
// import { useState, useEffect } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { useSummaries } from "@/lib/hooks/useSummaries";
// import { Profile } from "@/lib/types";
// import { X, Calendar, StoreIcon, CalendarDays, Calculator } from "lucide-react";
// import { formatRupiah } from "@/lib/utils/formatCurrency";

// interface MobileAnalyticsProps {
//     profile: Profile | null;
// }

// interface Store {
//     id: string;
//     name: string;
// }

// interface Seller {
//     id: string;
//     full_name: string;
// }

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
//     const [selectedStore, setSelectedStore] = useState<string>("");
//     const [selectedMonth, setSelectedMonth] = useState<string>(
//         new Date().toISOString().slice(0, 7) // Format: YYYY-MM
//     );
//     const [stores, setStores] = useState<Store[]>([]);
//     const [sellers, setSellers] = useState<Seller[]>([]);
//     const [showEditForm, setShowEditForm] = useState(false);
//     const [showCloseForm, setShowCloseForm] = useState(false);
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const [selectedSummary, setSelectedSummary] = useState<any>(null);
//     const [toast, setToast] = useState<{
//         message: string;
//         type: "success" | "error";
//     } | null>(null);

//     const [editForm, setEditForm] = useState({
//         seller_id: "",
//         opening_balance: "",
//     });
//     const [closeForm, setCloseForm] = useState({
//         actual_cash: "",
//         notes: "",
//     });

//     const supabase = createClient();
//     const { data, isLoading, error, createSummary, updateSummary } =
//         useSummaries(selectedStore, selectedMonth);

//     const showToast = (message: string, type: "success" | "error") => {
//         setToast({ message, type });
//         setTimeout(() => setToast(null), 3000);
//     };

//     // Fetch stores and sellers
//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 const [{ data: storesData }, { data: sellersData }] =
//                     await Promise.all([
//                         supabase
//                             .from("stores")
//                             .select("id, name")
//                             .order("name"),
//                         supabase
//                             .from("profiles")
//                             .select("id, full_name")
//                             .order("full_name"),
//                     ]);

//                 if (storesData) setStores(storesData);
//                 if (sellersData) setSellers(sellersData);

//                 // Auto-select first store
//                 if (storesData && storesData.length > 0 && !selectedStore) {
//                     setSelectedStore(storesData[0].id);
//                 }
//                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
//             } catch (err: any) {
//                 console.error("Error fetching data:", err);
//             }
//         };

//         fetchData();
//     }, [supabase, selectedStore]);

//     const handleOpenStoreToday = async () => {
//         if (!selectedStore) return;

//         try {
//             const {
//                 data: { user },
//             } = await supabase.auth.getUser();
//             if (!user) return;

//             const todayStr = new Date().toISOString().split("T")[0];
//             const defaultSeller = sellers.length > 0 ? sellers[0].id : user.id;

//             await createSummary({
//                 storeId: selectedStore,
//                 sellerId: defaultSeller,
//                 managerId: user.id,
//                 date: todayStr,
//                 openingBalance: 0,
//             });

//             showToast("Store opened for today", "success");
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         } catch (error: any) {
//             showToast(error.message || "Failed to open store", "error");
//             console.error(error);
//         }
//     };

//     const handleEditSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!selectedSummary) return;

//         try {
//             const openingBalance = parseFloat(editForm.opening_balance);
//             const expectedCash = openingBalance + selectedSummary.total_sales;

//             await updateSummary(selectedSummary.id, {
//                 seller_id: editForm.seller_id,
//                 opening_balance: openingBalance,
//                 expected_cash: expectedCash,
//             });

//             showToast("Daily summary updated successfully", "success");
//             setEditForm({ seller_id: "", opening_balance: "" });
//             setShowEditForm(false);
//             setSelectedSummary(null);
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         } catch (error: any) {
//             showToast(
//                 error.message || "Failed to update daily summary",
//                 "error"
//             );
//             console.error(error);
//         }
//     };

//     const handleCloseDay = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!selectedSummary) return;

//         try {
//             const actualCash = parseFloat(closeForm.actual_cash);
//             const variance = actualCash - selectedSummary.expected_cash;

//             await updateSummary(selectedSummary.id, {
//                 actual_cash: actualCash,
//                 variance: variance,
//                 notes: closeForm.notes || null,
//                 closed_at: new Date().toISOString(),
//             });

//             showToast("Day closed successfully", "success");
//             setCloseForm({ actual_cash: "", notes: "" });
//             setShowCloseForm(false);
//             setSelectedSummary(null);
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         } catch (error: any) {
//             showToast(error.message || "Failed to close day", "error");
//             console.error(error);
//         }
//     };

//     const formatDate = (dateStr: string) => {
//         const date = new Date(dateStr);
//         const today = new Date();
//         const yesterday = new Date(today);
//         yesterday.setDate(yesterday.getDate() - 1);

//         if (date.toDateString() === today.toDateString()) {
//             return "Today";
//         } else if (date.toDateString() === yesterday.toDateString()) {
//             return "Yesterday";
//         } else {
//             return date.toLocaleDateString("en-US", {
//                 weekday: "short",
//                 month: "short",
//                 day: "numeric",
//                 year:
//                     date.getFullYear() !== today.getFullYear()
//                         ? "numeric"
//                         : undefined,
//             });
//         }
//     };

//     const getTodaysSummary = () => {
//         const todayStr = new Date().toISOString().split("T")[0];
//         return data?.summaries.find((summary) => summary.date === todayStr);
//     };

//     const getProductBreakdownForDate = (date: string) => {
//         return data?.productBreakdown[date] || {};
//     };

//     const getOrdersCountForDate = (date: string) => {
//         const breakdown = getProductBreakdownForDate(date);
//         return Object.values(breakdown).reduce(
//             (total, product) => total + product.quantity,
//             0
//         );
//     };

//     if (isLoading) {
//         return (
//             <div className="text-center py-8">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
//                 <p className="text-gray-600">Loading analytics...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="text-center py-8">
//                 <p className="text-red-600">
//                     Error loading analytics: {error.message}
//                 </p>
//             </div>
//         );
//     }

//     const todaysSummary = getTodaysSummary();

//     return (
//         <div className="space-y-4">
//             {/* Monthly Summary Section - White Background */}
//             {data?.monthlyTotals && (
//                 <div className="bg-white p-4 rounded-lg shadow-sm">
//                     <div className="flex items-center gap-2 mb-3">
//                         <Calculator size={20} className="text-gray-600" />
//                         <h3 className="font-semibold text-gray-800">
//                             Monthly Summary
//                         </h3>
//                     </div>

//                     <div className="grid grid-cols-4 gap-2">
//                         <div className="text-center">
//                             <p className="text-xl font-bold text-blue-600">
//                                 {data.monthlyTotals.totalOrders}
//                             </p>
//                             <p className="text-sm text-gray-600">Orders</p>
//                         </div>
//                         <div className="text-center">
//                             <p className="text-xl font-bold text-orange-600">
//                                 {data.monthlyTotals.totalCups}
//                             </p>
//                             <p className="text-sm text-gray-600">Cups</p>
//                         </div>
//                         <div className="text-center col-span-2 border-l-2 border-gray-300">
//                             <p className="text-sm text-gray-600">Total Sales</p>

//                             <p className="text-xl font-bold text-green-600">
//                                 {formatRupiah(data.monthlyTotals.totalSales)}
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Store and Month Selection - White Background */}
//             <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
//                 {/* Date Filter */}
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         <CalendarDays size={16} className="inline mr-1" />
//                         Select Month
//                     </label>
//                     <input
//                         type="month"
//                         value={selectedMonth}
//                         onChange={(e) => setSelectedMonth(e.target.value)}
//                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                     />
//                 </div>

//                 {/* Store Filter */}

//                 {stores.length > 1 && (
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             <StoreIcon size={16} className="inline mr-1" />
//                             Select Store
//                         </label>
//                         <select
//                             value={selectedStore}
//                             onChange={(e) => setSelectedStore(e.target.value)}
//                             className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         >
//                             {stores.map((store) => (
//                                 <option key={store.id} value={store.id}>
//                                     {store.name}
//                                 </option>
//                             ))}
//                         </select>
//                     </div>
//                 )}
//             </div>

//             {selectedStore && (
//                 <div className="space-y-3">
//                     {!todaysSummary && (
//                         <div className="w-full bg-white rounded-lg shadow-md p-6">
//                             <h3 className="font-semibold text-gray-800">
//                                 Open store Today for{" "}
//                                 {
//                                     stores.find((s) => s.id === selectedStore)
//                                         ?.name
//                                 }
//                             </h3>
//                             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
//                                 <p className="text-sm text-gray-600">
//                                     Opening the store will initialize a summary
//                                     with zero balances.
//                                 </p>
//                                 <button
//                                     className="bg-blue-600 text-white text-sm font-medium py-2.5 px-5 rounded-lg hover:bg-blue-700 transition"
//                                     onClick={handleOpenStoreToday}
//                                 >
//                                     Open Store on{" "}
//                                     {new Date().toLocaleDateString("en-US", {
//                                         weekday: "long",
//                                         day: "numeric",
//                                         month: "short",
//                                     })}
//                                 </button>
//                             </div>
//                         </div>
//                     )}

//                     {/* Daily Summary Cards - Grey Background */}
//                     <div className="bg-gray-50 rounded-lg space-y-3">
//                         {!data?.summaries || data.summaries.length === 0 ? (
//                             <div className="bg-white p-8 rounded-lg shadow-sm text-center">
//                                 <Calendar
//                                     size={48}
//                                     className="mx-auto text-gray-400 mb-4"
//                                 />
//                                 <p className="text-gray-600">
//                                     No daily summary found for selected month
//                                 </p>
//                             </div>
//                         ) : (
//                             data.summaries.map((summary) => {
//                                 const productBreakdown =
//                                     getProductBreakdownForDate(summary.date);
//                                 const dailyCups = getOrdersCountForDate(
//                                     summary.date
//                                 );

//                                 return (
//                                     <div
//                                         key={summary.id}
//                                         className="bg-white rounded-lg shadow-sm overflow-hidden"
//                                     >
//                                         {/* Order Header - White Background */}
//                                         <div className="p-3.5 bg-white">
//                                             {/* Date and Cash Info Header */}
//                                             <div className="flex justify-between items-start mb-4">
//                                                 <div className="flex-1">
//                                                     <h3 className="text-lg font-semibold text-gray-800">
//                                                         {formatDate(
//                                                             summary.date
//                                                         )}
//                                                     </h3>
//                                                     <p className="text-sm text-gray-500">
//                                                         {
//                                                             summary.seller
//                                                                 ?.full_name
//                                                         }
//                                                     </p>
//                                                 </div>
//                                                 <div className="text-right">
//                                                     {summary.closed_at ? (
//                                                         <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
//                                                             Closed
//                                                         </span>
//                                                     ) : (
//                                                         <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
//                                                             Open
//                                                         </span>
//                                                     )}
//                                                 </div>
//                                             </div>

//                                             {/* Cash Balances */}
//                                             <div className="grid grid-cols-2 gap-4 mb-4">
//                                                 <div>
//                                                     <p className="text-xs text-gray-500">
//                                                         Opening Balance
//                                                     </p>
//                                                     <p className="text-lg font-semibold text-blue-600">
//                                                         {formatRupiah(
//                                                             summary.opening_balance
//                                                         )}
//                                                     </p>
//                                                 </div>
//                                                 <div>
//                                                     <p className="text-xs text-gray-500">
//                                                         Actual Cash
//                                                     </p>
//                                                     <p className="text-lg font-semibold text-purple-600">
//                                                         {summary.actual_cash !==
//                                                         null
//                                                             ? formatRupiah(
//                                                                   summary.actual_cash
//                                                               )
//                                                             : "Not counted"}
//                                                     </p>
//                                                 </div>
//                                             </div>

//                                             {/* Daily Totals */}
//                                             <div className="grid grid-cols-4 gap-4 mb-4">
//                                                 <div className="col-span-2">
//                                                     <p className="text-xs text-gray-500">
//                                                         Sales
//                                                     </p>
//                                                     <p className="text-lg font-bold text-green-600">
//                                                         {formatRupiah(
//                                                             summary.total_sales
//                                                         )}
//                                                     </p>
//                                                 </div>
//                                                 <div className="">
//                                                     <p className="text-xs text-gray-500">
//                                                         Orders
//                                                     </p>
//                                                     <p className="text-lg font-bold text-blue-600">
//                                                         {
//                                                             Object.keys(
//                                                                 productBreakdown
//                                                             ).length
//                                                         }
//                                                     </p>
//                                                 </div>
//                                                 <div className="">
//                                                     <p className="text-xs text-gray-500">
//                                                         Cups
//                                                     </p>
//                                                     <p className="text-lg font-bold text-orange-600">
//                                                         {dailyCups}
//                                                     </p>
//                                                 </div>
//                                             </div>

//                                             {/* Variance */}
//                                             {summary.variance !== null && (
//                                                 <div className="mb-4">
//                                                     <p
//                                                         className={`text-sm font-medium ${
//                                                             summary.variance >=
//                                                             0
//                                                                 ? "text-green-600"
//                                                                 : "text-red-600"
//                                                         }`}
//                                                     >
//                                                         Variance:{" "}
//                                                         {summary.variance >= 0
//                                                             ? "+"
//                                                             : ""}
//                                                         {formatRupiah(
//                                                             summary.variance
//                                                         )}
//                                                     </p>
//                                                 </div>
//                                             )}

//                                             {/* Notes */}
//                                             {summary.notes && (
//                                                 <div className="">
//                                                     <p className="text-xs text-gray-500 mb-1">
//                                                         Notes
//                                                     </p>
//                                                     <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
//                                                         {summary.notes}
//                                                     </p>
//                                                 </div>
//                                             )}
//                                         </div>

//                                         {/* Order Details - Gray Background */}
//                                         <div className="border-t border-gray-100 p-3 bg-gray-50">
//                                             {/* Product Sales Breakdown */}
//                                             {Object.keys(productBreakdown)
//                                                 .length > 0 && (
//                                                 <div className="space-y-3">
//                                                     <h4 className="font-medium text-gray-800 mb-1 text-sm">
//                                                         Product Sales
//                                                     </h4>
//                                                     <div className="space-y-2">
//                                                         {Object.entries(
//                                                             productBreakdown
//                                                         ).map(
//                                                             ([
//                                                                 productName,
//                                                                 data,
//                                                             ]) => (
//                                                                 <div
//                                                                     key={
//                                                                         productName
//                                                                     }
//                                                                     className="flex justify-between items-center bg-white p-2.5 rounded-md text-sm"
//                                                                 >
//                                                                     <span className="text-sm font-medium">
//                                                                         {
//                                                                             productName
//                                                                         }
//                                                                     </span>
//                                                                     <div className="text-right">
//                                                                         <p className="text-sm font-medium">
//                                                                             {
//                                                                                 data.quantity
//                                                                             }{" "}
//                                                                             cups
//                                                                         </p>
//                                                                         {/* <p className="text-xs text-gray-500">
//                                                                             {formatRupiah(
//                                                                                 data.revenue
//                                                                             )}
//                                                                         </p> */}
//                                                                     </div>
//                                                                 </div>
//                                                             )
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                             )}

//                                             {/* Action Buttons for Open Days */}
//                                             {!summary.closed_at && (
//                                                 <div className="flex space-x-2 mt-4">
//                                                     <button
//                                                         onClick={() => {
//                                                             setSelectedSummary(
//                                                                 summary
//                                                             );
//                                                             setEditForm({
//                                                                 seller_id:
//                                                                     summary.seller_id,
//                                                                 opening_balance:
//                                                                     summary.opening_balance.toString(),
//                                                             });
//                                                             setShowEditForm(
//                                                                 true
//                                                             );
//                                                         }}
//                                                         className="flex-1 bg-white text-blue-500 border border-blue-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center"
//                                                         // className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center "
//                                                     >
//                                                         {/* <Edit3
//                                                             size={16}
//                                                             className="mr-1"
//                                                         /> */}
//                                                         Set Balance
//                                                     </button>

//                                                     <button
//                                                         onClick={() => {
//                                                             setSelectedSummary(
//                                                                 summary
//                                                             );
//                                                             setCloseForm({
//                                                                 actual_cash:
//                                                                     summary.expected_cash.toString(),
//                                                                 notes: "",
//                                                             });
//                                                             setShowCloseForm(
//                                                                 true
//                                                             );
//                                                         }}
//                                                         className="flex-1 bg-white text-red-500 border border-red-500 py-2 px-3 rounded-lg
//                                                          text-sm font-medium hover:bg-red-50"
//                                                         // className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
//                                                     >
//                                                         Close Day
//                                                     </button>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                 );
//                             })
//                         )}
//                     </div>
//                 </div>
//             )}

//             {/* Edit Daily Summary Modal */}
//             {showEditForm && selectedSummary && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                     onClick={() => setShowEditForm(false)}
//                 >
//                     <div
//                         className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//                             <h2 className="text-lg font-semibold">
//                                 Edit Opening Balance
//                             </h2>
//                             <button
//                                 onClick={() => setShowEditForm(false)}
//                                 className="p-1 hover:bg-gray-100 rounded"
//                             >
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         <form
//                             onSubmit={handleEditSubmit}
//                             className="p-4 space-y-4"
//                         >
//                             {/* <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     Seller
//                                 </label>
//                                 <select
//                                     value={editForm.seller_id}
//                                     onChange={(e) =>
//                                         setEditForm({
//                                             ...editForm,
//                                             seller_id: e.target.value,
//                                         })
//                                     }
//                                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                     required
//                                 >
//                                     {sellers.map((seller) => (
//                                         <option
//                                             key={seller.id}
//                                             value={seller.id}
//                                         >
//                                             {seller.full_name}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div> */}

//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     Opening Balance
//                                 </label>
//                                 <input
//                                     type="number"
//                                     step="100"
//                                     inputMode="numeric"
//                                     min={0}
//                                     value={editForm.opening_balance}
//                                     onChange={(e) =>
//                                         setEditForm({
//                                             ...editForm,
//                                             opening_balance: e.target.value,
//                                         })
//                                     }
//                                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                     placeholder="0"
//                                     required
//                                 />
//                             </div>

//                             <button
//                                 type="submit"
//                                 className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600"
//                             >
//                                 Update Opening Balance
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             )}

//             {/* Close Day Modal */}
//             {showCloseForm && selectedSummary && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                     onClick={() => setShowCloseForm(false)}
//                 >
//                     <div
//                         className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//                             <h2 className="text-lg font-semibold">Close Day</h2>
//                             <button
//                                 onClick={() => setShowCloseForm(false)}
//                                 className="p-1 hover:bg-gray-100 rounded"
//                             >
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         <div className="p-4 space-y-4">
//                             <div className="bg-blue-50 p-4 rounded-lg">
//                                 <p className="font-medium text-blue-800">
//                                     Expected Cash
//                                 </p>
//                                 <p className="text-2xl font-bold text-blue-600">
//                                     {formatRupiah(
//                                         selectedSummary.expected_cash
//                                     )}
//                                 </p>
//                                 <p className="text-sm text-blue-600">
//                                     Opening:{" "}
//                                     {formatRupiah(
//                                         selectedSummary.opening_balance
//                                     )}{" "}
//                                     + Sales:{" "}
//                                     {formatRupiah(selectedSummary.total_sales)}
//                                 </p>
//                             </div>

//                             <form
//                                 onSubmit={handleCloseDay}
//                                 className="space-y-4"
//                             >
//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         Actual Cash Count
//                                     </label>
//                                     <input
//                                         type="number"
//                                         step="100"
//                                         min={0}
//                                         value={closeForm.actual_cash}
//                                         onChange={(e) =>
//                                             setCloseForm({
//                                                 ...closeForm,
//                                                 actual_cash: e.target.value,
//                                             })
//                                         }
//                                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                                         placeholder="0"
//                                         required
//                                     />
//                                 </div>

//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         Notes (Optional)
//                                     </label>
//                                     <textarea
//                                         value={closeForm.notes}
//                                         onChange={(e) =>
//                                             setCloseForm({
//                                                 ...closeForm,
//                                                 notes: e.target.value,
//                                             })
//                                         }
//                                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20"
//                                         placeholder="Any notes about the day..."
//                                     />
//                                 </div>

//                                 {closeForm.actual_cash && (
//                                     <div
//                                         className={`p-4 rounded-lg ${
//                                             parseFloat(closeForm.actual_cash) -
//                                                 selectedSummary.expected_cash >=
//                                             0
//                                                 ? "bg-green-50"
//                                                 : "bg-red-50"
//                                         }`}
//                                     >
//                                         <p className="font-medium">
//                                             Variance:{" "}
//                                             {formatRupiah(
//                                                 parseInt(
//                                                     closeForm.actual_cash
//                                                 ) -
//                                                     selectedSummary.expected_cash
//                                             )}
//                                         </p>
//                                     </div>
//                                 )}

//                                 <button
//                                     type="submit"
//                                     className="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600"
//                                 >
//                                     Close Day
//                                 </button>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Toast Notification */}
//             {toast && (
//                 <div
//                     className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
//                         toast.type === "success"
//                             ? "bg-green-500 text-white"
//                             : "bg-red-500 text-white"
//                     }`}
//                 >
//                     <div className="flex justify-between items-center">
//                         <span className="font-medium">{toast.message}</span>
//                         <button
//                             onClick={() => setToast(null)}
//                             className="ml-4 text-white hover:opacity-75"
//                         >
//                             ×
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }
"use client";
import { useState, useEffect } from "react";
import { useSummaries } from "@/lib/hooks/useSummaries";
import { useStores } from "@/lib/hooks/useData";
import { Profile } from "@/lib/types";
import {
    X,
    Calendar,
    StoreIcon,
    CalendarDays,
    Calculator,
    AlertTriangle,
    CheckCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";

interface MobileAnalyticsProps {
    profile: Profile | null;
}

interface ConfirmationPopupProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: "warning" | "info";
}

interface DetailsModalProps {
    isOpen: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summary: any;
    onClose: () => void;
    productBreakdown: Record<string, { quantity: number; revenue: number }>;
    storeName: string;
}

// Reusable Confirmation Popup Component
const ConfirmationPopup = ({
    isOpen,
    title,
    message,
    confirmText,
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    type = "info",
}: ConfirmationPopupProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-6">
                <div className="flex items-center mb-4">
                    {type === "warning" && (
                        <AlertTriangle
                            className="text-orange-500 mr-2"
                            size={24}
                        />
                    )}
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2 px-4 rounded-lg text-white font-medium ${
                            type === "warning"
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Details Modal Component
const DetailsModal = ({
    isOpen,
    summary,
    onClose,
    productBreakdown,
    storeName,
}: DetailsModalProps) => {
    if (!isOpen || !summary) return null;

    const formatFullTimestamp = (dateString: string) => {
        if (!dateString) return "Not set";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    };

    const dailyCups = Object.values(productBreakdown).reduce(
        (total, product) => total + product.quantity,
        0
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">
                        Daily Summary Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Summary Header */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">
                            {new Date(summary.date).toLocaleDateString(
                                "en-US",
                                {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }
                            )}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>
                                <strong>Summary ID:</strong> {summary.id}
                            </p>
                            <p>
                                <strong>Store:</strong> {storeName}
                            </p>
                            <p>
                                <strong>Seller:</strong>{" "}
                                {summary.seller?.full_name}
                            </p>
                            {summary.manager?.full_name && (
                                <p>
                                    <strong>Manager:</strong>{" "}
                                    {summary.manager.full_name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-xs text-blue-600 uppercase tracking-wide">
                                Opening Balance
                            </p>
                            <p className="text-lg font-bold text-blue-800">
                                {formatRupiah(summary.opening_balance)}
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-xs text-green-600 uppercase tracking-wide">
                                Total Sales
                            </p>
                            <p className="text-lg font-bold text-green-800">
                                {formatRupiah(summary.total_sales)}
                            </p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-xs text-purple-600 uppercase tracking-wide">
                                Expected Cash
                            </p>
                            <p className="text-lg font-bold text-purple-800">
                                {formatRupiah(summary.expected_cash)}
                            </p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <p className="text-xs text-orange-600 uppercase tracking-wide">
                                Actual Cash
                            </p>
                            <p className="text-lg font-bold text-orange-800">
                                {summary.actual_cash !== null
                                    ? formatRupiah(summary.actual_cash)
                                    : "Not counted"}
                            </p>
                        </div>
                    </div>

                    {/* Variance */}
                    {summary.variance !== null && (
                        <div
                            className={`p-4 rounded-lg ${
                                summary.variance >= 0
                                    ? "bg-green-50"
                                    : "bg-red-50"
                            }`}
                        >
                            <p
                                className={`text-xs uppercase tracking-wide ${
                                    summary.variance >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                }`}
                            >
                                Cash Variance
                            </p>
                            <p
                                className={`text-lg font-bold ${
                                    summary.variance >= 0
                                        ? "text-green-800"
                                        : "text-red-800"
                                }`}
                            >
                                {summary.variance >= 0 ? "+" : ""}
                                {formatRupiah(summary.variance)}
                            </p>
                        </div>
                    )}

                    {/* Sales Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">
                                {Object.keys(productBreakdown).length}
                            </p>
                            <p className="text-sm text-gray-600">
                                Total Orders
                            </p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">
                                {dailyCups}
                            </p>
                            <p className="text-sm text-gray-600">Cups Sold</p>
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-gray-800">
                            Timestamps
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Created:</span>
                                <span className="font-medium">
                                    {formatFullTimestamp(summary.created_at)}
                                </span>
                            </div>
                            {summary.closed_at && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Closed:
                                    </span>
                                    <span className="font-medium">
                                        {formatFullTimestamp(summary.closed_at)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Breakdown */}
                    {Object.keys(productBreakdown).length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-800">
                                Product Sales
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(productBreakdown).map(
                                    ([productName, data]) => (
                                        <div
                                            key={productName}
                                            className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                                        >
                                            <span className="font-medium">
                                                {productName}
                                            </span>
                                            <div className="text-right">
                                                <p className="font-medium">
                                                    {data.quantity} cups
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {formatRupiah(data.revenue)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {summary.notes && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-800">Notes</h4>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    {summary.notes}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().slice(0, 7)
    );
    const [showOpenStorePopup, setShowOpenStorePopup] = useState(false);
    const [showCloseReminder, setShowCloseReminder] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedSummary, setSelectedSummary] = useState<any>(null);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    const [editForm, setEditForm] = useState({
        opening_balance: "",
    });
    const [closeForm, setCloseForm] = useState({
        actual_cash: "",
        notes: "",
    });

    // Use hooks instead of direct Supabase calls
    const { data: stores = [], isLoading: storesLoading } = useStores(
        profile?.role ?? "",
        profile?.id ?? ""
    );

    const { data, isLoading, error, createSummary, updateSummary } =
        useSummaries(selectedStore, selectedMonth);

    const isManager = profile?.role === "manager";

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Auto-select first store when stores are loaded
    useEffect(() => {
        if (stores.length > 0 && !selectedStore) {
            setSelectedStore(stores[0].id);
        }
    }, [stores, selectedStore]);

    // Close day reminder logic - check every hour after 10 PM
    // useEffect(() => {
    //     if (!isManager || !data?.summaries) return;

    //     const checkCloseReminder = () => {
    //         const now = new Date();
    //         const hour = now.getHours();

    //         // Only show reminder between 10 PM and 6 AM
    //         if (hour >= 22 || hour < 6) {
    //             const todayStr = now.toISOString().split("T")[0];
    //             const todaysSummary = data.summaries.find(
    //                 (s) => s.date === todayStr
    //             );

    //             if (todaysSummary && !todaysSummary.closed_at) {
    //                 setShowCloseReminder(true);
    //             }
    //         }
    //     };

    //     // Check immediately
    //     checkCloseReminder();

    //     // Then check every hour
    //     const interval = setInterval(checkCloseReminder, 60 * 60 * 1000);

    //     return () => clearInterval(interval);
    // }, [isManager, data?.summaries]);

    // Add these helper functions after the existing helper functions:
    const getUnclosedSummaries = () => {
        if (!data?.summaries) return [];
        return data.summaries.filter((s) => !s.closed_at);
    };

    const getStoreName = () =>
        stores.find((s) => s.id === selectedStore)?.name || "Unknown Store";

    // useEffect(() => {
    //     if (!isManager || !data?.summaries) return;

    //     const unclosedSummaries = getUnclosedSummaries();
    //     if (unclosedSummaries.length > 0) {
    //         setShowCloseReminder(true);
    //     }
    // }, [isManager, data?.summaries]);

    // This new useEffect for open store reminder
    useEffect(() => {
        if (!isManager || !selectedStore || !data?.summaries) return;

        const todayStr = new Date().toISOString().split("T")[0];
        const todaysSummary = data.summaries.find((s) => s.date === todayStr);

        if (!todaysSummary) {
            setShowOpenStorePopup(true);
        } else {
            setShowOpenStorePopup(false);
        }
    }, [isManager, selectedStore, data?.summaries]);

    const handleOpenStoreToday = async () => {
        if (!selectedStore || !profile) return;

        try {
            const todayStr = new Date().toISOString().split("T")[0];

            await createSummary({
                storeId: selectedStore,
                sellerId: profile.id, // Current user as seller
                managerId: isManager ? profile.id : "", // Set manager if current user is manager
                date: todayStr,
                openingBalance: 0,
            });

            setShowOpenStorePopup(false);
            showToast("Store opened for today", "success");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            showToast(error.message || "Failed to open store", "error");
            console.error(error);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSummary || !isManager) return;

        try {
            const openingBalance = parseFloat(editForm.opening_balance);

            await updateSummary(selectedSummary.id, {
                opening_balance: openingBalance,
            });

            showToast("Opening balance updated successfully", "success");
            setEditForm({ opening_balance: "" });
            setShowEditForm(false);
            setSelectedSummary(null);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            showToast(
                error.message || "Failed to update opening balance",
                "error"
            );
            console.error(error);
        }
    };

    const handleCloseDay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSummary || !isManager) return;

        try {
            const actualCash = parseFloat(closeForm.actual_cash);
            const variance = actualCash - selectedSummary.expected_cash;

            await updateSummary(selectedSummary.id, {
                actual_cash: actualCash,
                variance: variance,
                notes: closeForm.notes || null,
                closed_at: new Date().toISOString(),
            });

            showToast("Day closed successfully", "success");
            setCloseForm({ actual_cash: "", notes: "" });
            setShowCloseForm(false);
            setShowCloseReminder(false);
            setSelectedSummary(null);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            showToast(error.message || "Failed to close day", "error");
            console.error(error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year:
                    date.getFullYear() !== today.getFullYear()
                        ? "numeric"
                        : undefined,
            });
        }
    };

    const getTodaysSummary = () => {
        const todayStr = new Date().toISOString().split("T")[0];
        return data?.summaries.find((summary) => summary.date === todayStr);
    };

    const getProductBreakdownForDate = (date: string) => {
        return data?.productBreakdown[date] || {};
    };

    const getCupsCountForDate = (date: string) => {
        const breakdown = getProductBreakdownForDate(date);
        return Object.values(breakdown).reduce(
            (total, product) => total + product.quantity,
            0
        );
    };

    const getOrdersCountForDate = (date: string) => {
        return data?.ordersByDate?.[date]?.length || 0;
    };

    if (isLoading || storesLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-600">
                    Error loading analytics: {error.message}
                </p>
            </div>
        );
    }

    const todaysSummary = getTodaysSummary();

    return (
        <div className="space-y-4">
            {/* Monthly Summary Section */}
            {data?.monthlyTotals && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Calculator size={20} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-800">
                            Monthly Summary
                        </h3>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                            <p className="text-xl font-bold text-blue-600">
                                {data.monthlyTotals.totalOrders}
                            </p>
                            <p className="text-sm text-gray-600">Orders</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-orange-600">
                                {data.monthlyTotals.totalCups}
                            </p>
                            <p className="text-sm text-gray-600">Cups</p>
                        </div>
                        <div className="text-center col-span-2 border-l-2 border-gray-300">
                            <p className="text-sm text-gray-600">Total Sales</p>
                            <p className="text-xl font-bold text-green-600">
                                {formatRupiah(data.monthlyTotals.totalSales)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Unclosed Days Warning */}
            {isManager && getUnclosedSummaries().length > 0 && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={20} className="text-red-600" />
                        <h3 className="font-semibold text-red-800">
                            {getUnclosedSummaries().length - 1} Overdue Unclosed
                            Day(s)
                        </h3>
                    </div>
                    <p className="text-sm text-red-700 mb-2">
                        Please close these days to maintain accurate financial
                        records.
                    </p>
                    {/* <button
                        onClick={() => setShowCloseReminder(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                        Review Unclosed Days
                    </button> */}
                </div>
            )}

            {/* Open Store Today Button - Only show if manager and store not opened */}
            {isManager && !todaysSummary && (
                // <div className="w-full bg-white rounded-lg shadow-md p-6">
                //     <h3 className="font-semibold text-gray-800">
                //         Open store Today for{" "}
                //         {stores.find((s) => s.id === selectedStore)?.name}
                //     </h3>
                //     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                //         <p className="text-sm text-gray-600">
                //             Opening the store will initialize a summary with
                //             zero balances.
                //         </p>
                //         <button
                //             className="bg-blue-600 text-white text-sm font-medium py-2.5 px-5 rounded-lg hover:bg-blue-700 transition"
                //             onClick={() => setShowOpenStorePopup(true)}
                //         >
                //             Open Store on{" "}
                //             {new Date().toLocaleDateString("en-US", {
                //                 weekday: "long",
                //                 day: "numeric",
                //                 month: "short",
                //             })}
                //         </button>
                //     </div>
                // </div>

                <div className="bg-green-50 border border-green-200 p-3.5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        {/* Replace 'CheckCircle' with an appropriate icon if you're using a library like react-feather or lucide-react */}
                        <CheckCircle size={20} className="text-green-600" />
                        <h3 className="font-semibold text-green-800">
                            Open store Today for{" "}
                            {stores.find((s) => s.id === selectedStore)?.name}
                        </h3>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                        Opening the store will initialize a summary with zero
                        balances.
                    </p>
                    <button
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                        onClick={() => setShowOpenStorePopup(true)}
                    >
                        Open Store on{" "}
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                        })}
                    </button>
                </div>
            )}

            {/* Store and Month Selection */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <CalendarDays size={16} className="inline mr-1" />
                        Select Month
                    </label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {stores.length > 1 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <StoreIcon size={16} className="inline mr-1" />
                            Select Store
                        </label>
                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                    {store.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {selectedStore && (
                <div className="space-y-3">
                    {/* Open Store Today Button - Only show if manager and store not opened */}
                    {/* {!todaysSummary && isManager && (
                        <div className="w-full bg-white rounded-lg shadow-md p-6">
                            <h3 className="font-semibold text-gray-800">
                                Open store Today for{" "}
                                {
                                    stores.find((s) => s.id === selectedStore)
                                        ?.name
                                }
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                                <p className="text-sm text-gray-600">
                                    Opening the store will initialize a summary
                                    with zero balances.
                                </p>
                                <button
                                    className="bg-blue-600 text-white text-sm font-medium py-2.5 px-5 rounded-lg hover:bg-blue-700 transition"
                                    onClick={() => setShowOpenStorePopup(true)}
                                >
                                    Open Store on{" "}
                                    {new Date().toLocaleDateString("en-US", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "short",
                                    })}
                                </button>
                            </div>
                        </div>
                    )} */}

                    {/* Daily Summary Cards */}
                    <div className="bg-gray-50 rounded-lg space-y-3">
                        {!data?.summaries || data.summaries.length === 0 ? (
                            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                                <Calendar
                                    size={48}
                                    className="mx-auto text-gray-400 mb-4"
                                />
                                <p className="text-gray-600">
                                    No daily summary found for selected month
                                </p>
                            </div>
                        ) : (
                            data.summaries.map((summary) => {
                                // const productBreakdown =
                                //     getProductBreakdownForDate(summary.date);
                                const dailyCups = getCupsCountForDate(
                                    summary.date
                                );
                                const dailyOrders = getOrdersCountForDate(
                                    summary.date
                                );

                                return (
                                    <div
                                        key={summary.id}
                                        className="bg-white rounded-lg shadow-sm overflow-hidden"
                                    >
                                        {/* Summary Header */}
                                        <div className="p-3.5 bg-white">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSummary(
                                                                summary
                                                            );
                                                            setShowDetailsModal(
                                                                true
                                                            );
                                                        }}
                                                        className="text-left hover:text-blue-600 transition-colors"
                                                    >
                                                        <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600">
                                                            {formatDate(
                                                                summary.date
                                                            )}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">
                                                            {
                                                                summary.seller
                                                                    ?.full_name
                                                            }
                                                        </p>
                                                        <p className="text-xs text-blue-600 mt-1">
                                                            Tap for details
                                                        </p>
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    {summary.closed_at ? (
                                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                                            Closed
                                                        </span>
                                                    ) : (
                                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                                            Open
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Cash Balances */}
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Opening Balance
                                                    </p>
                                                    <p className="text-lg font-semibold text-blue-600">
                                                        {formatRupiah(
                                                            summary.opening_balance
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Actual Cash
                                                    </p>
                                                    <p className="text-lg font-semibold text-purple-600">
                                                        {summary.actual_cash !==
                                                        null
                                                            ? formatRupiah(
                                                                  summary.actual_cash
                                                              )
                                                            : "Not counted"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Daily Totals */}
                                            <div className="grid grid-cols-4 gap-4 mb-4">
                                                <div className="col-span-2">
                                                    <p className="text-xs text-gray-500">
                                                        Sales
                                                    </p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        {formatRupiah(
                                                            summary.total_sales
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Orders
                                                    </p>
                                                    <p className="text-lg font-bold text-blue-600">
                                                        {/* {
                                                            Object.keys(
                                                                productBreakdown
                                                            ).length
                                                        } */}
                                                        {dailyOrders}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Cups
                                                    </p>
                                                    <p className="text-lg font-bold text-orange-600">
                                                        {dailyCups}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Variance */}
                                            {summary.variance !== null && (
                                                <div className="mb-4">
                                                    <p
                                                        className={`text-sm font-medium ${
                                                            summary.variance >=
                                                            0
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        Variance:{" "}
                                                        {summary.variance >= 0
                                                            ? "+"
                                                            : ""}
                                                        {formatRupiah(
                                                            summary.variance
                                                        )}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {summary.notes && (
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">
                                                        Notes
                                                    </p>
                                                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                                        {summary.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Manager Actions */}
                                        {isManager && !summary.closed_at && (
                                            <div className="border-t border-gray-100 p-3 bg-gray-50">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSummary(
                                                                summary
                                                            );
                                                            setEditForm({
                                                                opening_balance:
                                                                    summary.opening_balance.toString(),
                                                            });
                                                            setShowEditForm(
                                                                true
                                                            );
                                                        }}
                                                        className="flex-1 bg-white text-blue-500 border border-blue-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center"
                                                    >
                                                        Set Balance
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setSelectedSummary(
                                                                summary
                                                            );
                                                            setCloseForm({
                                                                actual_cash:
                                                                    summary.expected_cash.toString(),
                                                                notes: "",
                                                            });
                                                            setShowCloseForm(
                                                                true
                                                            );
                                                        }}
                                                        className="flex-1 bg-white text-red-500 border border-red-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-50"
                                                    >
                                                        Close Day
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Open Store Confirmation Popup */}
            <ConfirmationPopup
                isOpen={showOpenStorePopup}
                // title="Open Store Today"
                // message={`Are you sure you want to open ${
                //     stores.find((s) => s.id === selectedStore)?.name
                // } for today? This will create a new daily summary with zero opening balance.`}
                title="Open Store for Today"
                message={`Open ${getStoreName()} for ${new Date().toLocaleDateString(
                    "en-US",
                    {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }
                )}? This will create a new daily summary.`}
                confirmText="Open Store"
                onConfirm={handleOpenStoreToday}
                onCancel={() => setShowOpenStorePopup(false)}
            />

            {/* Close Day Reminder Popup */}
            <ConfirmationPopup
                isOpen={showCloseReminder}
                title="Close Day Reminder"
                message="Don't forget to close the day and count the cash before ending your shift. This ensures accurate financial records."
                confirmText="Close Now"
                // title={`${getUnclosedSummaries().length} Unclosed Day(s)`}
                // message={`You have ${
                //     getUnclosedSummaries().length
                // } unclosed day(s) at ${getStoreName()}. Please close them to ensure accurate records.`}
                // confirmText="Review & Close"
                cancelText="Remind Later"
                onConfirm={() => {
                    const todaysSummary = getTodaysSummary();
                    if (todaysSummary) {
                        setSelectedSummary(todaysSummary);
                        setCloseForm({
                            actual_cash: todaysSummary.expected_cash.toString(),
                            notes: "",
                        });
                        setShowCloseForm(true);
                        setShowCloseReminder(false);
                    }
                }}
                onCancel={() => setShowCloseReminder(false)}
                type="warning"
            />

            {/* Details Modal */}
            <DetailsModal
                isOpen={showDetailsModal}
                summary={selectedSummary}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedSummary(null);
                }}
                productBreakdown={
                    selectedSummary
                        ? getProductBreakdownForDate(selectedSummary.date)
                        : {}
                }
                storeName={
                    stores.find((s) => s.id === selectedStore)?.name ||
                    "Unknown Store"
                }
            />

            {/* Edit Opening Balance Modal */}
            {showEditForm && selectedSummary && isManager && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowEditForm(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            {/* <h2 className="text-lg font-semibold">
                                Edit Opening Balance
                            </h2> */}
                            <h2 className="text-lg font-semibold">
                                Set Opening Balance -{" "}
                                {formatDate(selectedSummary.date)} at{" "}
                                {getStoreName()}
                            </h2>
                            <button
                                onClick={() => setShowEditForm(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleEditSubmit}
                            className="p-4 space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Opening Balance
                                </label>
                                <input
                                    type="number"
                                    step="100"
                                    inputMode="numeric"
                                    min={0}
                                    value={editForm.opening_balance}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            opening_balance: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="0"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This will update the expected cash
                                    automatically
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600"
                            >
                                Update Opening Balance
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Day Modal */}
            {showCloseForm && selectedSummary && isManager && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowCloseForm(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            {/* <h2 className="text-lg font-semibold">Close Day</h2> */}
                            <h2 className="text-lg font-semibold">
                                Close Day - {formatDate(selectedSummary.date)}{" "}
                                at {getStoreName()}
                            </h2>
                            <button
                                onClick={() => setShowCloseForm(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="font-medium text-blue-800">
                                    Expected Cash
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatRupiah(
                                        selectedSummary.expected_cash
                                    )}
                                </p>
                                <p className="text-sm text-blue-600">
                                    Opening:{" "}
                                    {formatRupiah(
                                        selectedSummary.opening_balance
                                    )}{" "}
                                    + Sales:{" "}
                                    {formatRupiah(selectedSummary.total_sales)}
                                </p>
                            </div>

                            <form
                                onSubmit={handleCloseDay}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Actual Cash Count
                                    </label>
                                    <input
                                        type="number"
                                        step="100"
                                        min={0}
                                        value={closeForm.actual_cash}
                                        onChange={(e) =>
                                            setCloseForm({
                                                ...closeForm,
                                                actual_cash: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={closeForm.notes}
                                        onChange={(e) =>
                                            setCloseForm({
                                                ...closeForm,
                                                notes: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20"
                                        placeholder="Any notes about the day..."
                                    />
                                </div>

                                {closeForm.actual_cash && (
                                    <div
                                        className={`p-4 rounded-lg ${
                                            parseFloat(closeForm.actual_cash) -
                                                selectedSummary.expected_cash >=
                                            0
                                                ? "bg-green-50"
                                                : "bg-red-50"
                                        }`}
                                    >
                                        <p className="font-medium">
                                            Variance:{" "}
                                            {formatRupiah(
                                                parseFloat(
                                                    closeForm.actual_cash
                                                ) -
                                                    selectedSummary.expected_cash
                                            )}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600"
                                >
                                    Close Day
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                        toast.type === "success"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                    }`}
                >
                    <div className="flex justify-between items-center">
                        <span className="font-medium">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-4 text-white hover:opacity-75"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
