"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PayFrequency } from "@tea-pos/utils/week";

/* The pay cadence is a tenant fact, read server-side in the mobile layout and
   handed down. It is here rather than fetched per screen so a pay window is
   never rendered from a guessed cadence while a request is in flight — the
   value is present in the first paint or the screen doesn't draw a window. */
const PayFrequencyContext = createContext<PayFrequency | null>(null);

export function PayFrequencyProvider({
    value,
    children,
}: {
    value: PayFrequency | null;
    children: ReactNode;
}) {
    return <PayFrequencyContext.Provider value={value}>{children}</PayFrequencyContext.Provider>;
}

/* Null when the cadence couldn't be read. Callers must handle that by not
   drawing a pay window — never by substituting a default, which would put a
   window on screen that no payout was ever written against. */
export function usePayFrequency(): PayFrequency | null {
    return useContext(PayFrequencyContext);
}
