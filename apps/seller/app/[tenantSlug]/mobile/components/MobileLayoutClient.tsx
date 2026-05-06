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
    ReceiptText,
    StoreIcon,
    ChartNoAxesCombinedIcon,
    InboxIcon,
    MoreHorizontal,
} from "lucide-react";
import Image from "next/image";
import { useStores } from "@/lib/hooks/stores/useStores";
import { hasManagerRole, hasSellerRole } from "@tea-pos/utils/roleUtils";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import VersionInfo from "@/components/shared/VersionInfo";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { useStore } from "@/lib/context/StoreContext";
import { StorePickerDrawer } from "./StorePickerDrawer";
import { navigation } from "@tea-pos/utils/navigation";
import { useIsIPhonePWA } from "@/lib/usePWA";
import { MobileHeader } from "./MobileHeader";
import { MobileFooterNav } from "./MobileFooterNav";

interface MobileLayoutClientProps {
    children: ReactNode;
}

export default function MobileLayoutClient({
    children,
}: MobileLayoutClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { url } = useTenantSlug();

    const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [authRetryCount, setAuthRetryCount] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastRootTabRef = useRef<string>(url("/mobile/more"));

    const {
        profile,
        avatarUrl,
        isLoading: profileLoading,
        mutate: refreshProfile,
    } = useAuth();
    const { data: storesData } = useStores();
    const { selectedStore, setIsPickerOpen, isPickerOpen } = useStore();
    const isIPhonePWA = useIsIPhonePWA();

    const storesReady = !!storesData;
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

    const isLoading = useMemo(() => {
        if (authRetryCount >= 3) return false;
        if (profileLoading || !profile || !storesReady) return true;
        return false;
    }, [profile, profileLoading, authRetryCount, storesReady]);

    const tabs = useMemo(
        () =>
            [
                {
                    path: url("/mobile/pos"),
                    label: "Home",
                    icon: StoreIcon,
                    show: canSell,
                    matchPaths: [url("/mobile/pos")],
                },
                {
                    path: url("/mobile/orders"),
                    label: "Orders",
                    icon: ReceiptText,
                    show: canSell || canManage,
                    matchPaths: [
                        url("/mobile/orders"),
                        url("/mobile/orders/chart"),
                    ],
                },
                {
                    path: url("/mobile/analytics"),
                    label: "Analytics",
                    icon: ChartNoAxesCombinedIcon,
                    show: canManage,
                    matchPaths: [
                        url("/mobile/analytics"),
                        url("/mobile/analytics/chart"),
                    ],
                },
                {
                    path: url("/mobile/inbox"),
                    label: "Inbox",
                    icon: InboxIcon,
                    show: true,
                    matchPaths: [url("/mobile/inbox")],
                },
                {
                    path: url("/mobile/more"),
                    label: "More",
                    icon: MoreHorizontal,
                    show: true,
                    matchPaths: [url("/mobile/more")],
                },
            ].filter((tab) => tab.show),
        [canSell, canManage, url],
    );

    const getCurrentPageTitle = useCallback((path: string): string | null => {
        if (path.endsWith("/mobile/pos")) return "Home";
        if (path.endsWith("/mobile/orders")) return "Orders";
        if (path.endsWith("/mobile/orders/chart")) return "Daily Chart";
        if (path.endsWith("/mobile/analytics")) return "Analytics";
        if (path.endsWith("/mobile/analytics/chart")) return "Monthly Chart";
        if (path.endsWith("/mobile/inbox")) return "Inbox";
        if (path.endsWith("/mobile/more")) return "More";
        if (path.endsWith("/mobile/more/stores")) return "Assigned Stores";
        if (path.endsWith("/mobile/account/details")) return "Personal Details";
        if (path.endsWith("/mobile/more/map")) return "Map";
        if (path.endsWith("/mobile/account")) return "Account";
        if (path.endsWith("/mobile/notifications")) return "Notifications";
        if (
            path.includes("/mobile/notifications/") &&
            path.endsWith("/weather")
        )
            return "Weather Forecast";
        if (path.endsWith("/mobile/analytics/daily/close")) return "Close Day";
        if (path.endsWith("/mobile/analytics/daily/open")) return "Open Store";
        return "Mobile";
    }, []);

    const isSubPage = useCallback(
        (path: string) =>
            path.endsWith("/mobile/orders/chart") ||
            path.endsWith("/mobile/analytics/chart") ||
            path.endsWith("/mobile/notifications") ||
            path.includes("/mobile/notifications/") ||
            path.endsWith("/mobile/analytics/daily/close") ||
            path.endsWith("/mobile/analytics/daily/open") ||
            path.endsWith("/mobile/account") ||
            path.endsWith("/mobile/more/stores") ||
            path.endsWith("/mobile/more/map") ||
            path.endsWith("/mobile/account/details"),
        [],
    );

    const getParentPath = useCallback(
        (path: string) => {
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
            if (path.endsWith("/mobile/account")) return lastRootTabRef.current;
            if (path.endsWith("/mobile/account/details"))
                return url("/mobile/account");
            if (path.includes("/mobile/more/")) return url("/mobile/more");
            return url("/mobile");
        },
        [url],
    );

    const handleNavClick = useCallback(
        (path: string) => {
            if (path === pathname) return;
            setOptimisticPath(path.split("?")[0]);
            setIsTransitioning(true);
            router.push(path);
        },
        [pathname, router],
    );

    useEffect(() => {
        const rootTabs = [
            url("/mobile/pos"),
            url("/mobile/orders"),
            url("/mobile/analytics"),
            url("/mobile/inbox"),
            url("/mobile/more"),
        ];
        if (rootTabs.includes(pathname)) {
            lastRootTabRef.current = pathname;
        }
    }, [pathname, url]);

    useEffect(() => {
        navigation.register(handleNavClick);
    }, [handleNavClick]);

    useEffect(() => {
        if (optimisticPath && pathname === optimisticPath) {
            setTimeout(() => {
                setOptimisticPath(null);
                setIsTransitioning(false);
            }, 0);
        }
    }, [pathname, optimisticPath]);

    useEffect(() => {
        tabs.forEach((tab) => router.prefetch(tab.path));
        router.prefetch(url("/mobile/notifications"));
        router.prefetch(url("/mobile/orders"));
        router.prefetch(url("/mobile/analytics"));
        router.prefetch(url("/mobile/account"));
        router.prefetch(url("/mobile/more/stores"));
        router.prefetch(url("/mobile/account/details"));
        router.prefetch(url("/mobile/more/map"));
    }, [tabs, router, url]);

    useEffect(() => {
        if (profile) {
            setTimeout(() => setAuthRetryCount(0), 0);
            return;
        }

        let mounted = true;
        const checkAuthState = async () => {
            if (authRetryCount < 3) {
                const timer = setTimeout(async () => {
                    if (mounted) {
                        await refreshProfile();
                        setAuthRetryCount((prev) => prev + 1);
                    }
                }, 3000);
                return () => clearTimeout(timer);
            }
        };

        const cleanupPromise = checkAuthState();
        return () => {
            mounted = false;
            cleanupPromise.then((fn) => fn?.());
        };
    }, [profile, refreshProfile, authRetryCount]);

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

    const currentPath = optimisticPath || pathname;
    const currentTitle = getCurrentPageTitle(currentPath);
    const currentIsSubPage = isSubPage(currentPath);
    const isInlineHeader = currentPath.endsWith(
        "/mobile/analytics/daily/close",
    );

    const rootTabPaths = [
        url("/mobile/pos"),
        url("/mobile/orders"),
        url("/mobile/analytics"),
        url("/mobile/inbox"),
        url("/mobile/more"),
    ];
    const showAccountIcon = rootTabPaths.some((p) => currentPath === p);

    const scrollPaddingTop = isInlineHeader
        ? "pt-16"
        : currentIsSubPage
          ? "pt-27"
          : "pt-19";

    if (isLoading) {
        return (
            <div className="h-dvh overflow-hidden bg-white flex flex-col items-center justify-center">
                <div className="text-center" role="status" aria-live="polite">
                    <div className="mb-8">
                        <Image
                            src="/icons/icon-192x192.png"
                            alt="Logo"
                            width={70}
                            height={70}
                            priority
                            className="rounded-xl shadow-2xl mx-auto"
                        />
                    </div>
                    <div className="w-64 h-1.5 loading-track rounded-full">
                        <div className="loading-bar" />
                    </div>
                    <div className="mt-4 text-xs text-gray-600 text-center">
                        <span className="font-mono text-xs opacity-90">
                            Loading ...
                        </span>
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
                            src="/icons/icon-192x192.png"
                            alt="Logo"
                            width={70}
                            height={70}
                            priority
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
                </div>
            </div>
        );
    }

    return (
        <div className="h-dvh flex flex-col bg-gray-50 select-none overflow-hidden">
            <MobileHeader
                currentPath={currentPath}
                currentTitle={currentTitle}
                isSubPage={currentIsSubPage}
                selectedStore={selectedStore}
                showAccountIcon={showAccountIcon}
                avatarUrl={avatarUrl}
                onBack={() => handleNavClick(getParentPath(currentPath))}
                onStorePicker={() => setIsPickerOpen(true)}
                onAccount={() => handleNavClick(url("/mobile/account"))}
            />

            <div
                ref={scrollContainerRef}
                className={`flex-1 overflow-y-auto bg-gray-50 p-4 pb-28 ${scrollPaddingTop}`}
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
                <MobileFooterNav
                    tabs={tabs}
                    currentPath={currentPath}
                    onTabClick={handleNavClick}
                    isIPhonePWA={isIPhonePWA}
                    storesReady={storesReady}
                />
            )}

            <StorePickerDrawer />
        </div>
    );
}
