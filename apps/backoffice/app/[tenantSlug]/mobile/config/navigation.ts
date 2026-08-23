import {
    LayoutDashboard,
    DollarSign,
    Package,
    MessagesSquare,
    MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type { RouteConfig } from "@tea-pos/shell/routes";
import type { RouteConfig } from "@tea-pos/shell/routes";

export const mobileRoutes = {
    "/mobile/home": {
        titleKey: "Home",
        parent: null,
        prefetch: true,
        titleAccessory: true,
    },
    "/mobile/pay": {
        titleKey: "Pay",
        parent: null,
        prefetch: true,
    },
    "/mobile/pay/payouts": {
        titleKey: "Staff Payouts",
        parent: "/mobile/pay",
    },
    "/mobile/pay/claims": {
        titleKey: "Claims",
        parent: "/mobile/pay",
    },
    "/mobile/pay/staff": {
        titleKey: "Staff Payroll Info",
        parent: "/mobile/pay",
    },
    "/mobile/pay/claim-types": {
        titleKey: "Claim Types",
        inlineHeader: true,
        headerAction: "add",
        parent: "/mobile/pay",
    },
    "/mobile/pay/claim-types/add": {
        titleKey: "New Claim Type",
        parent: "/mobile/pay/claim-types",
    },
    "/mobile/pay/commission-types": {
        titleKey: "Commission Types",
        inlineHeader: true,
        headerAction: "add",
        parent: "/mobile/pay",
    },
    "/mobile/pay/commission-types/add": {
        titleKey: "New Commission Type",
        parent: "/mobile/pay/commission-types",
    },
    "/mobile/pay/staff-commissions": {
        titleKey: "Staff Commissions",
        parent: "/mobile/pay",
    },
    "/mobile/pay/pay-schedule": {
        titleKey: "Pay Schedule",
        parent: "/mobile/pay",
    },
    "/mobile/supply": {
        titleKey: "Supply",
        parent: null,
        prefetch: true,
    },
    "/mobile/chats": {
        titleKey: "Chats",
        parent: null,
        prefetch: true,
    },
    "/mobile/more": {
        titleKey: "More",
        parent: null,
        prefetch: true,
    },
    "/mobile/more/patch-notes": {
        titleKey: "Patch Notes",
        parent: "/mobile/more",
    },
    "/mobile/more/map": {
        titleKey: "Location Feedback",
        parent: "/mobile/more",
        scrollPaddingBottom: "pb-0",
    },
    "/mobile/account": {
        titleKey: "Account",
        inlineHeader: true,
        parent: "lastRootTab",
    },
} satisfies Record<string, RouteConfig>;

export const rootTabSuffixes = Object.entries(mobileRoutes)
    .filter(([, c]) => c.parent === null)
    .map(([path]) => path);

/* Derived from the table rather than kept as a second list, so marking the
   route is the only way to warm it. */
export const prefetchSuffixes = Object.entries(mobileRoutes)
    .filter(([, c]) => "prefetch" in c && c.prefetch)
    .map(([path]) => path);

export const resolveRoute = (path: string): RouteConfig | null => {
    const key = Object.keys(mobileRoutes).find(
        (k) => !k.includes("*") && path.endsWith(k),
    );
    if (key) return mobileRoutes[key as keyof typeof mobileRoutes];

    if (path.includes("/mobile/pay/claim-types/") && path.endsWith("/edit")) {
        return {
            titleKey: "Edit Claim Type",
            parent: "/mobile/pay/claim-types",
        };
    }

    if (path.includes("/mobile/pay/staff/")) {
        return {
            titleKey: "Payroll Info",
            parent: "/mobile/pay/staff",
        };
    }

    // Checked separately from the rule above rather than folded into it: the
    // paths only look alike. "/mobile/pay/staff-commissions/" does not contain
    // "/mobile/pay/staff/", so neither rule can swallow the other.
    if (path.includes("/mobile/pay/staff-commissions/")) {
        return {
            titleKey: "Set Commission",
            parent: "/mobile/pay/staff-commissions",
        };
    }

    if (path.includes("/mobile/pay/commission-types/") && path.endsWith("/edit")) {
        return {
            titleKey: "Edit Commission Type",
            parent: "/mobile/pay/commission-types",
        };
    }

    if (path.includes("/mobile/pay/payouts/")) {
        const suffix = path.split("/mobile/pay/payouts/")[1] ?? "";
        const segments = suffix.split("/").filter(Boolean);
        const payoutId = segments[0];

        if (segments.length === 1) {
            return { titleKey: "Payslip Details", parent: "/mobile/pay/payouts" };
        }
        if (segments.length === 2 && segments[1] === "pay") {
            // One screen, two outcomes — a transfer, or a period closed with
            // nothing owed. The title has to fit both.
            return { titleKey: "Confirm Payout", parent: `/mobile/pay/payouts/${payoutId}` };
        }
        return { titleKey: "Pay", parent: "/mobile/pay/payouts" };
    }

    return null;
};

export type TabDef = {
    pathSuffix: string;
    labelKey: string;
    icon: LucideIcon;
    matchSuffixes: string[];
};

export const tabGroups: { global: TabDef[] } = {
    global: [
        {
            pathSuffix: "/mobile/home",
            labelKey: "Home",
            icon: LayoutDashboard,
            matchSuffixes: ["/mobile/home"],
        },
        {
            pathSuffix: "/mobile/pay",
            labelKey: "Pay",
            icon: DollarSign,
            matchSuffixes: ["/mobile/pay"],
        },
        {
            pathSuffix: "/mobile/supply",
            labelKey: "Supply",
            icon: Package,
            matchSuffixes: ["/mobile/supply"],
        },
        {
            pathSuffix: "/mobile/chats",
            labelKey: "Chats",
            icon: MessagesSquare,
            matchSuffixes: ["/mobile/chats"],
        },
        {
            pathSuffix: "/mobile/more",
            labelKey: "More",
            icon: MoreHorizontal,
            matchSuffixes: ["/mobile/more"],
        },
    ],
};
