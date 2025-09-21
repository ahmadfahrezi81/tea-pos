// components/stores/StoreFormModal.tsx
import React from "react";
import { Store } from "../types/store";
import { StoreIcon } from "lucide-react";

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">
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
                            placeholder="Store Name .."
                            // className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm"
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
                            // className="w-full p-2 border rounded-lg  h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            className="w-full pl-4 pr-4 py-4 h-30 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm"
                            placeholder="Store Address (optional) ..."
                        />
                    </div>
                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm flex gap-2 justify-center items-center w-full cursor-pointer"
                        >
                            <StoreIcon size={18} />
                            {editingStore
                                ? "Update Store Info"
                                : "Create Store"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-700 px-4 py-2 rounded-lg transition-colors border-1 border-gray-500 cursor-pointer text-sm font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
