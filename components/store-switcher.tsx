// "use client";

// import * as React from "react";
// import { Check, ChevronsUpDown, Store } from "lucide-react";
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuLabel,
//     DropdownMenuSeparator,
//     DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//     SidebarMenu,
//     SidebarMenuButton,
//     SidebarMenuItem,
//     useSidebar,
// } from "@/components/ui/sidebar";
// import { useAllStores } from "@/lib/hooks/stores/useAllStores";
// import { cn } from "@/lib/utils";

// export function StoreSwitcher() {
//     const { isMobile } = useSidebar();
//     const { data, isLoading } = useAllStores();

//     const stores = data?.stores || [];
//     const [activeStore, setActiveStore] = React.useState<{
//         id: string;
//         name: string;
//     }>({ id: "all", name: "All Stores" });

//     return (
//         <SidebarMenu>
//             <SidebarMenuItem>
//                 <DropdownMenu>
//                     <DropdownMenuTrigger asChild className="py-4">
//                         <SidebarMenuButton
//                             size="sm"
//                             className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground text-sm"
//                         >
//                             <div className="flex items-center gap-2 truncate">
//                                 <Store className="size-4 opacity-80 shrink-0" />
//                                 <span className="truncate max-w-[120px]">
//                                     {isLoading
//                                         ? "Loading..."
//                                         : activeStore.name || "All Stores"}
//                                 </span>
//                             </div>
//                             <ChevronsUpDown className="ml-auto size-4 opacity-60 shrink-0" />
//                         </SidebarMenuButton>
//                     </DropdownMenuTrigger>

//                     <DropdownMenuContent
//                         className="min-w-52 rounded-lg"
//                         align="start"
//                         side={isMobile ? "bottom" : "right"}
//                         sideOffset={4}
//                     >
//                         <DropdownMenuLabel className="text-muted-foreground text-xs">
//                             Stores
//                         </DropdownMenuLabel>

//                         {/* All Stores Option */}
//                         <DropdownMenuItem
//                             onClick={() =>
//                                 setActiveStore({
//                                     id: "all",
//                                     name: "All Stores",
//                                 })
//                             }
//                             className="flex items-center justify-between"
//                         >
//                             <span>All Stores</span>
//                             {activeStore.id === "all" && (
//                                 <Check className="h-4 w-4 text-primary" />
//                             )}
//                         </DropdownMenuItem>

//                         {/* Divider */}
//                         <DropdownMenuSeparator />

//                         {/* Individual Stores */}
//                         {stores.map((store) => (
//                             <DropdownMenuItem
//                                 key={store.id}
//                                 onClick={() =>
//                                     setActiveStore({
//                                         id: store.id,
//                                         name: store.name,
//                                     })
//                                 }
//                                 className={cn(
//                                     "flex items-center justify-between",
//                                     activeStore.id === store.id && "bg-accent"
//                                 )}
//                             >
//                                 <span>{store.name}</span>
//                                 {activeStore.id === store.id && (
//                                     <Check className="h-4 w-4 text-primary" />
//                                 )}
//                             </DropdownMenuItem>
//                         ))}

//                         {!isLoading && stores.length === 0 && (
//                             <div className="py-2 text-center text-sm text-muted-foreground">
//                                 No stores found
//                             </div>
//                         )}
//                     </DropdownMenuContent>
//                 </DropdownMenu>
//             </SidebarMenuItem>
//         </SidebarMenu>
//     );
// }
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Store } from "lucide-react";

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
import { useAllStores } from "@/lib/hooks/stores/useAllStores";
import { cn } from "@/lib/utils";

export function StoreSwitcher() {
    const { isMobile } = useSidebar();
    const { data, isLoading } = useAllStores();

    const stores = data?.stores || [];
    const [activeStore, setActiveStore] = React.useState<{
        id: string;
        name: string;
    }>({
        id: "all",
        name: "All Stores",
    });

    if (isLoading) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" disabled>
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                            <Store className="size-4" />
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
                                <Store className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {activeStore.name}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {activeStore.id === "all"
                                        ? "All locations"
                                        : "Address"}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto opacity-60" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Stores
                        </DropdownMenuLabel>

                        {/* ALL STORES FIRST */}
                        <DropdownMenuItem
                            onClick={() =>
                                setActiveStore({
                                    id: "all",
                                    name: "All Stores",
                                })
                            }
                            className="gap-2 p-2"
                        >
                            <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                <Store className="size-3.5 shrink-0" />
                            </div>
                            <span>All Stores</span>
                            {activeStore.id === "all" && (
                                <Check className="ml-auto size-4 text-primary" />
                            )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* INDIVIDUAL STORES */}
                        {stores.map((store) => (
                            <DropdownMenuItem
                                key={store.id}
                                onClick={() =>
                                    setActiveStore({
                                        id: store.id,
                                        name: store.name,
                                    })
                                }
                                className={cn(
                                    "gap-2 p-2",
                                    activeStore.id === store.id &&
                                        "bg-sidebar-accent"
                                )}
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                    <Store className="size-3.5 shrink-0" />
                                </div>
                                <span>{store.name}</span>
                                {activeStore.id === store.id && (
                                    <Check className="ml-auto size-4 text-primary" />
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />

                        {/* ADD STORE */}
                        <DropdownMenuItem className="gap-2 p-2">
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
