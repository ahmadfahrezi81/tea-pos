// // import { useState } from "react";
// // import { X, CircleMinus } from "lucide-react";
// // import { DailySummary } from "@/lib/types";

// // interface ExpenseItem {
// //     label: string;
// //     customLabel?: string;
// //     amount: string;
// // }

// // interface SetExpenseModalProps {
// //     isOpen: boolean;
// //     summary: DailySummary;
// //     onClose: () => void;
// //     onSubmit: (expenses: ExpenseItem[]) => Promise<void>;
// //     formatDate: (date: string) => string;
// //     getStoreName: () => string;
// // }

// // export const SetExpenseModal = ({
// //     isOpen,
// //     summary,
// //     onClose,
// //     onSubmit,
// //     formatDate,
// //     getStoreName,
// // }: SetExpenseModalProps) => {
// //     const [expenseForm, setExpenseForm] = useState({
// //         items: [] as ExpenseItem[],
// //     });
// //     const [showAddExpensePopup, setShowAddExpensePopup] = useState(false);
// //     const [newExpense, setNewExpense] = useState({
// //         label: "Ice",
// //         customLabel: "",
// //     });

// //     if (!isOpen || !summary) return null;

// //     const handleSubmit = async (e: React.FormEvent) => {
// //         e.preventDefault();
// //         await onSubmit(expenseForm.items);
// //         onClose();
// //         setExpenseForm({ items: [] });
// //     };

// //     const handleClose = () => {
// //         onClose();
// //         setExpenseForm({ items: [] });
// //     };

// //     return (
// //         <>
// //             <div
// //                 className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
// //                 onClick={handleClose}
// //             >
// //                 <div
// //                     className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
// //                     onClick={(e) => e.stopPropagation()}
// //                 >
// //                     <div className="p-4 border-b border-gray-200 flex justify-between items-center">
// //                         <div className="flex flex-col space-y-1">
// //                             <h2 className="text-xl font-semibold text-gray-900">
// //                                 Add Expenses
// //                             </h2>
// //                             <p className="text-md text-gray-600">
// //                                 {formatDate(summary.date)} · {getStoreName()}
// //                             </p>
// //                         </div>

// //                         <button
// //                             onClick={handleClose}
// //                             className="p-1 hover:bg-gray-100 rounded"
// //                         >
// //                             <X size={24} />
// //                         </button>
// //                     </div>

// //                     <form onSubmit={handleSubmit} className="p-4 space-y-4">
// //                         {expenseForm.items.map((item, idx) => (
// //                             <div
// //                                 key={idx}
// //                                 className="flex items-center space-x-2"
// //                             >
// //                                 <div className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50">
// //                                     {item.label === "Custom"
// //                                         ? item.customLabel || "Custom"
// //                                         : item.label}
// //                                 </div>

// //                                 <input
// //                                     type="number"
// //                                     min={0}
// //                                     inputMode="numeric"
// //                                     step={100}
// //                                     value={item.amount}
// //                                     onChange={(e) => {
// //                                         const updated = [...expenseForm.items];
// //                                         updated[idx].amount = e.target.value;
// //                                         setExpenseForm({
// //                                             ...expenseForm,
// //                                             items: updated,
// //                                         });
// //                                     }}
// //                                     className="w-54 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
// //                                     placeholder="Rp"
// //                                     required
// //                                 />

// //                                 <button
// //                                     type="button"
// //                                     onClick={() => {
// //                                         const updated =
// //                                             expenseForm.items.filter(
// //                                                 (_, i) => i !== idx
// //                                             );
// //                                         setExpenseForm({
// //                                             ...expenseForm,
// //                                             items: updated,
// //                                         });
// //                                     }}
// //                                     className="p-2 text-red-500 hover:bg-red-50 rounded"
// //                                 >
// //                                     <CircleMinus size={20} />
// //                                 </button>
// //                             </div>
// //                         ))}

// //                         <button
// //                             type="button"
// //                             onClick={() => setShowAddExpensePopup(true)}
// //                             className="w-full p-3 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50"
// //                         >
// //                             + Add Expense
// //                         </button>

// //                         <button
// //                             type="submit"
// //                             className="w-full bg-green-500 text-white py-4 mb-4 rounded-xl font-semibold hover:bg-green-600"
// //                         >
// //                             Save Expenses
// //                         </button>
// //                     </form>
// //                 </div>
// //             </div>

// //             {/* Add Expense Type Popup */}
// //             {showAddExpensePopup && (
// //                 <div
// //                     className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center"
// //                     onClick={() => setShowAddExpensePopup(false)}
// //                 >
// //                     <div
// //                         className="bg-white rounded-xl shadow-lg w-80 p-4"
// //                         onClick={(e) => e.stopPropagation()}
// //                     >
// //                         <h3 className="text-lg font-semibold mb-3">
// //                             Select Expense Type
// //                         </h3>

// //                         <select
// //                             value={newExpense.label}
// //                             onChange={(e) =>
// //                                 setNewExpense({
// //                                     ...newExpense,
// //                                     label: e.target.value,
// //                                     customLabel: "",
// //                                 })
// //                             }
// //                             className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
// //                         >
// //                             <option value="Ice">Ice</option>
// //                             <option value="Electricity">Electricity</option>
// //                             <option value="Water">Water</option>
// //                             <option value="Custom">Custom...</option>
// //                         </select>

// //                         {newExpense.label === "Custom" && (
// //                             <input
// //                                 type="text"
// //                                 placeholder="Enter custom label"
// //                                 value={newExpense.customLabel}
// //                                 onChange={(e) =>
// //                                     setNewExpense({
// //                                         ...newExpense,
// //                                         customLabel: e.target.value,
// //                                     })
// //                                 }
// //                                 className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
// //                             />
// //                         )}

// //                         <div className="flex justify-end space-x-2">
// //                             <button
// //                                 type="button"
// //                                 onClick={() => setShowAddExpensePopup(false)}
// //                                 className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
// //                             >
// //                                 Cancel
// //                             </button>
// //                             <button
// //                                 type="button"
// //                                 onClick={() => {
// //                                     setExpenseForm({
// //                                         ...expenseForm,
// //                                         items: [
// //                                             ...expenseForm.items,
// //                                             { ...newExpense, amount: "" },
// //                                         ],
// //                                     });
// //                                     setShowAddExpensePopup(false);
// //                                 }}
// //                                 className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600"
// //                             >
// //                                 OK
// //                             </button>
// //                         </div>
// //                     </div>
// //                 </div>
// //             )}
// //         </>
// //     );
// // };

// // import { useState } from "react";
// // import { X, CircleMinus } from "lucide-react";
// // import { DailySummary as BaseDailySummary } from "@/lib/types";

// // interface Expense {
// //     id: string;
// //     expense_type: string;
// //     amount: number;
// // }

// // type DailySummaryWithExpenses = BaseDailySummary & {
// //     expenses?: Expense[];
// //     total_expenses?: number;
// // };

