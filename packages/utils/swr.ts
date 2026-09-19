/**
 * Dedupe tiers for SWR.
 *
 * The floor lives in each app's root `SWRConfig` and is `WARM`; a hook names a
 * tier only when it is leaving the floor. The point of the names is that the
 * number costs money — a reviewer should see a decision, not a literal copied
 * from the hook next door. See task 067.
 *
 * `dedupingInterval` is not polling. It is how long SWR reuses what it already
 * has for the same key, so it is paid on navigation and remount, not while a
 * screen sits still.
 */
export const SWR = {
    /** 5s — a list that moves while someone watches it. */
    HOT: 5_000,
    /** 10s — a queue someone is working through. */
    QUICK: 10_000,
    /** 30s — the floor. Today's orders and today's summary sit here. */
    WARM: 30_000,
    /** 60s — changes a few times a day. */
    COOL: 60_000,
    /** 300s — configuration; changes when an admin decides it does. */
    COLD: 300_000,
    /** 900s — a closed month cannot change. */
    STATIC: 900_000,
} as const;

export type SwrTier = (typeof SWR)[keyof typeof SWR];
