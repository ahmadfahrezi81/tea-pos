//app/[tenantSlug]/admin/TenantProvider.tsx
"use client";

import { createContext, useContext } from "react";

type TenantContextType = {
    tenantId: string | null;
    tenantSlug: string | null;
    tenantName: string | null;
};

const TenantContext = createContext<TenantContextType>({
    tenantId: null,
    tenantSlug: null,
    tenantName: null,
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({
    initialTenant,
    children,
}: {
    initialTenant: {
        id: string;
        slug: string;
        name: string;
    };
    children: React.ReactNode;
}) {
    return (
        <TenantContext.Provider
            value={{
                tenantId: initialTenant.id,
                tenantSlug: initialTenant.slug,
                tenantName: initialTenant.name,
            }}
        >
            {children}
        </TenantContext.Provider>
    );
}