// // interface ExpenseItem {
// //     label: string;
// //     customLabel?: string;
// //     amount: string;
// // }

// // interface SetExpenseModalProps {
// //     isOpen: boolean;
// //     summary: DailySummaryWithExpenses;
// //     onClose: () => void;
// //     onSubmit: (expenses: ExpenseItem[]) => Promise<void>;
// //     formatDate: (date: string) => string;
// //     getStoreName: () => string;
// // }

// // export const SetExpenseModal = ({
// //     isOpen,
// //     summary,
// //     onClose,
// //     onSubmit,
// //     formatDate,
// //     getStoreName,
// // }: SetExpenseModalProps) => {
// //     const [expenseForm, setExpenseForm] = useState({
// //         items: [] as ExpenseItem[],
// //     });
// //     const [showAddExpensePopup, setShowAddExpensePopup] = useState(false);
// //     const [newExpense, setNewExpense] = useState({
// //         label: "Ice",
// //         customLabel: "",
// //     });
// //     const [isSubmitting, setIsSubmitting] = useState(false);

// //     if (!isOpen || !summary) return null;

// //     const handleSubmit = async (e: React.FormEvent) => {
// //         e.preventDefault();

// //         if (expenseForm.items.length === 0) {
// //             return;
// //         }

// //         setIsSubmitting(true);
// //         try {
// //             await onSubmit(expenseForm.items);
// //             onClose();
// //             setExpenseForm({ items: [] });
// //         } catch (error) {
// //             console.error("Error submitting expenses:", error);
// //         } finally {
// //             setIsSubmitting(false);
// //         }
// //     };

// //     const handleClose = () => {
// //         if (isSubmitting) return;
// //         onClose();
// //         setExpenseForm({ items: [] });
// //         setNewExpense({ label: "Ice", customLabel: "" });
// //         setShowAddExpensePopup(false);
// //     };

// //     const addExpenseItem = () => {
// //         if (newExpense.label === "Custom" && !newExpense.customLabel.trim()) {
// //             return; // Don't add if custom label is empty
// //         }

// //         setExpenseForm({
// //             ...expenseForm,
// //             items: [
// //                 ...expenseForm.items,
// //                 {
// //                     label: newExpense.label,
// //                     customLabel: newExpense.customLabel || "",
// //                     amount: "",
// //                 },
// //             ],
// //         });
// //         setNewExpense({ label: "Ice", customLabel: "" });
// //         setShowAddExpensePopup(false);
// //     };

// //     const removeExpenseItem = (index: number) => {
// //         const updated = expenseForm.items.filter((_, i) => i !== index);
// //         setExpenseForm({
// //             ...expenseForm,
// //             items: updated,
// //         });
// //     };

// //     const updateExpenseAmount = (index: number, amount: string) => {
// //         const updated = [...expenseForm.items];
// //         updated[index].amount = amount;
// //         setExpenseForm({
// //             ...expenseForm,
// //             items: updated,
// //         });
// //     };

// //     const getTotalExpenseAmount = () => {
// //         return expenseForm.items.reduce((sum, item) => {
// //             const amount = parseInt(item.amount || "0", 10);
// //             return sum + amount;
// //         }, 0);
// //     };

// //     const isFormValid = () => {
// //         return (
// //             expenseForm.items.length > 0 &&
// //             expenseForm.items.every(
// //                 (item) => item.amount && parseInt(item.amount, 10) > 0
// //             )
// //         );
// //     };

// //     return (
// //         <>
// //             <div
// //                 className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
// //                 onClick={!isSubmitting ? handleClose : undefined}
// //             >
// //                 <div
// //                     className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
// //                     onClick={(e) => e.stopPropagation()}
// //                 >
// //                     <div className="p-4 border-b border-gray-200 flex justify-between items-center">
// //                         <div className="flex flex-col space-y-1">
// //                             <h2 className="text-xl font-semibold text-gray-900">
// //                                 Add Expenses
// //                             </h2>
// //                             <p className="text-md text-gray-600">
// //                                 {formatDate(summary.date)} · {getStoreName()}
// //                             </p>
// //                         </div>

// //                         <button
// //                             onClick={handleClose}
// //                             disabled={isSubmitting}
// //                             className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
// //                         >
// //                             <X size={24} />
// //                         </button>
// //                     </div>

// //                     <form onSubmit={handleSubmit} className="p-4 space-y-4">
// //                         {/* Current Expenses Display */}
// //                         {summary.expenses && summary.expenses.length > 0 && (
// //                             <div className="mb-4">
// //                                 <h3 className="text-sm font-medium text-gray-700 mb-2">
// //                                     Current Expenses
// //                                 </h3>
// //                                 <div className="bg-gray-50 rounded-lg p-3 space-y-2">
// //                                     {summary.expenses.map((expense) => (
// //                                         <div
// //                                             key={expense.id}
// //                                             className="flex justify-between items-center"
// //                                         >
// //                                             <span className="text-sm text-gray-600">
// //                                                 {expense.expense_type}
// //                                             </span>
// //                                             <span className="text-sm font-medium text-gray-900">
// //                                                 Rp{" "}
// //                                                 {expense.amount.toLocaleString()}
// //                                             </span>
// //                                         </div>
// //                                     ))}
// //                                     <div className="border-t pt-2 mt-2">
// //                                         <div className="flex justify-between items-center font-medium">
// //                                             <span className="text-sm text-gray-700">
// //                                                 Total
// //                                             </span>
// //                                             <span className="text-sm text-gray-900">
// //                                                 Rp{" "}
// //                                                 {(
// //                                                     summary.total_expenses || 0
// //                                                 ).toLocaleString()}
// //                                             </span>
// //                                         </div>
// //                                     </div>
// //                                 </div>
// //                             </div>
// //                         )}

// //                         {/* New Expenses */}
// //                         {expenseForm.items.map((item, idx) => (
// //                             <div
// //                                 key={idx}
// //                                 className="flex items-center space-x-2"
// //                             >
// //                                 <div className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50">
// //                                     {item.label === "Custom"
// //                                         ? item.customLabel || "Custom"
// //                                         : item.label}
// //                                 </div>

// //                                 <input
// //                                     type="number"
// //                                     min={0}
// //                                     inputMode="numeric"
// //                                     step={100}
// //                                     value={item.amount}
// //                                     onChange={(e) =>
// //                                         updateExpenseAmount(idx, e.target.value)
// //                                     }
// //                                     className="w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
// //                                     placeholder="0"
// //                                     required
// //                                 />

// //                                 <button
// //                                     type="button"
// //                                     onClick={() => removeExpenseItem(idx)}
// //                                     disabled={isSubmitting}
// //                                     className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
// //                                 >
// //                                     <CircleMinus size={20} />
// //                                 </button>
// //                             </div>
// //                         ))}

