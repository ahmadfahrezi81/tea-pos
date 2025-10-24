"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    Home,
    ShoppingBag,
    ShoppingCart,
    Store,
    Users,
    Settings,
} from "lucide-react";
import Link from "next/link";

const items = [
    { title: "Dashboard", href: "/admin", icon: Home },
    { title: "Products", href: "/admin/products", icon: ShoppingBag },
    { title: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { title: "Stores", href: "/admin/stores", icon: Store },
    { title: "Users", href: "/admin/users", icon: Users },
    { title: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.href}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
