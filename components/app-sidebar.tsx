// //components/app-sidebar.tsx

// "use client";

// import * as React from "react";
// import { usePathname } from "next/navigation"; // ✅ Add this import
// import {
//     LayoutDashboard,
//     ShoppingCart,
//     Store,
//     Users,
//     Package,
//     GalleryVerticalEnd,
//     AudioWaveform,
//     Command,
//     CreditCard,
// } from "lucide-react";

// import { NavMain } from "@/components/nav-main";
// import { NavSearch } from "@/components/nav-search";

// import { NavUser } from "@/components/nav-user";
// import { TeamSwitcher } from "@/components/team-switcher";
// import {
//     Sidebar,
//     SidebarContent,
//     SidebarFooter,
//     SidebarGroup,
//     SidebarGroupLabel,
//     SidebarHeader,
//     SidebarRail,
// } from "@/components/ui/sidebar";

// import { useTenantSlug } from "@/lib/tenant-url";
// import { StoreSwitcher } from "./store-switcher";

// export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
//     const { url } = useTenantSlug();
//     const pathname = usePathname(); // ✅ Get current pathname

//     // ✅ Sidebar data with dynamic isActive based on pathname
//     const data = React.useMemo(
//         () => ({
//             user: {
//                 name: "shadcn",
//                 email: "m@example.com",
//                 avatar: "/avatars/shadcn.jpg",
//             },
//             teams: [
//                 {
//                     name: "Acme Inc",
//                     logo: GalleryVerticalEnd,
//                     plan: "Enterprise",
//                 },
//                 {
//                     name: "Acme Corp.",
//                     logo: AudioWaveform,
//                     plan: "Startup",
//                 },
//                 {
//                     name: "Evil Corp.",
//                     logo: Command,
//                     plan: "Free",
//                 },
//             ],
//             navMain: [
//                 {
//                     title: "Dashboard",
//                     url: url("/admin"),
//                     icon: LayoutDashboard,
//                     isActive: pathname === url("/admin"), // ✅ Dynamic active state
//                     items: [],
//                 },
//                 {
//                     title: "POS",
//                     url: url("/admin/pos"),
//                     icon: CreditCard, // 💡 choose an appropriate icon
//                     isActive: pathname === url("/admin/pos"),
//                     items: [],
//                 },
//                 {
//                     title: "Orders",
//                     url: url("/admin/orders"),
//                     icon: ShoppingCart,
//                     isActive: pathname === url("/admin/orders"),
//                     items: [],
//                 },
//                 {
//                     title: "Products",
//                     url: url("/admin/products"),
//                     icon: Package,
//                     isActive: pathname === url("/admin/products"),
//                     items: [],
//                 },
//                 {
//                     title: "Stores",
//                     url: url("/admin/stores"),
//                     icon: Store,
//                     isActive: pathname === url("/admin/stores"),
//                     items: [],
//                 },
//                 {
//                     title: "Manage Users",
//                     url: url("/admin/users"),
//                     icon: Users,
//                     isActive: pathname === url("/admin/users"),
//                     items: [],
//                 },
//             ],
//         }),
//         [url, pathname] // ✅ Add pathname to dependencies
//     );

//     return (
//         <Sidebar collapsible="icon" {...props}>
//             {/* <SidebarHeader>
//                 <TeamSwitcher teams={data.teams} />
//             </SidebarHeader> */}
//             <SidebarHeader>
//                 <StoreSwitcher />
//             </SidebarHeader>
//             <SidebarContent>
//                 {/* <SidebarGroup>
//                     <SidebarGroupLabel>Stores</SidebarGroupLabel>
//                     <StoreSwitcher />
//                 </SidebarGroup> */}
//                 <SidebarGroup>
//                     <NavSearch items={data.navMain} />
//                 </SidebarGroup>

//                 <NavMain label="General" items={data.navMain} />
//             </SidebarContent>
//             <SidebarFooter>
//                 <NavUser user={data.user} />
//             </SidebarFooter>
//             <SidebarRail />
//         </Sidebar>
//     );
// }

