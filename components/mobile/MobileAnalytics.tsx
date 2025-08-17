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

//components/mobile/MobileAnalytics.tsx
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";
import { Profile } from "@/lib/types";
import {
    RefreshCw,
    X,
    Calendar,
    Edit3,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";

interface DailySummary {
    id: string;
    store_id: string;
    seller_id: string;
    manager_id: string | null;
    date: string;
    opening_balance: number;
    total_sales: number;
    expected_cash: number;
    actual_cash: number | null;
    variance: number | null;
    closed_at: string | null;
    notes: string | null;
    created_at: string;
    stores?: { name: string };
    seller?: { full_name: string };
}

interface MobileAnalyticsProps {
    profile: Profile | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [showEditForm, setShowEditForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(
        null
    );
    const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    const [editForm, setEditForm] = useState({
        seller_id: "",
        opening_balance: "",
    });
    const [closeForm, setCloseForm] = useState({
        actual_cash: "",
        notes: "",
    });
    const [hasOpenToday, setHasOpenToday] = useState(false);

    const todayStr = new Date().toISOString().split("T")[0];

    const checkHasOpenToday = async () => {
        if (!selectedStore) {
            setHasOpenToday(false);
            return;
        }
        try {
            const { count, error } = await supabase
                .from("daily_summaries")
                .select("id", { count: "exact", head: true })
                .eq("store_id", selectedStore)
                .eq("date", todayStr);

            if (error) throw error;
            setHasOpenToday((count ?? 0) > 0);
        } catch (err) {
            console.error(err);
            setHasOpenToday(false);
        }
    };

    const supabase = createClient();
    const {
        stores = [],
        sellers = [],
        summaries = [],
        isLoading,
        mutate,
    } = useAnalyticsData(selectedStore, selectedDate);

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Auto-select first store when stores are loaded
    useEffect(() => {
        if (stores && stores.length > 0 && !selectedStore) {
            setSelectedStore(stores[0].id);
        }
    }, [stores, selectedStore]);

    const calculateTotalSales = async (storeId: string, date: string) => {
        const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("store_id", storeId)
            .gte("created_at", `${date}T00:00:00`)
            .lt("created_at", `${date}T23:59:59`);

        return orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    };

    // const createDailySummary = async () => {
    //     if (!selectedStore || !selectedDate) return;

    //     try {
    //         const {
    //             data: { user },
    //         } = await supabase.auth.getUser();
    //         if (!user) return;

    //         // Check if summary already exists
    //         const { data: existing } = await supabase
    //             .from("daily_summaries")
    //             .select("id")
    //             .eq("store_id", selectedStore)
    //             .eq("date", selectedDate)
    //             .single();

    //         if (existing) {
    //             showToast(
    //                 "Daily summary already exists for this date",
    //                 "error"
    //             );
    //             return;
    //         }

    //         const totalSales = await calculateTotalSales(
    //             selectedStore,
    //             selectedDate
    //         );
    //         const defaultSeller = sellers.length > 0 ? sellers[0].id : user.id;

    //         const { error } = await supabase.from("daily_summaries").insert({
    //             store_id: selectedStore,
    //             seller_id: defaultSeller,
    //             manager_id: user.id,
    //             date: selectedDate,
    //             opening_balance: 0,
    //             total_sales: totalSales,
    //             expected_cash: totalSales,
    //         });

    //         if (error) throw error;

    //         showToast("Daily summary created successfully", "success");
    //         mutate();
    //     } catch (error) {
    //         showToast("Failed to create daily summary", "error");
    //         console.error(error);
    //     }
    // };

    // Inside MobileAnalytics component:

    // const handleOpenStoreToday = async () => {
    //     if (!selectedStore) return;

    //     try {
    //         const {
    //             data: { user },
    //         } = await supabase.auth.getUser();
    //         if (!user) return;

    //         const todayStr = new Date().toISOString().split("T")[0];

    //         // Check if already exists
    //         const { data: existing } = await supabase
    //             .from("daily_summaries")
    //             .select("id")
    //             .eq("store_id", selectedStore)
    //             .eq("date", todayStr)
    //             .single();

    //         if (existing) {
    //             showToast("Daily summary already exists for today", "error");
    //             return;
    //         }

    //         const defaultSeller = sellers.length > 0 ? sellers[0].id : user.id;

    //         const { error } = await supabase.from("daily_summaries").insert({
    //             store_id: selectedStore,
    //             seller_id: defaultSeller,
    //             manager_id: user.id,
    //             date: todayStr,
    //             opening_balance: 0,
    //             total_sales: 0,
    //             expected_cash: 0,
    //         });

    //         if (error) throw error;

    //         showToast("Store opened for today", "success");
    //         mutate();
    //     } catch (error) {
    //         showToast("Failed to open store", "error");
    //         console.error(error);
    //     }
    // };

    const handleOpenStoreToday = async () => {
        if (!selectedStore) return;

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // If already opened, bail (prevents race taps)
            const { count, error: existsErr } = await supabase
                .from("daily_summaries")
                .select("id", { count: "exact", head: true })
                .eq("store_id", selectedStore)
                .eq("date", todayStr);

            if (existsErr) throw existsErr;
            if ((count ?? 0) > 0) {
                showToast("Daily summary already exists for today", "error");
                setHasOpenToday(true);
                return;
            }

            const defaultSeller = sellers.length > 0 ? sellers[0].id : user.id;

            const { error } = await supabase.from("daily_summaries").insert({
                store_id: selectedStore,
                seller_id: defaultSeller,
                manager_id: user.id,
                date: todayStr,
                opening_balance: 0,
                total_sales: 0,
                expected_cash: 0,
            });

            if (error) throw error;

            showToast("Store opened for today", "success");
            setHasOpenToday(true);
            mutate(); // keep your list fresh
        } catch (error) {
            showToast("Failed to open store", "error");
            console.error(error);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSummary) return;

        try {
            const openingBalance = parseFloat(editForm.opening_balance);
            const expectedCash = openingBalance + selectedSummary.total_sales;

            const { error } = await supabase
                .from("daily_summaries")
                .update({
                    seller_id: editForm.seller_id,
                    opening_balance: openingBalance,
                    expected_cash: expectedCash,
                })
                .eq("id", selectedSummary.id);

            if (error) throw error;

            showToast("Daily summary updated successfully", "success");
            setEditForm({ seller_id: "", opening_balance: "" });
            setShowEditForm(false);
            setSelectedSummary(null);
            mutate();
        } catch (error) {
            showToast("Failed to update daily summary", "error");
            console.error(error);
        }
    };

    const handleCloseDay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSummary) return;

        try {
            const actualCash = parseFloat(closeForm.actual_cash);
            const variance = actualCash - selectedSummary.expected_cash;

            const { error } = await supabase
                .from("daily_summaries")
                .update({
                    actual_cash: actualCash,
                    variance: variance,
                    notes: closeForm.notes || null,
                    closed_at: new Date().toISOString(),
                })
                .eq("id", selectedSummary.id);

            if (error) throw error;

            showToast("Day closed successfully", "success");
            setCloseForm({ actual_cash: "", notes: "" });
            setShowCloseForm(false);
            setSelectedSummary(null);
            mutate();
        } catch (error) {
            showToast("Failed to close day", "error");
            console.error(error);
        }
    };

    const refreshSales = async (summary: DailySummary) => {
        try {
            const totalSales = await calculateTotalSales(
                summary.store_id,
                summary.date
            );
            const expectedCash = summary.opening_balance + totalSales;

            const { error } = await supabase
                .from("daily_summaries")
                .update({
                    total_sales: totalSales,
                    expected_cash: expectedCash,
                })
                .eq("id", summary.id);

            if (error) throw error;

            showToast("Sales refreshed successfully", "success");
            mutate();
        } catch (error) {
            showToast("Failed to refresh sales", "error");
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
                month: "short",
                day: "numeric",
                year:
                    date.getFullYear() !== today.getFullYear()
                        ? "numeric"
                        : undefined,
            });
        }
    };

    useEffect(() => {
        checkHasOpenToday();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStore, summaries.length]); // length changes on mutate -> recheck

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Store and Date Selection */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                {stores.length > 1 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Store
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date (Last 7 days from)
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Daily Summaries */}
            {/* {selectedStore && (
                <div className="space-y-3">
                    <div
                        onClick={handleOpenStoreToday}
                        className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition"
                    >
                        <h3 className="font-semibold text-gray-800">
                            Open store for{" "}
                            {stores.find((s) => s.id === selectedStore)?.name}{" "}
                            Today (
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                day: "numeric",
                                month: "short",
                            })}
                            )
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Creates a daily summary with zero balances for
                            today.
                        </p>
                    </div>
                    {summaries.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                            <Calendar
                                size={48}
                                className="mx-auto text-gray-400 mb-4"
                            />
                            <p className="text-gray-600 mb-4">
                                No daily summary found for selected dates
                            </p>
                            <button
                                onClick={createDailySummary}
                                className="bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600"
                            >
                                Create Today&apos;s Summary
                            </button>
                        </div>
                    ) : (
                        summaries.map((summary) => (
                            <div
                                key={summary.id}
                                className="bg-white rounded-lg shadow-sm overflow-hidden"
                            >
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() =>
                                        setExpandedSummary(
                                            expandedSummary === summary.id
                                                ? null
                                                : summary.id
                                        )
                                    }
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">
                                                {formatDate(summary.date)}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {summary.seller?.full_name}
                                            </p>
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
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
                                                Expected
                                            </p>
                                            <p className="text-lg font-bold text-blue-600">
                                                {formatRupiah(
                                                    summary.expected_cash
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {summary.variance !== null && (
                                        <div className="mt-2">
                                            <p
                                                className={`text-sm font-medium ${
                                                    summary.variance >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                Variance:
                                                {summary.variance >= 0
                                                    ? "+"
                                                    : ""}
                                                {formatRupiah(summary.variance)}
                                            </p>
                                        </div>
                                    )}
                                </div> */}
            {selectedStore && (
                <div className="space-y-3">
                    {!hasOpenToday && (
                        <div className="w-full bg-white rounded-lg shadow-md p-6 cursor-pointer hover:bg-gray-50 transition">
                            <h3 className="font-semibold text-gray-800">
                                Open store Today for{' "'}
                                {
                                    stores.find((s) => s.id === selectedStore)
                                        ?.name
                                }
                                {'" '}
                                {/* Today on{" "}
                                {new Date().toLocaleDateString("en-US", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "short",
                                })}
                                {"."} */}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                                <p className="text-sm text-gray-600">
                                    Opening the store will initialize a summary
                                    with zero balances.
                                </p>
                                <button
                                    className="bg-blue-600 text-white text-sm font-medium py-2.5 px-5 rounded-lg hover:bg-blue-700 transition"
                                    onClick={handleOpenStoreToday}
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
                    )}

                    {summaries.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                            <Calendar
                                size={48}
                                className="mx-auto text-gray-400 mb-4"
                            />
                            <p className="text-gray-600">
                                No daily summary found for selected dates
                            </p>
                        </div>
                    ) : (
                        // summaries.map((summary) => (
                        //     <div
                        //         key={summary.id}
                        //         className="bg-white rounded-lg shadow-sm overflow-hidden"
                        //     >
                        //         <div
                        //             className="p-4 cursor-pointer"
                        //             onClick={() =>
                        //                 setExpandedSummary(
                        //                     expandedSummary === summary.id
                        //                         ? null
                        //                         : summary.id
                        //                 )
                        //             }
                        //         >
                        //             <div className="flex justify-between items-start mb-2">
                        //                 <div>
                        //                     <h3 className="font-semibold text-gray-800">
                        //                         {formatDate(summary.date)}
                        //                     </h3>
                        //                     <p className="text-sm text-gray-600">
                        //                         {summary.seller?.full_name}
                        //                     </p>
                        //                 </div>
                        //                 <div className="text-right">
                        //                     {summary.closed_at ? (
                        //                         <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                        //                             Closed
                        //                         </span>
                        //                     ) : (
                        //                         <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        //                             Open
                        //                         </span>
                        //                     )}
                        //                 </div>
                        //             </div>

                        //             <div className="grid grid-cols-2 gap-4">
                        //                 <div>
                        //                     <p className="text-xs text-gray-500">
                        //                         Sales
                        //                     </p>
                        //                     <p className="text-lg font-bold text-green-600">
                        //                         {formatRupiah(
                        //                             summary.total_sales
                        //                         )}
                        //                     </p>
                        //                 </div>
                        //                 <div>
                        //                     <p className="text-xs text-gray-500">
                        //                         Expected
                        //                     </p>
                        //                     <p className="text-lg font-bold text-blue-600">
                        //                         {formatRupiah(
                        //                             summary.expected_cash
                        //                         )}
                        //                     </p>
                        //                 </div>
                        //                 {expandedSummary === summary.id ? (
                        //                     <ChevronUp
                        //                         size={20}
                        //                         className="text-gray-400"
                        //                     />
                        //                 ) : (
                        //                     <ChevronDown
                        //                         size={20}
                        //                         className="text-gray-400"
                        //                     />
                        //                 )}
                        //             </div>

                        //             {summary.variance !== null && (
                        //                 <div className="mt-2">
                        //                     <p
                        //                         className={`text-sm font-medium ${
                        //                             summary.variance >= 0
                        //                                 ? "text-green-600"
                        //                                 : "text-red-600"
                        //                         }`}
                        //                     >
                        //                         Variance:{" "}
                        //                         {summary.variance >= 0
                        //                             ? "+"
                        //                             : ""}
                        //                         {formatRupiah(summary.variance)}
                        //                     </p>
                        //                 </div>
                        //             )}
                        //         </div>

                        //         {/* Expanded Details */}
                        //         {expandedSummary === summary.id && (
                        //             <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                        //                 <div className="grid grid-cols-2 gap-4">
                        //                     <div>
                        //                         <p className="text-xs text-gray-500 mb-1">
                        //                             Opening Balance
                        //                         </p>
                        //                         <p className="font-semibold">
                        //                             {formatRupiah(
                        //                                 summary.opening_balance
                        //                             )}
                        //                         </p>
                        //                     </div>
                        //                     <div>
                        //                         <p className="text-xs text-gray-500 mb-1">
                        //                             Actual Cash
                        //                         </p>
                        //                         <p className="font-semibold">
                        //                             {summary.actual_cash !==
                        //                             null
                        //                                 ? `${formatRupiah(
                        //                                       summary.actual_cash
                        //                                   )}`
                        //                                 : "Not counted"}
                        //                         </p>
                        //                     </div>
                        //                 </div>

                        //                 {summary.notes && (
                        //                     <div>
                        //                         <p className="text-xs text-gray-500 mb-1">
                        //                             Notes
                        //                         </p>
                        //                         <p className="text-sm text-gray-700 bg-white p-2 rounded">
                        //                             {summary.notes}
                        //                         </p>
                        //                     </div>
                        //                 )}

                        //                 {summary.closed_at && (
                        //                     <div className="text-xs text-gray-500">
                        //                         Closed:{" "}
                        //                         {new Date(
                        //                             summary.closed_at
                        //                         ).toLocaleString()}
                        //                     </div>
                        //                 )}

                        //                 {!summary.closed_at && (
                        //                     <div className="flex space-x-2">
                        //                         <button
                        //                             onClick={(e) => {
                        //                                 e.stopPropagation();
                        //                                 setSelectedSummary(
                        //                                     summary
                        //                                 );
                        //                                 setEditForm({
                        //                                     seller_id:
                        //                                         summary.seller_id,
                        //                                     opening_balance:
                        //                                         summary.opening_balance.toString(),
                        //                                 });
                        //                                 setShowEditForm(true);
                        //                             }}
                        //                             className="flex-1 bg-gray-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center justify-center"
                        //                         >
                        //                             <Edit3
                        //                                 size={16}
                        //                                 className="mr-1"
                        //                             />
                        //                             Edit
                        //                         </button>
                        //                         <button
                        //                             onClick={(e) => {
                        //                                 e.stopPropagation();
                        //                                 refreshSales(summary);
                        //                             }}
                        //                             className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center"
                        //                         >
                        //                             <RefreshCw
                        //                                 size={16}
                        //                                 className="mr-1"
                        //                             />
                        //                             Refresh
                        //                         </button>
                        //                         <button
                        //                             onClick={(e) => {
                        //                                 e.stopPropagation();
                        //                                 setSelectedSummary(
                        //                                     summary
                        //                                 );
                        //                                 setCloseForm({
                        //                                     actual_cash:
                        //                                         summary.expected_cash.toString(),
                        //                                     notes: "",
                        //                                 });
                        //                                 setShowCloseForm(true);
                        //                             }}
                        //                             className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
                        //                         >
                        //                             Close Day
                        //                         </button>
                        //                     </div>
                        //                 )}
                        //             </div>
                        //         )}
                        //     </div>
                        // ))
                        summaries.map((summary) => (
                            <div
                                key={summary.id}
                                className="bg-white rounded-lg shadow-sm overflow-hidden"
                            >
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() =>
                                        setExpandedSummary(
                                            expandedSummary === summary.id
                                                ? null
                                                : summary.id
                                        )
                                    }
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium text-gray-600">
                                                {formatDate(summary.date)}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {summary.seller?.full_name}
                                            </p>
                                            <div className="flex gap-4 mt-2">
                                                <div>
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
                                                        Expected
                                                    </p>
                                                    <p className="text-lg font-bold text-blue-600">
                                                        {formatRupiah(
                                                            summary.expected_cash
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {summary.variance !== null && (
                                                <div className="mt-2">
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
                                        </div>

                                        <div className="text-right flex flex-col items-end space-y-2">
                                            <div>
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
                                            <div>
                                                {expandedSummary ===
                                                summary.id ? (
                                                    <ChevronUp
                                                        size={20}
                                                        className="text-gray-400"
                                                    />
                                                ) : (
                                                    <ChevronDown
                                                        size={20}
                                                        className="text-gray-400"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedSummary === summary.id && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Opening Balance
                                                </p>
                                                <p className="font-semibold">
                                                    {formatRupiah(
                                                        summary.opening_balance
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Actual Cash
                                                </p>
                                                <p className="font-semibold">
                                                    {summary.actual_cash !==
                                                    null
                                                        ? formatRupiah(
                                                              summary.actual_cash
                                                          )
                                                        : "Not counted"}
                                                </p>
                                            </div>
                                        </div>

                                        {summary.notes && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Notes
                                                </p>
                                                <p className="text-sm text-gray-700 bg-white p-2 rounded">
                                                    {summary.notes}
                                                </p>
                                            </div>
                                        )}

                                        {summary.closed_at && (
                                            <div className="text-xs text-gray-500">
                                                Closed:{" "}
                                                {new Date(
                                                    summary.closed_at
                                                ).toLocaleString()}
                                            </div>
                                        )}

                                        {!summary.closed_at && (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSummary(
                                                            summary
                                                        );
                                                        setEditForm({
                                                            seller_id:
                                                                summary.seller_id,
                                                            opening_balance:
                                                                summary.opening_balance.toString(),
                                                        });
                                                        setShowEditForm(true);
                                                    }}
                                                    className="flex-1 bg-gray-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center justify-center"
                                                >
                                                    <Edit3
                                                        size={16}
                                                        className="mr-1"
                                                    />
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        refreshSales(summary);
                                                    }}
                                                    className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center"
                                                >
                                                    <RefreshCw
                                                        size={16}
                                                        className="mr-1"
                                                    />
                                                    Refresh
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSummary(
                                                            summary
                                                        );
                                                        setCloseForm({
                                                            actual_cash:
                                                                summary.expected_cash.toString(),
                                                            notes: "",
                                                        });
                                                        setShowCloseForm(true);
                                                    }}
                                                    className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
                                                >
                                                    Close Day
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Edit Daily Summary Modal */}
            {showEditForm && selectedSummary && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowEditForm(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold">
                                Edit Daily Summary
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
                                    Seller
                                </label>
                                <select
                                    value={editForm.seller_id}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            seller_id: e.target.value,
                                        })
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    {sellers.map((seller) => (
                                        <option
                                            key={seller.id}
                                            value={seller.id}
                                        >
                                            {seller.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Opening Balance
                                </label>
                                <input
                                    type="number"
                                    step="100"
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
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600"
                            >
                                Update Summary
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Day Modal */}
            {showCloseForm && selectedSummary && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowCloseForm(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Close Day</h2>
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
                                                parseInt(
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
