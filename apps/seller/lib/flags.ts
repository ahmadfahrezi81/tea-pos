import { PostHog } from "posthog-node";
import { after } from "next/server";
import type { Flags } from "@/lib/api/flags";

export const FLAGS = {
    FEATURE: {
        QRIS: "feature-qris",
        REPORT: "feature-report",
        REQUEST: "feature-request",
        REIMBURSEMENT: "feature-reimbursement",
        FAST_ORDER: "feature-fast-order",
    },
    OPS: {
        SKIP_MANAGE_PHOTOS: "ops-skip-manage-photos",
        MAINTENANCE: "ops-maintenance",
    },
} as const;

type FlagKey =
    | (typeof FLAGS.FEATURE)[keyof typeof FLAGS.FEATURE]
    | (typeof FLAGS.OPS)[keyof typeof FLAGS.OPS];

/**
 * One client per instance, not one per request. `posthog-node` is built to be
 * long-lived: constructing it per request repeats setup work every time, and
 * `shutdown()` destroys the client, which on a shared instance would tear it
 * out from under any concurrent request still using it. Only ever `flush()`.
 *
 * Batching is on (`flushAt` / `flushInterval`) because the previous
 * `flushAt: 1, flushInterval: 0` forced a send per event. Anything queued is
 * drained by the `after()` flush below, which runs once the response is
 * already sent and no-ops when the queue is empty.
 */
let flagClient: PostHog | null = null;

function getFlagClient(): PostHog {
    flagClient ??= new PostHog(process.env.POSTHOG_API_KEY!, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        flushAt: 20,
        flushInterval: 10000,

        /* Local evaluation — task 060 Item 2.

           `POSTHOG_API_KEY` above is the *project* key (`phc_`) and cannot read
           flag definitions; PostHog withholds that from a key that ships to
           browsers. This is a second, personal key (`phx_`), scoped to
           feature-flag read. With it the client holds the flag rules in memory
           and answers in process instead of paying an HTTP round trip per
           request — the measured cost was 71ms, the most expensive non-cron
           route on the board.

           It resolves this project's flags because none of them target a
           cohort: the conditions are "all users", "no users", `storeId`, and
           `Distinct ID`, and the first two are trivial while the last two are
           facts the caller already passes as person properties. **A cohort
           condition added later would silently fall back to the network** —
           correct, just not free. Re-check the flag list before assuming this
           is still buying anything.

           Undefined when the variable is absent, which is a deliberate and
           load-bearing degradation: local evaluation switches off and every
           call takes the network path it takes today. So this is safe to deploy
           before the variable exists in an environment. */
        personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
        featureFlagsPollingInterval: 30_000,
    });
    return flagClient;
}

type FlagEvaluations = { isEnabled: (flag: string) => boolean };
const DISABLED: FlagEvaluations = { isEnabled: () => false };

// For bulk evaluation (e.g. GET /api/flags) — one client, one network call.
export async function getAllFlags(
    userId: string,
    properties?: Record<string, string>,
): Promise<FlagEvaluations> {
    const client = getFlagClient();
    try {
        /* `onlyEvaluateLocally` is deliberately left at its default of false.

           Setting it true would guarantee no network call, and would also mean
           a cold instance — one whose flag definitions have not been fetched
           yet — answers false for everything. On this codebase that is not a
           slow path, it is every feature switching off for the first requests
           an instance serves, and `ops-maintenance` is one of them.

           Left false, an instance without definitions takes the network path,
           which is exactly today's behaviour. Worst case is what we already
           have; best case is free. */
        const flags = await client.evaluateFlags(userId, {
            personProperties: properties,
        });
        // Drain after the response — a serverless instance can freeze between
        // invocations, so the flush timer alone isn't a reliable delivery path.
        after(() => client.flush());
        return flags;
    } catch {
        return DISABLED;
    }
}

// For single-flag checks in individual API routes (hard gates).
export async function isFlagEnabled(
    flag: FlagKey,
    userId: string,
    properties?: Record<string, string>,
): Promise<boolean> {
    const flags = await getAllFlags(userId, properties);
    return flags.isEnabled(flag);
}

/**
 * The whole flag set as the client consumes it.
 *
 * Extracted so `GET /api/flags` and the mobile layout's server render produce
 * the same object from the same evaluation — the layout seeds SWR with this and
 * the route revalidates it, so any drift between the two would show up as flags
 * flipping shortly after boot.
 *
 * Fails closed by construction: `getAllFlags` returns `DISABLED` on any error,
 * so every field here comes back false rather than throwing or going stale.
 */
export async function evaluateFlagSet(
    userId: string,
    properties?: Record<string, string>,
): Promise<Flags> {
    const evaluation = await getAllFlags(userId, properties);
    return {
        isQrisEnabled: evaluation.isEnabled(FLAGS.FEATURE.QRIS),
        isReportEnabled: evaluation.isEnabled(FLAGS.FEATURE.REPORT),
        isRequestEnabled: evaluation.isEnabled(FLAGS.FEATURE.REQUEST),
        isReimbursementEnabled: evaluation.isEnabled(FLAGS.FEATURE.REIMBURSEMENT),
        isFastOrderEnabled: evaluation.isEnabled(FLAGS.FEATURE.FAST_ORDER),
        isSkipManagePhotosEnabled: evaluation.isEnabled(FLAGS.OPS.SKIP_MANAGE_PHOTOS),
        isMaintenanceEnabled: evaluation.isEnabled(FLAGS.OPS.MAINTENANCE),
    };
}
