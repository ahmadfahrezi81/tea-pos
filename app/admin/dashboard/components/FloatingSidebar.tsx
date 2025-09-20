"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks/useData";
import {
    ShoppingCart,
    Package,
    Store,
    BarChart3,
    LogOut,
    User,
    LayoutDashboard,
    Clock,
} from "lucide-react";
import Image from "next/image";

const FloatingSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const { data: profile } = useProfile();

    const menuItems = [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/admin/dashboard",
        },
        {
            id: "pos",
            label: "POS",
            icon: ShoppingCart,
            href: "/admin/dashboard/pos",
        },
        {
            id: "orders",
            label: "Orders",
            icon: Clock,
            href: "/admin/dashboard/orders",
        },
        {
            id: "products",
            label: "Products",
            icon: Package,
            href: "/admin/dashboard/products",
        },
        {
            id: "stores",
            label: "Stores",
            icon: Store,
            href: "/admin/dashboard/stores",
        },
        {
            id: "analytics",
            label: "Analytics",
            icon: BarChart3,
            href: "/admin/dashboard/analytics",
        },
    ];

    const isActiveRoute = (href: string): boolean => {
        if (href === "/admin/dashboard") {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    const signOut = async () => {
        const confirmed = window.confirm("Are you sure you want to sign out?");
        if (confirmed) {
            await supabase.auth.signOut();
            router.push("/login");
        }
    };

    return (
        <div className="fixed left-6 top-6 bottom-6 w-64 bg-white rounded-xl shadow-sm z-40 flex flex-col gap-4 border-1 border-gray-200">
            {/* Header */}
            <div className="p-2">
                <Link href="/admin/dashboard" className="block">
                    <div className="flex items-center hover:bg-blue-50 p-2 rounded-lg gap-2">
                        <Image
                            src="/LEMONI-512x512.png"
                            alt="LEMONI Logo"
                            width={30}
                            height={30}
                            className="rounded"
                        />
                        <h2 className="text-xl font-bold text-gray-800 transition-colors">
                            TEA-POS
                        </h2>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2">
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActiveRoute(item.href);

                        return (
                            <li key={item.id}>
                                <Link
                                    href={item.href}
                                    className={`w-full flex items-center space-x-2 p-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        isActive
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-gray-800 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                >
                                    <Icon
                                        className={`h-5 w-5 ${
                                            isActive
                                                ? "text-blue-700"
                                                : "text-gray-800"
                                        }`}
                                    />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                        {profile ? (
                            <>
                                <p className="text-sm font-medium text-gray-900">
                                    {profile.full_name}
                                </p>
                                <p className="text-xs text-gray-500 uppercase">
                                    {profile.role}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-gray-900">
                                    Loading...
                                </p>
                                <p className="text-xs text-gray-500">User</p>
                            </>
                        )}
                    </div>
                </div>
                <button
                    onClick={signOut}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium  bg-red-50 text-red-700 border-1 border-red-300 transition-colors cursor-pointer"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default FloatingSidebar;
