"use client";

import * as React from "react";
import { usePathname } from "next/navigation"; // ✅ Add this import
import {
    LayoutDashboard,
    ShoppingCart,
    Store,
    Users,
    Package,
    GalleryVerticalEnd,
    AudioWaveform,
    Command,
    CreditCard,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSearch } from "@/components/nav-search";

import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";

import { useTenantSlug } from "@/lib/tenant-url";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { url } = useTenantSlug();
    const pathname = usePathname(); // ✅ Get current pathname

    // ✅ Sidebar data with dynamic isActive based on pathname
    const data = React.useMemo(
        () => ({
            user: {
                name: "shadcn",
                email: "m@example.com",
                avatar: "/avatars/shadcn.jpg",
            },
            teams: [
                {
                    name: "Acme Inc",
                    logo: GalleryVerticalEnd,
                    plan: "Enterprise",
                },
                {
                    name: "Acme Corp.",
                    logo: AudioWaveform,
                    plan: "Startup",
                },
                {
                    name: "Evil Corp.",
                    logo: Command,
                    plan: "Free",
                },
            ],
            navMain: [
                {
                    title: "Dashboard",
                    url: url("/admin"),
                    icon: LayoutDashboard,
                    isActive: pathname === url("/admin"), // ✅ Dynamic active state
                    items: [],
                },
                {
                    title: "POS",
                    url: url("/admin/pos"),
                    icon: CreditCard, // 💡 choose an appropriate icon
                    isActive: pathname === url("/admin/pos"),
                    items: [],
                },
                {
                    title: "Orders",
                    url: url("/admin/orders"),
                    icon: ShoppingCart,
                    isActive: pathname === url("/admin/orders"),
                    items: [],
                },
                {
                    title: "Products",
                    url: url("/admin/products"),
                    icon: Package,
                    isActive: pathname === url("/admin/products"),
                    items: [],
                },
                {
                    title: "Stores",
                    url: url("/admin/stores"),
                    icon: Store,
                    isActive: pathname === url("/admin/stores"),
                    items: [],
                },
                {
                    title: "Users",
                    url: url("/admin/users"),
                    icon: Users,
                    isActive: pathname === url("/admin/users"),
                    items: [],
                },
            ],
        }),
        [url, pathname] // ✅ Add pathname to dependencies
    );

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <NavSearch items={data.navMain} />
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