// //                         <button
// //                             type="button"
// //                             onClick={() => setShowAddExpensePopup(true)}
// //                             disabled={isSubmitting}
// //                             className="w-full p-3 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 disabled:opacity-50"
// //                         >
// //                             + Add Expense
// //                         </button>

// //                         {/* Total Display */}
// //                         {expenseForm.items.length > 0 && (
// //                             <div className="bg-blue-50 rounded-lg p-3">
// //                                 <div className="flex justify-between items-center">
// //                                     <span className="font-medium text-blue-900">
// //                                         New Expenses Total
// //                                     </span>
// //                                     <span className="font-bold text-blue-900">
// //                                         Rp{" "}
// //                                         {getTotalExpenseAmount().toLocaleString()}
// //                                     </span>
// //                                 </div>
// //                             </div>
// //                         )}

// //                         <button
// //                             type="submit"
// //                             disabled={!isFormValid() || isSubmitting}
// //                             className="w-full bg-green-500 text-white py-4 mb-4 rounded-xl font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
// //                         >
// //                             {isSubmitting ? "Saving..." : "Save Expenses"}
// //                         </button>
// //                     </form>
// //                 </div>
// //             </div>

// //             {/* Add Expense Type Popup */}
// //             {showAddExpensePopup && !isSubmitting && (
// //                 <div
// //                     className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center"
// //                     onClick={() => setShowAddExpensePopup(false)}
// //                 >
// //                     <div
// //                         className="bg-white rounded-xl shadow-lg w-80 p-4"
// //                         onClick={(e) => e.stopPropagation()}
// //                     >
// //                         <h3 className="text-lg font-semibold mb-3">
// //                             Select Expense Type
// //                         </h3>

// //                         <select
// //                             value={newExpense.label}
// //                             onChange={(e) =>
// //                                 setNewExpense({
// //                                     ...newExpense,
// //                                     label: e.target.value,
// //                                     customLabel: "",
// //                                 })
// //                             }
// //                             className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
// //                         >
// //                             <option value="Ice">Ice</option>
// //                             <option value="Electricity">Electricity</option>
// //                             <option value="Water">Water</option>
// //                             <option value="Custom">Custom...</option>
// //                         </select>

// //                         {newExpense.label === "Custom" && (
// //                             <input
// //                                 type="text"
// //                                 placeholder="Enter custom label"
// //                                 value={newExpense.customLabel}
// //                                 onChange={(e) =>
// //                                     setNewExpense({
// //                                         ...newExpense,
// //                                         customLabel: e.target.value,
// //                                     })
// //                                 }
// //                                 className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
// //                             />
// //                         )}

// //                         <div className="flex justify-end space-x-2">
// //                             <button
// //                                 type="button"
// //                                 onClick={() => setShowAddExpensePopup(false)}
// //                                 className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
// //                             >
// //                                 Cancel
// //                             </button>
// //                             <button
// //                                 type="button"
// //                                 onClick={addExpenseItem}
// //                                 disabled={
// //                                     newExpense.label === "Custom" &&
// //                                     !newExpense.customLabel.trim()
// //                                 }
// //                                 className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
// //                             >
// //                                 Add
// //                             </button>
// //                         </div>
// //                     </div>
// //                 </div>
// //             )}
// //         </>
// //     );
// // };

// // //components/SetExpenseModal.tsx
// // import { useState, useEffect } from "react";
// // import { X, CircleMinus } from "lucide-react";
// // import { DailySummary as BaseDailySummary } from "@/lib/types";

// // interface Expense {
// //     id: string;
// //     expense_type: string;
// //     amount: number;
// // }

// // type DailySummaryWithExpenses = BaseDailySummary & {
// //     expenses?: Expense[];
// //     total_expenses?: number;
// // };

// // interface ExpenseItem {
// //     label: string;
// //     customLabel?: string;
// //     amount: string;
// // }

// // interface SetExpenseModalProps {
// //     isOpen: boolean;
// //     summary: DailySummaryWithExpenses;
// //     onClose: () => void;
// //     onSubmit: (expenses: ExpenseItem[]) => Promise<void>;
// //     formatDate: (date: string) => string;
// //     getStoreName: () => string;
// // }

// // export const SetExpenseModal = ({
// //     isOpen,
// //     summary,
// //     onClose,
// //     onSubmit,
// //     formatDate,
// //     getStoreName,
// // }: SetExpenseModalProps) => {
// //     const [expenseForm, setExpenseForm] = useState({
// //         items: [] as ExpenseItem[],
// //     });
// //     const [showAddExpensePopup, setShowAddExpensePopup] = useState(false);
// //     const [newExpense, setNewExpense] = useState({
// //         label: "Ice",
// //         customLabel: "",
// //     });
// //     const [isSubmitting, setIsSubmitting] = useState(false);

// //     // Prevent background scrolling when modal is open
// //     useEffect(() => {
// //         if (isOpen) {
// //             document.body.style.overflow = "hidden";
// //         } else {
// //             document.body.style.overflow = "unset";
// //         }

// //         // Cleanup function to restore scrolling when component unmounts
// //         return () => {
// //             document.body.style.overflow = "unset";
// //         };
// //     }, [isOpen]);

// //     if (!isOpen || !summary) return null;

// //     const handleSubmit = async (e: React.FormEvent) => {
// //         e.preventDefault();

// //         if (expenseForm.items.length === 0) {
// //             return;
// //         }

// //         setIsSubmitting(true);
// //         try {
// //             await onSubmit(expenseForm.items);
// //             onClose();
// //             setExpenseForm({ items: [] });
// //         } catch (error) {
// //             console.error("Error submitting expenses:", error);
// //         } finally {
// //             setIsSubmitting(false);
// //         }
// //     };

// //     const handleClose = () => {
// //         if (isSubmitting) return;
// //         onClose();
// //         setExpenseForm({ items: [] });
// //         setNewExpense({ label: "Ice", customLabel: "" });
// //         setShowAddExpensePopup(false);
// //     };

// //     const addExpenseItem = () => {
// //         if (newExpense.label === "Custom" && !newExpense.customLabel.trim()) {
// //             return; // Don't add if custom label is empty
// //         }

// //         setExpenseForm({
// //             ...expenseForm,
// //             items: [
// //                 ...expenseForm.items,
// //                 {
// //                     label: newExpense.label,
// //                     customLabel: newExpense.customLabel || "",
// //                     amount: "",
// //                 },
// //             ],
// //         });
// //         setNewExpense({ label: "Ice", customLabel: "" });
// //         setShowAddExpensePopup(false);
// //     };

// //     const removeExpenseItem = (index: number) => {
// //         const updated = expenseForm.items.filter((_, i) => i !== index);
// //         setExpenseForm({
// //             ...expenseForm,
// //             items: updated,
// //         });
// //     };

// //     const updateExpenseAmount = (index: number, amount: string) => {
// //         const updated = [...expenseForm.items];
// //         updated[index].amount = amount;
// //         setExpenseForm({
// //             ...expenseForm,
// //             items: updated,
// //         });
// //     };

