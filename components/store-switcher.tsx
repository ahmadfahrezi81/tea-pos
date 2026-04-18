//components/store-switcher.tsx
"use client";

import * as React from "react";
import { Box, Boxes, Check, ChevronsUpDown, Plus } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { useStores } from "@/lib/client/hooks/stores/useStores";
import { cn } from "@/lib/shared/utils/cn";
import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider";
import { useTenant } from "@/app/[tenantSlug]/TenantProvider";

export function StoreSwitcher() {
    const { isMobile } = useSidebar();
    const { data, isLoading } = useStores();
    const { scope, storeId, switchStore } = useStoreScope();
    const { tenantName } = useTenant();

    const stores = data?.stores || [];

    const ActiveIcon = scope === "company" ? Boxes : Box;
    const activeStoreName =
        scope === "company"
            ? tenantName || "Company"
            : stores.find((s) => s.id === storeId)?.name || "Loading...";

    if (isLoading) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" disabled>
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                            <Boxes className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">
                                Loading...
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                Please wait
                            </span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-sm">
                                <ActiveIcon size={20} />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {activeStoreName}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {scope === "company"
                                        ? "All Stores (Overview)"
                                        : "Store Details"}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            All Stores (Overview)
                        </DropdownMenuLabel>

                        {/* ✅ ALL STORES */}
                        <DropdownMenuItem
                            onClick={() => switchStore("all")}
                            className={cn(
                                "gap-2 p-2",
                                scope === "company" && "bg-sidebar-accent",
                            )}
                        >
                            <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                <Boxes className="size-3.5 shrink-0" />
                            </div>
                            <span>{tenantName || "Company"}</span>
                            {scope === "company" && (
                                <Check className="ml-auto size-4 text-primary" />
                            )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Stores
                        </DropdownMenuLabel>

                        {stores.map((s) => (
                            <DropdownMenuItem
                                key={s.id}
                                onClick={() => switchStore(s.id)}
                                className={cn(
                                    "gap-2 p-2",
                                    storeId === s.id && "bg-sidebar-accent",
                                )}
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                    <Box className="size-3.5 shrink-0" />
                                </div>
                                <span>{s.name}</span>
                                {storeId === s.id && (
                                    <Check className="ml-auto size-4 text-primary" />
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 p-2" disabled>
                            <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                <Plus className="size-4" />
                            </div>
                            <div className="text-muted-foreground font-medium">
                                Add Store
                            </div>
                        </DropdownMenuItem>

                        {!isLoading && stores.length === 0 && (
                            <div className="py-2 text-center text-sm text-muted-foreground">
                                No stores found
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
