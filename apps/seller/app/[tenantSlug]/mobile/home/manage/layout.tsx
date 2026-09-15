"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { navigation } from "@tea-pos/utils/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";

export default function ManageLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { url } = useTenantSlug();
    const { selectedStoreId } = useStore();
    const { gate, session } = useSession(selectedStoreId);
    const { user } = useAuth();

    const isExempt =
        pathname.endsWith("/home/manage") ||
        pathname.endsWith("/home/manage/open") ||
        pathname.endsWith("/home/manage/close");

    useEffect(() => {
        if (!gate || isExempt) return;
        const sessionTakenByOther = gate === "open" && !!session && !!user && session.userId !== user.id;
        if (gate !== "open" || sessionTakenByOther) {
            // Replace, not push: a blocked page left in history would redirect
            // again the moment back reached it, trapping the back button.
            navigation.replace(url("/mobile/home/manage"));
        }
    }, [gate, session, user, isExempt, url]);

    return <>{children}</>;
}
