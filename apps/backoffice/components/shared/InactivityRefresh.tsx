"use client";

import { useSWRConfig } from "swr";
import InactivityRefreshPopup from "@tea-pos/shell/InactivityRefreshPopup";

/**
 * `InactivityRefreshPopup` with this app's cache attached.
 *
 * `mutate(() => true)` matches every key in the cache, which is the point: the
 * idle prompt exists because the user has been away long enough that anything
 * on screen could be stale, and the sheet has no idea which screen that is.
 * Most hooks here run with `revalidateOnFocus` off, so nothing else would
 * refetch on the way back in.
 */
export function InactivityRefresh() {
    const { mutate } = useSWRConfig();
    return <InactivityRefreshPopup onSoftRefresh={() => mutate(() => true)} />;
}
