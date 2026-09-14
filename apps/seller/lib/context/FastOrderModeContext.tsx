"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useFlags } from "@/lib/context/FlagsContext";

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
    const { flags } = useFlags();
    const [preference, setPreference] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("fastOrderMode") === "true";
    });

    /**
     * The flag is the switch; the stored preference only says what to do while
     * it is on. Without the `&&` a user who turned fast order on before the
     * flag was withdrawn stays in it forever: the toggle that would turn it off
     * is itself behind the flag, so the preference becomes unreachable.
     *
     * Flags arrive false and are corrected on the first evaluation, so this
     * reads as off for one render on a phone that is entitled to it. Off then
     * on is the right way round — the opposite would flash the fast-order
     * layout at users who no longer have the feature at all.
     */
    const fastOrderMode = flags.isFastOrderEnabled && preference;

    useEffect(() => {
        document.documentElement.dataset.fastOrder = String(fastOrderMode);
    }, [fastOrderMode]);

    const toggleFastOrderMode = () => {
        setPreference((prev) => {
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
