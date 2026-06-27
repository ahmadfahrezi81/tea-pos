import {
    LayoutDashboard,
    DollarSign,
    Package,
    MessagesSquare,
    MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type RouteConfig = {
    title: string;
    subPage: boolean;
    inlineHeader: boolean;
    parent: string | null | "lastRootTab";
    headerAction?: "add";
    footerCta?: string;
};

export const mobileRoutes = {
    "/mobile/dashboard": {
        title: "Dashboard",
        subPage: false,
        inlineHeader: false,
        parent: null,
    },
    "/mobile/pay": {
        title: "Pay",
        subPage: false,
        inlineHeader: false,
        parent: null,
    },
    "/mobile/pay/payouts": {
        title: "Staff Payouts",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay",
    },
    "/mobile/pay/claims": {
        title: "Claims",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay",
    },
    "/mobile/pay/staff": {
        title: "Staff Payroll Info",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay",
    },
    "/mobile/pay/claim-types": {
        title: "Claim Types",
        subPage: true,
        inlineHeader: true,
        headerAction: "add",
        parent: "/mobile/pay",
    },
    "/mobile/pay/claim-types/add": {
        title: "New Claim Type",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay/claim-types",
    },
    "/mobile/pay/commission-types": {
        title: "Commission Types",
        subPage: true,
        inlineHeader: true,
        headerAction: "add",
        parent: "/mobile/pay",
    },
    "/mobile/pay/commission-types/add": {
        title: "New Commission Type",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay/commission-types",
    },
    "/mobile/supply": {
        title: "Supply",
        subPage: false,
        inlineHeader: false,
        parent: null,
    },
    "/mobile/chats": {
        title: "Chats",
        subPage: false,
        inlineHeader: false,
        parent: null,
    },
    "/mobile/more": {
        title: "More",
        subPage: false,
        inlineHeader: false,
        parent: null,
    },
    "/mobile/account": {
        title: "Account",
        subPage: true,
        inlineHeader: true,
        parent: "lastRootTab",
    },
} satisfies Record<string, RouteConfig>;

export const rootTabSuffixes = Object.entries(mobileRoutes)
    .filter(([, c]) => !c.subPage && c.parent === null)
    .map(([path]) => path);

export const resolveRoute = (path: string): RouteConfig | null => {
    const key = Object.keys(mobileRoutes).find(
        (k) => !k.includes("*") && path.endsWith(k),
    );
    if (key) return mobileRoutes[key as keyof typeof mobileRoutes];

    if (path.includes("/mobile/pay/claim-types/") && path.endsWith("/edit")) {
        return {
            title: "Edit Claim Type",
            subPage: true,
            inlineHeader: false,
            parent: "/mobile/pay/claim-types",
        };
    }

    if (path.includes("/mobile/pay/staff/")) {
        return {
            title: "Payroll Info",
            subPage: true,
            inlineHeader: false,
            parent: "/mobile/pay/staff",
        };
    }

    if (path.includes("/mobile/pay/commission-types/") && path.endsWith("/edit")) {
        return {
            title: "Edit Commission Type",
            subPage: true,
            inlineHeader: false,
            parent: "/mobile/pay/commission-types",
        };
    }

    if (path.includes("/mobile/pay/payouts/")) {
        const suffix = path.split("/mobile/pay/payouts/")[1] ?? "";
        const segments = suffix.split("/").filter(Boolean);
        const userId = segments[0];
        const payoutId = segments[1];

        if (segments.length === 1) {
            return { title: "Pay History", subPage: true, inlineHeader: false, parent: "/mobile/pay/payouts" };
        }
        if (segments.length === 2) {
            return { title: "Payslip Details", subPage: true, inlineHeader: false, parent: `/mobile/pay/payouts/${userId}` };
        }
        if (segments.length === 3 && segments[2] === "pay") {
            return { title: "Confirm Payment", subPage: true, inlineHeader: false, parent: `/mobile/pay/payouts/${userId}/${payoutId}` };
        }
        if (segments.length === 5) {
            return { title: "Summary Details", subPage: true, inlineHeader: false, parent: `/mobile/pay/payouts/${userId}/${payoutId}` };
        }
        return { title: "Pay", subPage: true, inlineHeader: false, parent: "/mobile/pay/payouts" };
    }

    return null;
};

export type TabDef = {
    pathSuffix: string;
    label: string;
    icon: LucideIcon;
    matchSuffixes: string[];
};

export const tabGroups: { global: TabDef[] } = {
    global: [
        {
            pathSuffix: "/mobile/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            matchSuffixes: ["/mobile/dashboard"],
        },
        {
            pathSuffix: "/mobile/pay",
            label: "Pay",
            icon: DollarSign,
            matchSuffixes: ["/mobile/pay"],
        },
        {
            pathSuffix: "/mobile/supply",
            label: "Supply",
            icon: Package,
            matchSuffixes: ["/mobile/supply"],
        },
        {
            pathSuffix: "/mobile/chats",
            label: "Chats",
            icon: MessagesSquare,
            matchSuffixes: ["/mobile/chats"],
        },
        {
            pathSuffix: "/mobile/more",
            label: "More",
            icon: MoreHorizontal,
            matchSuffixes: ["/mobile/more"],
        },
    ],
};