// //     const getTotalExpenseAmount = () => {
// //         return expenseForm.items.reduce((sum, item) => {
// //             const amount = parseInt(item.amount || "0", 10);
// //             return sum + amount;
// //         }, 0);
// //     };

// //     const isFormValid = () => {
// //         return (
// //             expenseForm.items.length > 0 &&
// //             expenseForm.items.every(
// //                 (item) => item.amount && parseInt(item.amount, 10) > 0
// //             )
// //         );
// //     };

// //     return (
// //         <>
// //             <div
// //                 className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
// //                 onClick={!isSubmitting ? handleClose : undefined}
// //             >
// //                 <div
// //                     className="bg-white w-full rounded-t-2xl max-h-[90vh] flex flex-col"
// //                     onClick={(e) => e.stopPropagation()}
// //                 >
// //                     {/* Fixed Header */}
// //                     <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
// //                         <div className="flex justify-between items-center">
// //                             <div className="flex flex-col space-y-1">
// //                                 <h2 className="text-xl font-semibold text-gray-900">
// //                                     Add Expenses
// //                                 </h2>
// //                                 <p className="text-md text-gray-600">
// //                                     {formatDate(summary.date)} ·{" "}
// //                                     {getStoreName()}
// //                                 </p>
// //                             </div>

// //                             <button
// //                                 onClick={handleClose}
// //                                 disabled={isSubmitting}
// //                                 className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
// //                             >
// //                                 <X size={24} />
// //                             </button>
// //                         </div>
// //                     </div>

// //                     {/* Scrollable Content */}
// //                     <div className="flex-1 overflow-y-auto">
// //                         <div className="p-4 space-y-4">
// //                             {/* Current Expenses Display */}
// //                             {summary.expenses &&
// //                                 summary.expenses.length > 0 && (
// //                                     <div className="mb-4">
// //                                         <h3 className="text-sm font-medium text-gray-700 mb-2">
// //                                             Current Expenses
// //                                         </h3>
// //                                         <div className="bg-gray-50 rounded-lg p-3 space-y-2">
// //                                             {summary.expenses.map((expense) => (
// //                                                 <div
// //                                                     key={expense.id}
// //                                                     className="flex justify-between items-center"
// //                                                 >
// //                                                     <span className="text-sm text-gray-600">
// //                                                         {expense.expense_type}
// //                                                     </span>
// //                                                     <span className="text-sm font-medium text-gray-900">
// //                                                         Rp{" "}
// //                                                         {expense.amount.toLocaleString()}
// //                                                     </span>
// //                                                 </div>
// //                                             ))}
// //                                             <div className="border-t pt-2 mt-2">
// //                                                 <div className="flex justify-between items-center font-medium">
// //                                                     <span className="text-sm text-gray-700">
// //                                                         Total
// //                                                     </span>
// //                                                     <span className="text-sm text-gray-900">
// //                                                         Rp{" "}
// //                                                         {(
// //                                                             summary.total_expenses ||
// //                                                             0
// //                                                         ).toLocaleString()}
// //                                                     </span>
// //                                                 </div>
// //                                             </div>
// //                                         </div>
// //                                     </div>
// //                                 )}

// //                             {/* New Expenses */}
// //                             {expenseForm.items.map((item, idx) => (
// //                                 <div
// //                                     key={idx}
// //                                     className="flex items-center space-x-2"
// //                                 >
// //                                     <div className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50">
// //                                         {item.label === "Custom"
// //                                             ? item.customLabel || "Custom"
// //                                             : item.label}
// //                                     </div>

// //                                     <input
// //                                         type="number"
// //                                         min={0}
// //                                         inputMode="numeric"
// //                                         step={100}
// //                                         value={item.amount}
// //                                         onChange={(e) =>
// //                                             updateExpenseAmount(
// //                                                 idx,
// //                                                 e.target.value
// //                                             )
// //                                         }
// //                                         className="w-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
// //                                         placeholder="0"
// //                                         required
// //                                     />

// //                                     <button
// //                                         type="button"
// //                                         onClick={() => removeExpenseItem(idx)}
// //                                         disabled={isSubmitting}
// //                                         className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
// //                                     >
// //                                         <CircleMinus size={20} />
// //                                     </button>
// //                                 </div>
// //                             ))}

// //                             <button
// //                                 type="button"
// //                                 onClick={() => setShowAddExpensePopup(true)}
// //                                 disabled={isSubmitting}
// //                                 className="w-full p-3 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
// //                             >
// //                                 + Add Expense
// //                             </button>

// //                             {/* Total Display */}
// //                             {expenseForm.items.length > 0 && (
// //                                 <div className="bg-blue-50 rounded-lg p-3">
// //                                     <div className="flex justify-between items-center">
// //                                         <span className="font-medium text-blue-900">
// //                                             New Expenses Total
// //                                         </span>
// //                                         <span className="font-bold text-blue-900">
// //                                             Rp{" "}
// //                                             {getTotalExpenseAmount().toLocaleString()}
// //                                         </span>
// //                                     </div>
// //                                 </div>
// //                             )}
// //                         </div>
// //                     </div>

// //                     {/* Fixed Footer with Submit Button */}
// //                     <div className="flex-shrink-0 p-4 pb-8 bg-white border-t border-gray-200">
// //                         <button
// //                             type="submit"
// //                             onClick={handleSubmit}
// //                             disabled={!isFormValid() || isSubmitting}
// //                             className="w-full bg-green-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
// //                         >
// //                             {isSubmitting ? "Saving..." : "Save Expenses"}
// //                         </button>
// //                     </div>
// //                 </div>
// //             </div>

// //             {/* Add Expense Type Popup */}
// //             {showAddExpensePopup && !isSubmitting && (
// //                 <div
// //                     className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center"
// //                     onClick={() => setShowAddExpensePopup(false)}
// //                 >
// //                     <div
// //                         className="bg-white rounded-xl shadow-lg w-80 p-4 mx-4"
// //                         onClick={(e) => e.stopPropagation()}
// //                     >
// //                         <h3 className="text-lg font-semibold mb-3">
// //                             Select Expense Type
// //                         </h3>

// //                         <select
// //                             value={newExpense.label}
// //                             onChange={(e) =>
// //                                 setNewExpense({
// //                                     ...newExpense,
// //                                     label: e.target.value,
// //                                     customLabel: "",
// //                                 })
// //                             }
// //                             className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
// //                         >
// //                             <option value="Ice">Ice</option>
// //                             <option value="Electricity">Electricity</option>
// //                             <option value="Custom">Custom...</option>
// //                         </select>

// //                         {newExpense.label === "Custom" && (
// //                             <input
// //                                 type="text"
// //                                 placeholder="Enter custom label"
// //                                 value={newExpense.customLabel}
// //                                 onChange={(e) =>
// //                                     setNewExpense({
// //                                         ...newExpense,
// //                                         customLabel: e.target.value,
// //                                     })
// //                                 }
// //                                 className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
// //                             />
// //                         )}

