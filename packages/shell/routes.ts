import type { LucideIcon } from "lucide-react";

/**
 * What the shell needs to know about a route.
 *
 * Every field describes a *layout capability*, never a specific screen — the
 * test being whether some unrelated route in another app could plausibly want
 * it. That rule is what keeps this from growing a flag per page, and it is why
 * nothing here names a store, a chart or a payout.
 *
 * Only `titleKey` and `parent` are required; everything else defaults to off,
 * so a typical route is one line.
 */
export type RouteConfig = {
    /**
     * Looked up through the `t` given to the shell. An app without i18n passes
     * an identity `t` and puts display text here.
     */
    titleKey: string;
    /**
     * `null` marks a root tab. `"lastRootTab"` returns to whichever tab the user
     * came from. Anything else is a route suffix. Also determines whether this
     * is a subpage — see `isSubPage`.
     */
    parent: string | null | "lastRootTab";
    /** Compact header: title beside a close button, rather than under a back arrow. */
    inlineHeader?: boolean;
    /** Primary action button in the header, linking to `<route>/add` or `/edit`. */
    headerAction?: "add" | "edit";
    /** Render the app's title accessory — a store picker, a filter, whatever it supplies. */
    titleAccessory?: boolean;
    /** i18n key for a full-width button in the footer region, linking to `<route>/add`. */
    footerCtaKey?: string;
    /** Overrides the scroll region's bottom padding. */
    scrollPaddingBottom?: string;
    /** Return to this route at the scroll offset it was left at. */
    preserveScroll?: boolean;
};

/** A route is a subpage exactly when it has somewhere to go back to. */
export const isSubPage = (route: RouteConfig | null): boolean =>
    route ? route.parent !== null : false;

/** Resolves a pathname to its config. Owned per app, since route tables are app data. */
export type ResolveRoute = (path: string) => RouteConfig | null;

export type Tab = {
    path: string;
    label: string;
    icon: LucideIcon;
    matchPaths: string[];
    /**
     * Swaps this tab's label and icon while on a matching path — e.g. a POS tab
     * that presents as Manage once you are in the manage section. Resolved by
     * the shell against the path being navigated to, so the swap lands with the
     * tap rather than after it.
     */
    variant?: {
        pathContains: string;
        label: string;
        icon: LucideIcon;
    };
};
