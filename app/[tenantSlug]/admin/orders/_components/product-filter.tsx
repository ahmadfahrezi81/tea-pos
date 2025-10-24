// app/[tenantSlug]/admin/orders/_components/product-filter.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
}

interface ProductFilterProps {
    products: Product[];
    selectedProductIds: string[];
    onSelectionChange: (productIds: string[]) => void;
}

export function ProductFilter({
    products,
    selectedProductIds,
    onSelectionChange,
}: ProductFilterProps) {
    const [open, setOpen] = useState(false);

    const handleToggleProduct = (productId: string) => {
        if (selectedProductIds.includes(productId)) {
            onSelectionChange(
                selectedProductIds.filter((id) => id !== productId)
            );
        } else {
            onSelectionChange([...selectedProductIds, productId]);
        }
    };

    const handleClear = () => {
        onSelectionChange([]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 border-dashed h-auto min-h-8 py-2"
                >
                    <Plus className="h-4 w-4" />
                    Product
                    {selectedProductIds.length > 0 && (
                        <>
                            <div className="h-4 w-px bg-border" />
                            <div className="flex gap-1">
                                {selectedProductIds.slice(0, 2).map((id) => {
                                    const product = products.find(
                                        (p) => p.id === id
                                    );
                                    return (
                                        <Badge
                                            key={id}
                                            variant="secondary"
                                            className="rounded-sm px-1 font-normal"
                                        >
                                            {product?.name || "Unknown"}
                                        </Badge>
                                    );
                                })}
                                {selectedProductIds.length > 2 && (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm px-1 font-normal"
                                    >
                                        +{selectedProductIds.length - 2}
                                    </Badge>
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
                <div className="max-h-[300px] overflow-y-auto">
                    <div className="p-2">
                        <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-sm font-medium">Product</span>
                            {selectedProductIds.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-0 text-xs"
                                    onClick={handleClear}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <div className="space-y-1">
                            {products.map((product) => {
                                const isSelected = selectedProductIds.includes(
                                    product.id
                                );
                                return (
                                    <div
                                        key={product.id}
                                        className="flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent"
                                        onClick={() =>
                                            handleToggleProduct(product.id)
                                        }
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
                                            {product.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        {products.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No products found
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
