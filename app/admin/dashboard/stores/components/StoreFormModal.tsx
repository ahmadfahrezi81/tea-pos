// components/stores/StoreFormModal.tsx
import React, { useState, useEffect } from "react";
import { Store } from "../types/store";
import { StoreIcon, X } from "lucide-react";

interface StoreFormModalProps {
    isOpen: boolean;
    storeForm: { name: string; address: string };
    editingStore: Store | null;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    onFormChange: (form: { name: string; address: string }) => void;
    isSubmitting?: boolean;
}

export const StoreFormModal: React.FC<StoreFormModalProps> = ({
    isOpen,
    storeForm,
    editingStore,
    onSubmit,
    onClose,
    onFormChange,
    isSubmitting = false,
}) => {
    const [hasChanges, setHasChanges] = useState(false);

    // Check for changes when form data changes
    useEffect(() => {
        if (editingStore) {
            // For editing: check if current form differs from original store data
            const hasNameChange = storeForm.name !== editingStore.name;
            const hasAddressChange =
                storeForm.address !== (editingStore.address || "");
            setHasChanges(hasNameChange || hasAddressChange);
        } else {
            // For new store: check if any field has content
            setHasChanges(
                storeForm.name.trim() !== "" || storeForm.address.trim() !== ""
            );
        }
    }, [storeForm, editingStore]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            onClose();
        }
    };

    const isFormValid = storeForm.name.trim() !== "";
    const canSubmit =
        isFormValid && (editingStore ? hasChanges : true) && !isSubmitting;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <StoreIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {editingStore ? "Edit Store" : "Add New Store"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            onKeyDown={handleKeyPress}
                            placeholder="Enter store name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500"
                            required
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            className="w-full px-3 py-2 h-24 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500 resize-none"
                            placeholder="Enter store address (optional)"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                                !canSubmit
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md"
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {editingStore
                                        ? "Updating..."
                                        : "Creating..."}
                                </>
                            ) : (
                                <>
                                    <StoreIcon className="w-4 h-4" />
                                    {editingStore
                                        ? "Update Store"
                                        : "Create Store"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
