// app/mobile/page.tsx
"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStores } from "@/lib/hooks/stores/useStores";
import { hasSellerRole } from "@/lib/utils/roleUtils";
import { useAuth } from "@/lib/context/AuthContext";

export default function MobilePage() {
    const router = useRouter();
    const { profile } = useAuth();

    const { data: storesData } = useStores();

    const user = useMemo(
        () => (profile ? { id: profile.id } : null),
        [profile]
    );

    const assignments = useMemo(
        () => storesData?.assignments ?? {},
        [storesData?.assignments]
    );

    useEffect(() => {
        // Redirect to appropriate default page
        if (user && hasSellerRole(user.id, assignments)) {
            router.replace("/mobile/pos");
        } else {
            router.replace("/mobile/profile");
        }
    }, [user, assignments, router]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Redirecting...</p>
            </div>
        </div>
    );
}
