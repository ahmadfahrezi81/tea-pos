"use client";
import {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { MobileHeader } from "./MobileHeader";
import { MobileFooterNav } from "./MobileFooterNav";
import { FooterSlotContext } from "./FooterSlotContext";
import { ScrollContext } from "./ScrollContext";
import { useScrollRestoration } from "./useScrollRestoration";
import { useStandaloneViewportHeight } from "./useStandaloneViewportHeight";
import { isSubPage, type ResolveRoute, type Tab } from "./routes";

/** How long a navigation may take before it earns a loading indicator. */
const PENDING_BAR_DELAY_MS = 200;

export interface MobileShellProps {
    children: ReactNode;

    // ── Route data — owned per app ────────────────────────────────────────────
    resolveRoute: ResolveRoute;
    /** Absolute paths of the root tabs, already tenant-prefixed. */
    rootTabPaths: string[];
    tabs: Tab[];
    /** Where "back" lands from a route whose parent is `null`. */
    homePath: string;
    /** Turns a route suffix from the table into an absolute path. */
    toPath: (suffix: string) => string;
    /** Looks up a `titleKey`. Apps without i18n can pass `(k) => k`. */
    t: (key: string) => string;

    // ── Chrome — supplied by the app, never inferred here ─────────────────────
    /** Rendered beside the title on routes that set `titleAccessory`. */
    titleAccessory?: ReactNode;
    avatarUrl: string | null;
    onAccount: () => void;
    /** Always-mounted extras, e.g. a picker drawer. */
    extras?: ReactNode;
    /** Covers the whole shell — loaders, maintenance, auth errors. */
    overlay?: ReactNode;

    /** False until the app's own bootstrap data has arrived; gates the content. */
    ready: boolean;
    /** Routes the app's table marked `prefetch`. Warmed once the shell is up. */
    prefetchPaths?: string[];
    /** Called on every navigation, so apps can register a global navigate fn. */
    onNavigate?: (navigate: (path: string) => void) => void;
    /** The same, for the replacing variant — a spent screen leaving history. */
    onReplace?: (replace: (path: string) => void) => void;
}

/**
 * The mobile app shell: header, content region, bottom chrome.
 *
 * All three are real flex children, so the content region is exactly the
 * leftover space. No height is ever guessed — the browser computes it, and the
 * safe-area insets on the chrome are absorbed automatically.
 */
export function MobileShell({
    children,
    resolveRoute,
    rootTabPaths,
    tabs,
    homePath,
    toPath,
    t,
    titleAccessory,
    avatarUrl,
    onAccount,
    extras,
    overlay,
    ready,
    prefetchPaths,
    onNavigate,
    onReplace,
}: MobileShellProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [isPending, startTransition] = useTransition();
    // Only drives the tab highlight, so a tap lights up immediately even though
    // the header and content deliberately wait for the new route to commit.
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    // A DOM node, not a stored ReactNode: pages portal into it, so the shell
    // never re-renders because of what a page put in its footer.
    const [footerSlotEl, setFooterSlotEl] = useState<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollContext = useMemo(() => ({ scrollRef: scrollContainerRef }), []);
    const lastRootTabRef = useRef<string>(homePath);
    /** History entries this shell pushed, so back can unwind instead of push. */
    const pushDepthRef = useRef(0);

    useStandaloneViewportHeight();

    const saveScroll = useScrollRestoration({
        containerRef: scrollContainerRef,
        pathname,
        enabled: resolveRoute(pathname)?.preserveScroll ?? false,
        ready: ready && !isPending,
    });

    const navigate = useCallback(
        (path: string) => {
            // Tapping the tab you are already on returns to the top, the way
            // native tab bars do. No timing window, so nothing to misfire.
            if (path === pathname) {
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
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
     * Swaps the current history entry for another instead of stacking one on
     * top. Used where returning to the outgoing screen would be wrong.
     */
    const replaceWith = useCallback(
        (path: string) => {
            if (path === pathname) return;
            saveScroll();
            setPendingPath(path.split("?")[0]);
            startTransition(() => {
                router.replace(path);
            });
        },
        [pathname, router, saveScroll],
    );

    /**
     * Going back unwinds history rather than pushing another entry. Pushing the
     * parent instead would leave [More, Pay, More] behind, so the system back
     * button would walk *into* the page the user just left.
     *
     * When there is nothing of ours to unwind, back *replaces* with the parent
     * rather than pushing it. The depth counter lives in memory while history
     * outlives the document, so any reload — the update sheet's, the idle
     * sheet's, a manual one — leaves the counter at zero on a page with real
     * entries behind it. Pushing there was the bug: each header-back added an
     * entry, the system back button popped straight back to where it started,
     * and the two took turns forever without ever reaching a root tab.
     * Replacing walks up the route tree in place, so history can only shrink.
     */
    const goBackTo = useCallback(
        (fallbackPath: string) => {
            saveScroll();
            if (pushDepthRef.current > 0) {
                startTransition(() => {
                    router.back();
                });
                return;
            }
            replaceWith(fallbackPath);
        },
        [router, saveScroll, replaceWith],
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
        onNavigate?.(navigate);
    }, [onNavigate, navigate]);

    useEffect(() => {
        onReplace?.(replaceWith);
    }, [onReplace, replaceWith]);

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

    /**
     * Only once the app is up.
     *
     * Every prefetch is a full RSC request that re-runs the proxy's auth check
     * and re-renders this layout on the server. Firing them at mount put ten of
     * those on the wire in the same instant the app was fetching the data it
     * needs to render at all — buying the second navigation by taxing the first,
     * which is exactly backwards.
     *
     * Waiting on `ready` is what makes it cheap, and an idle callback keeps it
     * off the commit that finally reveals the app. What to warm is the app's
     * call, declared per route in its table.
     */
    useEffect(() => {
        if (!ready || !prefetchPaths?.length) return;
        const run = () => prefetchPaths.forEach((path) => router.prefetch(path));
        // Safari has no requestIdleCallback. A timeout is not the same promise,
        // but it clears the current frame, which is the part that matters.
        const hasIdle = typeof window.requestIdleCallback === "function";
        const handle = hasIdle
            ? window.requestIdleCallback(run, { timeout: 2000 })
            : window.setTimeout(run, 500);
        return () => (hasIdle ? window.cancelIdleCallback(handle) : clearTimeout(handle));
        // Targets are static; re-running on every `prefetchPaths` identity would
        // refetch the same routes on each render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready]);

    // The header and content both follow `pathname`, the committed route, so the
    // title never jumps ahead of the page it labels. Only the tab bar runs ahead
    // via `navPath`, because a tap has to acknowledge itself immediately.
    const navPath = pendingPath ?? pathname;

    const resolvedTabs = tabs.map((tab) =>
        tab.variant && navPath.includes(tab.variant.pathContains)
            ? { ...tab, label: tab.variant.label, icon: tab.variant.icon }
            : tab,
    );

    const route = resolveRoute(pathname);
    const title = route ? t(route.titleKey) : "";
    const currentIsSubPage = isSubPage(route);
    const footerCtaLabel = route?.footerCtaKey ? t(route.footerCtaKey) : undefined;
    const showAccountIcon = rootTabPaths.includes(pathname);

    const parentSuffix = route?.parent;
    const parentPath = !parentSuffix
        ? homePath
        : parentSuffix === "lastRootTab"
          ? lastRootTabRef.current
          : toPath(parentSuffix);

    const goBack = useCallback(() => goBackTo(parentPath), [goBackTo, parentPath]);

    // Defaults to nothing, so the p-4 below applies evenly on all four sides.
    // Routes opt out (pb-0 for full-bleed content) or add room as they need it.
    const scrollPaddingBottom = route?.scrollPaddingBottom ?? "";

    return (
        <ScrollContext.Provider value={scrollContext}>
        <FooterSlotContext.Provider value={footerSlotEl}>
            {/* svh in a browser tab: measured against the largest URL-bar state,
                so the shell does not resize as the bar hides and shows.

                Installed, --shell-height takes over — see
                useStandaloneViewportHeight for why the CSS units cannot be
                trusted to stay fresh there. dvh is the fallback for the first
                paint, before the hook has measured anything. */}
            <div className="h-[100svh] [@media(display-mode:standalone)]:h-[var(--shell-height,100dvh)] flex flex-col bg-gradient-to-b from-slate-100 to-slate-200 select-none overflow-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
                <MobileHeader
                    route={route}
                    title={title}
                    isSubPage={currentIsSubPage}
                    titleAccessory={titleAccessory}
                    avatarUrl={avatarUrl}
                    showAccountIcon={showAccountIcon}
                    onBack={goBack}
                    onAccount={onAccount}
                    onHeaderAction={() =>
                        navigate(`${pathname}/${route?.headerAction === "edit" ? "edit" : "add"}`)
                    }
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
                        {ready && children}
                    </div>
                </main>

                {/* Bottom chrome — one region. A page-provided slot (or the route's
                    CTA) stacks above the tab nav, and the safe-area inset is applied
                    once here rather than by each occupant.

                    The background turns white only when the region actually holds
                    something: the tab nav, the route CTA, or an occupied slot all
                    make a non-empty child, while a subpage with no chrome leaves
                    only the empty slot div — where a white safe-area strip would
                    read as an unexplained band above the home indicator.

                    Two selectors, because :not(:empty) alone misses the slot: the
                    portal target commits empty and fills later, and :has() does
                    not reliably re-run on that. FooterSlot marks itself
                    .is-occupied instead. The :not(:empty) arm still covers the
                    nav and the CTA, which are non-empty from the first paint. */}
                <footer className="shrink-0 pb-[env(safe-area-inset-bottom)] [&:has(>:not(:empty))]:bg-white [&:has(>.is-occupied)]:bg-white">
                    <div ref={setFooterSlotEl} />
                    {footerCtaLabel && (
                        <div className="bg-white border-t border-gray-200 p-4">
                            <button
                                onClick={() => navigate(`${pathname}/add`)}
                                className="w-full bg-brand text-white py-4 rounded-xl font-semibold text-base active:scale-[0.98] transition-transform"
                            >
                                {footerCtaLabel}
                            </button>
                        </div>
                    )}
                    {!currentIsSubPage && (
                        <MobileFooterNav
                            tabs={resolvedTabs}
                            currentPath={navPath}
                            onTabClick={navigate}
                        />
                    )}
                </footer>

                {extras}
            </div>

            {overlay}
        </FooterSlotContext.Provider>
        </ScrollContext.Provider>
    );
}
