// //components/mobile/MobileAnalytics.tsx
// "use client";
// import { useState, useEffect, useCallback } from "react";
// import { useSummaries } from "@/lib/hooks/useSummaries";
// import { useStores } from "@/lib/hooks/useData";
// import { Profile, Store } from "@/lib/types";
// import {
//     Calendar,
//     StoreIcon,
//     CalendarDays,
//     AlertTriangle,
//     CheckCircle,
//     Receipt,
// } from "lucide-react";
// import { formatRupiah } from "@/lib/utils/formatCurrency";
// import { Assignment } from "@/app/mobile/page";
// import { hasManagerRoleInStore } from "@/lib/utils/roleUtils";
// import { SetBalanceModal } from "./analytics/SetBalanceModal";
// import { SetExpenseModal } from "./analytics/SetExpenseModal";
// import { CloseDayModal } from "./analytics/CloseDayModal";
// import { DetailsModal } from "./ui/DetailsModal";
// import { ConfirmationPopup } from "./ui/ConfirmationPopup";

// interface MobileAnalyticsProps {
//     profile: Profile | null;
// }

// export const isCurrentMonthSelected = (selectedMonth: string): boolean => {
//     const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
//     return selectedMonth === currentMonth;
// };

// export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
//     const [selectedStore, setSelectedStore] = useState<string>("");
//     const [selectedMonth, setSelectedMonth] = useState<string>(
//         new Date().toISOString().slice(0, 7)
//     );
//     const [showOpenStorePopup, setShowOpenStorePopup] = useState(false);
//     const [showCloseReminder, setShowCloseReminder] = useState(false);
//     const [showExpenseForm, setShowExpenseForm] = useState(false);

//     const [showEditForm, setShowEditForm] = useState(false);
//     const [showCloseForm, setShowCloseForm] = useState(false);
//     const [showDetailsModal, setShowDetailsModal] = useState(false);
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const [selectedSummary, setSelectedSummary] = useState<any>(null);
//     const [toast, setToast] = useState<{
//         message: string;
//         type: "success" | "error";
//     } | null>(null);

//     const { data: storesData, isLoading: storesLoading } = useStores(
//         profile?.id ?? ""
//     );
//     const stores = storesData?.stores ?? [];
//     const assignments = storesData?.assignments ?? {};

//     const managerStores = stores.filter((store: Store) =>
//         hasManagerRoleInStore(profile?.id ?? "", store.id, assignments)
//     );

//     const defaultStore = stores.find((store: Store) =>
//         assignments[store.id]?.some(
//             (assignment: Assignment) =>
//                 assignment.user_id === profile?.id && assignment.is_default
//         )
//     );

//     // const { data, isLoading, error, createSummary, updateSummary } =
//     //     useSummaries(selectedStore, selectedMonth);

//     const {
//         data,
//         isLoading,
//         error,
//         createSummary,
//         updateSummary,
//         createExpenses,
//     } = useSummaries(selectedStore, selectedMonth);

//     const isManager = profile?.role === "manager";

//     const showToast = (message: string, type: "success" | "error") => {
//         setToast({ message, type });
//         setTimeout(() => setToast(null), 3000);
//     };

//     // Auto-select first store when stores are loaded
//     useEffect(() => {
//         if (defaultStore && !selectedStore) {
//             setSelectedStore(defaultStore.id);
//         }
//     }, [defaultStore, selectedStore, storesData]);

//     const getStoreName = () =>
//         stores.find((store: Store) => store.id === selectedStore)?.name ||
//         "Unknown Store";

//     // This new useEffect for open store reminder
//     useEffect(() => {
//         if (!isManager || !selectedStore || !data?.summaries) return;

//         if (!isCurrentMonthSelected(selectedMonth)) {
//             setShowOpenStorePopup(false);
//             return;
//         }

//         const todayStr = new Date().toISOString().split("T")[0];
//         const todaysSummary = data.summaries.find((s) => s.date === todayStr);

//         if (!todaysSummary) {
//             setShowOpenStorePopup(true);
//         } else {
//             setShowOpenStorePopup(false);
//         }
//     }, [isManager, selectedStore, data?.summaries, selectedMonth]);

//     // Closed store reminder useEffect
//     const getUnclosedSummaries = useCallback(() => {
//         if (!data?.summaries) return [];
//         return data.summaries.filter((s) => !s.closed_at);
//     }, [data?.summaries]);

