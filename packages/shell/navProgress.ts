/**
 * The navigation progress bar, kept outside React. See tasks 065, 070.
 *
 *     idle → loading → landing → done → idle
 *
 * - **loading** — tap until the route commits (or a refresh settles).
 * - **landing** — committed; waiting for first-load requests and for the page
 *   to actually be on screen.
 * - **done** — fill, one pulse, fade.
 *
 * Writes `data-state` on one always-mounted node and drives its CSS animations
 * directly, so the shell never re-renders for progress. Every wait is capped.
 */

type State = "idle" | "loading" | "landing" | "done";

const LOADING_CAP_MS = 15_000;
const LANDING_CAP_MS = 4_000;
/** Reduced motion has no animationend to end `done`. */
const DONE_CAP_MS = 1_500;
/** A hidden tab never paints; stop waiting for frames after this. */
const PAINT_WAIT_MAX_MS = 400;
/** Unbroken frames needed after a commit before the bar ends. */
const QUIET_MS = 200;
/** A frame gap longer than this means the browser drew nothing. */
const FRAME_GAP_MS = 100;

let bar: HTMLElement | null = null;
let state: State = "idle";
/** Landing and done caps — sequential, so one slot. */
let cap: ReturnType<typeof setTimeout> | undefined;
/** Loading cap. Its own slot so later navigations can't keep resetting it. */
let watchdog: ReturnType<typeof setTimeout> | undefined;
let settleFrame = 0;
let cancelPaint = () => {};
/** First-load requests in flight, per run. */
let pending = 0;
/** Bumped per run so a late request can't count against the next one. */
let generation = 0;

const isRunning = () => state === "loading" || state === "landing";

function cancelWaits() {
    cancelAnimationFrame(settleFrame);
    cancelPaint();
}

/**
 * Runs `fn` once a frame has actually painted — two nested frames prove it — or
 * after `PAINT_WAIT_MAX_MS` in a hidden tab. Returns a cancel.
 */
export function whenPainted(fn: () => void): () => void {
    let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(done);
    });
    const timer = setTimeout(done, PAINT_WAIT_MAX_MS);
    function cancel() {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
    }
    function done() {
        cancel();
        fn();
    }
    return cancel;
}

function setState(next: State) {
    if (state === next) return;
    const previous = state;
    state = next;
    if (!bar) return;
    bar.dataset.state = next;
    drive(previous, next);
    if (isRunning()) bar.parentElement?.setAttribute("aria-busy", "true");
    else bar.parentElement?.removeAttribute("aria-busy");
}

function armCap(ms: number, onExpire: () => void) {
    clearTimeout(cap);
    cap = setTimeout(onExpire, ms);
}

/** The bar's animations. Empty under reduced motion; callers skip missing ones. */
function animations() {
    const all = bar?.getAnimations({ subtree: true }) ?? [];
    const named = (name: string) => all.find((a) => (a as CSSAnimation).animationName === name);
    return {
        crawl: named("nav-crawl"),
        sheen: named("nav-sheen"),
        fill: named("nav-fill"),
        settle: named("nav-settle"),
    };
}

/**
 * Plays and parks the animations for a state change. Two rules from task 070:
 * never create an animation mid-navigation — on a slow phone it misses the
 * compositor and freezes — and let JavaScript be the only controller, since
 * mixing it with CSS play-state made WebKit replay finished animations.
 */
function drive(previous: State, next: State) {
    const { crawl, sheen, fill, settle } = animations();
    const fresh = next === "loading" && (previous === "idle" || previous === "done");
    if (next === "idle" || fresh) {
        // Parked at zero: off-screen, and drawing nothing.
        for (const animation of [crawl, sheen, fill, settle]) {
            if (!animation) continue;
            animation.pause();
            animation.currentTime = 0;
        }
    }
    if (fresh) {
        crawl?.play();
        sheen?.play();
    } else if (next === "done") {
        sheen?.pause();
        fill?.play();
        settle?.play();
    }
}

