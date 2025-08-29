import { useState } from "react";
import { X, CircleMinus } from "lucide-react";
import { DailySummary } from "@/lib/types";

interface ExpenseItem {
    label: string;
    customLabel?: string;
    amount: string;
}

interface SetExpenseModalProps {
    isOpen: boolean;
    summary: DailySummary;
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

    if (!isOpen || !summary) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(expenseForm.items);
        onClose();
        setExpenseForm({ items: [] });
    };

    const handleClose = () => {
        onClose();
        setExpenseForm({ items: [] });
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                onClick={handleClose}
            >
                <div
                    className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex flex-col space-y-1">
                            <h2 className="text-2xl font-semibold text-gray-900">
                                Add Expenses
                            </h2>
                            <p className="text-lg text-gray-600">
                                {formatDate(summary.date)} · {getStoreName()}
                            </p>
                        </div>

                        <button
                            onClick={handleClose}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <X size={30} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {expenseForm.items.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center space-x-2"
                            >
                                <div className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50">
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
                                    onChange={(e) => {
                                        const updated = [...expenseForm.items];
                                        updated[idx].amount = e.target.value;
                                        setExpenseForm({
                                            ...expenseForm,
                                            items: updated,
                                        });
                                    }}
                                    className="w-54 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Rp"
                                    required
                                />

                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated =
                                            expenseForm.items.filter(
                                                (_, i) => i !== idx
                                            );
                                        setExpenseForm({
                                            ...expenseForm,
                                            items: updated,
                                        });
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <CircleMinus size={20} />
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setShowAddExpensePopup(true)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50"
                        >
                            + Add Expense
                        </button>

                        <button
                            type="submit"
                            className="w-full bg-green-500 text-white py-4 mb-4 rounded-xl font-semibold hover:bg-green-600"
                        >
                            Save Expenses
                        </button>
                    </form>
                </div>
            </div>

            {/* Add Expense Type Popup */}
            {/* {showAddExpensePopup && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center"
                    onClick={() => setShowAddExpensePopup(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-lg w-80 p-4"
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
                            className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Ice">Ice</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Water">Water</option>
                            <option value="Gas">Gas</option>
                            <option value="Other">Other</option>
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
                                className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                            />
                        )}

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setShowAddExpensePopup(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setExpenseForm({
                                        ...expenseForm,
                                        items: [
                                            ...expenseForm.items,
                                            { ...newExpense, amount: "" },
                                        ],
                                    });
                                    setShowAddExpensePopup(false);
                                }}
                                className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )} */}
            {showAddExpensePopup && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center"
                    onClick={() => setShowAddExpensePopup(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-lg w-80 p-4"
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
                            className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Ice">Ice</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Water">Water</option>
                            <option value="Gas">Gas</option>
                            <option value="Other">Other</option>
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
                                className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                            />
                        )}

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setShowAddExpensePopup(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setExpenseForm({
                                        ...expenseForm,
                                        items: [
                                            ...expenseForm.items,
                                            { ...newExpense, amount: "" },
                                        ],
                                    });
                                    setShowAddExpensePopup(false);
                                }}
                                className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
