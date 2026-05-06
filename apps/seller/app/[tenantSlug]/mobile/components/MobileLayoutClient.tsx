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
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { useStore } from "@/lib/context/StoreContext";
import { StorePickerDrawer } from "./StorePickerDrawer";
import { navigation } from "@tea-pos/utils/navigation";
import { useIsIPhonePWA } from "@/lib/usePWA";
import { MobileHeader } from "./MobileHeader";
import { MobileFooterNav } from "./MobileFooterNav";
import { resolveRoute } from "../config/routes";

interface MobileLayoutClientProps {
    children: ReactNode;
}

export default function MobileLayoutClient({
    children,
}: MobileLayoutClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { url } = useTenantSlug();

    const [shellReady, setShellReady] = useState(false);
    const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastRootTabRef = useRef<string>(url("/mobile/more"));

    const { profile, avatarUrl, mutate: refreshProfile } = useAuth();
    const { data: storesData } = useStores();
    const { selectedStore, setIsPickerOpen, isPickerOpen } = useStore();
    const isIPhonePWA = useIsIPhonePWA();

    const storesReady = !!storesData;

    useEffect(() => {
        if (profile) {
            setShellReady(true);
        }
    }, [profile]);

    const tabs = useMemo(
        () => [
            {
                path: url("/mobile/pos"),
                label: "Home",
                icon: StoreIcon,
                matchPaths: [url("/mobile/pos")],
            },
            {
                path: url("/mobile/orders"),
                label: "Orders",
                icon: ReceiptText,
                matchPaths: [
                    url("/mobile/orders"),
                    url("/mobile/orders/chart"),
                ],
            },
            {
                path: url("/mobile/analytics"),
                label: "Analytics",
                icon: ChartNoAxesCombinedIcon,
                matchPaths: [
                    url("/mobile/analytics"),
                    url("/mobile/analytics/chart"),
                ],
            },
            {
                path: url("/mobile/inbox"),
                label: "Inbox",
                icon: InboxIcon,
                matchPaths: [url("/mobile/inbox")],
            },
            {
                path: url("/mobile/more"),
                label: "More",
                icon: MoreHorizontal,
                matchPaths: [url("/mobile/more")],
            },
        ],
        [url],
    );

    const getCurrentPageTitle = useCallback(
        (path: string): string | null => resolveRoute(path)?.title ?? "Mobile",
        [],
    );

    const isSubPage = useCallback(
        (path: string) => resolveRoute(path)?.subPage ?? false,
        [],
    );

    const getParentPath = useCallback(
        (path: string) => {
            const route = resolveRoute(path);
            if (!route?.parent) return url("/mobile");
            if (route.parent === "lastRootTab") return lastRootTabRef.current;
            return url(route.parent);
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
        router.prefetch(url("/mobile/notifications"));
        router.prefetch(url("/mobile/account"));
        router.prefetch(url("/mobile/more/stores"));
        router.prefetch(url("/mobile/account/details"));
        router.prefetch(url("/mobile/more/map"));
    }, []);

    useEffect(() => {
        tabs.forEach((tab) => router.prefetch(tab.path));
    }, [tabs]);

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
    const isInlineHeader = resolveRoute(currentPath)?.inlineHeader ?? false;

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

    if (!shellReady) {
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
