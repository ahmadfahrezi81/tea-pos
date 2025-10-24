// app/[tenantSlug]/admin/orders/_components/store-selector.tsx
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface Store {
    id: string;
    name: string;
}

interface StoreSelectorProps {
    stores: Store[];
    selectedStoreIds: string[];
    onSelectionChange: (storeIds: string[]) => void;
}

export function StoreSelector({
    stores,
    selectedStoreIds,
    onSelectionChange,
}: StoreSelectorProps) {
    const [open, setOpen] = useState(false);

    const allStoresSelected =
        selectedStoreIds.length === 0 ||
        selectedStoreIds.length === stores.length;

    const handleSelectAll = () => {
        onSelectionChange([]);
    };

    const handleToggleStore = (storeId: string) => {
        if (selectedStoreIds.includes(storeId)) {
            const newSelection = selectedStoreIds.filter(
                (id) => id !== storeId
            );
            onSelectionChange(newSelection);
        } else {
            onSelectionChange([...selectedStoreIds, storeId]);
        }
    };

    const displayText = useMemo(() => {
        if (allStoresSelected) {
            return "All Stores";
        }
        if (selectedStoreIds.length === 1) {
            const store = stores.find((s) => s.id === selectedStoreIds[0]);
            return store?.name || "1 store";
        }
        return `${selectedStoreIds.length} stores`;
    }, [allStoresSelected, selectedStoreIds, stores]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[240px] justify-between"
                >
                    <div className="flex items-center gap-2 truncate">
                        <Store className="h-4 w-4 shrink-0" />
                        <span className="truncate">{displayText}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
                <div className="max-h-[300px] overflow-y-auto">
                    <div className="p-2">
                        {/* Select All Option */}
                        <div
                            className={cn(
                                "flex items-center gap-2 rounded-sm px-2 py-2 cursor-pointer hover:bg-accent",
                                allStoresSelected && "bg-accent"
                            )}
                            onClick={handleSelectAll}
                        >
                            <div
                                className={cn(
                                    "h-4 w-4 rounded-sm border flex items-center justify-center",
                                    allStoresSelected
                                        ? "bg-primary border-primary"
                                        : "border-input"
                                )}
                            >
                                {allStoresSelected && (
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                            </div>
                            <span className="text-sm font-medium">
                                All Stores
                            </span>
                        </div>

                        <div className="my-2 h-px bg-border" />

                        {/* Individual Stores */}
                        {stores.map((store) => {
                            const isSelected = selectedStoreIds.includes(
                                store.id
                            );
                            return (
                                <div
                                    key={store.id}
                                    className={cn(
                                        "flex items-center gap-2 rounded-sm px-2 py-2 cursor-pointer hover:bg-accent",
                                        isSelected && "bg-accent"
                                    )}
                                    onClick={() => handleToggleStore(store.id)}
                                >
                                    <div
                                        className={cn(
                                            "h-4 w-4 rounded-sm border flex items-center justify-center",
                                            isSelected
                                                ? "bg-primary border-primary"
                                                : "border-input"
                                        )}
                                    >
                                        {isSelected && (
                                            <Check className="h-3 w-3 text-primary-foreground" />
                                        )}
                                    </div>
                                    <span className="text-sm truncate">
                                        {store.name}
                                    </span>
                                </div>
                            );
                        })}

                        {stores.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No stores found
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Footer */}
                {!allStoresSelected && selectedStoreIds.length > 0 && (
                    <div className="border-t p-2">
                        <div className="flex items-center gap-1 flex-wrap">
                            {selectedStoreIds.slice(0, 2).map((id) => {
                                const store = stores.find((s) => s.id === id);
                                return (
                                    <Badge
                                        key={id}
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {store?.name || "Unknown"}
                                    </Badge>
                                );
                            })}
                            {selectedStoreIds.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                    +{selectedStoreIds.length - 2} more
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
