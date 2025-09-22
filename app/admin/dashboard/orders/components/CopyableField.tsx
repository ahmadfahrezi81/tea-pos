// components/CopyableField.tsx
import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyableFieldProps {
    label: string;
    value: string;
}

export const CopyableField: React.FC<CopyableFieldProps> = ({
    label,
    value,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title={`Copy ${label}`}
        >
            {copied ? (
                <Check size={14} className="text-green-600" />
            ) : (
                <Copy size={14} />
            )}
        </button>
    );
};
