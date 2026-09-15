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
import { RefreshCw } from "lucide-react";
import { MobileHeader } from "./MobileHeader";
import { MobileFooterNav } from "./MobileFooterNav";
import { FooterSlotContext } from "./FooterSlotContext";
import { ScrollContext } from "./ScrollContext";
import { useScrollRestoration } from "./useScrollRestoration";
import { useStandaloneViewportHeight } from "./useStandaloneViewportHeight";
import { isSubPage, type ResolveRoute, type Tab } from "./routes";
import { navProgress } from "./navProgress";

/** How far the indicator must travel, after resistance, for letting go to refresh. */
const PULL_THRESHOLD_PX = 64;
/** The indicator stops following the finger here. */
const PULL_MAX_PX = 96;
/** The indicator moves half as far as the finger, so the pull feels weighted. */
const PULL_RESISTANCE = 0.5;
/** Where the indicator rests, hidden above the content. Matches `.pull-indicator`. */
const PULL_REST_OFFSET_PX = 44;

/**
 * TEMPORARY — route prefetching is switched off while the owner lives with the
 * app without it. Set 2026-08-25. **Remove this constant and the guard below
 * once the experiment is settled**; leaving it is how a trial becomes the
 * accidental permanent behaviour.
 *
 * The case for trying it: every tab in both apps is a client component behind a
 * thin RSC shell, so a prefetch mostly warms the route's JS chunk, while costing
 * a full proxy run — an auth round trip and a live `users` read apiece. Neither
 * app sets `experimental.staleTimes`, so on the default a prefetched dynamic
 * route is stale on arrival and the tap refetches it regardless, which would
 * make the RSC half of the trade worth nothing at all.
 *
 * What it costs while off: a tab switch is one round trip instead of instant.
 * Navigation runs in a transition, so the previous screen stays up and the tab
 * lights immediately — it reads as latency, not as a blank.
 */
