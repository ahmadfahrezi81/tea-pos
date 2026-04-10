"use client";
import {
    useEffect,
    ReactNode,
    useMemo,
    useState,
    useRef,
    useCallback,
} from "react";
import {
    User,
    ShoppingCart,
    Clock,
    BarChart3,
    Bell,
    ArrowLeft,
    ChevronsUpDown,
} from "lucide-react";
import { useStores } from "@/lib/hooks/stores/useStores";
import Image from "next/image";
import { hasManagerRole, hasSellerRole } from "@/lib/utils/roleUtils";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useTenantSlug } from "@/lib/tenant-url";
import { useStore } from "@/lib/context/StoreContext";
import { StorePickerDrawer } from "./StorePickerDrawer";
import { navigation } from "@/lib/utils/navigation";
import useNotifications from "@/lib/hooks/notifications/useNotifications";
import { useProfileIcon } from "@/lib/context/ProfileIconContext";

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
    // ─── Router & path ───────────────────────────────────────────────
    const router = useRouter();
    const pathname = usePathname();
    const { url } = useTenantSlug();

    // ─── UI state ────────────────────────────────────────────────────
    const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [authRetryCount, setAuthRetryCount] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // ─── Auth ────────────────────────────────────────────────────────
    const {
        profile,
        isLoading: profileLoading,
        mutate: refreshProfile,
    } = useAuth();

    // ─── Stores & permissions ─────────────────────────────────────────
    const { data: storesData, isLoading: storesLoading } = useStores();
    const { selectedStore, setIsPickerOpen, isPickerOpen } = useStore();
    const { ProfileIcon } = useProfileIcon();

    const user = useMemo(
        () => (profile ? { id: profile.id } : null),
        [profile],
    );
    const assignments = useMemo(
        () => storesData?.assignments ?? {},
        [storesData?.assignments],
    );

    const canSell = useMemo(
        () => !!user && hasSellerRole(user.id, assignments),
        [user, assignments],
    );
    const canManage = useMemo(
        () => !!user && hasManagerRole(user.id, assignments),
        [user, assignments],
    );

    const { data: notificationsData } = useNotifications();
    const unreadCount = notificationsData?.unreadCount ?? 0;
    const badgeCount = unreadCount > 99 ? "99+" : unreadCount;

    const isLoading = useMemo(() => {
        if (authRetryCount >= 3) return false;
        if (profileLoading || !profile) return true;
        if (storesLoading) return true;
        return false;
    }, [profile, profileLoading, storesLoading, authRetryCount]);

    // ─── Tabs ─────────────────────────────────────────────────────────
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
                    label: "You",
                    icon: User,
                    show: true,
                    matchPaths: [url("/mobile/profile")],
                },
            ].filter((tab) => tab.show),
        [canSell, canManage, url],
    );

    // ─── Path helpers ─────────────────────────────────────────────────
    const getCurrentPageTitle = useCallback((path: string): string | null => {
        if (path.endsWith("/mobile/pos")) return "POS";
        if (path.endsWith("/mobile/orders")) return "Orders";
        if (path.endsWith("/mobile/orders/chart")) return "Daily Chart";
        if (path.endsWith("/mobile/analytics")) return "Analytics";
        if (path.endsWith("/mobile/analytics/chart")) return "Monthly Chart";
        if (path.endsWith("/mobile/profile")) return "Profile";
        if (path.endsWith("/mobile/profile/stores")) return "Assigned Stores";
        if (path.endsWith("/mobile/notifications")) return "Notifications";
        if (
            path.includes("/mobile/notifications/") &&
            path.endsWith("/weather")
        )
            return "Weather Forecast";
        if (path.endsWith("/mobile/analytics/daily/close"))
            return "Daily Close";
        if (path.endsWith("/mobile/analytics/daily/open")) return "Open Store";
        return "Mobile";
    }, []);

    const isSubPage = useCallback(
        (path: string) =>
            path.includes("/mobile/profile/") ||
            path.endsWith("/mobile/orders/chart") ||
            path.endsWith("/mobile/analytics/chart") ||
            path.endsWith("/mobile/notifications") ||
            path.includes("/mobile/notifications/") ||
            path.endsWith("/mobile/analytics/daily/close") ||
            path.endsWith("/mobile/analytics/daily/open"),
        [],
    );

    const isChartPage = useCallback(
        (path: string) =>
            path.endsWith("/mobile/orders/chart") ||
            path.endsWith("/mobile/analytics/chart"),
        [],
    );

    const getParentPath = useCallback(
        (path: string) => {
            if (path.includes("/mobile/profile/"))
                return url("/mobile/profile");
            if (path.endsWith("/mobile/orders/chart"))
                return url("/mobile/orders");
            if (path.endsWith("/mobile/analytics/chart"))
                return url("/mobile/analytics");
            if (path.endsWith("/mobile/notifications"))
                return url("/mobile/pos");
            if (path.includes("/mobile/notifications/"))
                return url("/mobile/notifications");
            if (path.includes("/mobile/analytics/daily/"))
                return url("/mobile/analytics");
            return url("/mobile");
        },
        [url],
    );

    // ─── Navigation ───────────────────────────────────────────────────
    const handleNavClick = useCallback(
        (path: string) => {
            if (path === pathname) return;
            setOptimisticPath(path.split("?")[0]);
            setIsTransitioning(true);
            router.push(path);
        },
        [pathname, router],
    );

    // ─── Effects ──────────────────────────────────────────────────────
    useEffect(() => {
        navigation.register(handleNavClick);
    }, [handleNavClick]);

    useEffect(() => {
        if (optimisticPath && pathname === optimisticPath) {
            setOptimisticPath(null);
            setIsTransitioning(false);
        }
    }, [pathname, optimisticPath]);

    useEffect(() => {
        tabs.forEach((tab) => router.prefetch(tab.path));
        router.prefetch(url("/mobile/notifications"));
        router.prefetch(url("/mobile/orders"));
        router.prefetch(url("/mobile/analytics"));
        router.prefetch(url("/mobile/profile"));
    }, [tabs, router, url]);

    useEffect(() => {
        let mounted = true;
        const checkAuthState = async () => {
            if ((profileLoading || !profile) && authRetryCount < 3) {
                const timer = setTimeout(async () => {
                    if (mounted && (profileLoading || !profile)) {
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
        if (profile) setAuthRetryCount(0);
    }, [profile]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        if (isPickerOpen) {
            el.dataset.scrollY = String(el.scrollTop);
        } else {
            const saved = el.dataset.scrollY;
            if (saved !== undefined) {
                requestAnimationFrame(() => el.scrollTo(0, Number(saved)));
            }
        }
    }, [isPickerOpen]);

    // ─── Derived state ────────────────────────────────────────────────
    const currentPath = optimisticPath || pathname;
    const isProfilePage = currentPath.endsWith("/mobile/profile");
    const currentTitle = getCurrentPageTitle(currentPath);
    const currentIsSubPage = isSubPage(currentPath);
    const isInlineHeader = currentPath.endsWith(
        "/mobile/analytics/daily/close",
    );

    // ─── Early returns ────────────────────────────────────────────────
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
                        <div className="mt-2 text-xs text-brand">
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
                            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium"
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

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <div className="h-dvh flex flex-col bg-gray-50 select-none overflow-hidden">
            <header className="fixed top-0 left-0 right-0 z-40 bg-gray-50 p-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {currentIsSubPage ? (
                            isInlineHeader ? (
                                // Inline header — back button + title on same row
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() =>
                                            handleNavClick(
                                                getParentPath(currentPath),
                                            )
                                        }
                                        className="text-gray-900 active:scale-95 pr-2 pl-0 py-1"
                                    >
                                        <ArrowLeft size={28} strokeWidth={2} />
                                    </button>
                                    {currentTitle && (
                                        <p className="text-xl font-semibold tracking-tight text-gray-900">
                                            {currentTitle}
                                        </p>
                                    )}
                                </div>
                            ) : isChartPage(currentPath) ? (
                                // Chart pages — back + title + store picker stacked
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() =>
                                            handleNavClick(
                                                getParentPath(currentPath),
                                            )
                                        }
                                        className="text-gray-900 active:scale-95 self-start pr-2 pl-0 py-1"
                                    >
                                        <ArrowLeft size={28} strokeWidth={2} />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <p className="text-2xl font-semibold tracking-tight text-gray-900">
                                            {currentTitle}
                                        </p>
                                        {selectedStore && (
                                            <button
                                                onClick={() =>
                                                    setIsPickerOpen(true)
                                                }
                                                className="flex items-center mt-1 gap-0.5 active:scale-95"
                                            >
                                                <p className="text-lg text-brand font-bold">
                                                    {selectedStore.name}
                                                </p>
                                                <ChevronsUpDown
                                                    size={14}
                                                    strokeWidth={3}
                                                    className="text-brand"
                                                />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : currentTitle === null ? (
                                // Minimal header — back button only
                                <button
                                    onClick={() =>
                                        handleNavClick(
                                            getParentPath(currentPath),
                                        )
                                    }
                                    className="text-gray-900 active:scale-95 pr-2 pl-0 py-1"
                                >
                                    <ArrowLeft size={28} strokeWidth={2} />
                                </button>
                            ) : (
                                // Full subpage header — back button + title below
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() =>
                                            handleNavClick(
                                                getParentPath(currentPath),
                                            )
                                        }
                                        className="text-gray-900 active:scale-95 self-start pr-2 pl-0 py-1"
                                    >
                                        <ArrowLeft size={28} strokeWidth={2} />
                                    </button>
                                    <p className="text-2xl font-semibold tracking-tight text-gray-900">
                                        {currentTitle}
                                    </p>
                                </div>
                            )
                        ) : (
                            // Main tab header
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                    {currentTitle}
                                </h1>
                                {selectedStore && !isProfilePage && (
                                    <button
                                        onClick={() => setIsPickerOpen(true)}
                                        className="flex items-center mt-1.5 active:scale-98"
                                    >
                                        <p className="text-xl font-semibold text-brand">
                                            {selectedStore.name}
                                        </p>
                                        <ChevronsUpDown
                                            size={16}
                                            strokeWidth={3}
                                            className="text-brand"
                                        />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {currentPath.endsWith("/mobile/profile") && (
                        <button
                            onClick={() =>
                                handleNavClick(url("/mobile/notifications"))
                            }
                            className="relative p-1.5 rounded-xl active:scale-95"
                            aria-label="Notifications"
                        >
                            <Bell size={28} className="text-black" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                                    {badgeCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </header>

            <div
                ref={scrollContainerRef}
                className={`flex-1 overflow-y-auto p-4 pb-28 bg-gray-50 ${
                    isInlineHeader
                        ? "pt-14"
                        : currentIsSubPage
                          ? "pt-24"
                          : "pt-17"
                }`}
            >
                {isTransitioning ? (
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                        <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    children
                )}
            </div>

            {!currentIsSubPage && (
                <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                    <div className="flex">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive =
                                tab.matchPaths.includes(currentPath);
                            const isProfileTab =
                                tab.path === url("/mobile/profile");

                            return (
                                <button
                                    key={tab.path}
                                    onClick={() => handleNavClick(tab.path)}
                                    className={`flex-1 py-3 px-4 pb-2 flex flex-col items-center space-y-1 relative transition-all duration-75 active:scale-98 ${
                                        isActive
                                            ? "text-brand bg-brand/5"
                                            : "text-gray-600 hover:text-brand"
                                    }`}
                                >
                                    {isProfileTab ? (
                                        <ProfileIcon
                                            size={22}
                                            className="transition-transform duration-75"
                                        />
                                    ) : (
                                        <Icon
                                            size={22}
                                            className="transition-transform duration-75"
                                        />
                                    )}
                                    <span className="text-xs font-medium transition-transform duration-75">
                                        {tab.label}
                                    </span>
                                    {isActive && (
                                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-brand rounded-b-full transition-all duration-200" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </footer>
            )}

            <StorePickerDrawer />
        </div>
    );
}
