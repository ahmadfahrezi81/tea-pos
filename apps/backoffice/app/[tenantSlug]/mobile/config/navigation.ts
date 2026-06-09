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
    "/mobile/pay/periods": {
        title: "Staff Pay Periods",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay",
    },
    "/mobile/pay/rates": {
        title: "Commission Rates",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay",
    },
    "/mobile/pay/reimbursements": {
        title: "Claims",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay",
    },
    "/mobile/pay/claim-types": {
        title: "Claim Types",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay",
    },
    "/mobile/pay/commission-types": {
        title: "Commission Types",
        subPage: true,
        inlineHeader: false,
        parent: "/mobile/pay",
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

    if (path.includes("/mobile/pay/periods/")) {
        const suffix = path.split("/mobile/pay/periods/")[1] ?? "";
        const segments = suffix.split("/").filter(Boolean);
        if (segments.length >= 2) {
            return {
                title: "Pay Details",
                subPage: true,
                inlineHeader: false,
                parent: "/mobile/pay/periods",
            };
        }
        return {
            title: "Period Staff",
            subPage: true,
            inlineHeader: false,
            parent: "/mobile/pay/periods",
        };
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
