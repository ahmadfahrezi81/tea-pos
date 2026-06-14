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
    titleKey?: string;
    subPage: boolean;
    inlineHeader: boolean;
    isChart: boolean;
    parent: string | null | "lastRootTab";
    headerAction?: "add" | "edit";
    hideStorePicker?: boolean;
    footerCta?: string;
    footerCtaKey?: string;
    scrollPaddingBottom?: string;
    preserveScroll?: boolean;
};

export const mobileRoutes = {
    "/mobile/home/pos": {
        title: "POS",
        titleKey: "nav.pos",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/home/manage": {
        title: "Manage",
        titleKey: "nav.manage",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/home/manage/open": {
        title: "Open Store",
        titleKey: "nav.openStore",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage",
    },
    "/mobile/home/manage/close": {
        title: "Close Day",
        titleKey: "nav.closeDay",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage",
    },
    "/mobile/home/manage/expense": {
        title: "Store Expenses",
        titleKey: "nav.storeExpenses",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/home/manage",
        headerAction: "add",
        footerCta: "New Store Expense",
        footerCtaKey: "nav.newStoreExpense",
    },
    "/mobile/home/manage/expense/add": {
        title: "New Store Expense",
        titleKey: "nav.newStoreExpense",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage/expense",
    },
    "/mobile/orders": {
        title: "Orders",
        titleKey: "nav.orders",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/orders/chart": {
        title: "Daily Chart",
        titleKey: "nav.dailyChart",
        subPage: true,
        inlineHeader: false,
        isChart: true,
        parent: "/mobile/orders",
    },
    "/mobile/analytics": {
        title: "Analytics",
        titleKey: "nav.analytics",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
        preserveScroll: true,
    },
    "/mobile/analytics/chart": {
        title: "Monthly Chart",
        titleKey: "nav.monthlyChart",
        subPage: true,
        inlineHeader: false,
        isChart: true,
        parent: "/mobile/analytics",
    },
    "/mobile/chats": {
        title: "Chats",
        titleKey: "nav.chats",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
        hideStorePicker: true,
    },
    "/mobile/more": {
        title: "More",
        titleKey: "nav.more",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
        hideStorePicker: true,
    },
    "/mobile/more/stores": {
        title: "My Stores",
        titleKey: "nav.myStores",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more",
    },
    "/mobile/more/map": {
        title: "Location Feedback",
        titleKey: "nav.locationFeedback",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/more",
        headerAction: "add",
        scrollPaddingBottom: "pb-0",
    },
    "/mobile/more/map/add": {
        title: "New Location Feedback",
        titleKey: "nav.newLocationFeedback",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more/map",
    },
    "/mobile/account": {
        title: "Account",
        titleKey: "nav.account",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "lastRootTab",
    },
    "/mobile/account/details": {
        title: "Personal Details",
        titleKey: "nav.personalDetails",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/account",
        headerAction: "edit",
    },
    "/mobile/account/details/edit": {
        title: "Edit Personal Details",
        titleKey: "nav.editPersonalDetails",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/account/details",
    },
    "/mobile/notifications": {
        title: "Notifications",
        titleKey: "nav.notifications",
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
        titleKey: "nav.weatherForecast",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/notifications",
    },
    "/mobile/analytics/daily/open": {
        title: "Open Store",
        titleKey: "nav.openStore",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/analytics",
    },
    "/mobile/analytics/daily/*": {
        title: "Day Summary Details",
        titleKey: "nav.daySummaryDetails",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/analytics",
    },
    "/mobile/analytics/daily/*/events": {
        title: "Day Activity",
        titleKey: "nav.dayActivity",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/analytics",
    },
    "/mobile/analytics/daily/*/sessions": {
        title: "Day Sessions",
        titleKey: "nav.daySessions",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/analytics",
    },
    "/mobile/home/manage/request": {
        title: "Store Requests",
        titleKey: "nav.storeRequests",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/home/manage",
        headerAction: "add",
        footerCta: "New Store Request",
        footerCtaKey: "nav.newStoreRequest",
    },
    "/mobile/home/manage/request/add": {
        title: "New Store Request",
        titleKey: "nav.newStoreRequest",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage/request",
    },
    "/mobile/home/manage/report": {
        title: "Store Reports",
        titleKey: "nav.storeReports",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/home/manage",
        headerAction: "add",
        footerCta: "New Store Report",
        footerCtaKey: "nav.newStoreReport",
    },
    "/mobile/home/manage/report/add": {
        title: "New Store Report",
        titleKey: "nav.newStoreReport",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/home/manage/report",
    },
    "/mobile/more/earnings": {
        title: "My Pay",
        titleKey: "nav.myPay",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more",
    },
    "/mobile/more/earnings/*": {
        title: "Pay Details",
        titleKey: "nav.payDetails",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more/earnings",
    },
    "/mobile/more/reimbursements": {
        title: "My Claims",
        titleKey: "nav.myClaims",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/more",
        headerAction: "add",
    },
    "/mobile/more/reimbursements/add": {
        title: "New Claim",
        titleKey: "nav.newClaim",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more/reimbursements",
    },
    "/mobile/account/language": {
        title: "Language",
        titleKey: "language.title",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/account",
    },
    "/mobile/account/payroll-info": {
        title: "Payroll Info",
        titleKey: "nav.payrollInfo",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/account",
        headerAction: "edit",
    },
    "/mobile/account/payroll-info/edit": {
        title: "Edit Payroll Info",
        titleKey: "nav.editPayrollInfo",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/account/payroll-info",
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
    label: string;
    labelKey?: string;
    icon: LucideIcon;
};

export type TabDef = {
    pathSuffix: string;
    label: string;
    labelKey?: string;
    icon: LucideIcon;
    matchSuffixes: string[];
    variant?: TabVariant;
};

export const tabGroups: { global: TabDef[] } = {
    global: [
        {
            pathSuffix: "/mobile/home/pos",
            label: "POS",
            labelKey: "nav.pos",
            icon: ShoppingCart,
            matchSuffixes: ["/mobile/home/pos", "/mobile/home/manage"],
            variant: {
                pathContains: "/mobile/home/manage",
                label: "Manage",
                labelKey: "nav.manage",
                icon: Layers,
            },
        },
        {
            pathSuffix: "/mobile/orders",
            label: "Orders",
            labelKey: "nav.orders",
            icon: ReceiptText,
            matchSuffixes: ["/mobile/orders", "/mobile/orders/chart"],
        },
        {
            pathSuffix: "/mobile/analytics",
            label: "Analytics",
            labelKey: "nav.analytics",
            icon: ChartNoAxesCombinedIcon,
            matchSuffixes: ["/mobile/analytics", "/mobile/analytics/chart"],
        },
        {
            pathSuffix: "/mobile/chats",
            label: "Chats",
            labelKey: "nav.chats",
            icon: MessagesSquare,
            matchSuffixes: ["/mobile/chats"],
        },
        {
            pathSuffix: "/mobile/more",
            label: "More",
            labelKey: "nav.more",
            icon: MoreHorizontal,
            matchSuffixes: ["/mobile/more"],
        },
    ],
};
