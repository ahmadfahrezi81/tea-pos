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
import { getWeekInfo } from "@tea-pos/utils/week";
import { useIsIPhonePWA } from "@/lib/usePWA";
import { MobileHeader } from "./MobileHeader";
import { MobileFooterNav } from "./MobileFooterNav";
import { MobileOverlayContext } from "./MobileOverlayContext";
import { MobileFooterSlotContext } from "./MobileFooterSlotContext";
import { MobileScrollContext } from "./MobileScrollContext";
import { resolveRoute, rootTabSuffixes, tabGroups } from "../config/navigation";
import { useT } from "@/lib/hooks/useT";
import { useFlags } from "@/lib/context/FlagsContext";

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
    const { flags: { isMaintenanceEnabled } } = useFlags();
    const t = useT();
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
            if (path === pathname) {
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
            const currentRoute = resolveRoute(pathname);
            if (currentRoute?.preserveScroll) {
                const cleanPath = path.split("?")[0];
                const isTabSwitch = rootTabPaths.includes(cleanPath);
                if (isTabSwitch) {
                    sessionStorage.removeItem(`scroll:${pathname}`);
                } else if (scrollContainerRef.current) {
                    sessionStorage.setItem(`scroll:${pathname}`, String(scrollContainerRef.current.scrollTop));
                }
            }
            setOptimisticPath(path.split("?")[0]);
            setIsTransitioning(true);
            router.push(path);
        },
        [pathname, router, rootTabPaths],
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
                const label = v?.labelKey ? t(v.labelKey) : v?.label ?? (tab.labelKey ? t(tab.labelKey) : tab.label);
                return {
                    path: url(tab.pathSuffix),
                    label,
                    icon: v?.icon ?? tab.icon,
                    matchPaths: tab.matchSuffixes.map(url),
                };
            }),
        [currentPath, url, t],
    );

    useEffect(() => {
        tabs.forEach((tab) => router.prefetch(tab.path));
    }, [tabs]);

    const currentRoute = resolveRoute(currentPath);
    const currentTitle = currentRoute?.titleKey ? t(currentRoute.titleKey) : currentRoute?.title ?? "Mobile";
    const currentIsSubPage = currentRoute?.subPage ?? false;
    const isInlineHeader = currentRoute?.inlineHeader ?? false;
    const hasHeaderAction = !!currentRoute?.headerAction;
    const footerCtaLabel = currentRoute?.footerCtaKey ? t(currentRoute.footerCtaKey) : currentRoute?.footerCta;
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

    const scrollPaddingBottom = currentRoute?.scrollPaddingBottom ?? (
        !!footerCtaLabel
            ? "pb-32"
            : isIPhonePWA
              ? "pb-30"
              : "pb-24"
    );

    return (
        <MobileScrollContext.Provider value={{ scrollRef: scrollContainerRef }}>
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
                            className={`absolute inset-0 z-10 flex items-center justify-center`}
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
                        <div className="mb-4">
                            <Image
                                src="/icons/icon-192x192.png"
                                alt="Logo"
                                width={70}
                                height={70}
                                priority
                                className="rounded-xl shadow-2xl mx-auto"
                            />
                        </div>
                        <p className="font-mono text-lg font-semibold text-gray-700 mb-2">{getWeekInfo().label}</p>
                        <div className="w-64 h-4 loading-track">
                            <div className="loading-bar">
                                <div className="absolute top-0 left-0 right-0 h-1/2 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-600 text-center">
                            <span className="font-mono text-xs opacity-90">
                                {t("common.loading")}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Maintenance overlay — shown when ops-maintenance flag is on */}
            {isMaintenanceEnabled && (
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
                            Under Maintenance
                        </h2>
                        <p className="text-gray-500 text-sm max-w-xs">
                            We&apos;re making some updates to improve your experience. We&apos;ll be back shortly.
                        </p>
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
                            {t("common.authRequired")}
                        </h2>
                        <p className="text-gray-600 mb-6 text-sm">
                            {t("common.authRequiredSub")}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium"
                            >
                                {t("common.refresh")}
                            </button>
                            <button
                                onClick={() => refreshProfile()}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                            >
                                {t("common.retry")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileOverlayContext.Provider>
        </MobileFooterSlotContext.Provider>
        </MobileScrollContext.Provider>
    );
}
