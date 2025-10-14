"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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

interface NavItem {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
}

export function NavSearch({ items }: { items: NavItem[] }) {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();

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

    const handleSelect = (url: string) => {
        setOpen(false);
        router.push(url);
    };

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
                    <CommandGroup heading="Pages">
                        {items.map((item) => {
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