// //                         <div className="flex justify-end space-x-2">
// //                             <button
// //                                 type="button"
// //                                 onClick={() => setShowAddExpensePopup(false)}
// //                                 className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
// //                             >
// //                                 Cancel
// //                             </button>
// //                             <button
// //                                 type="button"
// //                                 onClick={addExpenseItem}
// //                                 disabled={
// //                                     newExpense.label === "Custom" &&
// //                                     !newExpense.customLabel.trim()
// //                                 }
// //                                 className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
// //                             >
// //                                 Add
// //                             </button>
// //                         </div>
// //                     </div>
// //                 </div>
// //             )}
// //         </>
// //     );
// // };

// // components/mobile/components/SetExpenseModal.tsx
// import { useState, useEffect } from "react";
// import { X, CircleMinus } from "lucide-react";
// import { DailySummary } from "@/lib/schemas/daily-summaries";
// import { Expense } from "@/lib/schemas/expenses";

// type DailySummaryWithExpenses = DailySummary & {
//     expenses?: Expense[];
//     totalExpenses?: number;
// };

// interface ExpenseItem {
//     label: string;
//     customLabel?: string;
//     amount: string;
// }

// interface SetExpenseModalProps {
//     isOpen: boolean;
//     summary: DailySummaryWithExpenses;
//     onClose: () => void;
//     onSubmit: (expenses: ExpenseItem[]) => Promise<void>;
//     formatDate: (date: string) => string;
//     getStoreName: () => string;
// }

// export const SetExpenseModal = ({
//     isOpen,
//     summary,
//     onClose,
//     onSubmit,
//     formatDate,
//     getStoreName,
// }: SetExpenseModalProps) => {
//     const [expenseForm, setExpenseForm] = useState({
//         items: [] as ExpenseItem[],
//     });
//     const [showAddExpensePopup, setShowAddExpensePopup] = useState(false);
//     const [newExpense, setNewExpense] = useState({
//         label: "Ice",
//         customLabel: "",
//     });
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     // Prevent background scrolling when modal is open
//     useEffect(() => {
//         if (isOpen) {
//             document.body.style.overflow = "hidden";
//         } else {
//             document.body.style.overflow = "unset";
//         }

//         return () => {
//             document.body.style.overflow = "unset";
//         };
//     }, [isOpen]);

//     if (!isOpen || !summary) return null;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();

//         if (expenseForm.items.length === 0) {
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             await onSubmit(expenseForm.items);
//             onClose();
//             setExpenseForm({ items: [] });
//         } catch (error) {
//             console.error("Error submitting expenses:", error);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleClose = () => {
//         if (isSubmitting) return;
//         onClose();
//         setExpenseForm({ items: [] });
//         setNewExpense({ label: "Ice", customLabel: "" });
//         setShowAddExpensePopup(false);
//     };

//     const addExpenseItem = () => {
//         if (newExpense.label === "Custom" && !newExpense.customLabel.trim()) {
//             return;
//         }

//         setExpenseForm({
//             ...expenseForm,
//             items: [
//                 ...expenseForm.items,
//                 {
//                     label: newExpense.label,
//                     customLabel: newExpense.customLabel || "",
//                     amount: "",
//                 },
//             ],
//         });
//         setNewExpense({ label: "Ice", customLabel: "" });
//         setShowAddExpensePopup(false);
//     };

//     const removeExpenseItem = (index: number) => {
//         const updated = expenseForm.items.filter((_, i) => i !== index);
//         setExpenseForm({
//             ...expenseForm,
//             items: updated,
//         });
//     };

//     const updateExpenseAmount = (index: number, amount: string) => {
//         const updated = [...expenseForm.items];
//         updated[index].amount = amount;
//         setExpenseForm({
//             ...expenseForm,
//             items: updated,
//         });
//     };

//     const getTotalExpenseAmount = () => {
//         return expenseForm.items.reduce((sum, item) => {
//             const amount = parseInt(item.amount || "0", 10);
//             return sum + amount;
//         }, 0);
//     };

//     const isFormValid = () => {
//         return (
//             expenseForm.items.length > 0 &&
//             expenseForm.items.every(
//                 (item) => item.amount && parseInt(item.amount, 10) > 0
//             )
//         );
//     };

//     return (
//         <>
//             <div
//                 className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                 onClick={!isSubmitting ? handleClose : undefined}
//             >
//                 <div
//                     className="bg-white w-full rounded-t-2xl max-h-[90vh] flex flex-col"
//                     onClick={(e) => e.stopPropagation()}
//                 >
//                     {/* Fixed Header */}
//                     <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
//                         <div className="flex justify-between items-center">
//                             <div className="flex flex-col space-y-1">
//                                 <h2 className="text-xl font-semibold text-gray-900">
//                                     Add Expenses
//                                 </h2>
//                                 <p className="text-md text-gray-600">
//                                     {formatDate(summary.date)} ·{" "}
//                                     {getStoreName()}
//                                 </p>
//                             </div>

//                             <button
//                                 onClick={handleClose}
//                                 disabled={isSubmitting}
//                                 className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
//                             >
//                                 <X size={24} />
//                             </button>
//                         </div>
//                     </div>

//                     {/* Scrollable Content */}
//                     <div className="flex-1 overflow-y-auto">
//                         <div className="p-4 space-y-4">
//                             {/* Current Expenses Display */}
//                             {summary.expenses &&
//                                 summary.expenses.length > 0 && (
//                                     <div className="mb-4">
//                                         <h3 className="text-sm font-medium text-gray-700 mb-2">
//                                             Current Expenses
//                                         </h3>
//                                         <div className="bg-gray-50 rounded-lg p-3 space-y-2">
//                                             {summary.expenses.map((expense) => (
//                                                 <div
//                                                     key={expense.id}
//                                                     className="flex justify-between items-center"
//                                                 >
//                                                     <span className="text-sm text-gray-600">
//                                                         {expense.expenseType}
//                                                     </span>
//                                                     <span className="text-sm font-medium text-gray-900">
//                                                         Rp{" "}
//                                                         {expense.amount.toLocaleString()}
//                                                     </span>
//                                                 </div>
//                                             ))}
//                                             <div className="border-t pt-2 mt-2">
//                                                 <div className="flex justify-between items-center font-medium">
//                                                     <span className="text-sm text-gray-700">
//                                                         Total
//                                                     </span>
//                                                     <span className="text-sm text-gray-900">
//                                                         Rp{" "}
//                                                         {(
//                                                             summary.totalExpenses ||
//                                                             0
//                                                         ).toLocaleString()}
//                                                     </span>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 )}

//                             {/* New Expenses */}
//                             {expenseForm.items.map((item, idx) => (
//                                 <div
//                                     key={idx}
//                                     className="flex items-center space-x-2"
//                                 >
//                                     <div className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50">
//                                         {item.label === "Custom"
//                                             ? item.customLabel || "Custom"
//                                             : item.label}
//                                     </div>

