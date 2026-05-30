"use client";
import React, {
    useEffect,
    ReactNode,
    useMemo,
    useState,
    useRef,
    useCallback,
} from "react";
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
import { MobileOverlayContext } from "./MobileOverlayContext";
import { MobileFooterSlotContext } from "./MobileFooterSlotContext";
import { resolveRoute, rootTabSuffixes, tabGroups } from "../config/navigation";

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
    const [overlay, setOverlayNode] = useState<ReactNode>(null);
    const setOverlay = useCallback((node: ReactNode) => setOverlayNode(node), []);
    const [footerSlot, setFooterSlotNode] = useState<ReactNode>(null);
    const setFooterSlot = useCallback((node: ReactNode) => setFooterSlotNode(node), []);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastRootTabRef = useRef<string>(url("/mobile/more"));

    const { user, avatarUrl, mutate: refreshProfile } = useAuth();
    const { data: storesData } = useStores();
    const { selectedStore, setIsPickerOpen, isPickerOpen } = useStore();
    const isIPhonePWA = useIsIPhonePWA();

    useEffect(() => {
        if (user && storesData !== undefined) {
            setShellReady(true);
        }
    }, [user, storesData]);

    const rootTabPaths = useMemo(() => rootTabSuffixes.map(url), [url]);

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
        if (rootTabPaths.includes(pathname)) {
            lastRootTabRef.current = pathname;
        }
    }, [pathname, rootTabPaths]);

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
        router.prefetch(url("/mobile/home/pos"));
        router.prefetch(url("/mobile/home/manage"));
        router.prefetch(url("/mobile/notifications"));
        router.prefetch(url("/mobile/account"));
        router.prefetch(url("/mobile/more/stores"));
        router.prefetch(url("/mobile/account/details"));
        router.prefetch(url("/mobile/more/map"));
    }, []);

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

    const tabs = useMemo(
        () =>
            tabGroups.global.map((tab) => {
                const v =
                    tab.variant && currentPath.includes(tab.variant.pathContains)
                        ? tab.variant
                        : null;
                return {
                    path: url(tab.pathSuffix),
                    label: v?.label ?? tab.label,
                    icon: v?.icon ?? tab.icon,
                    matchPaths: tab.matchSuffixes.map(url),
                };
            }),
        [currentPath, url],
    );

    useEffect(() => {
        tabs.forEach((tab) => router.prefetch(tab.path));
    }, [tabs]);

    const currentRoute = resolveRoute(currentPath);
    const currentTitle = currentRoute?.title ?? "Mobile";
    const currentIsSubPage = currentRoute?.subPage ?? false;
    const isInlineHeader = currentRoute?.inlineHeader ?? false;
    const hasHeaderAction = currentRoute?.headerAction === "add";
    const footerCtaLabel = currentRoute?.footerCta;
    const parentSuffix = currentRoute?.parent;
    const parentPath = !parentSuffix
        ? url("/mobile")
        : parentSuffix === "lastRootTab"
          ? lastRootTabRef.current
          : url(parentSuffix);
    const showAccountIcon = rootTabPaths.some((p) => currentPath === p);

    const scrollPaddingTop = hasHeaderAction
        ? "pt-30"
        : isInlineHeader
          ? "pt-16"
          : currentIsSubPage
            ? "pt-27"
            : "pt-19";

    const scrollPaddingBottom = (hasHeaderAction || !!footerCtaLabel) ? "pb-32" : "pb-28";

    return (
        <MobileFooterSlotContext.Provider value={{ setFooterSlot }}>
        <MobileOverlayContext.Provider value={{ setOverlay }}>
            {/* Shell — always rendered so header/footer are on screen from first paint */}
            <div
                className="h-dvh flex flex-col bg-gradient-to-b from-slate-100 to-slate-200 select-none overflow-hidden"
                style={{ '--mobile-footer-h': isIPhonePWA ? '97px' : '65px' } as React.CSSProperties}
            >
                <MobileHeader
                    currentPath={currentPath}
                    currentTitle={currentTitle}
                    isSubPage={currentIsSubPage}
                    selectedStore={selectedStore}
                    showAccountIcon={showAccountIcon}
                    avatarUrl={avatarUrl}
                    onBack={() => handleNavClick(parentPath)}
                    onStorePicker={() => setIsPickerOpen(true)}
                    onAccount={() => handleNavClick(url("/mobile/account"))}
                />

                <div className="flex-1 relative overflow-hidden">
                    <div
                        ref={scrollContainerRef}
                        className={`absolute inset-0 overflow-y-auto p-4 ${scrollPaddingBottom} ${scrollPaddingTop}`}
                    >
                        {shellReady && !isTransitioning && children}
                    </div>
                    {isTransitioning && (
                        <div
                            className={`absolute inset-x-0 top-0 z-10 px-4 pb-4 ${scrollPaddingTop}`}
                            style={{ bottom: "var(--mobile-footer-h)" }}
                        >
                            <div className="animate-pulse space-y-3">
                                <div className="h-20 bg-slate-200 rounded-2xl" />
                                <div className="h-40 bg-slate-200 rounded-2xl" />
                                <div className="h-44 bg-slate-200 rounded-2xl" />
                                <div className="h-12 bg-slate-200 rounded-2xl" />
                            </div>
                        </div>
                    )}
                    {overlay && (
                        <div
                            className={`absolute inset-x-0 top-0 z-10 ${scrollPaddingTop} pb-5 px-3`}
                            style={{ bottom: 'var(--mobile-footer-h)' }}
                        >
                            {overlay}
                        </div>
                    )}
                    {(footerSlot || footerCtaLabel) && (
                        <div className="absolute bottom-0 left-0 right-0 z-20">
                            {footerSlot ?? (
                                <div className="bg-white border-t border-gray-200 p-4 pb-8">
                                    <button
                                        onClick={() => handleNavClick(`${currentPath}/add`)}
                                        className="w-full bg-brand text-white py-4 rounded-xl font-semibold text-base active:scale-[0.98] transition-transform"
                                    >
                                        {footerCtaLabel}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!currentIsSubPage && (
                    <MobileFooterNav
                        tabs={tabs}
                        currentPath={currentPath}
                        onTabClick={handleNavClick}
                        isIPhonePWA={isIPhonePWA}
                    />
                )}

                <StorePickerDrawer />
            </div>

            {/* Loader overlay — covers shell until shellReady; shell is already behind it */}
            {!shellReady && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
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
                        <div className="w-64 h-4 loading-track">
                            <div className="loading-bar">
                                <div className="absolute top-0 left-0 right-0 h-1/2 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-600 text-center">
                            <span className="font-mono text-xs opacity-90">
                                Loading ...
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Auth error overlay — shown when session is valid but user profile failed */}
            {shellReady && !user && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4">
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
            )}
        </MobileOverlayContext.Provider>
        </MobileFooterSlotContext.Provider>
    );
}
