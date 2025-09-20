// components/stores/StoreFormModal.tsx
import React from "react";
import { Store } from "../types/store";

interface StoreFormModalProps {
    isOpen: boolean;
    storeForm: { name: string; address: string };
    editingStore: Store | null;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    onFormChange: (form: { name: string; address: string }) => void;
}

export const StoreFormModal: React.FC<StoreFormModalProps> = ({
    isOpen,
    storeForm,
    editingStore,
    onSubmit,
    onClose,
    onFormChange,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">
                    {editingStore ? "Edit Store" : "Add New Store"}
                </h2>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Store Name
                        </label>
                        <input
                            type="text"
                            value={storeForm.name}
                            onChange={(e) =>
                                onFormChange({
                                    ...storeForm,
                                    name: e.target.value,
                                })
                            }
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Address
                        </label>
                        <textarea
                            value={storeForm.address}
                            onChange={(e) =>
                                onFormChange({
                                    ...storeForm,
                                    address: e.target.value,
                                })
                            }
                            className="w-full p-2 border rounded h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Optional"
                        />
                    </div>
                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                        >
                            {editingStore ? "Update" : "Create"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
