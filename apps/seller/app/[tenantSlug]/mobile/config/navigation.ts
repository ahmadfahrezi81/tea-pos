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

export type { RouteConfig } from "@tea-pos/shell/routes";
import type { RouteConfig } from "@tea-pos/shell/routes";

export const mobileRoutes = {
    // ── Root tabs ─────────────────────────────────────────────────────────────
    "/mobile/home/pos": {
        titleKey: "nav.pos",
        parent: null,
        titleAccessory: true,
    },
    "/mobile/home/manage": {
        titleKey: "nav.manage",
        parent: null,
        titleAccessory: true,
    },
    "/mobile/orders": {
        titleKey: "nav.orders",
        parent: null,
        titleAccessory: true,
    },
    "/mobile/analytics": {
        titleKey: "nav.analytics",
        parent: null,
        titleAccessory: true,
        preserveScroll: true,
    },
    "/mobile/chats": {
        titleKey: "nav.chats",
        parent: null,
    },
    "/mobile/more": {
        titleKey: "nav.more",
        parent: null,
    },

    // ── Home / manage ─────────────────────────────────────────────────────────
    "/mobile/home/manage/open": {
        titleKey: "nav.openStore",
        parent: "/mobile/home/manage",
    },
    "/mobile/home/manage/close": {
        titleKey: "nav.closeDay",
        parent: "/mobile/home/manage",
    },
    "/mobile/home/manage/expense": {
        titleKey: "nav.storeExpenses",
        parent: "/mobile/home/manage",
        inlineHeader: true,
        headerAction: "add",
        footerCtaKey: "nav.newStoreExpense",
    },
    "/mobile/home/manage/expense/add": {
        titleKey: "nav.newStoreExpense",
        parent: "/mobile/home/manage/expense",
    },
    "/mobile/home/manage/request": {
        titleKey: "nav.storeRequests",
        parent: "/mobile/home/manage",
        inlineHeader: true,
        headerAction: "add",
        footerCtaKey: "nav.newStoreRequest",
    },
    "/mobile/home/manage/request/add": {
        titleKey: "nav.newStoreRequest",
        parent: "/mobile/home/manage/request",
    },
    "/mobile/home/manage/report": {
        titleKey: "nav.storeReports",
        parent: "/mobile/home/manage",
        inlineHeader: true,
        headerAction: "add",
        footerCtaKey: "nav.newStoreReport",
    },
    "/mobile/home/manage/report/add": {
        titleKey: "nav.newStoreReport",
        parent: "/mobile/home/manage/report",
    },

    // ── Orders ────────────────────────────────────────────────────────────────
    "/mobile/orders/chart": {
        titleKey: "nav.dailyChart",
        parent: "/mobile/orders",
        titleAccessory: true,
    },

    // ── Analytics ─────────────────────────────────────────────────────────────
    "/mobile/analytics/chart": {
        titleKey: "nav.monthlyChart",
        parent: "/mobile/analytics",
        titleAccessory: true,
    },
    "/mobile/analytics/daily/open": {
        titleKey: "nav.openStore",
        parent: "/mobile/analytics",
    },
    "/mobile/analytics/daily/*": {
        titleKey: "nav.daySummaryDetails",
        parent: "/mobile/analytics",
    },
    "/mobile/analytics/daily/*/events": {
        titleKey: "nav.dayActivity",
        parent: "/mobile/analytics",
    },
    "/mobile/analytics/daily/*/sessions": {
        titleKey: "nav.daySessions",
        parent: "/mobile/analytics",
    },

    // ── More ──────────────────────────────────────────────────────────────────
    "/mobile/more/stores": {
        titleKey: "nav.myStores",
        parent: "/mobile/more",
    },
    "/mobile/more/map": {
        titleKey: "nav.locationFeedback",
        parent: "/mobile/more",
        inlineHeader: true,
        headerAction: "add",
        scrollPaddingBottom: "pb-0",
    },
    "/mobile/more/map/add": {
        titleKey: "nav.newLocationFeedback",
        parent: "/mobile/more/map",
    },
    "/mobile/more/earnings": {
        titleKey: "nav.myPay",
        parent: "/mobile/more",
    },
    "/mobile/more/earnings/*": {
        titleKey: "nav.payDetails",
        parent: "/mobile/more/earnings",
    },
    "/mobile/more/reimbursements": {
        titleKey: "nav.myClaims",
        parent: "/mobile/more",
        inlineHeader: true,
        headerAction: "add",
    },
    "/mobile/more/reimbursements/add": {
        titleKey: "nav.newClaim",
        parent: "/mobile/more/reimbursements",
    },

    // ── Account ───────────────────────────────────────────────────────────────
    "/mobile/account": {
        titleKey: "nav.account",
        parent: "lastRootTab",
        inlineHeader: true,
    },
    "/mobile/account/details": {
        titleKey: "nav.personalDetails",
        parent: "/mobile/account",
        inlineHeader: true,
        headerAction: "edit",
    },
    "/mobile/account/details/edit": {
        titleKey: "nav.editPersonalDetails",
        parent: "/mobile/account/details",
    },
    "/mobile/account/language": {
        titleKey: "language.title",
        parent: "/mobile/account",
    },
    "/mobile/account/payroll-info": {
        titleKey: "nav.payrollInfo",
        parent: "/mobile/account",
        inlineHeader: true,
        headerAction: "edit",
    },
    "/mobile/account/payroll-info/edit": {
        titleKey: "nav.editPayrollInfo",
        parent: "/mobile/account/payroll-info",
    },
} satisfies Record<string, RouteConfig>;

