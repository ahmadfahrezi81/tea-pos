"use client";
import React, {
    useEffect,
    ReactNode,
    useMemo,
    useState,
    useRef,
    useCallback,
    useTransition,
} from "react";
import Image from "next/image";
import { useStores } from "@/lib/hooks/stores/useStores";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { useStore } from "@/lib/context/StoreContext";
import { StorePickerDrawer } from "./StorePickerDrawer";
import { navigation } from "@tea-pos/utils/navigation";
import { MobileHeader } from "./MobileHeader";
import { MobileFooterNav } from "./MobileFooterNav";
import { MobileFooterSlotContext } from "./MobileFooterSlotContext";
import { useScrollRestoration } from "./useScrollRestoration";
import { useEdgeSwipeBack } from "./useEdgeSwipeBack";
import { isSubPage, resolveRoute, rootTabSuffixes, tabGroups } from "../config/navigation";
import { useFlags } from "@/lib/context/FlagsContext";
import { useT } from "@/lib/hooks/useT";

interface MobileLayoutClientProps {
    children: ReactNode;
}

/** How long a navigation may take before it earns a loading indicator. */
const PENDING_BAR_DELAY_MS = 200;

export default function MobileLayoutClient({
    children,
}: MobileLayoutClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { url } = useTenantSlug();

    const [shellReady, setShellReady] = useState(false);
    const [isPending, startTransition] = useTransition();
    // Only drives the tab highlight, so a tap lights up immediately even though
    // the header and content deliberately wait for the new route to commit.
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    const [footerSlot, setFooterSlotNode] = useState<ReactNode>(null);
    const setFooterSlot = useCallback((node: ReactNode) => setFooterSlotNode(node), []);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastRootTabRef = useRef<string>(url("/mobile/more"));
    /** History entries this shell pushed, so back can unwind instead of push. */
    const pushDepthRef = useRef(0);

    const { user, avatarUrl, mutate: refreshProfile } = useAuth();
    const { flags: { isMaintenanceEnabled } } = useFlags();
    const t = useT();
    const { data: storesData } = useStores();
    const { selectedStore, setIsPickerOpen, isPickerOpen } = useStore();

    useEffect(() => {
        if (user && storesData !== undefined) {
            setShellReady(true);
        }
    }, [user, storesData]);

    const rootTabPaths = useMemo(() => rootTabSuffixes.map(url), [url]);

    const saveScroll = useScrollRestoration({
        containerRef: scrollContainerRef,
        pathname,
        enabled: resolveRoute(pathname)?.preserveScroll ?? false,
        ready: shellReady && !isPending,
    });

    const handleNavClick = useCallback(
        (path: string) => {
            if (path === pathname) return;
            // Save while the outgoing page is still the one on screen.
            saveScroll();
            setPendingPath(path.split("?")[0]);
            pushDepthRef.current += 1;
            // Inside a transition the current screen stays mounted and
            // interactive until the next one is ready to commit, instead of
            // being torn down and replaced by a placeholder.
            startTransition(() => {
                router.push(path);
            });
        },
        [pathname, router, saveScroll],
    );

    /**
     * Going back unwinds history rather than pushing another entry. Pushing the
     * parent instead would leave [More, Pay, More] behind, so the system back
     * button would walk *into* the page the user just left. Falls back to a push
     * when there is nothing of ours to unwind — a deep link or a hard reload
     * straight onto a subpage.
     */
    const handleBack = useCallback(
        (fallbackPath: string) => {
            saveScroll();
            if (pushDepthRef.current > 0) {
                startTransition(() => {
                    router.back();
                });
                return;
            }
            handleNavClick(fallbackPath);
        },
        [router, saveScroll, handleNavClick],
    );

    // Every way back out of a page ends in a popstate — the system back button,
    // and router.back() above — so the depth is decremented here only. Doing it
    // at the call site too would double-count and strand the counter at zero.
    useEffect(() => {
        const onPopState = () => {
            pushDepthRef.current = Math.max(0, pushDepthRef.current - 1);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    useEffect(() => {
        if (rootTabPaths.includes(pathname)) {
            lastRootTabRef.current = pathname;
        }
    }, [pathname, rootTabPaths]);

    useEffect(() => {
        navigation.register(handleNavClick);
    }, [handleNavClick]);

    useEffect(() => {
        setPendingPath(null);
    }, [pathname]);

    // A prefetched tab commits in well under this, so the common case shows no
    // loading affordance at all. Only a genuinely slow route gets one, which
    // keeps the bar meaningful instead of flashing on every tap.
    const [showPendingBar, setShowPendingBar] = useState(false);
    useEffect(() => {
        if (!isPending) {
            setShowPendingBar(false);
            return;
        }
        const timer = setTimeout(() => setShowPendingBar(true), PENDING_BAR_DELAY_MS);
        return () => clearTimeout(timer);
    }, [isPending]);

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

    // The header and content both follow `pathname`, the committed route, so the
    // title never jumps ahead of the page it labels. Only the tab bar runs ahead
    // via `navPath`, because a tap has to acknowledge itself immediately.
    const navPath = pendingPath ?? pathname;

    const tabs = useMemo(
        () =>
            tabGroups.global.map((tab) => {
                const v =
                    tab.variant && navPath.includes(tab.variant.pathContains)
                        ? tab.variant
                        : null;
                return {
                    path: url(tab.pathSuffix),
                    label: t((v ?? tab).labelKey),
                    icon: v?.icon ?? tab.icon,
                    matchPaths: tab.matchSuffixes.map(url),
                };
            }),
        [navPath, url, t],
    );

    useEffect(() => {
        tabs.forEach((tab) => router.prefetch(tab.path));
    }, [tabs]);

    const currentRoute = resolveRoute(pathname);
    const currentTitle = currentRoute ? t(currentRoute.titleKey) : "Mobile";
    const currentIsSubPage = isSubPage(currentRoute);
    const footerCtaLabel = currentRoute?.footerCtaKey ? t(currentRoute.footerCtaKey) : undefined;
    const parentSuffix = currentRoute?.parent;
    const parentPath = !parentSuffix
        ? url("/mobile")
        : parentSuffix === "lastRootTab"
          ? lastRootTabRef.current
          : url(parentSuffix);
    const showAccountIcon = rootTabPaths.some((p) => pathname === p);

    const goBack = useCallback(() => handleBack(parentPath), [handleBack, parentPath]);

    useEdgeSwipeBack({
        containerRef: scrollContainerRef,
        enabled: currentIsSubPage,
        onBack: goBack,
    });

    const scrollPaddingBottom = currentRoute?.scrollPaddingBottom ?? "pb-8";

    // Whether any bottom chrome renders. Drives the footer background so the
    // safe-area strip below it reads as part of the bar rather than a gap —
    // and stays transparent on subpages that have no bottom chrome at all.
    const hasFooterChrome = !!footerSlot || !!footerCtaLabel || !currentIsSubPage;

    return (
        <MobileFooterSlotContext.Provider value={{ setFooterSlot }}>
            {/* Shell — header, content and footer are real flex children, so the
                content region is exactly the leftover space. No height is ever
                guessed: the browser computes it, and the safe-area insets on the
                chrome are absorbed automatically. */}
            <div className="h-[100svh] flex flex-col bg-gradient-to-b from-slate-100 to-slate-200 select-none overflow-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
                <MobileHeader
                    currentPath={pathname}
                    currentTitle={currentTitle}
                    isSubPage={currentIsSubPage}
                    selectedStore={selectedStore}
                    showAccountIcon={showAccountIcon}
                    avatarUrl={avatarUrl}
                    onBack={goBack}
                    onStorePicker={() => setIsPickerOpen(true)}
                    onAccount={() => handleNavClick(url("/mobile/account"))}
                />

                {/* min-h-0 is required: a flex child defaults to min-height:auto and
                    would refuse to shrink below its content, pushing the footer
                    off-screen instead of scrolling internally. */}
                <main className="flex-1 min-h-0 relative">
                    {/* Only a slow navigation gets an indicator, and it sits over
                        the outgoing page rather than replacing it. */}
                    {showPendingBar && (
                        <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
                            <div className="nav-pending-bar bg-brand" />
                        </div>
                    )}
                    <div
                        ref={scrollContainerRef}
                        className={`absolute inset-0 overflow-y-auto p-4 ${scrollPaddingBottom}`}
                    >
                        {shellReady && children}
                    </div>
                </main>

                {/* Bottom chrome — one region. A page-provided slot (or the route's
                    CTA) stacks above the tab nav, and the safe-area inset is applied
                    once here rather than by each occupant. */}
                <footer className={`shrink-0 pb-[env(safe-area-inset-bottom)] ${hasFooterChrome ? "bg-white" : ""}`}>
                    {(footerSlot || footerCtaLabel) && (
                        footerSlot ?? (
                            <div className="bg-white border-t border-gray-200 p-4">
                                <button
                                    onClick={() => handleNavClick(`${pathname}/add`)}
                                    className="w-full bg-brand text-white py-4 rounded-xl font-semibold text-base active:scale-[0.98] transition-transform"
                                >
                                    {footerCtaLabel}
                                </button>
                            </div>
                        )
                    )}
                    {!currentIsSubPage && (
                        <MobileFooterNav
                            tabs={tabs}
                            currentPath={navPath}
                            onTabClick={handleNavClick}
                        />
                    )}
                </footer>

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
        </MobileFooterSlotContext.Provider>
    );
}
