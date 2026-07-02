import { PostHog } from "posthog-node";
import { after } from "next/server";

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

function getFlagClient(): PostHog {
    return new PostHog(process.env.POSTHOG_API_KEY!, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        flushAt: 1,
        flushInterval: 0,
    });
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
        const flags = await client.evaluateFlags(userId, {
            personProperties: properties,
        });
        after(() => client.shutdown());
        return flags;
    } catch {
        await client.shutdown();
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
