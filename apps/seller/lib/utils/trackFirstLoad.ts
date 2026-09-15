import { unstable_serialize, type Middleware } from "swr";
import { navProgress } from "@tea-pos/shell/navProgress";

/** The part of SWR's runtime config this reads. It is there, but not on the public type. */
type WithCache = { cache: { get(key: string): { data?: unknown } | undefined } };

/**
 * Holds the navigation progress bar until a page's first-load requests settle.
 * See task 065. Mounted by `MobileLayoutClient` around page content only.
 *
 * A request counts only when its key has no cached data — the same test SWR
 * uses for `isLoading` — so revalidating a screen that already shows its data
 * never holds the bar, and the bar and the skeletons agree on what loading is.
 *
 * The cost is one closure per hook render, plus one cache lookup per request
 * actually made: SWR only calls the fetcher when it fetches.
 */
export const trackFirstLoad: Middleware = (useSWRNext) =>
    // Named as a hook, because it calls one.
    function useTrackFirstLoad(key, fetcher, config) {
        const { cache } = config as typeof config & WithCache;
        const tracked: typeof fetcher =
            fetcher &&
            ((...args) => {
                const firstLoad = cache.get(unstable_serialize(key))?.data === undefined;
                const result = fetcher(...args);
                return firstLoad ? navProgress.track(Promise.resolve(result)) : result;
            });
        return useSWRNext(key, tracked, config);
    };
