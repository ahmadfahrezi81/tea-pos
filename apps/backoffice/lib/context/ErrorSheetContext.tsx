"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { SWRConfig } from "swr";
import { ErrorSheet } from "@tea-pos/ui/custom/ErrorSheet";
import { toApiError, createFetchErrorGate, type ApiError } from "@tea-pos/utils/errors";
import { useToast } from "@/lib/context/ToastContext";

interface ErrorSheetContextValue {
    showError: (err: unknown) => void;
}

const ErrorSheetContext = createContext<ErrorSheetContextValue | null>(null);

export function ErrorSheetProvider({ children }: { children: ReactNode }) {
    const [error, setError] = useState<ApiError | null>(null);
    const { showToast } = useToast();
    const canShowFetchError = useRef(createFetchErrorGate()).current;

    const showError = useCallback((err: unknown) => {
        setError(toApiError(err));
    }, []);

    return (
        <ErrorSheetContext.Provider value={{ showError }}>
            <SWRConfig
                value={{
                    onError: (_err, key) => {
                        if (!canShowFetchError(key)) return;
                        showToast("Couldn't load the latest data — check your connection.", "error");
                    },
                }}
            >
                {children}
            </SWRConfig>
            <ErrorSheet isOpen={error !== null} onClose={() => setError(null)} error={error} />
        </ErrorSheetContext.Provider>
    );
}

export function useErrorSheet() {
    const ctx = useContext(ErrorSheetContext);
    if (!ctx) throw new Error("useErrorSheet must be used within an ErrorSheetProvider");
    return ctx;
}