//     // Close day reminder logic - check every hour after 10 PM
//     useEffect(() => {
//         if (!isManager || !data?.summaries || !selectedStore) return;

//         const unclosedSummaries = getUnclosedSummaries();
//         const todayStr = new Date().toISOString().split("T")[0];
//         const todaysSummary = data.summaries.find((s) => s.date === todayStr);

//         if (todaysSummary && unclosedSummaries.length > 0) {
//             const now = new Date();
//             const hour = now.getHours();
//             if (hour >= 22 || hour < 6) {
//                 setShowCloseReminder(true);
//             }
//         }
//     }, [isManager, data?.summaries, selectedStore, getUnclosedSummaries]);

//     const handleOpenStoreToday = async () => {
//         if (!selectedStore || !profile) return;

//         try {
//             const todayStr = new Date().toISOString().split("T")[0];

//             await createSummary({
//                 storeId: selectedStore,
//                 sellerId: profile.id, // Current user as seller
//                 managerId: isManager ? profile.id : "", // Set manager if current user is manager
//                 date: todayStr,
//                 openingBalance: 0,
//             });

//             setShowOpenStorePopup(false);
//             showToast("Store opened for today", "success");
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         } catch (error: any) {
//             showToast(error.message || "Failed to open store", "error");
//             console.error(error);
//         }
//     };

//     const handleExpenseSubmit = async (
//         expenses: Array<{
//             label: string;

//             customLabel?: string;

//             amount: string;
//         }>
//     ) => {
//         if (!selectedSummary || !selectedStore) return;

//         try {
//             await createExpenses({
//                 dailySummaryId: selectedSummary.id,

//                 storeId: selectedStore,

//                 expenses: expenses,
//             });

//             setShowExpenseForm(false);

//             setSelectedSummary(null);

//             showToast("Expenses saved successfully", "success");
//         } catch (error: any) {
//             showToast(error.message || "Failed to save expenses", "error");

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

//     const getCupsCountForDate = (date: string) => {
//         const breakdown = getProductBreakdownForDate(date);
//         return Object.values(breakdown).reduce(
//             (total, product) => total + product.quantity,
//             0
//         );
//     };

//     const getOrdersCountForDate = (date: string) => {
//         return data?.ordersByDate?.[date]?.length || 0;
//     };

//     const getExpensesForDate = (date: string) => {
//         return data?.expensesByDate?.[date] || [];
//     };

//     if (isLoading || storesLoading) {
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
//             {/* Monthly Summary Section */}
//             {data?.monthlyTotals && (
//                 <div className="bg-white p-4 rounded-lg shadow-sm">
//                     <div className="flex items-center gap-2 mb-3">
//                         <Receipt size={20} className="text-gray-600" />
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

//             {/* Unclosed Days Warning */}
//             {isManager && getUnclosedSummaries().length > 1 && (
//                 <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg">
//                     <div className="flex items-center gap-2 mb-2">
//                         <AlertTriangle size={20} className="text-red-600" />
//                         <h3 className="font-semibold text-red-800">
//                             {getUnclosedSummaries().length - 1} Overdue Unclosed
//                             Day(s)
//                         </h3>
//                     </div>
//                     <p className="text-sm text-red-700 mb-2">
//                         Please close these days to maintain accurate financial
//                         records.
//                     </p>
//                     {/* <button
//                         onClick={() => setShowCloseReminder(true)}
//                         className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
//                     >
//                         Review Unclosed Days
//                     </button> */}
//                 </div>
//             )}

//             {/* Open Store Today Button - Only show if manager and store not opened */}
//             {isManager &&
//                 !todaysSummary &&
//                 isCurrentMonthSelected(selectedMonth) && (
//                     <div className="bg-green-50 border border-green-200 p-3.5 rounded-lg">
//                         <div className="flex items-center gap-2 mb-2">
//                             <CheckCircle size={20} className="text-green-600" />
//                             <h3 className="font-semibold text-green-800">
//                                 Open store Today for{" "}
//                                 {
//                                     stores.find(
//                                         (store: Store) =>
//                                             store.id === selectedStore
//                                     )?.name
//                                 }
//                             </h3>
//                         </div>
//                         <p className="text-sm text-green-700 mb-2">
//                             Opening the store will initialize a summary with
//                             zero balances.
//                         </p>
//                         <button
//                             className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
//                             onClick={() => setShowOpenStorePopup(true)}
//                         >
//                             Open Store on{" "}
//                             {new Date().toLocaleDateString("en-US", {
//                                 weekday: "long",
//                                 day: "numeric",
//                                 month: "short",
//                             })}
//                         </button>
//                     </div>
//                 )}

//             {/* Store and Month Selection */}
//             <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
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

//                 {managerStores.length > 1 && (
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
//                             {managerStores.map((store: Store) => (
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
//                     {/* Daily Summary Cards */}
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
//                                 // const productBreakdown =
//                                 //     getProductBreakdownForDate(summary.date);
//                                 const dailyCups = getCupsCountForDate(
//                                     summary.date
//                                 );
//                                 const dailyOrders = getOrdersCountForDate(
//                                     summary.date
//                                 );

//                                 return (
//                                     <div
//                                         key={summary.id}
//                                         className="bg-white rounded-lg shadow-sm overflow-hidden"
//                                     >
//                                         {/* Summary Header */}
//                                         <div className="p-3.5 bg-white">
//                                             <div className="flex justify-between items-start mb-4">
//                                                 <div className="flex-1">
//                                                     <button
//                                                         onClick={() => {
//                                                             setSelectedSummary(
//                                                                 summary
//                                                             );
//                                                             setShowDetailsModal(
//                                                                 true
//                                                             );
//                                                         }}
//                                                         className="text-left hover:text-blue-600 transition-colors"
//                                                     >
//                                                         <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600">
//                                                             {formatDate(
//                                                                 summary.date
//                                                             )}
//                                                         </h3>
//                                                         {/* <p className="text-sm text-gray-500">
//                                                             {
//                                                                 summary.seller
//                                                                     ?.full_name
//                                                             }
//                                                         </p> */}
//                                                         <p className="text-xs text-blue-600 underline">
//                                                             Tap for details
//                                                         </p>
//                                                     </button>
//                                                 </div>
//                                                 <div className="text-right">
//                                                     {summary.closed_at ? (
//                                                         <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
//                                                             Closed
//                                                         </span>
//                                                     ) : (
//                                                         <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
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
//                                                 <div>
//                                                     <p className="text-xs text-gray-500">
//                                                         Orders
//                                                     </p>
//                                                     <p className="text-lg font-bold text-blue-600">
//                                                         {/* {
//                                                             Object.keys(
//                                                                 productBreakdown
//                                                             ).length
//                                                         } */}
//                                                         {dailyOrders}
//                                                     </p>
//                                                 </div>
//                                                 <div>
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
//                                                     <p className="text-xs mb-1">
//                                                         Variance
//                                                     </p>
//                                                     <p
//                                                         className={`text-sm px-3 py-2 rounded font-medium ${
//                                                             summary.variance >=
//                                                             0
//                                                                 ? "bg-green-50 border border-green-200 text-green-700"
//                                                                 : "bg-red-50 border border-red-200 text-red-700"
//                                                         }`}
//                                                     >
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
//                                                 <div>
//                                                     <p className="text-xs mb-1">
//                                                         Notes
//                                                     </p>
//                                                     <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
//                                                         {summary.notes}
//                                                     </p>
//                                                 </div>
//                                             )}
//                                         </div>

//                                         {/* Manager Actions */}
//                                         {isManager && !summary.closed_at && (
//                                             <div className="border-t border-gray-100 p-3 bg-gray-50">
//                                                 <div className="flex space-x-2">
//                                                     <button
//                                                         onClick={() => {
//                                                             setSelectedSummary(
//                                                                 summary
//                                                             );
//                                                             setShowEditForm(
//                                                                 true
//                                                             );
//                                                         }}
//                                                         className="flex-1 bg-white text-blue-500 border border-blue-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center"
//                                                     >
//                                                         Balance
//                                                     </button>
//                                                     <button
//                                                         onClick={() => {
//                                                             setSelectedSummary(
//                                                                 summary
//                                                             );
//                                                             setShowExpenseForm(
//                                                                 true
//                                                             );
//                                                         }}
//                                                         className="flex-1 bg-white text-green-500 border border-green-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center justify-center"
//                                                     >
//                                                         Expense
//                                                     </button>

//                                                     <button
//                                                         onClick={() => {
//                                                             setSelectedSummary(
//                                                                 summary
//                                                             );
//                                                             setShowCloseForm(
//                                                                 true
//                                                             );
//                                                         }}
//                                                         // className="flex-1 bg-white text-red-500 border border-red-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-50"
//                                                         className="flex-1 bg-red-500 text-white border border-red-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
//                                                     >
//                                                         Close Day
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </div>
//                                 );
//                             })
//                         )}
//                     </div>
//                 </div>
//             )}

//             {/* Open Store Confirmation Popup */}
//             <ConfirmationPopup
//                 isOpen={showOpenStorePopup}
//                 // title="Open Store Today"
//                 // message={`Are you sure you want to open ${
//                 //     stores.find((s) => s.id === selectedStore)?.name
//                 // } for today? This will create a new daily summary with zero opening balance.`}
//                 title="Open Store for Today"
//                 message={`Open ${getStoreName()} for ${new Date().toLocaleDateString(
//                     "en-US",
//                     {
//                         weekday: "long",
//                         year: "numeric",
//                         month: "long",
//                         day: "numeric",
//                     }
//                 )}? This will create a new daily summary.`}
//                 confirmText="Open Store"
//                 onConfirm={handleOpenStoreToday}
//                 onCancel={() => setShowOpenStorePopup(false)}
//             />

//             {/* Close Day Reminder Popup */}
//             <ConfirmationPopup
//                 isOpen={showCloseReminder}
//                 title="Close Day Reminder"
//                 message="Don't forget to close the day and count the cash before ending your shift. This ensures accurate financial records."
//                 confirmText="Close Now"
//                 // title={`${getUnclosedSummaries().length} Unclosed Day(s)`}
//                 // message={`You have ${
//                 //     getUnclosedSummaries().length
//                 // } unclosed day(s) at ${getStoreName()}. Please close them to ensure accurate records.`}
//                 // confirmText="Review & Close"
//                 cancelText="Remind Later"
//                 onConfirm={() => {
//                     const todaysSummary = getTodaysSummary();
//                     if (todaysSummary) {
//                         setSelectedSummary(todaysSummary);
//                         setShowCloseForm(true);
//                         setShowCloseReminder(false);
//                     }
//                 }}
//                 onCancel={() => setShowCloseReminder(false)}
//                 type="warning"
//             />

//             {/* Details Modal */}
//             <DetailsModal
//                 isOpen={showDetailsModal}
//                 summary={selectedSummary}
//                 onClose={() => {
//                     setShowDetailsModal(false);
//                     setSelectedSummary(null);
//                 }}
//                 productBreakdown={
//                     selectedSummary
//                         ? getProductBreakdownForDate(selectedSummary.date)
//                         : {}
//                 }
//                 storeName={
//                     stores.find((store: Store) => store.id === selectedStore)
//                         ?.name || "Unknown Store"
//                 }
//             />

//             {/* Set Balance Modal */}
//             <SetBalanceModal
//                 isOpen={showEditForm}
//                 summary={selectedSummary}
//                 onClose={() => {
//                     setShowEditForm(false);
//                     setSelectedSummary(null);
//                 }}
//                 onSubmit={async (openingBalance) => {
//                     await updateSummary(selectedSummary.id, {
//                         opening_balance: openingBalance,
//                     });
//                     showToast(
//                         "Opening balance updated successfully",
//                         "success"
//                     );
//                 }}
//                 formatDate={formatDate}
//                 getStoreName={getStoreName}
//             />

//             {/* Set Expense Modal */}
//             <SetExpenseModal
//                 isOpen={showExpenseForm}
//                 summary={selectedSummary}
//                 onClose={() => {
//                     setShowExpenseForm(false);
//                     setSelectedSummary(null);
//                 }}
//                 onSubmit={async (expenses) => {
//                     console.log(expenses);
//                     // send to API or update state
//                     showToast("Expenses saved successfully", "success");
//                 }}
//                 formatDate={formatDate}
//                 getStoreName={getStoreName}
//             />

//             {/* Close Day Modal */}
//             <CloseDayModal
//                 isOpen={showCloseForm}
//                 summary={selectedSummary}
//                 onClose={() => {
//                     setShowCloseForm(false);
//                     setSelectedSummary(null);
//                 }}
//                 onSubmit={async (actualCash, notes, variance) => {
//                     await updateSummary(selectedSummary.id, {
//                         actual_cash: actualCash,
//                         variance: variance,
//                         notes: notes || null,
//                         closed_at: new Date().toISOString(),
//                     });
//                     showToast("Day closed successfully", "success");
//                     setShowCloseReminder(false);
//                 }}
//                 formatDate={formatDate}
//                 getStoreName={getStoreName}
//             />

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
import { useState, useEffect, useCallback } from "react";
import { useSummaries } from "@/lib/hooks/useSummaries";
import { useStores } from "@/lib/hooks/useData";
import { Profile, Store } from "@/lib/types";
import {
    Calendar,
    StoreIcon,
    CalendarDays,
    AlertTriangle,
    CheckCircle,
    Receipt,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import { Assignment } from "@/app/mobile/page";
import { hasManagerRoleInStore } from "@/lib/utils/roleUtils";
import { SetBalanceModal } from "./analytics/SetBalanceModal";
import { SetExpenseModal } from "./analytics/SetExpenseModal";
import { CloseDayModal } from "./analytics/CloseDayModal";
import { DetailsModal } from "./ui/DetailsModal";
import { ConfirmationPopup } from "./ui/ConfirmationPopup";

interface MobileAnalyticsProps {
    profile: Profile | null;
}

export const isCurrentMonthSelected = (selectedMonth: string): boolean => {
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    return selectedMonth === currentMonth;
};

export default function MobileAnalytics({ profile }: MobileAnalyticsProps) {
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().slice(0, 7)
    );
    const [showOpenStorePopup, setShowOpenStorePopup] = useState(false);
    const [showCloseReminder, setShowCloseReminder] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedSummary, setSelectedSummary] = useState<any>(null);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    console.log(selectedSummary);

    const { data: storesData, isLoading: storesLoading } = useStores(
        profile?.id ?? ""
    );
    const stores = storesData?.stores ?? [];
    const assignments = storesData?.assignments ?? {};

    const managerStores = stores.filter((store: Store) =>
        hasManagerRoleInStore(profile?.id ?? "", store.id, assignments)
    );

    const defaultStore = stores.find((store: Store) =>
        assignments[store.id]?.some(
            (assignment: Assignment) =>
                assignment.user_id === profile?.id && assignment.is_default
        )
    );

    const {
        data,
        isLoading,
        error,
        createSummary,
        updateSummary,
        createExpenses,
    } = useSummaries(selectedStore, selectedMonth);

    // const isManager = profile?.role === "manager";

    // Add this useEffect in MobileAnalytics to track data changes
    // useEffect(() => {
    //     console.log("=== Enhanced Debug ===");
    //     console.log("Raw SWR Data:", data);
    //     console.log("Processed Summaries:");
    //     data?.summaries?.forEach((summary) => {
    //         console.log(`Summary ${summary.date}:`, {
    //             id: summary.id,
    //             total_expenses: summary.total_expenses,
    //             expenses: summary.expenses?.length,
    //             expected_cash: summary.expected_cash,
    //         });
    //     });
    // }, [data]);

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Auto-select first store when stores are loaded
    useEffect(() => {
        if (defaultStore && !selectedStore) {
            setSelectedStore(defaultStore.id);
        }
    }, [defaultStore, selectedStore, storesData]);

    const getStoreName = () =>
        stores.find((store: Store) => store.id === selectedStore)?.name ||
        "Unknown Store";

    // This new useEffect for open store reminder
    // useEffect(() => {
    //     if (!isManager || !selectedStore || !data?.summaries) return;

    //     if (!isCurrentMonthSelected(selectedMonth)) {
    //         setShowOpenStorePopup(false);
    //         return;
    //     }

    //     const todayStr = new Date().toISOString().split("T")[0];
    //     const todaysSummary = data.summaries.find((s) => s.date === todayStr);

    //     if (!todaysSummary) {
    //         setShowOpenStorePopup(true);
    //     } else {
    //         setShowOpenStorePopup(false);
    //     }
    // }, [isManager, selectedStore, data?.summaries, selectedMonth]);

    const [hasSeenPopup, setHasSeenPopup] = useState(false);

    useEffect(() => {
        if (!selectedStore || !data?.summaries || hasSeenPopup) return;

        if (!isCurrentMonthSelected(selectedMonth)) {
            setShowOpenStorePopup(false);
            return;
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const todaysSummary = data.summaries.find((s) => s.date === todayStr);

        if (!todaysSummary) {
            setShowOpenStorePopup(true);
            setHasSeenPopup(true); // prevent re-showing it
        } else {
            setShowOpenStorePopup(false);
        }
    }, [selectedStore, data?.summaries, selectedMonth, hasSeenPopup]);

    // Closed store reminder useEffect
    const getUnclosedSummaries = useCallback(() => {
        if (!data?.summaries) return [];
        return data.summaries.filter((s) => !s.closed_at);
    }, [data?.summaries]);

    // Close day reminder logic - check every hour after 10 PM

    // useEffect(() => {
    //     if (!isManager || !data?.summaries || !selectedStore) return;

    //     const unclosedSummaries = getUnclosedSummaries();
    //     const todayStr = new Date().toISOString().split("T")[0];
    //     const todaysSummary = data.summaries.find((s) => s.date === todayStr);

    //     if (todaysSummary && unclosedSummaries.length > 0) {
    //         const now = new Date();
    //         const hour = now.getHours();
    //         if (hour >= 22 || hour < 6) {
    //             setShowCloseReminder(true);
    //         }
    //     }
    // }, [isManager, data?.summaries, selectedStore, getUnclosedSummaries]);

    const [hasSeenCloseReminder, setHasSeenCloseReminder] = useState(false);
    useEffect(() => {
        if (!data?.summaries || !selectedStore || hasSeenCloseReminder) return;

        const unclosedSummaries = getUnclosedSummaries();
        const todayStr = new Date().toISOString().split("T")[0];
        const todaysSummary = data.summaries.find((s) => s.date === todayStr);

        if (todaysSummary && unclosedSummaries.length > 0) {
            const now = new Date();
            const hour = now.getHours();
            if (hour >= 22 || hour < 6) {
                setShowCloseReminder(true);
                setHasSeenCloseReminder(true); // prevent re-showing
            }
        }
    }, [
        data?.summaries,
        selectedStore,
        getUnclosedSummaries,
        hasSeenCloseReminder,
    ]);

    const handleOpenStoreToday = async () => {
        if (!selectedStore || !profile) return;

        try {
            const todayStr = new Date().toISOString().split("T")[0];

            await createSummary({
                storeId: selectedStore,
                sellerId: profile.id, // Current user as seller
                managerId: profile.id, // Set manager if current user is manager
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

    const handleExpenseSubmit = async (
        expenses: Array<{
            label: string;
            customLabel?: string;
            amount: string;
        }>
    ) => {
        if (!selectedSummary || !selectedStore) return;

        try {
            await createExpenses({
                dailySummaryId: selectedSummary.id,
                storeId: selectedStore,
                expenses: expenses,
            });

            setShowExpenseForm(false);
            setSelectedSummary(null);
            showToast("Expenses saved successfully", "success");
        } catch (error) {
            if (error instanceof Error) {
                showToast(error.message, "error");
                console.error(error);
            } else {
                showToast("Failed to save expenses", "error");
                console.error(error);
            }
        }
    };

    const handleBalanceSubmit = async (openingBalance: number) => {
        if (!selectedSummary) return;

        try {
            await updateSummary(selectedSummary.id, {
                opening_balance: openingBalance,
            });

            setShowEditForm(false);
            setSelectedSummary(null);
            showToast("Opening balance updated successfully", "success");
        } catch (error) {
            if (error instanceof Error) {
                showToast(error.message, "error");
                console.error(error);
            } else {
                showToast("Failed to update balance", "error");
                console.error(error);
            }
        }
    };

    const handleCloseDaySubmit = async (
        actualCash: number,
        notes: string | null,
        variance: number
    ) => {
        if (!selectedSummary) return;

        try {
            await updateSummary(selectedSummary.id, {
                actual_cash: actualCash,
                variance: variance,
                notes: notes || null,
                closed_at: new Date().toISOString(),
            });

            setShowCloseForm(false);
            setSelectedSummary(null);
            showToast("Day closed successfully", "success");
            setShowCloseReminder(false);
        } catch (error) {
            if (error instanceof Error) {
                showToast(error.message, "error");
                console.error(error);
            } else {
                showToast("Failed to close day", "error");
                console.error(error);
            }
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

    const getExpensesForDate = (date: string) => {
        return data?.expensesByDate?.[date] || [];
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
                        <Receipt size={20} className="text-gray-600" />
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
            {getUnclosedSummaries().length > 1 && (
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
                </div>
            )}

            {/* Open Store Today Button - Only show if manager and store not opened */}
            {!todaysSummary && isCurrentMonthSelected(selectedMonth) && (
                <div className="bg-green-50 border border-green-200 p-3.5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={20} className="text-green-600" />
                        <h3 className="font-semibold text-green-800">
                            Open store Today for{" "}
                            {
                                stores.find(
                                    (store: Store) => store.id === selectedStore
                                )?.name
                            }
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

                {managerStores.length > 1 && (
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
                            {managerStores.map((store: Store) => (
                                <option key={store.id} value={store.id}>
                                    {store.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Date Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                    {selectedMonth}
                </h3>
            </div>

            {selectedStore && (
                <div className="space-y-3">
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
                                const dailyCups = getCupsCountForDate(
                                    summary.date
                                );
                                const dailyOrders = getOrdersCountForDate(
                                    summary.date
                                );
                                const dailyExpenses = getExpensesForDate(
                                    summary.date
                                );

                                return (
                                    <div
                                        key={summary.id}
                                        className="bg-white rounded-xl shadow-sm overflow-hidden"
                                    >
                                        {/* Summary Header */}
                                        <div className="p-3 bg-white space-y-3">
                                            <div className="flex justify-between items-start mb-3">
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
                                                        <p className="text-sm text-blue-600 underline">
                                                            Tap for details →
                                                        </p>
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    {summary.closed_at ? (
                                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                                            Closed
                                                        </span>
                                                    ) : (
                                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                                            Open
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Cash Balances */}
                                            <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                Summary of the Day
                                            </h4>

                                            <div className="grid grid-cols-2 gap-2 rounded-lg border-1 p-2 border-gray-200 bg-gray-50 text-gray-800">
                                                {/* 1. Opening Balance */}
                                                <div>
                                                    <p className="text-xs">
                                                        Opening Balance
                                                    </p>
                                                    <p className="text-lg font-semibold text-blue-600">
                                                        {formatRupiah(
                                                            summary.opening_balance
                                                        )}
                                                    </p>
                                                </div>

                                                {/* 2. Sales */}
                                                <div>
                                                    <p className="text-xs ">
                                                        Total Sales
                                                    </p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        {formatRupiah(
                                                            summary.total_sales
                                                        )}
                                                    </p>
                                                </div>

                                                {/* 3. Gross Expected Cash (Opening + Sales) */}
                                                <div>
                                                    <p className="text-xs ">
                                                        Opening + Sales
                                                    </p>
                                                    <p className="text-lg font-semibold text-purple-600">
                                                        {formatRupiah(
                                                            summary.opening_balance +
                                                                summary.total_sales
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-xs ">
                                                            Orders
                                                        </p>
                                                        <p className="text-lg font-bold text-blue-600">
                                                            {dailyOrders}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs">
                                                            Cups
                                                        </p>
                                                        <p className="text-lg font-bold text-orange-600">
                                                            {dailyCups}
                                                        </p>
                                                    </div>
                                                </div>

                                                <hr className="col-span-2 border-gray-300" />

                                                {/* 4. Net Expected Cash (after subtracting expenses) */}
                                                <div>
                                                    <p className="text-xs">
                                                        Net Expected Cash
                                                    </p>
                                                    <p className="text-lg font-semibold text-purple-600">
                                                        {formatRupiah(
                                                            summary.expected_cash
                                                        )}
                                                    </p>
                                                </div>

                                                {/* 5. Actual Cash (Counted physical cash) */}
                                                <div>
                                                    <p className="text-xs">
                                                        Actual Cash (Counted)
                                                    </p>
                                                    <p className="text-lg font-semibold text-orange-600">
                                                        {summary.actual_cash !==
                                                        null
                                                            ? formatRupiah(
                                                                  summary.actual_cash
                                                              )
                                                            : "Not counted"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Expenses Display */}
                                            {dailyExpenses.length > 0 && (
                                                <div>
                                                    <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                        Expenses of the Day
                                                    </h4>
                                                    <div className="bg-red-50 border border-red-200 p-2 rounded-lg">
                                                        {dailyExpenses.map(
                                                            (expense, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex justify-between text-sm"
                                                                >
                                                                    <span className="text-red-700">
                                                                        {
                                                                            expense.expense_type
                                                                        }
                                                                    </span>
                                                                    <span className="font-medium text-red-800">
                                                                        -
                                                                        {formatRupiah(
                                                                            expense.amount
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                        <div className="border-t border-red-300 mt-1 pt-1 flex justify-between font-medium">
                                                            <span className="text-red-700">
                                                                Total
                                                            </span>
                                                            <span className="text-red-800">
                                                                -
                                                                {formatRupiah(
                                                                    dailyExpenses.reduce(
                                                                        (
                                                                            sum,
                                                                            exp
                                                                        ) =>
                                                                            sum +
                                                                            exp.amount,
                                                                        0
                                                                    )
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Variance */}
                                            {summary.variance !== null && (
                                                <div>
                                                    <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                        Variance
                                                    </h4>
                                                    <p
                                                        className={`text-sm px-3 py-2 rounded-lg font-medium ${
                                                            summary.variance >=
                                                            0
                                                                ? "bg-green-50 border border-green-200 text-green-700"
                                                                : "bg-red-50 border border-red-200 text-red-700"
                                                        }`}
                                                    >
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
                                                    <h4 className="text-gray-800 text-sm font-semibold mb-1">
                                                        Notes
                                                    </h4>
                                                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border-1 border-gray-200">
                                                        {summary.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Manager Actions */}
                                        {!summary.closed_at && (
                                            <div className="border-t border-gray-100 p-3 bg-gray-50">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSummary(
                                                                summary
                                                            );
                                                            setShowEditForm(
                                                                true
                                                            );
                                                        }}
                                                        className="flex-1 bg-white text-blue-500 border border-blue-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center"
                                                    >
                                                        Balance
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSummary(
                                                                summary
                                                            );
                                                            setShowExpenseForm(
                                                                true
                                                            );
                                                        }}
                                                        className="flex-1 bg-white text-green-500 border border-green-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center justify-center"
                                                    >
                                                        Expenses
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setSelectedSummary(
                                                                summary
                                                            );
                                                            setShowCloseForm(
                                                                true
                                                            );
                                                        }}
                                                        className="flex-1 bg-red-500 text-white border border-red-500 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600"
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
                onCancel={() => {
                    setShowOpenStorePopup(false);
                    setHasSeenPopup(true); // avoid reopening due to useEffect
                }}
            />

            {/* Close Day Reminder Popup */}
            <ConfirmationPopup
                isOpen={showCloseReminder}
                title="Close Day Reminder"
                message="Don't forget to close the day and count the cash before ending your shift. This ensures accurate financial records."
                confirmText="Close Now"
                cancelText="Remind Later"
                onConfirm={() => {
                    const todaysSummary = getTodaysSummary();
                    if (todaysSummary) {
                        setSelectedSummary(todaysSummary);
                        setShowCloseForm(true);
                        setShowCloseReminder(false);
                    }
                }}
                type="warning"
                onCancel={() => {
                    setShowCloseReminder(false);
                    setHasSeenCloseReminder(true);
                }}
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
                    stores.find((store: Store) => store.id === selectedStore)
                        ?.name || "Unknown Store"
                }
            />

            {/* Set Balance Modal */}
            <SetBalanceModal
                isOpen={showEditForm}
                summary={selectedSummary}
                onClose={() => {
                    setShowEditForm(false);
                    setSelectedSummary(null);
                }}
                onSubmit={handleBalanceSubmit}
                formatDate={formatDate}
                getStoreName={getStoreName}
            />

            {/* Set Expense Modal */}
            <SetExpenseModal
                isOpen={showExpenseForm}
                summary={selectedSummary}
                onClose={() => {
                    setShowExpenseForm(false);
                    setSelectedSummary(null);
                }}
                onSubmit={handleExpenseSubmit}
                formatDate={formatDate}
                getStoreName={getStoreName}
            />

            {/* Close Day Modal */}
            <CloseDayModal
                isOpen={showCloseForm}
                summary={selectedSummary}
                onClose={() => {
                    setShowCloseForm(false);
                    setSelectedSummary(null);
                }}
                onSubmit={handleCloseDaySubmit}
                formatDate={formatDate}
                getStoreName={getStoreName}
            />

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
