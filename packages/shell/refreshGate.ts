/**
 * How recently the app last refetched everything, and whether it is worth doing
 * again.
 *
 * Deliberately outside React, like `navProgress`: a timestamp is not render
 * state, and reading it must not cost a commit on the touch path.
 *
 * The problem it solves is not one SWR can solve for us. A refresh is
 * `mutate(() => true)`, and `internalMutate` deletes the dedupe markers before
 * revalidating — its own comment says "so new requests will not be deduped". So
 * pull to refresh is the one path in either app that `dedupingInterval` cannot
 * bound, however high the floor goes. See task 068.
 */

/**
 * How long a pull waits before it is allowed to fetch again.
 *
 * It matches the app-wide `dedupingInterval` today, and that is a coincidence
 * worth keeping rather than a fact to deduplicate: that number is how long a
 * cached entry may be reused, this one is how often a person may ask. They are
 * free to diverge, so they are not the same constant.
 */
export const PULL_MIN_INTERVAL_MS = 30_000;

/**
 * `performance.now()` rather than `Date.now()` because it is monotonic. A clock
 * correction while the app is open could otherwise leave `lastAt` in the future
 * and lock the gesture out until it caught up. It resets per document, which is
 * correct — a reload refetches everything anyway.
 */
let lastAt = 0;

export const refreshGate = {
    /** Has enough time passed that a refetch could plausibly return something new? */
    shouldFetch: () => performance.now() - lastAt >= PULL_MIN_INTERVAL_MS,

    /**
     * Record that everything was just refetched. Every path that refreshes the
     * whole cache calls this, including ones this gate does not hold back — the
     * idle sheet marks without being gated, because after twenty quiet minutes
     * its refresh cannot be redundant.
     */
    mark: () => {
        lastAt = performance.now();
    },
};