//                                     <input
//                                         type="number"
//                                         min={0}
//                                         inputMode="numeric"
//                                         step={100}
//                                         value={item.amount}
//                                         onChange={(e) =>
//                                             updateExpenseAmount(
//                                                 idx,
//                                                 e.target.value
//                                             )
//                                         }
//                                         className="w-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                         placeholder="0"
//                                         required
//                                     />

//                                     <button
//                                         type="button"
//                                         onClick={() => removeExpenseItem(idx)}
//                                         disabled={isSubmitting}
//                                         className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
//                                     >
//                                         <CircleMinus size={20} />
//                                     </button>
//                                 </div>
//                             ))}

//                             <button
//                                 type="button"
//                                 onClick={() => setShowAddExpensePopup(true)}
//                                 disabled={isSubmitting}
//                                 className="w-full p-3 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
//                             >
//                                 + Add Expense
//                             </button>

//                             {/* Total Display */}
//                             {expenseForm.items.length > 0 && (
//                                 <div className="bg-blue-50 rounded-lg p-3">
//                                     <div className="flex justify-between items-center">
//                                         <span className="font-medium text-blue-900">
//                                             New Expenses Total
//                                         </span>
//                                         <span className="font-bold text-blue-900">
//                                             Rp{" "}
//                                             {getTotalExpenseAmount().toLocaleString()}
//                                         </span>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Fixed Footer with Submit Button */}
//                     <div className="flex-shrink-0 p-4 pb-8 bg-white border-t border-gray-200">
//                         <button
//                             type="submit"
//                             onClick={handleSubmit}
//                             disabled={!isFormValid() || isSubmitting}
//                             className="w-full bg-green-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
//                         >
//                             {isSubmitting ? "Saving..." : "Save Expenses"}
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Add Expense Type Popup */}
//             {showAddExpensePopup && !isSubmitting && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center"
//                     onClick={() => setShowAddExpensePopup(false)}
//                 >
//                     <div
//                         className="bg-white rounded-xl shadow-lg w-80 p-4 mx-4"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <h3 className="text-lg font-semibold mb-3">
//                             Select Expense Type
//                         </h3>

//                         <select
//                             value={newExpense.label}
//                             onChange={(e) =>
//                                 setNewExpense({
//                                     ...newExpense,
//                                     label: e.target.value,
//                                     customLabel: "",
//                                 })
//                             }
//                             className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                         >
//                             <option value="Ice">Ice</option>
//                             <option value="Electricity">Electricity</option>
//                             <option value="Custom">Custom...</option>
//                         </select>

//                         {newExpense.label === "Custom" && (
//                             <input
//                                 type="text"
//                                 placeholder="Enter custom label"
//                                 value={newExpense.customLabel}
//                                 onChange={(e) =>
//                                     setNewExpense({
//                                         ...newExpense,
//                                         customLabel: e.target.value,
//                                     })
//                                 }
//                                 className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                             />
//                         )}

//                         <div className="flex justify-end space-x-2">
//                             <button
//                                 type="button"
//                                 onClick={() => setShowAddExpensePopup(false)}
//                                 className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 type="button"
//                                 onClick={addExpenseItem}
//                                 disabled={
//                                     newExpense.label === "Custom" &&
//                                     !newExpense.customLabel.trim()
//                                 }
//                                 className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
//                             >
//                                 Add
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// // components/mobile/components/SetExpenseModal.tsx
// import { useState, useEffect } from "react";
// import { X, CircleMinus } from "lucide-react";
// import { DailySummary } from "@/lib/schemas/daily-summaries";
// import { Expense } from "@/lib/schemas/expenses";

// type DailySummaryWithExpenses = DailySummary & {
//     expenses?: Expense[];
//     totalExpenses?: number;
// };

// interface ExpenseItem {
//     label: string;
//     customLabel?: string;
//     amount: string;
// }

// interface SetExpenseModalProps {
//     isOpen: boolean;
//     summary: DailySummaryWithExpenses;
//     onClose: () => void;
//     onSubmit: (expenses: ExpenseItem[]) => Promise<void>;
//     formatDate: (date: string) => string;
//     getStoreName: () => string;
// }

// export const SetExpenseModal = ({
//     isOpen,
//     summary,
//     onClose,
//     onSubmit,
//     formatDate,
//     getStoreName,
// }: SetExpenseModalProps) => {
//     const [expenseForm, setExpenseForm] = useState({
//         items: [] as ExpenseItem[],
//     });
//     const [showAddExpensePopup, setShowAddExpensePopup] = useState(false);
//     const [newExpense, setNewExpense] = useState({
//         label: "Ice",
//         customLabel: "",
//     });
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     // Prevent background scrolling when modal is open
//     useEffect(() => {
//         if (isOpen) {
//             document.body.style.overflow = "hidden";
//         } else {
//             document.body.style.overflow = "unset";
//         }

//         return () => {
//             document.body.style.overflow = "unset";
//         };
//     }, [isOpen]);

//     if (!isOpen || !summary) return null;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();

//         if (expenseForm.items.length === 0) {
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             await onSubmit(expenseForm.items);
//             onClose();
//             setExpenseForm({ items: [] });
//         } catch (error) {
//             console.error("Error submitting expenses:", error);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleClose = () => {
//         if (isSubmitting) return;
//         onClose();
//         setExpenseForm({ items: [] });
//         setNewExpense({ label: "Ice", customLabel: "" });
//         setShowAddExpensePopup(false);
//     };

//     const addExpenseItem = () => {
//         if (newExpense.label === "Custom" && !newExpense.customLabel.trim()) {
//             return;
//         }

//         setExpenseForm({
//             ...expenseForm,
//             items: [
//                 ...expenseForm.items,
//                 {
//                     label: newExpense.label,
//                     customLabel: newExpense.customLabel || "",
//                     amount: "",
//                 },
//             ],
//         });
//         setNewExpense({ label: "Ice", customLabel: "" });
//         setShowAddExpensePopup(false);
//     };

//     const removeExpenseItem = (index: number) => {
//         const updated = expenseForm.items.filter((_, i) => i !== index);
//         setExpenseForm({
//             ...expenseForm,
//             items: updated,
//         });
//     };

//     const updateExpenseAmount = (index: number, amount: string) => {
//         const updated = [...expenseForm.items];
//         updated[index].amount = amount;
//         setExpenseForm({
//             ...expenseForm,
//             items: updated,
//         });
//     };

//     const getTotalExpenseAmount = () => {
//         return expenseForm.items.reduce((sum, item) => {
//             const amount = parseInt(item.amount || "0", 10);
//             return sum + amount;
//         }, 0);
//     };

//     const isFormValid = () => {
//         return (
//             expenseForm.items.length > 0 &&
//             expenseForm.items.every(
//                 (item) => item.amount && parseInt(item.amount, 10) > 0
//             )
//         );
//     };

