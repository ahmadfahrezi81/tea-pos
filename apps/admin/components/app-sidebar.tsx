"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingCart,
    Store,
    Users,
    Package,
    CreditCard,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSearch } from "@/components/nav-search";
import { NavUser } from "@/components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";

import { useTenantSlug } from "@/lib/server/config/tenant-url";
import { StoreSwitcher } from "./store-switcher";
import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider"; // ✅ import hook

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { url } = useTenantSlug();
    const pathname = usePathname();
    const { scope, storeId } = useStoreScope(); // ✅ get current scope info

    // ✅ Helper: build correct URL depending on current scope
    const buildScopedUrl = React.useCallback(
        (path: string) => {
            if (scope === "store" && storeId) {
                return url(`/admin/${storeId}${path}`);
            }
            return url(`/admin${path}`);
        },
        [scope, storeId, url]
    );

    // ✅ Sidebar data
    const data = React.useMemo(() => {
        // Common nav items (may differ by scope)
        let navMain = [
            {
                title: "Dashboard",
                url: buildScopedUrl(""),
                icon: LayoutDashboard,
                isActive:
                    pathname === buildScopedUrl("") ||
                    pathname === buildScopedUrl("/"),
                items: [],
            },
            {
                title: "POS",
                url: buildScopedUrl("/pos"),
                icon: CreditCard,
                isActive: pathname.startsWith(buildScopedUrl("/pos")),
                items: [],
            },
            {
                title: "Orders",
                url: buildScopedUrl("/orders"),
                icon: ShoppingCart,
                isActive: pathname.startsWith(buildScopedUrl("/orders")),
                items: [],
            },
            {
                title: "Products",
                url: buildScopedUrl("/products"),
                icon: Package,
                isActive: pathname.startsWith(buildScopedUrl("/products")),
                items: [],
            },
            {
                title: "Stores",
                url: buildScopedUrl("/stores"),
                icon: Store,
                isActive: pathname.startsWith(buildScopedUrl("/stores")),
                items: [],
            },
            {
                title: "Manage Users",
                url: buildScopedUrl("/users"),
                icon: Users,
                isActive: pathname.startsWith(buildScopedUrl("/users")),
                items: [],
            },
        ];

        // ✅ If in store scope — hide Products & Stores, and rename others
        if (scope === "store") {
            navMain = navMain
                .filter(
                    (item) =>
                        item.title !== "Products" && item.title !== "Stores"
                )
                .map((item) => {
                    if (item.title === "Dashboard")
                        return { ...item, title: "Dashboard" };
                    if (item.title === "POS") return { ...item, title: "POS" };
                    if (item.title === "Orders")
                        return { ...item, title: "Orders" };
                    if (item.title === "Manage Users")
                        return { ...item, title: "Manage Store People" };
                    return item;
                });
        }

        return {
            navMain,
        };
    }, [pathname, buildScopedUrl, scope]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <StoreSwitcher />
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    {/* <NavSearch items={data.navMain} /> */}
                    <NavSearch />
                </SidebarGroup>

                <NavMain label="General" items={data.navMain} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
