import { AlertTriangle } from "lucide-react";

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

export const ConfirmationPopup = ({
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
