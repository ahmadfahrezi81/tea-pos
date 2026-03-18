"use client";
import { createContext, useContext, useState } from "react";

type FastOrderModeContextType = {
    fastOrderMode: boolean;
    toggleFastOrderMode: () => void;
};

const FastOrderModeContext = createContext<FastOrderModeContextType | null>(
    null,
);

export function FastOrderModeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [fastOrderMode, setFastOrderMode] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("fastOrderMode") === "true";
    });

    const toggleFastOrderMode = () => {
        setFastOrderMode((prev) => {
            const next = !prev;
            localStorage.setItem("fastOrderMode", String(next));
            return next;
        });
    };

    return (
        <FastOrderModeContext.Provider
            value={{ fastOrderMode, toggleFastOrderMode }}
        >
            {children}
        </FastOrderModeContext.Provider>
    );
}

export function useFastOrderMode(): FastOrderModeContextType {
    const context = useContext(FastOrderModeContext);
    if (!context) {
        throw new Error(
            "useFastOrderMode must be used within a FastOrderModeProvider",
        );
    }
    return context;
}
