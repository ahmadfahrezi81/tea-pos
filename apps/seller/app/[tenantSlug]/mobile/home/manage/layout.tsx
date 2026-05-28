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
    const { user } = useAuth();

    const isExempt =
        pathname.endsWith("/home/manage") ||
        pathname.endsWith("/home/manage/open") ||
        pathname.endsWith("/home/manage/close");

    useEffect(() => {
        if (!gate || isExempt) return;
        const sessionTakenByOther = gate === "open" && !!session && !!user && session.userId !== user.id;
        if (gate !== "open" || sessionTakenByOther) {
            router.push(url("/mobile/home/manage"));
        }
    }, [gate, session, user, isExempt, router, url]);

    return <>{children}</>;
}
