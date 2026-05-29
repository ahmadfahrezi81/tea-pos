import { PostHog } from "posthog-node";
import { after } from "next/server";

function getFlagClient(): PostHog {
    return new PostHog(process.env.POSTHOG_API_KEY!, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        flushAt: 1,
        flushInterval: 0,
    });
}

export async function isFlagEnabled(
    flag: string,
    userId: string,
    properties?: Record<string, string>,
): Promise<boolean> {
    const client = getFlagClient();
    try {
        const flags = await client.evaluateFlags(userId, {
            personProperties: properties,
        });
        after(() => client.shutdown());
        return flags.isEnabled(flag);
    } catch {
        await client.shutdown();
        return false;
    }
}