//     return (
//         <>
//             <div
//                 className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                 onClick={!isSubmitting ? handleClose : undefined}
//             >
//                 <div
//                     className="bg-white w-full rounded-t-2xl max-h-[90vh] flex flex-col"
//                     onClick={(e) => e.stopPropagation()}
//                 >
//                     {/* Fixed Header */}
//                     <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
//                         <div className="flex justify-between items-center">
//                             <div className="flex flex-col space-y-1">
//                                 <h2 className="text-xl font-semibold text-gray-900">
//                                     Add Expenses
//                                 </h2>
//                                 <p className="text-md text-gray-600">
//                                     {formatDate(summary.date)} ·{" "}
//                                     {getStoreName()}
//                                 </p>
//                             </div>

//                             <button
//                                 onClick={handleClose}
//                                 disabled={isSubmitting}
//                                 className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
//                             >
//                                 <X size={24} />
//                             </button>
//                         </div>
//                     </div>

//                     {/* Scrollable Content */}
//                     <div className="flex-1 overflow-y-auto">
//                         <div className="p-4 space-y-4">
//                             {/* Current Expenses Display */}
//                             {summary.expenses &&
//                                 summary.expenses.length > 0 && (
//                                     <div className="mb-4">
//                                         <h3 className="text-sm font-medium text-gray-700 mb-2">
//                                             Current Expenses
//                                         </h3>
//                                         <div className="bg-gray-50 rounded-lg p-3 space-y-2">
//                                             {summary.expenses.map((expense) => (
//                                                 <div
//                                                     key={expense.id}
//                                                     className="flex justify-between items-center"
//                                                 >
//                                                     <span className="text-sm text-gray-600">
//                                                         {expense.expenseType}
//                                                     </span>
//                                                     <span className="text-sm font-medium text-gray-900">
//                                                         Rp{" "}
//                                                         {expense.amount.toLocaleString()}
//                                                     </span>
//                                                 </div>
//                                             ))}
//                                             <div className="border-t pt-2 mt-2">
//                                                 <div className="flex justify-between items-center font-medium">
//                                                     <span className="text-sm text-gray-700">
//                                                         Total
//                                                     </span>
//                                                     <span className="text-sm text-gray-900">
//                                                         Rp{" "}
//                                                         {(
//                                                             summary.totalExpenses ||
//                                                             0
//                                                         ).toLocaleString()}
//                                                     </span>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 )}

//                             {/* New Expenses */}
//                             {expenseForm.items.map((item, idx) => (
//                                 <div
//                                     key={idx}
//                                     className="flex items-center space-x-2"
//                                 >
//                                     <div className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50">
//                                         {item.label === "Custom"
//                                             ? item.customLabel || "Custom"
//                                             : item.label}
//                                     </div>

//                                     <input
//                                         type="number"
//                                         min={0}
//                                         inputMode="numeric"
//                                         step={100}
//                                         value={item.amount}
//                                         onChange={(e) =>
//                                             updateExpenseAmount(
//                                                 idx,
//                                                 e.target.value
//                                             )
//                                         }
//                                         className="w-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                         placeholder="0"
//                                         required
//                                     />

//                                     <button
//                                         type="button"
//                                         onClick={() => removeExpenseItem(idx)}
//                                         disabled={isSubmitting}
//                                         className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
//                                     >
//                                         <CircleMinus size={20} />
//                                     </button>
//                                 </div>
//                             ))}

//                             <button
//                                 type="button"
//                                 onClick={() => setShowAddExpensePopup(true)}
//                                 disabled={isSubmitting}
//                                 className="w-full p-3 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
//                             >
//                                 + Add Expense
//                             </button>

//                             {/* Total Display */}
//                             {expenseForm.items.length > 0 && (
//                                 <div className="bg-blue-50 rounded-lg p-3">
//                                     <div className="flex justify-between items-center">
//                                         <span className="font-medium text-blue-900">
//                                             New Expenses Total
//                                         </span>
//                                         <span className="font-bold text-blue-900">
//                                             Rp{" "}
//                                             {getTotalExpenseAmount().toLocaleString()}
//                                         </span>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Fixed Footer with Submit Button */}
//                     <div className="flex-shrink-0 p-4 pb-8 bg-white border-t border-gray-200">
//                         <button
//                             type="submit"
//                             onClick={handleSubmit}
//                             disabled={!isFormValid() || isSubmitting}
//                             className="w-full bg-green-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
//                         >
//                             {isSubmitting ? "Saving..." : "Save Expenses"}
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Add Expense Type Popup */}
//             {showAddExpensePopup && !isSubmitting && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center"
//                     onClick={() => setShowAddExpensePopup(false)}
//                 >
//                     <div
//                         className="bg-white rounded-xl shadow-lg w-80 p-4 mx-4"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <h3 className="text-lg font-semibold mb-3">
//                             Select Expense Type
//                         </h3>

//                         <select
//                             value={newExpense.label}
//                             onChange={(e) =>
//                                 setNewExpense({
//                                     ...newExpense,
//                                     label: e.target.value,
//                                     customLabel: "",
//                                 })
//                             }
//                             className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                         >
//                             <option value="Ice">Ice</option>
//                             <option value="Electricity">Electricity</option>
//                             <option value="Custom">Custom...</option>
//                         </select>

//                         {newExpense.label === "Custom" && (
//                             <input
//                                 type="text"
//                                 placeholder="Enter custom label"
//                                 value={newExpense.customLabel}
//                                 onChange={(e) =>
//                                     setNewExpense({
//                                         ...newExpense,
//                                         customLabel: e.target.value,
//                                     })
//                                 }
//                                 className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                             />
//                         )}

//                         <div className="flex justify-end space-x-2">
//                             <button
//                                 type="button"
//                                 onClick={() => setShowAddExpensePopup(false)}
//                                 className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 type="button"
//                                 onClick={addExpenseItem}
//                                 disabled={
//                                     newExpense.label === "Custom" &&
//                                     !newExpense.customLabel.trim()
//                                 }
//                                 className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
//                             >
//                                 Add
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// components/mobile/components/SetExpenseModal.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { X, CircleMinus } from "lucide-react";
import { DailySummary } from "@/lib/schemas/daily-summaries";
import { Expense } from "@/lib/schemas/expenses";

type DailySummaryWithExpenses = DailySummary & {
    expenses?: Expense[];
    totalExpenses?: number;
};

interface ExpenseItem {
    label: string;
    customLabel?: string;
    amount: string;
}

interface SetExpenseModalProps {
    isOpen: boolean;
    summary: DailySummaryWithExpenses;
    onClose: () => void;
    onSubmit: (expenses: ExpenseItem[]) => Promise<void>;
    formatDate: (date: string) => string;
    getStoreName: () => string;
}