const PREFETCH_DISABLED = true;

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
    /** The same, for going up a level — what a form does once it has saved. */
    onBack?: (back: () => void) => void;
    /**
     * Refetch what is on screen, in place — never a reload. Runs when the user
     * pulls down past the threshold on a route marked `refreshable`. Supplied by
     * the app, because this package has no SWR dependency.
     */
    onRefresh?: () => Promise<unknown>;
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
    onBack,
    onRefresh,
}: MobileShellProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [isPending, startTransition] = useTransition();
    // Only drives the tab highlight, so a tap lights up immediately even though
    // the header and content deliberately wait for the new route to commit.
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    // The same destination, readable from callbacks without re-creating them.
    const pendingPathRef = useRef<string | null>(null);
    // The committed route, for the popstate listener, which is registered once.
    const pathnameRef = useRef(pathname);
    // A DOM node, not a stored ReactNode: pages portal into it, so the shell
    // never re-renders because of what a page put in its footer.
    const [footerSlotEl, setFooterSlotEl] = useState<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pullIndicatorRef = useRef<HTMLDivElement>(null);
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
            const destination = path.split("?")[0];
            // A second tap on a destination still loading is the same
            // navigation. Letting it through counted one history entry twice,
            // so header back later walked out of the app instead of up a level.
            if (destination === pendingPathRef.current) return;
            // Save while the outgoing page is still the one on screen, and
            // before the bar starts: saving reads scrollTop, and a read after a
            // write forces layout.
            saveScroll();
            navProgress.start();
            pendingPathRef.current = destination;
            setPendingPath(destination);
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
            const destination = path.split("?")[0];
            if (destination === pendingPathRef.current) return;
            saveScroll();
            navProgress.start();
            pendingPathRef.current = destination;
            setPendingPath(destination);
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
                // No transition: router.back() is history.back(), which returns
                // at once, so a transition around it always ended empty. The
                // popstate that follows is what navigates.
                navProgress.start();
                router.back();
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
            // The phone's back button never passes through navigate. The URL has
            // already changed when popstate fires, so this is one comparison —
            // and a popstate that keeps the path would start a bar nothing ends.
            if (window.location.pathname !== pathnameRef.current) navProgress.start();
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
        pendingPathRef.current = null;
        pathnameRef.current = pathname;
        navProgress.committed();
    }, [pathname]);

    // A push or replace can also settle without changing the path — a change to
    // the query string alone. Clearing here keeps that destination from
    // swallowing every later tap on it, and committing here keeps the bar from
    // crawling to its cap. A back navigation never enters a transition, so it
    // relies on the pathname effect above instead.
    useEffect(() => {
        if (isPending) return;
        pendingPathRef.current = null;
        navProgress.committed();
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
     *
     * The current route is skipped: warming the screen already on display is a
     * proxy run bought for nothing, and it was the single most expensive entry
     * in both apps' tables — every open landed on a route that then prefetched
     * itself.
     */
    useEffect(() => {
        if (PREFETCH_DISABLED) return;
        if (!ready || !prefetchPaths?.length) return;
        const targets = prefetchPaths.filter((path) => path !== pathname);
        if (!targets.length) return;
        const run = () => targets.forEach((path) => router.prefetch(path));
        // Safari has no requestIdleCallback. A timeout is not the same promise,
        // but it clears the current frame, which is the part that matters.
        const hasIdle = typeof window.requestIdleCallback === "function";
        const handle = hasIdle
            ? window.requestIdleCallback(run, { timeout: 2000 })
            : window.setTimeout(run, 500);
        return () => (hasIdle ? window.cancelIdleCallback(handle) : clearTimeout(handle));
        // Targets are static; re-running on every `prefetchPaths` identity would
        // refetch the same routes on each render. `pathname` is deliberately not
        // a dependency either: this warms the other tabs once, when the app comes
        // up, and must not re-run on every navigation.
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

    useEffect(() => {
        onBack?.(goBack);
    }, [onBack, goBack]);

    // Read by the pull gesture, which attaches once rather than on every
    // navigation, so it needs the current values from somewhere stable.
    const refreshable = route?.refreshable ?? false;
    const pullRef = useRef({ refreshable, onRefresh });
    useEffect(() => {
        pullRef.current = { refreshable, onRefresh };
    }, [refreshable, onRefresh]);

    /**
     * Pull to refresh.
     *
     * Passive listeners, so the browser never waits on them to scroll, and style
     * writes batched to one per frame, so the gesture re-renders nothing. A tap
     * writes nothing at all: styles are touched only once a movement has been
     * judged a pull. Armed only at the very top of a refreshable route, and not
     * while a navigation is in flight.
     */
    useEffect(() => {
        const scroller = scrollContainerRef.current;
        const indicator = pullIndicatorRef.current;
        if (!scroller || !indicator) return;
        const icon = indicator.firstElementChild as SVGElement | null;

        let armed = false;
        let pulling = false;
        let startX = 0;
        let startY = 0;
        let distance = 0;
        let frame = 0;

        const paint = () => {
            frame = 0;
            const progress = Math.min(distance / PULL_THRESHOLD_PX, 1);
            indicator.style.transform = `translate3d(-50%, ${distance - PULL_REST_OFFSET_PX}px, 0)`;
            indicator.style.opacity = String(progress);
            indicator.dataset.ready = String(distance >= PULL_THRESHOLD_PX);
            if (icon) icon.style.transform = `rotate(${progress * 270}deg)`;
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(paint);
        };

        const onTouchStart = (event: TouchEvent) => {
            // Cheapest checks first: scrollTop is a layout read, and it must not
            // run while a navigation is committing.
            armed =
                event.touches.length === 1 &&
                pullRef.current.refreshable &&
                !navProgress.isBusy() &&
                scroller.scrollTop <= 0;
            pulling = false;
            if (!armed) return;
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
        };

        const onTouchMove = (event: TouchEvent) => {
            if (!armed) return;
            const dx = event.touches[0].clientX - startX;
            const dy = event.touches[0].clientY - startY;
            if (!pulling) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                // The first real movement decides. Sideways belongs to a
                // horizontal scroller, upwards to ordinary scrolling.
                if (Math.abs(dx) > Math.abs(dy) || dy < 0) {
                    armed = false;
                    return;
                }
                pulling = true;
                indicator.style.transition = "none";
            }
            distance = Math.min(Math.max(dy, 0) * PULL_RESISTANCE, PULL_MAX_PX);
            schedule();
        };

        const release = (refresh: boolean) => {
            const wasPulling = armed && pulling;
            armed = false;
            pulling = false;
            if (!wasPulling) return;
            const onRefreshNow = pullRef.current.onRefresh;
            const fire = refresh && distance >= PULL_THRESHOLD_PX && onRefreshNow;
            distance = 0;
            indicator.style.transition = "transform 200ms ease, opacity 200ms ease";
            schedule();
            // Deferred a microtask so a refresh that throws cannot throw here.
            if (fire) navProgress.run(Promise.resolve().then(onRefreshNow));
        };
        const onTouchEnd = () => release(true);
        const onTouchCancel = () => release(false);

        scroller.addEventListener("touchstart", onTouchStart, { passive: true });
        scroller.addEventListener("touchmove", onTouchMove, { passive: true });
        scroller.addEventListener("touchend", onTouchEnd, { passive: true });
        scroller.addEventListener("touchcancel", onTouchCancel, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            scroller.removeEventListener("touchstart", onTouchStart);
            scroller.removeEventListener("touchmove", onTouchMove);
            scroller.removeEventListener("touchend", onTouchEnd);
            scroller.removeEventListener("touchcancel", onTouchCancel);
        };
    }, []);

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
            <div className="h-[100svh] [@media(display-mode:standalone)]:h-[var(--shell-height,100dvh)] flex flex-col bg-gradient-to-b from-slate-100 to-slate-200 overflow-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
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
                {/* overflow-hidden clips the pull indicator, so it emerges from the
                    top of the content rather than over the header. */}
                <main className="flex-1 min-h-0 relative overflow-hidden">
                    {/* Always mounted and never re-rendered for progress:
                        navProgress drives it through data-state. It sits over
                        the outgoing page rather than replacing it. */}
                    <div ref={navProgress.attach} className="nav-progress" aria-hidden>
                        <span className="crawl" />
                        <span className="fill" />
                    </div>
                    <div
                        ref={pullIndicatorRef}
                        className="pull-indicator flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-md data-[ready=true]:text-brand"
                        aria-hidden
                    >
                        <RefreshCw size={18} strokeWidth={2.5} />
                    </div>
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
