// components/DeleteConfimationModal.tsx
import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Trash2 } from "lucide-react";
import { Store } from "../types/store";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    store: Store | null;
    onClose: () => void;
    onConfirm: (storeId: string) => void;
    isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<
    DeleteConfirmationModalProps
> = ({ isOpen, store, onClose, onConfirm, isDeleting = false }) => {
    const [confirmationText, setConfirmationText] = useState("");
    const [isValid, setIsValid] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setConfirmationText("");
            setIsValid(false);
        }
    }, [isOpen]);

    // Check if confirmation text matches store name
    useEffect(() => {
        if (store) {
            setIsValid(confirmationText.trim() === store.name);
        }
    }, [confirmationText, store]);

    const handleConfirm = () => {
        if (isValid && store) {
            onConfirm(store.id);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && isValid) {
            handleConfirm();
        }
        if (e.key === "Escape") {
            onClose();
        }
    };

    if (!isOpen || !store) return null;

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
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Delete Store
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isDeleting}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Warning Content */}
                <div className="mb-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-red-800 font-medium mb-2">
                            ⚠️ This action cannot be undone
                        </p>
                        <p className="text-sm text-red-700">
                            This will permanently delete the store{" "}
                            <strong>&quot;{store.name}&quot;</strong> and all
                            associated data.
                        </p>
                    </div>

                    {store.address && (
                        <div className="text-sm text-gray-600 mb-4">
                            <strong>Address:</strong> {store.address}
                        </div>
                    )}
                </div>

                {/* Confirmation Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        To confirm deletion, type{" "}
                        <strong>&quot;{store.name}&quot;</strong> in the box
                        below:
                    </label>
                    <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={store.name}
                        className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
                            confirmationText && !isValid
                                ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        }`}
                        disabled={isDeleting}
                        autoFocus
                    />
                    {confirmationText && !isValid && (
                        <p className="mt-1 text-xs text-red-600">
                            Store name doesn&apos;t match. Please type &quot;
                            {store.name}&quot; exactly.
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid || isDeleting}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                            !isValid || isDeleting
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
                        }`}
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Delete Store
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