export const rootTabSuffixes = Object.entries(mobileRoutes)
    .filter(([, c]) => c.parent === null)
    .map(([path]) => path);

export const resolveRoute = (path: string): RouteConfig | null => {
    const key = Object.keys(mobileRoutes).find(
        (k) => !k.includes("*") && path.endsWith(k),
    );
    if (key) return mobileRoutes[key as keyof typeof mobileRoutes];


    if (path.includes("/mobile/analytics/daily/")) {
        if (path.endsWith("/events"))
            return mobileRoutes["/mobile/analytics/daily/*/events"];
        if (path.endsWith("/sessions"))
            return mobileRoutes["/mobile/analytics/daily/*/sessions"];
        return mobileRoutes["/mobile/analytics/daily/*"];
    }

    if (path.includes("/mobile/more/earnings/")) {
        return mobileRoutes["/mobile/more/earnings/*"];
    }

    return null;
};

// ─── Tab Groups ───────────────────────────────────────────────────────────────

export type TabVariant = {
    pathContains: string;
    labelKey: string;
    icon: LucideIcon;
};

export type TabDef = {
    pathSuffix: string;
    labelKey: string;
    icon: LucideIcon;
    matchSuffixes: string[];
    variant?: TabVariant;
};

export const tabGroups: { global: TabDef[] } = {
    global: [
        {
            pathSuffix: "/mobile/home/pos",
            labelKey: "nav.pos",
            icon: ShoppingCart,
            matchSuffixes: ["/mobile/home/pos", "/mobile/home/manage"],
            variant: {
                pathContains: "/mobile/home/manage",
                labelKey: "nav.manage",
                icon: Layers,
            },
        },
        {
            pathSuffix: "/mobile/orders",
            labelKey: "nav.orders",
            icon: ReceiptText,
            matchSuffixes: ["/mobile/orders", "/mobile/orders/chart"],
        },
        {
            pathSuffix: "/mobile/analytics",
            labelKey: "nav.analytics",
            icon: ChartNoAxesCombinedIcon,
            matchSuffixes: ["/mobile/analytics", "/mobile/analytics/chart"],
        },
        {
            pathSuffix: "/mobile/chats",
            labelKey: "nav.chats",
            icon: MessagesSquare,
            matchSuffixes: ["/mobile/chats"],
        },
        {
            pathSuffix: "/mobile/more",
            labelKey: "nav.more",
            icon: MoreHorizontal,
            matchSuffixes: ["/mobile/more"],
        },
    ],
};
