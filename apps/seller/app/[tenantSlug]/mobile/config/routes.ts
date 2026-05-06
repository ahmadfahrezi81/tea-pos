export type RouteConfig = {
    title: string;
    subPage: boolean;
    inlineHeader: boolean;
    isChart: boolean;
    parent: string | null | "lastRootTab";
};

export const mobileRoutes = {
    "/mobile/pos": {
        title: "Home",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
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
    "/mobile/inbox": {
        title: "Inbox",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/more": {
        title: "More",
        subPage: false,
        inlineHeader: false,
        isChart: false,
        parent: null,
    },
    "/mobile/more/stores": {
        title: "Assigned Stores",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more",
    },
    "/mobile/more/map": {
        title: "Map",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/more",
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
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/account",
    },
    "/mobile/notifications": {
        title: "Notifications",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/pos",
    },
    // Dynamic: any notification detail page (e.g. /mobile/notifications/{id})
    "/mobile/notifications/*": {
        title: "Mobile",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/notifications",
    },
    // Dynamic: weather sub-page of a notification (e.g. /mobile/notifications/{id}/weather)
    "/mobile/notifications/*/weather": {
        title: "Weather Forecast",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/notifications",
    },
    "/mobile/analytics/daily/close": {
        title: "Close Day",
        subPage: true,
        inlineHeader: true,
        isChart: false,
        parent: "/mobile/analytics",
    },
    "/mobile/analytics/daily/open": {
        title: "Open Store",
        subPage: true,
        inlineHeader: false,
        isChart: false,
        parent: "/mobile/analytics",
    },
} satisfies Record<string, RouteConfig>;

export const resolveRoute = (path: string): RouteConfig | null => {
    // Static routes: exact suffix match, skip wildcard keys
    const key = Object.keys(mobileRoutes).find(
        (k) => !k.includes("*") && path.endsWith(k),
    );
    if (key) return mobileRoutes[key as keyof typeof mobileRoutes];

    // Dynamic notification sub-routes
    if (path.includes("/mobile/notifications/")) {
        if (path.endsWith("/weather"))
            return mobileRoutes["/mobile/notifications/*/weather"];
        return mobileRoutes["/mobile/notifications/*"];
    }

    return null;
};
