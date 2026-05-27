"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";

export default function ManageLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { url } = useTenantSlug();
    const { selectedStoreId } = useStore();
    const { gate, session } = useSession(selectedStoreId);
    const { profile } = useAuth();

    const isManageRoot = pathname.endsWith("/home/manage");

    useEffect(() => {
        if (!gate || isManageRoot) return;
        const sessionTakenByOther = gate === "open" && !!session && session.userId !== profile?.id;
        if (gate !== "open" || sessionTakenByOther) {
            router.push(url("/mobile/home/manage"));
        }
    }, [gate, session, profile, isManageRoot, router, url]);

    return <>{children}</>;
}
