/**
 * The navigation progress bar's state, kept outside React. See task 065.
 *
 * The bar is on screen exactly when the main thread is busiest, so nothing about
 * it may add work there. React state would re-render the shell — header and tab
 * bar — on every change, in the middle of a navigation. Instead this module
 * writes one `data-state` attribute on an always-mounted node, a handful of
 * times per navigation, and `nav-progress.css` does all of the motion on the
 * compositor.
 *
 *     idle → loading → landing → done → idle
 *
 * - **loading** — from the tap until the route commits.
 * - **landing** — the route has committed and the requests its page started on
 *   first load are still in flight. Each app counts them with `track`.
 * - **done** — fill, one pulse, fade. Ends on `nav-settle`'s animationend.
 *
 * Nothing here reads layout. Every wait is capped, so a missed signal can never
 * leave the bar running.
 */

type State = "idle" | "loading" | "landing" | "done";

/** A route that has not committed by now is not going to; finish rather than crawl forever. */
const LOADING_CAP_MS = 15_000;
/** The page has been on screen this long; its skeletons say the rest. */
const LANDING_CAP_MS = 4_000;
/**
 * `done` normally ends on animationend, but reduced motion has no animation and
 * so no event. Without this the bar would sit in `done` for good.
 */
const DONE_CAP_MS = 1_500;

let bar: HTMLElement | null = null;
let state: State = "idle";
let cap: ReturnType<typeof setTimeout> | undefined;
let settleFrame = 0;
/**
 * Bumped by every navigation. A request remembers the generation it was counted
 * in, so one that outlives its navigation cannot decrement the next one's count.
 */
let generation = 0;
/** First-load requests in flight for the current generation. */
let pending = 0;

function setState(next: State) {
    state = next;
    if (!bar) return;
    bar.dataset.state = next;
    // The bar sits directly inside the shell's <main>, which is what is busy.
    if (next === "loading" || next === "landing") {
        bar.parentElement?.setAttribute("aria-busy", "true");
    } else {
        bar.parentElement?.removeAttribute("aria-busy");
    }
}

function armCap(ms: number, onExpire: () => void) {
    clearTimeout(cap);
    cap = setTimeout(onExpire, ms);
}

function finish() {
    cancelAnimationFrame(settleFrame);
    setState("done");
    armCap(DONE_CAP_MS, () => setState("idle"));
}

/**
 * Confirmed a frame later rather than at once. Some pages start a request only
 * once another has answered, and that second request begins in the re-render the
 * first one causes — before the next frame. Waiting one frame lets it be counted
 * instead of finishing the bar in the gap between the two.
 */
function settleNextFrame() {
    cancelAnimationFrame(settleFrame);
    settleFrame = requestAnimationFrame(() => {
        if (state === "landing" && pending === 0) finish();
    });
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
        node.addEventListener("animationend", onAnimationEnd);
        return () => {
            node.removeEventListener("animationend", onAnimationEnd);
            if (bar === node) bar = null;
        };
    },

    /**
     * A navigation has begun. Call it before the work starts — before
     * `router.push` — so the bar has painted and handed its animation to the
     * compositor by the time the main thread blocks.
     *
     * A navigation that interrupts one still in progress keeps the crawl going
     * rather than snapping back, which reads smoother. One that follows a
     * finished bar restarts it from zero.
     */
    start() {
        cancelAnimationFrame(settleFrame);
        generation += 1;
        pending = 0;
        if (bar && (state === "idle" || state === "done")) {
            bar.dataset.run = bar.dataset.run === "b" ? "a" : "b";
        }
        setState("loading");
        armCap(LOADING_CAP_MS, () => {
            if (process.env.NODE_ENV !== "production") {
                console.warn("[navProgress] no commit within 15s — a navigation path is missing its signal");
            }
            finish();
        });
    },

    /** The route has committed. Call from the shell's `pathname` effect. */
    committed() {
        if (state !== "loading") return;
        setState("landing");
        armCap(LANDING_CAP_MS, finish);
        if (pending === 0) settleNextFrame();
    },

    /**
     * Holds the bar in landing until `promise` settles. For requests a page makes
     * on its first load; each app calls it from an SWR middleware.
     *
     * Only counted while a navigation is in progress, so background polling and
     * revalidation never start or extend the bar on a screen at rest.
     *
     * Returns the `finally` chain rather than the original promise, so the caller
     * awaits the same outcome — a rejection still reaches its error handling
     * instead of surfacing here as an unhandled one.
     */
    track<T>(promise: Promise<T>): Promise<T> {
        if (state !== "loading" && state !== "landing") return promise;
        const counted = generation;
        pending += 1;
        return promise.finally(() => {
            if (counted !== generation) return;
            pending -= 1;
            if (state === "landing" && pending === 0) settleNextFrame();
        });
    },
};
