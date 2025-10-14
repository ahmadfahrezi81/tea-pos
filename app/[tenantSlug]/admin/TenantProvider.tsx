"use client";

import { createContext, useContext, useState } from "react";

type TenantContextType = {
    tenantId: string | null;
    setTenantId: (id: string) => void;
};

const TenantContext = createContext<TenantContextType>({
    tenantId: null,
    setTenantId: () => {},
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({
    initialTenantId,
    children,
}: {
    initialTenantId: string | null;
    children: React.ReactNode;
}) {
    const [tenantId, setTenantId] = useState(initialTenantId);

    return (
        <TenantContext.Provider value={{ tenantId, setTenantId }}>
            {children}
        </TenantContext.Provider>
    );
}
