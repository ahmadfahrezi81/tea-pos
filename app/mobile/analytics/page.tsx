// app/mobile/analytics/page.tsx
"use client";
import { useProfile, useStores } from "@/lib/hooks/useData";
import { hasManagerRole } from "@/lib/utils/roleUtils";
import MobileAnalytics from "@/components/mobile/MobileAnalytics";
import { redirect } from "next/navigation";

export default function AnalyticsPage() {
    const { data: profile } = useProfile();
    const { data: storesData } = useStores(profile?.id ?? "");
    const assignments = storesData?.assignments ?? {};
    const user = profile ? { id: profile.id } : null;

    if (!user) {
        redirect("/mobile/profile");
    }

    if (!hasManagerRole(user.id, assignments)) {
        redirect("/mobile/profile");
    }

    return <MobileAnalytics profile={profile} />;
}