// "use client";

// import * as React from "react";
// import { usePathname } from "next/navigation";
// import {
//     LayoutDashboard,
//     ShoppingCart,
//     Store,
//     Users,
//     Package,
//     GalleryVerticalEnd,
//     AudioWaveform,
//     Command,
//     CreditCard,
// } from "lucide-react";

// import { NavMain } from "@/components/nav-main";
// import { NavSearch } from "@/components/nav-search";
// import { NavUser } from "@/components/nav-user";
// import {
//     Sidebar,
//     SidebarContent,
//     SidebarFooter,
//     SidebarGroup,
//     SidebarGroupLabel,
//     SidebarHeader,
//     SidebarRail,
// } from "@/components/ui/sidebar";

// import { useTenantSlug } from "@/lib/tenant-url";
// import { StoreSwitcher } from "./store-switcher";
// import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider"; // ✅ import hook

// export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
//     const { url } = useTenantSlug();
//     const pathname = usePathname();
//     const { scope, storeId } = useStoreScope(); // ✅ get current scope info

//     // ✅ Helper: build correct URL depending on current scope
//     const buildScopedUrl = React.useCallback(
//         (path: string) => {
//             if (scope === "store" && storeId) {
//                 return url(`/admin/${storeId}${path}`);
//             }
//             return url(`/admin${path}`);
//         },
//         [scope, storeId, url]
//     );

//     // ✅ Sidebar data
//     const data = React.useMemo(
//         () => ({
//             user: {
//                 name: "shadcn",
//                 email: "m@example.com",
//                 avatar: "/avatars/shadcn.jpg",
//             },
//             navMain: [
//                 {
//                     title: "Dashboard",
//                     url: buildScopedUrl(""),
//                     icon: LayoutDashboard,
//                     isActive:
//                         pathname === buildScopedUrl("") ||
//                         pathname === buildScopedUrl("/"),
//                     items: [],
//                 },
//                 {
//                     title: "POS",
//                     url: buildScopedUrl("/pos"),
//                     icon: CreditCard,
//                     isActive: pathname.startsWith(buildScopedUrl("/pos")),
//                     items: [],
//                 },
//                 {
//                     title: "Orders",
//                     url: buildScopedUrl("/orders"),
//                     icon: ShoppingCart,
//                     isActive: pathname.startsWith(buildScopedUrl("/orders")),
//                     items: [],
//                 },
//                 {
//                     title: "Products",
//                     url: buildScopedUrl("/products"),
//                     icon: Package,
//                     isActive: pathname.startsWith(buildScopedUrl("/products")),
//                     items: [],
//                 },
//                 {
//                     title: "Stores",
//                     url: buildScopedUrl("/stores"),
//                     icon: Store,
//                     isActive: pathname.startsWith(buildScopedUrl("/stores")),
//                     items: [],
//                 },
//                 {
//                     title: "Manage Users",
//                     url: buildScopedUrl("/users"),
//                     icon: Users,
//                     isActive: pathname.startsWith(buildScopedUrl("/users")),
//                     items: [],
//                 },
//             ],
//         }),
//         [pathname, buildScopedUrl]
//     );

//     return (
//         <Sidebar collapsible="icon" {...props}>
//             <SidebarHeader>
//                 <StoreSwitcher />
//             </SidebarHeader>

//             <SidebarContent>
//                 <SidebarGroup>
//                     <NavSearch items={data.navMain} />
//                 </SidebarGroup>

//                 <NavMain label="General" items={data.navMain} />
//             </SidebarContent>

//             <SidebarFooter>
//                 <NavUser user={data.user} />
//             </SidebarFooter>

//             <SidebarRail />
//         </Sidebar>
//     );
// }

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

import { useTenantSlug } from "@/lib/tenant-url";
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
            user: {
                name: "shadcn",
                email: "m@example.com",
                avatar: "/avatars/shadcn.jpg",
            },
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
                <NavUser user={data.user} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
