"use client";
import { useEffect, ReactNode, useMemo, useState, useRef } from "react";
import {
    User,
    ShoppingCart,
    Clock,
    BarChart3,
    Bell,
    ArrowLeft,
    CornerDownRight,
    ChevronsUpDown,
    Pencil,
} from "lucide-react";
import { useStores } from "@/lib/hooks/stores/useStores";
import { format } from "date-fns";
import Image from "next/image";
import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useTenantSlug } from "@/lib/tenant-url";
import { useStore } from "@/lib/context/StoreContext";
import { StorePickerDrawer } from "./StorePickerDrawer";

export interface Assignment {
    user_id: string;
    role: string;
    is_default: boolean;
}

export interface Assignments {
    [storeId: string]: Assignment[];
}

interface MobileLayoutClientProps {
    children: ReactNode;
}

export default function MobileLayoutClient({
    children,
}: MobileLayoutClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
    const [authRetryCount, setAuthRetryCount] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { url } = useTenantSlug();

    const {
        profile,
        isLoading: profileLoading,
        mutate: refreshProfile,
    } = useAuth();
    const { data: storesData, isLoading: storesLoading } = useStores();

    const user = useMemo(
        () => (profile ? { id: profile.id } : null),
        [profile],
    );

    const assignments = useMemo(
        () => storesData?.assignments ?? {},
        [storesData?.assignments],
    );

    const { selectedStore, setIsPickerOpen, isPickerOpen } = useStore();

    // Restore scroll position when drawer closes
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        if (isPickerOpen) {
            // Save scroll position when opening
            el.dataset.scrollY = String(el.scrollTop);
        } else {
            // Restore scroll position when closing
            const saved = el.dataset.scrollY;
            if (saved !== undefined) {
                requestAnimationFrame(() => {
                    el.scrollTo(0, Number(saved));
                });
            }
        }
    }, [isPickerOpen]);

    // Auth state synchronization and recovery
    useEffect(() => {
        let mounted = true;

        const checkAuthState = async () => {
            if ((profileLoading || !profile) && authRetryCount < 3) {
                const timer = setTimeout(async () => {
                    if (mounted && (profileLoading || !profile)) {
                        console.log(
                            `🔄 Force refreshing auth state (attempt ${
                                authRetryCount + 1
                            })...`,
                        );
                        await refreshProfile();
                        setAuthRetryCount((prev) => prev + 1);
                    }
                }, 3000);

                return () => clearTimeout(timer);
            }
        };

        checkAuthState();

        return () => {
            mounted = false;
        };
    }, [profileLoading, profile, refreshProfile, authRetryCount]);

    useEffect(() => {
        if (profile) {
            setAuthRetryCount(0);
        }
    }, [profile]);

    const isLoading = useMemo(() => {
        if (authRetryCount >= 3) {
            console.warn("⚠️ Auth retries exhausted - allowing UI to render");
            return false;
        }
        if (profileLoading || !profile) return true;
        if (storesLoading) return true;
        return false;
    }, [profile, profileLoading, storesLoading, authRetryCount]);

    const canSell = useMemo(
        () => !!user && hasSellerRole(user.id, assignments),
        [user, assignments],
    );

    const canManage = useMemo(
        () => !!user && hasManagerRole(user.id, assignments),
        [user, assignments],
    );

    const tabs = useMemo(
        () =>
            [
                {
                    path: url("/mobile/pos"),
                    label: "POS",
                    icon: ShoppingCart,
                    show: canSell,
                    matchPaths: [url("/mobile/pos")],
                },
                {
                    path: url("/mobile/orders"),
                    label: "Orders",
                    icon: Clock,
                    show: canSell || canManage,
                    matchPaths: [
                        url("/mobile/orders"),
                        url("/mobile/orders/chart"),
                    ],
                },
                {
                    path: url("/mobile/analytics"),
                    label: "Analytics",
                    icon: BarChart3,
                    show: canManage,
                    matchPaths: [
                        url("/mobile/analytics"),
                        url("/mobile/analytics/chart"),
                    ],
                },
                {
                    path: url("/mobile/profile"),
                    label: "Profile",
                    icon: User,
                    show: true,
                    matchPaths: [url("/mobile/profile")],
                },
            ].filter((tab) => tab.show),
        [canSell, canManage, url],
    );

    useEffect(() => {
        console.log("🔍 MobileLayoutClient Debug:", {
            profileLoading,
            storesLoading,
            profile: !!profile,
            profileData: profile
                ? { id: profile.id, name: profile.fullName }
                : null,
            isLoading,
            assignments: !!assignments,
            authRetryCount,
            pathname,
        });
    }, [
        profileLoading,
        storesLoading,
        profile,
        isLoading,
        assignments,
        authRetryCount,
        pathname,
    ]);

    useEffect(() => {
        tabs.forEach((tab) => {
            router.prefetch(tab.path);
        });
    }, [tabs, router]);

    useEffect(() => {
        if (optimisticPath && pathname === optimisticPath) {
            setOptimisticPath(null);
        }
    }, [pathname, optimisticPath]);

    if (isLoading) {
        return (
            <div className="h-dvh overflow-hidden bg-white flex flex-col items-center justify-center">
                <div className="text-center" role="status" aria-live="polite">
                    <div className="mb-8">
                        <Image
                            src="/LEMONI-512x512.png"
                            alt="Logo"
                            width={80}
                            height={80}
                            className="rounded-xl shadow-2xl mx-auto"
                        />
                    </div>
                    <div className="w-64 h-1.5 loading-track rounded-full">
                        <div className="loading-bar" />
                    </div>
                    <div className="mt-4 text-xs text-gray-600 text-center">
                        <VersionInfo />
                    </div>
                    {authRetryCount > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                            Connecting... ({authRetryCount}/3)
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="h-dvh overflow-hidden bg-white flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <div className="mb-6">
                        <Image
                            src="/LEMONI-512x512.png"
                            alt="Logo"
                            width={80}
                            height={80}
                            className="rounded-xl shadow-2xl mx-auto"
                        />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">
                        Authentication Required
                    </h2>
                    <p className="text-gray-600 mb-6 text-sm">
                        Unable to load your profile. Please check your
                        connection and try again.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                        >
                            Refresh Page
                        </button>
                        <button
                            onClick={() => refreshProfile()}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                            Retry
                        </button>
                    </div>
                    <div className="mt-6 text-xs text-gray-500">
                        <VersionInfo />
                    </div>
                </div>
            </div>
        );
    }

    const currentPath = optimisticPath || pathname;

    const getCurrentPageTitle = (path: string) => {
        if (path.endsWith("/mobile/pos")) return "POS";
        if (path.endsWith("/mobile/orders")) return "Orders";
        if (path.endsWith("/mobile/orders/chart")) return "Daily";
        if (path.endsWith("/mobile/analytics")) return "Analytics";
        if (path.endsWith("/mobile/analytics/chart")) return "Monthly";
        if (path.endsWith("/mobile/profile")) return "Profile";
        return "Mobile";
    };

    const handleNavClick = (path: string) => {
        if (path === pathname) return;
        setOptimisticPath(path);
        router.push(path);
    };

    const handleLogoClick = () => {
        const targetPath = canSell
            ? url("/mobile/pos")
            : url("/mobile/profile");
        if (targetPath === pathname) return;
        setOptimisticPath(targetPath);
        router.push(targetPath);
    };

    const isSubPage = (path: string) => {
        return path.includes("/mobile/profile/");
    };

    const isChartPage = (path: string) => {
        return (
            path.endsWith("/mobile/orders/chart") ||
            path.endsWith("/mobile/analytics/chart")
        );
    };

    return (
        <div className="h-dvh flex flex-col bg-gray-50 select-none overflow-hidden">
            <header className="fixed top-0 left-0 right-0 z-40 bg-gray-50 p-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isSubPage(currentPath) ? (
                            <button
                                onClick={() => router.back()}
                                className="text-gray-900"
                            >
                                <ArrowLeft size={28} strokeWidth={2} />
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                    {getCurrentPageTitle(currentPath)}
                                </h1>
                                {selectedStore && (
                                    <button
                                        onClick={() => setIsPickerOpen(true)}
                                        className="flex items-center mt-1"
                                    >
                                        <p className="text-xl text-blue-600/90 font-bold">
                                            {selectedStore.name}
                                        </p>
                                        <ChevronsUpDown
                                            size={14}
                                            strokeWidth={3}
                                            className="text-blue-600/90"
                                        />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {!isSubPage(currentPath) && !isChartPage(currentPath) && (
                        <button
                            disabled
                            className="relative p-2 rounded-lg border border-gray-200 bg-white opacity-40 cursor-not-allowed"
                            aria-label="Notifications"
                        >
                            <Bell size={20} className="text-gray-800" />
                        </button>
                    )}
                </div>
            </header>

            {/* Scrollable content area with ref */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto pt-20 p-4 pb-28 bg-gray-50"
            >
                {children}
            </div>

            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="flex">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.matchPaths.includes(currentPath);

                        return (
                            <button
                                key={tab.path}
                                onClick={() => handleNavClick(tab.path)}
                                className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 relative transition-all duration-75 active:scale-95 ${
                                    isActive
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-gray-600 hover:text-blue-500"
                                }`}
                            >
                                <Icon
                                    size={20}
                                    className="transition-transform duration-75"
                                />
                                <span className="text-xs font-medium transition-transform duration-75">
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full transition-all duration-200"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </footer>

            <StorePickerDrawer />
        </div>
    );
}
