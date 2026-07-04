"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import type { ApiError } from "@tea-pos/utils/errors";

const STATUS_TITLE: Record<number, string> = {
    400: "That request didn't look right",
    401: "You've been signed out",
    403: "You don't have permission for that",
    404: "We couldn't find that",
    422: "That didn't go through",
    500: "Something broke on our end",
};

const STATUS_TEXT: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
};

function titleFor(status: number): string {
    return STATUS_TITLE[status] ?? (status >= 500 ? "Something broke on our end" : "That didn't go through");
}

function statusTextFor(status: number): string {
    return STATUS_TEXT[status] ?? (status >= 500 ? "Server Error" : "Client Error");
}

export function ErrorSheet({ isOpen, onClose, error }: { isOpen: boolean; onClose: () => void; error: ApiError | null }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !error) return null;

    const details = [
        new Date().toLocaleString(),
        error.route ?? "",
        `${error.status} ${statusTextFor(error.status)}`,
        error.message,
    ].filter(Boolean).join("\n");

    const handleCopy = () => {
        navigator.clipboard.writeText(details)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            })
            .catch(() => {});
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center">
                    <div className="w-8 h-1 rounded-full bg-gray-300" />
                </div>

                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <span className="inline-block text-xs font-mono font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            {error.status} · {statusTextFor(error.status)}
                        </span>
                        <p className="text-lg font-bold text-gray-900">{titleFor(error.status)}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 shrink-0">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-gray-600">{error.message}</p>

                <div className="bg-gray-50 rounded-xl p-3">
                    <pre className="text-xs font-mono text-gray-500 whitespace-pre-wrap break-words">{details}</pre>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        disabled={copied}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 active:bg-gray-50 disabled:opacity-60"
                    >
                        {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                        {copied ? "Copied" : "Copy details"}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold active:opacity-80"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
