"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { RealtimeManager } from "@tea-pos/utils/realtime";
import { SupabaseRealtimeAdapter } from "@tea-pos/utils/realtime";
import { createClient } from "@/lib/supabase";

interface RealtimeContextType {
    realtime: RealtimeManager | null;
    isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({
    realtime: null,
    isConnected: false,
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const [realtime, setRealtime] = useState<RealtimeManager | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        const adapter = new SupabaseRealtimeAdapter(supabase);

        setRealtime(adapter);

        // Monitor connection status
        const unsubscribe = adapter.onConnectionChange((connected) => {
            setIsConnected(connected);
        });

        return () => {
            unsubscribe.then(() => adapter.cleanup());
        };
    }, []);

    return (
        <RealtimeContext.Provider value={{ realtime, isConnected }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);
    if (!context) {
        throw new Error("useRealtime must be used within RealtimeProvider");
    }
    return context;
}