/** Ends the run once a frame has painted, so the ending is seen. */
function finish() {
    cancelWaits();
    cancelPaint = whenPainted(() => {
        clearTimeout(watchdog);
        setState("done");
        armCap(DONE_CAP_MS, () => setState("idle"));
    });
}

/** Enters loading. A running bar keeps its crawl; a settled one restarts. */
function begin() {
    cancelWaits();
    clearTimeout(cap); // the old run's cap must not fire into this one
    generation += 1;
    pending = 0;
    if (!isRunning()) {
        clearTimeout(watchdog);
        watchdog = setTimeout(() => {
            if (process.env.NODE_ENV !== "production") {
                console.warn("[navProgress] no commit within 15s — a navigation path is missing its signal");
            }
            finish();
        }, LOADING_CAP_MS);
    }
    setState("loading");
}

/**
 * Finishes after `QUIET_MS` of unbroken frames — once the page is on screen, not
 * merely committed. A slow phone can draw nothing for a second after a commit;
 * that gap resets the streak, so the ending lands after the page appears.
 */
function settleWhenQuiet() {
    cancelAnimationFrame(settleFrame);
    let streakFrom = 0;
    let previous = -Infinity;
    const tick = (now: number) => {
        if (state !== "landing" || pending > 0) return; // `track` restarts it
        if (now - previous > FRAME_GAP_MS) streakFrom = now;
        previous = now;
        if (now - streakFrom >= QUIET_MS) finish();
        else settleFrame = requestAnimationFrame(tick);
    };
    settleFrame = requestAnimationFrame(tick);
}

function onAnimationEnd(event: AnimationEvent) {
    if (event.animationName !== "nav-settle" || state !== "done") return;
    clearTimeout(cap);
    setState("idle");
}

export const navProgress = {
    /** Ref callback for the bar. Stable, so React attaches it once. */
    attach(node: HTMLElement | null) {
        if (!node) return;
        bar = node;
        node.dataset.state = state;
        if (isRunning()) drive("idle", "loading"); // mounted mid-run
        node.addEventListener("animationend", onAnimationEnd);
        return () => {
            node.removeEventListener("animationend", onAnimationEnd);
            if (bar === node) bar = null;
        };
    },

    /** A navigation has begun. Call before the work — before `router.push`. */
    start: begin,

    /**
     * Starts the bar and runs `then` once it has painted. For `router.back()`,
     * which takes the thread at once; without the wait a slow phone never shows
     * the bar on the page being left. Not cancellable — `then` must happen.
     */
    startThen(then: () => void) {
        begin();
        whenPainted(then);
    },

    /** The route has committed. Call from the shell's `pathname` effect. */
    committed() {
        if (state !== "loading") return;
        setState("landing");
        armCap(LANDING_CAP_MS, finish);
        settleWhenQuiet();
    },

    /**
     * Holds the bar in landing until `promise` settles — for a page's first-load
     * requests, via each app's SWR middleware. Ignored at rest, so polling never
     * starts the bar. Returns the `finally` chain so rejections still reach the
     * caller.
     */
    track<T>(promise: Promise<T>): Promise<T> {
        if (!isRunning()) return promise;
        const counted = generation;
        pending += 1;
        return promise.finally(() => {
            if (counted !== generation) return;
            pending -= 1;
            if (state === "landing" && pending === 0) settleWhenQuiet();
        });
    },

    /**
     * Runs the bar for `promise` alone — a pull to refresh. A navigation started
     * meanwhile takes the bar over, and this then settles without touching it.
     */
    run(promise: Promise<unknown>) {
        begin();
        const counted = generation;
        const settle = () => {
            if (counted === generation && state === "loading") finish();
        };
        promise.then(settle, settle);
    },

    /** A navigation or refresh is in flight. A finishing bar does not count. */
    isBusy: isRunning,
};
