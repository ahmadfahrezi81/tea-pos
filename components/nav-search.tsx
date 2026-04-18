"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    LayoutDashboard,
    ShoppingCart,
    Users,
    CreditCard,
    Package,
    Store,
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useStores } from "@/lib/client/hooks/stores/useStores";
import { useTenantSlug } from "@/lib/server/config/tenant-url";

export function NavSearch() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();
    const { data } = useStores();
    const { url } = useTenantSlug();

    const stores = data?.stores || [];

    // 🔹 Open dialog with ⌘K or Ctrl+K
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const handleSelect = (path: string) => {
        setOpen(false);
        router.push(path);
    };

    // 🔹 Company-level pages
    const companyPages = [
        {
            title: "Dashboard",
            url: url("/admin"),
            icon: LayoutDashboard,
        },
        {
            title: "POS",
            url: url("/admin/pos"),
            icon: CreditCard,
        },
        {
            title: "Orders",
            url: url("/admin/orders"),
            icon: ShoppingCart,
        },
        { title: "Products", url: url("/admin/products"), icon: Package },
        { title: "Stores", url: url("/admin/stores"), icon: Store },
        { title: "Users", url: url("/admin/users"), icon: Users },
    ];

    // 🔹 Store-level pages (for each store)
    const storePages = stores.flatMap((store) => [
        {
            title: `${store.name} • Dashboard`,
            url: url(`/admin/${store.id}`),
            icon: LayoutDashboard,
        },
        {
            title: `${store.name} • POS`,
            url: url(`/admin/${store.id}/pos`),
            icon: CreditCard,
        },
        {
            title: `${store.name} • Orders`,
            url: url(`/admin/${store.id}/orders`),
            icon: ShoppingCart,
        },
        {
            title: `${store.name} • Users`,
            url: url(`/admin/${store.id}/users`),
            icon: Users,
        },
    ]);

    // 🔹 Scope-sensitive results
    // const items =
    //     scope === "store"
    //         ? storePages.filter((i) => i.url.includes(`/admin/${storeId}`))
    //         : [...companyPages, ...storePages];

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => setOpen(true)}
                        tooltip="Search"
                    >
                        <Search className="h-4 w-4" />
                        <span>Search</span>
                        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Search pages..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    {/* Company Pages */}
                    <CommandGroup heading="Company Pages">
                        {companyPages.map((item) => {
                            const Icon = item.icon;
                            return (
                                <CommandItem
                                    key={item.url}
                                    onSelect={() => handleSelect(item.url)}
                                >
                                    <Icon className="mr-2 h-4 w-4" />
                                    <span>{item.title}</span>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>

                    {/* Store Pages */}
                    <CommandGroup heading="Stores Pages">
                        {storePages.map((item) => {
                            const Icon = item.icon;
                            return (
                                <CommandItem
                                    key={item.url}
                                    onSelect={() => handleSelect(item.url)}
                                >
                                    <Icon className="mr-2 h-4 w-4" />
                                    <span>{item.title}</span>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
