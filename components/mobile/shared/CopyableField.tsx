import React, { useState } from "react";
import { Check, Copy, X } from "lucide-react";

interface CopyableFieldProps {
    label: string;
    value: string | number;
}

interface Toast {
    message: string;
    type: "success" | "error";
}

const CopyableField: React.FC<CopyableFieldProps> = ({ label, value }) => {
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    const handleCopy = () => {
        navigator.clipboard
            .writeText(String(value))
            .then(() => {
                setCopied(true);
                setToast({
                    message: `${label} copied to clipboard!`,
                    type: "success",
                });

                // Reset copied icon and toast after 4 seconds
                setTimeout(() => {
                    setCopied(false);
                    setToast(null);
                }, 4000);
            })
            .catch(() => {
                setToast({
                    message: `Failed to copy ${label}`,
                    type: "error",
                });

                setTimeout(() => {
                    setToast(null);
                }, 2000);
            });
    };

    return (
        <>
            <button
                onClick={handleCopy}
                disabled={copied}
                className={`ml-2 text-gray-800 transition-transform transform active:scale-90 ${
                    copied ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title={copied ? "Copied!" : "Copy to clipboard"}
                aria-label={`Copy ${label}`}
            >
                {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg text-sm ${
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
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default CopyableField;
