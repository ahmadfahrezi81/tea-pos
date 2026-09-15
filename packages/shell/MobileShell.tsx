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
import { navProgress } from "./navProgress";

/** Pull distance, after resistance, at which letting go refreshes. */
const PULL_THRESHOLD_PX = 64;
/** However far the finger goes, the content stops here. */
const PULL_MAX_PX = 120;
/** Shapes the resistance curve. Smaller is stiffer. */
const PULL_STIFFNESS_PX = 160;
/** The gap held open under the header while a refresh runs. */
const PULL_HOLD_PX = 56;
/** A refresh holds the gap at least this long, so a fast one never just blinks. */
const PULL_MIN_SPIN_MS = 400;
/** How long the gap takes to close. */
const PULL_CLOSE_MS = 280;
/** How long the spinner takes to fade after a refresh. Matches `.pull-spinner[data-state="leaving"]`. */
const PULL_SPINNER_FADE_MS = 150;

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
    const pullSpinnerRef = useRef<HTMLDivElement>(null);
    // Closes an open pull gap at once. Set by the pull gesture; called when a
    // route commits, because the content the gap was holding open is gone.
    const closePullRef = useRef<(() => void) | null>(null);
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
        closePullRef.current?.();
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
     * A fresh open is a navigation too. When `ready` lets the first screen mount,
     * its requests start in its own layout effects — before any effect here runs —
     * and `track` only counts while the bar is running. So the bar starts at shell
     * mount, crawling unseen under the boot loader, and `ready` stands in for the
     * commit.
     *
     * Declared after the two effects above on purpose: both call `committed()` on
     * mount, and if this ran first they would land the bar before anything had
     * mounted.
     */
    useEffect(() => {
        navProgress.start();
    }, []);

    useEffect(() => {
        if (ready) navProgress.committed();
    }, [ready]);

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
     * Pull to refresh, the YouTube way (task 065, step 7).
     *
     * Pulling slides the scroll container down, opening a gap under the header
     * with a spinner in it. Let go past the threshold and the gap holds open while
     * the app refetches, then closes.
     *
     * Only the finger-following write is JavaScript, at most once a frame, on a
     * screen at rest. Holding, springing, closing and spinning are CSS. Listeners
     * are passive, nothing here is React state, and a tap writes nothing. At rest
     * the container's transform is cleared outright — not left at zero — so
     * fixed-position elements inside a page behave normally between pulls.
     */
    useEffect(() => {
        const scroller = scrollContainerRef.current;
        const spinner = pullSpinnerRef.current;
        const arc = spinner?.querySelector("circle");
        const dial = arc?.ownerSVGElement;
        const arrowhead = spinner?.querySelector(".pull-arrowhead");
        if (!scroller || !spinner || !arc || !dial || !arrowhead) return;

        let phase: "idle" | "pulling" | "holding" | "closing" = "idle";
        let armed = false;
        let ready = false;
        let startX = 0;
        let startY = 0;
        let distance = 0;
        let frame = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        // Bumped whenever a gap is abandoned, so a refresh that settles later
        // cannot close a gap that is no longer its own.
        let token = 0;

        const paint = () => {
            frame = 0;
            if (phase !== "pulling") return;
            const progress = Math.min(distance / PULL_THRESHOLD_PX, 1);
            scroller.style.transform = `translate3d(0, ${distance}px, 0)`;
            spinner.style.opacity = String(progress);
            spinner.style.transform = `scale(${ready ? 1.1 : 0.6 + progress * 0.4})`;
            dial.style.transform = `rotate(${-90 + progress * 180}deg)`;
            // The arrowhead rides the growing end of the arc, like a refresh
            // icon: at a full arc — three quarters of the circle — that is 270°.
            arrowhead.setAttribute("transform", `rotate(${progress * 270} 12 12)`);
            arc.style.strokeDashoffset = String(100 - progress * 75);
        };

        // Back to an ordinary element.
        const clear = () => {
            phase = "idle";
            scroller.style.transform = "";
            scroller.style.transition = "";
            scroller.style.willChange = "";
        };

        const slideTo = (y: number, easing: string, ms: number) => {
            scroller.style.transition = `transform ${ms}ms ${easing}`;
            scroller.style.transform = `translate3d(0, ${y}px, 0)`;
        };

        // `keepSpinning`: after a refresh the spinner goes on turning, at full
        // size, while it fades out quickly. Dropping straight to no state stopped
        // the spin dead and snapped the arc back to its starting angle — a
        // visible flip — then shrank it.
        const hideSpinner = (keepSpinning = false) => {
            spinner.dataset.state = keepSpinning ? "leaving" : "";
            spinner.style.opacity = "";
            spinner.style.transform = "";
            dial.style.transform = "";
        };

        const slideClosed = () => {
            // Any spinner is fully faded by now, so its spin can stop unseen.
            spinner.dataset.state = "";
            slideTo(0, "cubic-bezier(0.2, 0, 0, 1)", PULL_CLOSE_MS);
            // A timer rather than transitionend: a slide from 0 to 0 never fires one.
            timer = setTimeout(clear, PULL_CLOSE_MS + 20);
        };

        // After a refresh the spinner fades out completely before the content
        // rises. Together, the content reads as swallowing a spinner still on
        // screen. A cancelled pull closes at once: its spinner was never whole.
        const close = (afterSpinner = false) => {
            clearTimeout(timer);
            phase = "closing";
            hideSpinner(afterSpinner);
            if (afterSpinner) timer = setTimeout(slideClosed, PULL_SPINNER_FADE_MS);
            else slideClosed();
        };

        closePullRef.current = () => {
            if (phase === "idle") return;
            token += 1;
            armed = false;
            cancelAnimationFrame(frame);
            frame = 0;
            clearTimeout(timer);
            hideSpinner();
            clear();
        };

        const onTouchStart = (event: TouchEvent) => {
            // Cheapest checks first: scrollTop is a layout read, and it must not
            // run while a navigation is committing.
            armed =
                phase === "idle" &&
                event.touches.length === 1 &&
                pullRef.current.refreshable &&
                !navProgress.isBusy() &&
                scroller.scrollTop <= 0;
            if (!armed) return;
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
        };

        const onTouchMove = (event: TouchEvent) => {
            if (!armed) return;
            const dx = event.touches[0].clientX - startX;
            const dy = event.touches[0].clientY - startY;
            if (phase !== "pulling") {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                // The first real movement decides. Sideways belongs to a
                // horizontal scroller, upwards to ordinary scrolling.
                if (Math.abs(dx) > Math.abs(dy) || dy < 0) {
                    armed = false;
                    return;
                }
                phase = "pulling";
                ready = false;
                spinner.dataset.state = "pulling";
                scroller.style.transition = "none";
                scroller.style.willChange = "transform";
            }
            // Resistance that grows with distance: easy at first, stiffer the
            // further it goes, and never past the cap.
            distance = PULL_MAX_PX * (1 - Math.exp(-Math.max(dy, 0) / PULL_STIFFNESS_PX));
            const nowReady = distance >= PULL_THRESHOLD_PX;
            // One short tick on crossing forwards, where the platform has a
            // vibration API. iOS does not; the pop in scale is the cue there.
            if (nowReady && !ready && "vibrate" in navigator) navigator.vibrate(10);
            ready = nowReady;
            if (!frame) frame = requestAnimationFrame(paint);
        };

        const release = (refresh: boolean) => {
            if (!armed) return;
            armed = false;
            if (phase !== "pulling") return;
            cancelAnimationFrame(frame);
            frame = 0;
            const onRefreshNow = pullRef.current.onRefresh;
            if (!refresh || !ready || !onRefreshNow) {
                close();
                return;
            }

            phase = "holding";
            const mine = ++token;
            const startedAt = performance.now();
            spinner.style.opacity = "";
            spinner.style.transform = "";
            dial.style.transform = "";
            arc.style.strokeDashoffset = "25";
            spinner.dataset.state = "spinning";
            const spring = window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "ease-out"
                : "cubic-bezier(0.34, 1.4, 0.64, 1)";
            slideTo(PULL_HOLD_PX, spring, 360);

            // Deferred a microtask, so a refresh that throws cannot throw here. A
            // failed one leaves the old data on screen, as the idle refresh does.
            const refreshing = Promise.resolve().then(onRefreshNow).catch(() => {});
            // The shell's loading bar runs as well, so a pull looks like every
            // other refresh — the idle sheet's, or a navigation's.
            navProgress.run(refreshing);
            refreshing.then(() => {
                const wait = PULL_MIN_SPIN_MS - (performance.now() - startedAt);
                timer = setTimeout(() => {
                    if (mine === token) close(true);
                }, Math.max(0, wait));
            });
        };
        const onTouchEnd = () => release(true);
        const onTouchCancel = () => release(false);

        scroller.addEventListener("touchstart", onTouchStart, { passive: true });
        scroller.addEventListener("touchmove", onTouchMove, { passive: true });
        scroller.addEventListener("touchend", onTouchEnd, { passive: true });
        scroller.addEventListener("touchcancel", onTouchCancel, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timer);
            closePullRef.current = null;
            scroller.removeEventListener("touchstart", onTouchStart);
            scroller.removeEventListener("touchmove", onTouchMove);
            scroller.removeEventListener("touchend", onTouchEnd);
            scroller.removeEventListener("touchcancel", onTouchCancel);
            hideSpinner();
            clear();
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
                {/* overflow-hidden clips the content while a pull holds it pushed
                    down, so its bottom slides under the footer rather than over it. */}
                <main className="flex-1 min-h-0 relative overflow-hidden">
                    {/* Always mounted and never re-rendered for progress:
                        navProgress drives it through data-state. It sits over
                        the outgoing page rather than replacing it. */}
                    <div ref={navProgress.attach} className="nav-progress" aria-hidden>
                        <span className="crawl" />
                        <span className="fill" />
                    </div>
                    {/* Earlier in the document than the scroll container, which
                        paints over it: sliding the content down is what uncovers
                        it. Nothing here is React state; the gesture drives it. */}
                    <div ref={pullSpinnerRef} className="pull-spinner text-brand" aria-hidden>
                        <svg viewBox="0 0 24 24" width="24" height="24" overflow="visible">
                            <circle
                                cx="12"
                                cy="12"
                                r="9"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                pathLength={100}
                                strokeDasharray={100}
                                strokeDashoffset={100}
                            />
                            {/* Drawn at the arc's starting point, three o'clock
                                before the dial's -90° turn, pointing along the
                                stroke; the gesture rotates it to the arc's end. */}
                            <path
                                className="pull-arrowhead"
                                d="M15.8 12 L26.2 12 L21 18 Z"
                                fill="currentColor"
                                transform="rotate(0 12 12)"
                            />
                        </svg>
                    </div>
                    <div
                        ref={scrollContainerRef}
                        // No native bounce where a pull moves the content itself:
                        // on iOS the two would move it twice.
                        className={`absolute inset-0 overflow-y-auto p-4 ${scrollPaddingBottom} ${refreshable ? "overscroll-y-none" : ""}`}
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
