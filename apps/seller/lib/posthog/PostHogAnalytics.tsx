"use client";
import posthog from "posthog-js";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";

export function PostHogAnalytics() {
    const { user } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        posthog.capture("$pageview", { $current_url: window.location.href });
    }, [pathname, searchParams]);

    useEffect(() => {
        if (!user) {
            posthog.reset();
            return;
        }
        posthog.identify(user.id, {
            email: user.email,
            name: user.fullName,
            role: user.role,
        });
    }, [user]);

    return null;
}