export const SetExpenseModal = ({
    isOpen,
    summary,
    onClose,
    onSubmit,
    formatDate,
    getStoreName,
}: SetExpenseModalProps) => {
    const [expenseForm, setExpenseForm] = useState({
        items: [] as ExpenseItem[],
    });
    const [showAddExpensePopup, setShowAddExpensePopup] = useState(false);
    const [newExpense, setNewExpense] = useState({
        label: "Ice",
        customLabel: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visible, setVisible] = useState(false);
    const [bottomOffset, setBottomOffset] = useState(0);

    // Animate in/out
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    // iOS visualViewport — tracks keyboard height so sheet rides above it
    useEffect(() => {
        if (!isOpen) return;

        const viewport = window.visualViewport;
        if (!viewport) return;

        const handleResize = () => {
            const offset =
                window.innerHeight - viewport.height - viewport.offsetTop;
            setBottomOffset(Math.max(0, offset));
        };

        viewport.addEventListener("resize", handleResize);
        viewport.addEventListener("scroll", handleResize);
        handleResize();

        return () => {
            viewport.removeEventListener("resize", handleResize);
            viewport.removeEventListener("scroll", handleResize);
            setBottomOffset(0);
        };
    }, [isOpen]);

    // Lock body scroll while open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen && !visible) return null;
    if (!summary) return null;

    const resetState = () => {
        setExpenseForm({ items: [] });
        setNewExpense({ label: "Ice", customLabel: "" });
        setShowAddExpensePopup(false);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetState();
        onClose();
    };

    const handleSubmit = async () => {
        if (expenseForm.items.length === 0) return;
        setIsSubmitting(true);
        try {
            await onSubmit(expenseForm.items);
            resetState();
            onClose();
        } catch (error) {
            console.error("Error submitting expenses:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addExpenseItem = () => {
        if (newExpense.label === "Custom" && !newExpense.customLabel.trim())
            return;
        setExpenseForm({
            ...expenseForm,
            items: [
                ...expenseForm.items,
                {
                    label: newExpense.label,
                    customLabel: newExpense.customLabel || "",
                    amount: "",
                },
            ],
        });
        setNewExpense({ label: "Ice", customLabel: "" });
        setShowAddExpensePopup(false);
    };

    const removeExpenseItem = (index: number) => {
        setExpenseForm({
            ...expenseForm,
            items: expenseForm.items.filter((_, i) => i !== index),
        });
    };

    const updateExpenseAmount = (index: number, amount: string) => {
        const updated = [...expenseForm.items];
        updated[index].amount = amount;
        setExpenseForm({ ...expenseForm, items: updated });
    };

    const getTotalExpenseAmount = () => {
        return expenseForm.items.reduce((sum, item) => {
            return sum + parseInt(item.amount || "0", 10);
        }, 0);
    };

    const isFormValid = () => {
        return (
            expenseForm.items.length > 0 &&
            expenseForm.items.every(
                (item) => item.amount && parseInt(item.amount, 10) > 0,
            )
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60"
                style={{
                    opacity: visible ? 1 : 0,
                    transition: "opacity 0.3s ease",
                }}
                onClick={handleClose}
            />

            {/* Sheet */}
            <div
                className="fixed left-0 right-0 z-50 bg-white rounded-t-3xl flex flex-col"
                style={{
                    bottom: bottomOffset,
                    maxHeight: "90dvh",
                    transform: visible ? "translateY(0)" : "translateY(100%)",
                    transition: "transform 0.3s ease, bottom 0.15s ease",
                }}
            >
                {/* Pull tab */}
                <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
                    <div className="w-10 h-1 rounded-full bg-gray-400" />
                </div>

                {/* Header */}
                <div className="flex-shrink-0 px-4 pt-7 pb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col space-y-0.5">
                            <h2 className="text-xl font-bold text-gray-900">
                                Add Expenses
                            </h2>
                            <p className="text-sm text-gray-500">
                                {formatDate(summary.date)} · {getStoreName()}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2 disabled:opacity-50"
                        >
                            <X size={26} />
                        </button>
                    </div>
                    <div className="h-px bg-gray-200 -mx-4" />
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="px-4 pt-2 pb-4 space-y-4">
                        {/* Current Expenses Display */}
                        {summary.expenses && summary.expenses.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">
                                    Current Expenses
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                    {summary.expenses.map((expense) => (
                                        <div
                                            key={expense.id}
                                            className="flex justify-between items-center"
                                        >
                                            <span className="text-sm text-gray-600">
                                                {expense.expenseType}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">
                                                Rp{" "}
                                                {expense.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="border-t pt-2 mt-2">
                                        <div className="flex justify-between items-center font-medium">
                                            <span className="text-sm text-gray-700">
                                                Total
                                            </span>
                                            <span className="text-sm text-gray-900">
                                                Rp{" "}
                                                {(
                                                    summary.totalExpenses || 0
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* New Expense Items */}
                        {expenseForm.items.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center space-x-2"
                            >
                                <div className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-800">
                                    {item.label === "Custom"
                                        ? item.customLabel || "Custom"
                                        : item.label}
                                </div>
                                <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    step={100}
                                    value={item.amount}
                                    onChange={(e) =>
                                        updateExpenseAmount(idx, e.target.value)
                                    }
                                    className="w-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeExpenseItem(idx)}
                                    disabled={isSubmitting}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                                >
                                    <CircleMinus size={20} />
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setShowAddExpensePopup(true)}
                            disabled={isSubmitting}
                            className="w-full p-3 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            + Add Expense
                        </button>

                        {/* Total Display */}
                        {expenseForm.items.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-blue-900">
                                        New Expenses Total
                                    </span>
                                    <span className="font-bold text-blue-900">
                                        Rp{" "}
                                        {getTotalExpenseAmount().toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 bg-white px-4 pt-4 pb-8 border-t border-gray-200">
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid() || isSubmitting}
                        className="w-full bg-green-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? "Saving..." : "Save Expenses"}
                    </button>
                </div>
            </div>

            {/* Add Expense Popup — plain div, no library */}
            {showAddExpensePopup && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
                    onClick={() => setShowAddExpensePopup(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-lg w-80 p-4 mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold mb-3">
                            Select Expense Type
                        </h3>

                        <select
                            value={newExpense.label}
                            onChange={(e) =>
                                setNewExpense({
                                    ...newExpense,
                                    label: e.target.value,
                                    customLabel: "",
                                })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="Ice">Ice</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Custom">Custom...</option>
                        </select>

                        {newExpense.label === "Custom" && (
                            <input
                                type="text"
                                placeholder="Enter custom label"
                                value={newExpense.customLabel}
                                onChange={(e) =>
                                    setNewExpense({
                                        ...newExpense,
                                        customLabel: e.target.value,
                                    })
                                }
                                className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        )}

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddExpensePopup(false);
                                    setNewExpense({
                                        label: "Ice",
                                        customLabel: "",
                                    });
                                }}
                                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={addExpenseItem}
                                disabled={
                                    newExpense.label === "Custom" &&
                                    !newExpense.customLabel.trim()
                                }
                                className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
