// lib/client/context/ToastContext.tsx
"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
    useEffect,
} from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    subtitle?: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType, subtitle?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, type: ToastType = "info", subtitle?: string) => {
            const id = crypto.randomUUID();
            setToasts((prev) => [...prev, { id, message, subtitle, type }]);
            setTimeout(() => dismissToast(id), 4000);
        },
        [dismissToast],
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-6 left-4 right-4 z-50 flex flex-col gap-2 items-center pointer-events-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within a ToastProvider");
    return ctx;
}

const TOAST_CONFIG: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
    success: { bg: "bg-green-500", icon: <CheckCircle2 size={24} className="text-white shrink-0 mb-0.5" /> },
    error: { bg: "bg-red-500", icon: <AlertCircle size={24} className="text-white shrink-0 mb-0.5" /> },
    warning: { bg: "bg-amber-400", icon: <AlertTriangle size={24} className="text-white shrink-0 mb-0.5" /> },
    info: { bg: "bg-blue-500", icon: <Info size={24} className="text-white shrink-0 mb-0.5" /> },
};

function ToastItem({ toast }: { toast: Toast }) {
    const { bg, icon } = TOAST_CONFIG[toast.type];
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const exitDelay = setTimeout(() => setExiting(true), 3700);
        return () => clearTimeout(exitDelay);
    }, []);

    return (
        <div
            className={`pointer-events-auto flex items-center gap-2.5 p-3 rounded-2xl shadow-lg text-white font-semibold text-base ${bg}`}
            style={{
                animation: exiting ? "slideUp 0.3s ease forwards" : "slideDown 0.3s ease forwards",
                maxWidth: "360px",
                width: "100%",
            }}
        >
            {icon}
            <div className="flex flex-col flex-1">
                <span>{toast.message}</span>
                {toast.subtitle && <span className="text-sm font-medium">{toast.subtitle}</span>}
            </div>
        </div>
    );
}
