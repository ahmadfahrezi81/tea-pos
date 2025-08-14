"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import MobileAuth from "@/components/mobile/MobileAuth";
import MobilePOS from "@/components/mobile/MobilePOS";
import MobileOrders from "@/components/mobile/MobileOrders";
import { User, ShoppingCart, Clock } from "lucide-react";
import { useProfile } from "@/lib/hooks/useData";
import { BarChart3 } from "lucide-react"; // Add this import
import MobileAnalytics from "@/components/mobile/MobileAnalytics";

type TabType = "auth" | "pos" | "orders" | "analytics";

export default function MobilePage() {
    const [activeTab, setActiveTab] = useState<TabType>("auth");
    // const [user, setUser] = useState<any>(null);
    // const [profile, setProfile] = useState<Profile | null>(null);
    // const [loading, setLoading] = useState(true);
    // const router = useRouter();
    const supabase = createClient();

    // Get profile reactively
    const { data: profile, isLoading, mutate } = useProfile();
    const user = profile ? { id: profile.id } : null;

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

    // useEffect(() => {
    //     const getUser = async () => {
    //         const {
    //             data: { user },
    //         } = await supabase.auth.getUser();
    //         setUser(user);

    //         if (user) {
    //             // Get profile
    //             const { data: profileData } = await supabase
    //                 .from("profiles")
    //                 .select("*")
    //                 .eq("id", user.id)
    //                 .single();

    //             setProfile(profileData);

    //             // If authenticated, default to POS
    //             setActiveTab("pos");
    //         }
    //         setLoading(false);
    //     };

    //     getUser();

    //     // Listen for auth changes
    //     const {
    //         data: { subscription },
    //     } = supabase.auth.onAuthStateChange((event, session) => {
    //         if (event === "SIGNED_IN" && session?.user) {
    //             setUser(session.user);
    //             setActiveTab("pos");
    //         } else if (event === "SIGNED_OUT") {
    //             setUser(null);
    //             setProfile(null);
    //             setActiveTab("auth");
    //         }
    //     });

    //     return () => subscription.unsubscribe();
    // }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

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

    // const tabs = [
    //     {
    //         id: "pos" as TabType,
    //         label: "POS",
    //         icon: ShoppingCart,
    //         show: !!user,
    //     },
    //     {
    //         id: "orders" as TabType,
    //         label: "Orders",
    //         icon: Clock,
    //         show: !!user,
    //     },
    //     {
    //         id: "auth" as TabType,
    //         label: user ? "Profile" : "Login",
    //         icon: User,
    //         show: true,
    //     },
    // ].filter((tab) => tab.show);
    const tabs = [
        {
            id: "pos" as TabType,
            label: "POS",
            icon: ShoppingCart,
            show: !!user,
        },
        {
            id: "orders" as TabType,
            label: "Orders",
            icon: Clock,
            show: !!user,
        },
        {
            id: "analytics" as TabType,
            label: "Analytics",
            icon: BarChart3,
            show: !!user && profile?.role === "manager",
        },
        {
            id: "auth" as TabType,
            label: user ? "Profile" : "Login",
            icon: User,
            show: true,
        },
    ].filter((tab) => tab.show);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white shadow-sm p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">
                    {user ? `Hi, ${profile?.full_name}` : "Welcome"}
                </h1>
                {user && (
                    <button
                        onClick={handleLogout}
                        className="text-sm text-red-600 hover:text-red-800"
                    >
                        Logout
                    </button>
                )}
            </div>

            {/* Content */}
            {/* <div className="p-4">
                {activeTab === "auth" && (
                    <MobileAuth user={user} profile={profile} />
                )}
                {activeTab === "pos" && user && <MobilePOS profile={profile} />}
                {activeTab === "orders" && user && (
                    <MobileOrders profile={profile} />
                )}
            </div> */}

            <div className="p-4">
                {activeTab === "pos" && user && <MobilePOS profile={profile} />}
                {activeTab === "orders" && user && (
                    <MobileOrders profile={profile} />
                )}
                {activeTab === "analytics" &&
                    user &&
                    profile?.role === "manager" && (
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
