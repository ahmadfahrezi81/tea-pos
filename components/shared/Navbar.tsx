"use client";
// import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/lib/hooks/useData";

export default function Navbar() {
    // const [user, setUser] = useState<any>(null);
    // const [profile, setProfile] = useState<any>(null);
    const router = useRouter();
    const supabase = createClient();

    const { data: profile } = useProfile();

    // useEffect(() => {
    //     getUser();
    // }, []);

    // const getUser = async () => {
    //     const {
    //         data: { user },
    //     } = await supabase.auth.getUser();
    //     if (user) {
    //         setUser(user);
    //         const { data } = await supabase
    //             .from("profiles")
    //             .select("*")
    //             .eq("id", user.id)
    //             .single();
    //         setProfile(data);
    //     }
    // };

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <nav className="bg-white shadow-sm border-b">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link href="/dashboard" className="text-xl font-bold">
                        POS System
                    </Link>

                    <div className="flex items-center space-x-6">
                        <Link
                            href="/dashboard"
                            className="text-gray-600 hover:text-gray-900"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/dashboard/pos"
                            className="text-gray-600 hover:text-gray-900"
                        >
                            POS
                        </Link>
                        <Link
                            href="/dashboard/orders"
                            className="text-gray-600 hover:text-gray-900"
                        >
                            Orders
                        </Link>

                        {profile?.role === "manager" && (
                            <Link
                                href="/dashboard/products"
                                className="text-gray-600 hover:text-gray-900"
                            >
                                Products
                            </Link>
                        )}

                        {profile?.role === "manager" && (
                            <Link
                                href="/dashboard/stores"
                                className="text-gray-600 hover:text-gray-900"
                            >
                                Stores
                            </Link>
                        )}

                        {profile?.role === "manager" && (
                            <Link
                                href="/dashboard/analytics"
                                className="text-gray-600 hover:text-gray-900"
                            >
                                Analytics
                            </Link>
                        )}

                        <div className="flex items-center space-x-3">
                            {profile && (
                                <span className="text-sm text-gray-600">
                                    {profile.full_name} ({profile.role})
                                </span>
                            )}
                            <button
                                onClick={signOut}
                                className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
