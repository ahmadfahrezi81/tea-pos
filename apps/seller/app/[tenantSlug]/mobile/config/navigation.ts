import {
    ShoppingCart,
    ReceiptText,
    ChartNoAxesCombinedIcon,
    MessagesSquare,
    MoreHorizontal,
    Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Route Metadata ───────────────────────────────────────────────────────────

export type RouteConfig = {
    title: string;
    subPage: boolean;
    inlineHeader: boolean;
    isChart: boolean;
    parent: string | null | "lastRootTab";
    headerAction?: "add";
    hideStorePicker?: boolean;
    footerCta?: string;
};

export const mobileRoutes = {
    "/mobile/home/pos": {
        title: "POS",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/home/manage": {
        title: "Manage",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/home/manage/open": {
        title: "Open Store",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage",
    },
    "/mobile/home/manage/close": {
        title: "Close Day",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage",
    },
    "/mobile/home/manage/expense": {
        title: "Store Expenses",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/home/manage",
        headerAction: "add",
        footerCta: "New Store Expense",
    },
    "/mobile/home/manage/expense/add": {
        title: "New Store Expense",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage/expense",
    },
    "/mobile/orders": {
        title: "Orders",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/orders/chart": {
        title: "Daily Chart",
        subPage: true,
        inlineHeader: false,
        isChart: true,
        parent: "/mobile/orders",
    },
    "/mobile/analytics": {
        title: "Analytics",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/analytics/chart": {
        title: "Monthly Chart",
        subPage: true,
        inlineHeader: false,
        isChart: true,
        parent: "/mobile/analytics",
    },
    "/mobile/chats": {
        title: "Chats",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
        hideStorePicker: true,
    },
    "/mobile/more": {
        title: "More",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
        hideStorePicker: true,
    },
    "/mobile/more/stores": {
        title: "Assigned Stores",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more",
    },
    "/mobile/more/map": {
        title: "Location Feedback",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/more",
        headerAction: "add",
        footerCta: "New Location Feedback",
    },
    "/mobile/more/map/add": {
        title: "New Location Feedback",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more/map",
    },
    "/mobile/account": {
        title: "Account",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "lastRootTab",
    },
    "/mobile/account/details": {
        title: "Personal Details",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/account",
    },
    "/mobile/notifications": {
        title: "Notifications",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/pos",
    },
    "/mobile/notifications/*": {
        title: "Mobile",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/notifications",
    },
    "/mobile/notifications/*/weather": {
        title: "Weather Forecast",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/notifications",
    },
    "/mobile/analytics/daily/open": {
        title: "Open Store",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/analytics",
    },
    "/mobile/analytics/daily/*/events": {
        title: "Day Activity",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/analytics",
    },
    "/mobile/home/manage/request": {
        title: "Store Requests",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/home/manage",
        headerAction: "add",
        footerCta: "New Store Request",
    },
    "/mobile/home/manage/request/add": {
        title: "New Store Request",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage/request",
    },
    "/mobile/home/manage/report": {
        title: "Store Reports",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/home/manage",
        headerAction: "add",
        footerCta: "New Store Report",
    },
    "/mobile/home/manage/report/add": {
        title: "New Store Report",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage/report",
    },
    "/mobile/account/earnings": {
        title: "My Earnings",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/account",
    },
    "/mobile/account/earnings/*": {
        title: "Period Detail",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/account/earnings",
    },
    "/mobile/account/reimbursements": {
        title: "Reimbursements",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/account",
        headerAction: "add",
    },
    "/mobile/account/reimbursements/add": {
        title: "New Claim",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/account/reimbursements",
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

    if (path.includes("/mobile/notifications/")) {
        if (path.endsWith("/weather"))
            return mobileRoutes["/mobile/notifications/*/weather"];
        return mobileRoutes["/mobile/notifications/*"];
    }

    if (path.includes("/mobile/analytics/daily/") && path.endsWith("/events")) {
        return mobileRoutes["/mobile/analytics/daily/*/events"];
    }

    if (path.includes("/mobile/account/earnings/")) {
        return mobileRoutes["/mobile/account/earnings/*"];
    }

    return null;
};

// ─── Tab Groups ───────────────────────────────────────────────────────────────

export type TabVariant = {
    pathContains: string;
    label: string;
    icon: LucideIcon;
};

export type TabDef = {
    pathSuffix: string;
    label: string;
    icon: LucideIcon;
    matchSuffixes: string[];
    variant?: TabVariant;
};

export const tabGroups: { global: TabDef[] } = {
    global: [
        {
            pathSuffix: "/mobile/home/pos",
            label: "POS",
            icon: ShoppingCart,
            matchSuffixes: ["/mobile/home/pos", "/mobile/home/manage"],
            variant: {
                pathContains: "/mobile/home/manage",
                label: "Manage",
                icon: Layers,
            },
        },
        {
            pathSuffix: "/mobile/orders",
            label: "Orders",
            icon: ReceiptText,
            matchSuffixes: ["/mobile/orders", "/mobile/orders/chart"],
        },
        {
            pathSuffix: "/mobile/analytics",
            label: "Analytics",
            icon: ChartNoAxesCombinedIcon,
            matchSuffixes: ["/mobile/analytics", "/mobile/analytics/chart"],
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
