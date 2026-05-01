// /app/[tenantSlug]/admin/StoreScopeProvider.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStores } from "@/lib/client/hooks/stores/useStores"; // ✅ import store data hook

type Scope = "company" | "store";

interface StoreScopeContextValue {
    scope: Scope;
    storeId?: string | null;
    storeName?: string | null; // ✅ new
    subPath: string;
    switchStore: (nextStoreId: string) => void;
}

const StoreScopeContext = React.createContext<StoreScopeContextValue | null>(
    null,
);

export function useStoreScope() {
    const ctx = React.useContext(StoreScopeContext);
    if (!ctx)
        throw new Error("useStoreScope must be used inside StoreScopeProvider");
    return ctx;
}

export function StoreScopeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { data } = useStores(); // ✅ use your existing stores hook

    // Parse URL: /slug/admin/(storeId?)/(subPath?)
    const segments = pathname.split("/").filter(Boolean);
    const slug = segments[0];
    const adminIndex = segments.indexOf("admin");

    let storeId: string | null = null;
    let subPath = "";

    if (adminIndex >= 0) {
        const afterAdmin = segments.slice(adminIndex + 1);

        // Detect storeId based on first segment
        if (
            afterAdmin.length &&
            /^[A-Za-z0-9_-]+$/.test(afterAdmin[0]) &&
            ![
                "pos",
                "orders",
                "products",
                "users",
                "settings",
                "stores",
            ].includes(afterAdmin[0])
        ) {
            storeId = afterAdmin[0];
            subPath = afterAdmin.slice(1).join("/");
        } else {
            subPath = afterAdmin.join("/");
        }
    }

    const scope: Scope = storeId ? "store" : "company";

    // ✅ Derive storeName from the data hook (reactive + cached)
    const storeName = React.useMemo(() => {
        if (scope === "store" && data?.stores?.length) {
            return (
                data.stores.find((s) => s.id === storeId)?.name ||
                "Unknown Store"
            );
        }
        return null;
    }, [scope, storeId, data]);

    const switchStore = React.useCallback(
        (nextStoreId: string) => {
            const currentSub = subPath ? `/${subPath}` : "";

            if (nextStoreId === "all") {
                router.push(`/${slug}/admin${currentSub}`);
                return;
            }

            if (["products", "stores"].some((p) => subPath.startsWith(p))) {
                router.push(`/${slug}/admin/${nextStoreId}`);
                return;
            }

            router.push(`/${slug}/admin/${nextStoreId}${currentSub}`);
        },
        [router, slug, subPath], // dependencies used inside switchStore
    );

    const value = React.useMemo(
        () => ({ scope, storeId, storeName, subPath, switchStore }),
        [scope, storeId, storeName, subPath, switchStore],
    );

    return (
        <StoreScopeContext.Provider value={value}>
            {children}
        </StoreScopeContext.Provider>
    );
}
