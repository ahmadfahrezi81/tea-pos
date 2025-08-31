//app/mobile/page.tsx
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import MobileAuth from "@/components/mobile/MobileAuth";
import MobilePOS from "@/components/mobile/MobilePOS";
import MobileOrders from "@/components/mobile/MobileOrders";
import { User, ShoppingCart, Clock } from "lucide-react";
import { useProfile, useStores } from "@/lib/hooks/useData";
import { BarChart3 } from "lucide-react"; // Add this import
import MobileAnalytics from "@/components/mobile/MobileAnalytics";
import { format } from "date-fns";
import Image from "next/image";
import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";

type TabType = "auth" | "pos" | "orders" | "analytics";

export interface Assignment {
    user_id: string;
    role: string;
    is_default: boolean;
}

export interface Assignments {
    [storeId: string]: Assignment[];
}

export default function MobilePage() {
    const [activeTab, setActiveTab] = useState<TabType>("pos");

    const supabase = createClient();

    // Get profile reactively
    const { data: profile, isLoading, mutate } = useProfile();
    const user = profile ? { id: profile.id } : null;

    //Get store assignments data
    const { data: storesData } = useStores(profile?.id ?? "");
    const assignments = storesData?.assignments ?? {};

    // useEffect(() => {
    //     if (!isLoading && user && activeTab === "auth") {
    //         setActiveTab("pos");
    //     }
    // }, [isLoading, user, activeTab]);

    // Listen for auth changes & refresh profile
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === "SIGNED_IN") {
                    mutate();
                    setActiveTab("pos");
                } else if (event === "SIGNED_OUT") {
                    mutate();
                    setActiveTab("auth");
                }
            }
        );
        return () => authListener.subscription.unsubscribe();
    }, [mutate, supabase]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const tabs = [
        {
            id: "pos" as TabType,
            label: "POS",
            icon: ShoppingCart,
            show: !!user && hasSellerRole(user.id, assignments),
        },
        {
            id: "orders" as TabType,
            label: "Orders",
            icon: Clock,
            show:
                !!user &&
                hasSellerRole(user.id, assignments) &&
                hasManagerRole(user.id, assignments),
        },
        {
            id: "analytics" as TabType,
            label: "Analytics",
            icon: BarChart3,
            show: !!user && hasManagerRole(user.id, assignments),
        },
        {
            id: "auth" as TabType,
            label: user ? "Profile" : "Login",
            icon: User,
            show: true,
        },
    ].filter((tab) => tab.show);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 select-none">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white shadow-sm p-4 flex justify-between items-center">
                <div className="flex gap-2 items-center">
                    <Image
                        src={"/LEMONI-512x512.png"}
                        alt={"Logo"}
                        width={30}
                        height={30}
                        className="rounded object-cover cursor-pointer" // Add cursor-pointer
                        onClick={() => setActiveTab("pos")} // <- Navigate to POS tab
                    />

                    <h1 className="text-2xl font-bold text-gray-800 capitalize">
                        {{
                            pos: "POS",
                            orders: "Orders",
                            analytics: "Analytics",
                            auth: "Profile",
                        }[activeTab] || ""}
                    </h1>
                </div>
                <div className="text-right">
                    <h1 className="text-base font-bold text-gray-800">
                        {user ? `Hi, ${profile?.full_name}` : "Welcome"}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {format(new Date(), "MMMM dd, yyyy")}
                    </p>
                </div>
            </div>

            <div className="p-4">
                {/* {activeTab === "pos" && user && <MobilePOS profile={profile} />} */}
                {activeTab === "pos" &&
                    user &&
                    hasSellerRole(user.id, assignments) && (
                        <MobilePOS profile={profile} />
                    )}
                {activeTab === "orders" &&
                    user &&
                    hasSellerRole(user.id, assignments) &&
                    hasManagerRole(user.id, assignments) && (
                        <MobileOrders profile={profile} />
                    )}
                {/* {activeTab === "sales" &&
                    user &&
                    profile?.role === "manager" && (
                        <MobileAnalytics profile={profile} />
                    )} */}
                {activeTab === "analytics" &&
                    user &&
                    hasManagerRole(user.id, assignments) && (
                        <MobileAnalytics profile={profile} />
                    )}
                {activeTab === "auth" && (
                    <MobileAuth profile={profile} mutate={mutate} />
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="flex">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 ${
                                    isActive
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-gray-600"
                                }`}
                            >
                                <Icon size={20} />
                                <span className="text-xs font-medium">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
