import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/lib/client/context/ToastContext";

interface CopyableFieldProps {
    label: string;
    value: string | number;
}

const CopyableField: React.FC<CopyableFieldProps> = ({ label, value }) => {
    const [copied, setCopied] = useState(false);
    const { showToast } = useToast();

    const handleCopy = () => {
        navigator.clipboard
            .writeText(String(value))
            .then(() => {
                setCopied(true);
                showToast(`${label} copied to clipboard!`, "success");
                setTimeout(() => setCopied(false), 3000);
            })
            .catch(() => {
                showToast(`Failed to copy ${label}`, "error");
            });
    };

    return (
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
    );
};

export default CopyableField;
