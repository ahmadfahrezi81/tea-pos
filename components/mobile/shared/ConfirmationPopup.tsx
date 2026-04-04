import { useEffect } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

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
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        // Cleanup function to restore scrolling when component unmounts
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const IconComponent = type === "warning" ? AlertTriangle : Info;
    const iconColor = type === "warning" ? "text-orange-500" : "text-blue-500";

    return (
        <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-xl max-w-sm w-full p-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with close button */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center flex-1">
                        <IconComponent
                            className={`${iconColor} mr-2 flex-shrink-0`}
                            size={20}
                        />
                        <h3 className="text-lg font-semibold">{title}</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-gray-100 rounded ml-2 flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                <h4 className="text-gray-800 text-sm font-semibold mb-1">
                    Details:
                </h4>
                <div className="p-2 border-1 rounded-lg border-gray-200 bg-gray-50 mb-4">
                    <p className="text-gray-800">{message}</p>
                </div>

                <div className="flex space-x-3 justify-end">
                    <button
                        onClick={onCancel}
                        className=" py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={` py-2 px-4 rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2 ${
                            type === "warning"
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        <span>{confirmText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
