"use client";

import * as React from "react";
import { Box, Boxes } from "lucide-react";
import { useTenant } from "@/app/[tenantSlug]/TenantProvider";
import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider";
import { cn } from "@/lib/utils";

interface ScopeBadgeProps {
    className?: string;
    showIcon?: boolean;
}

export function ScopeBadge({ className, showIcon = true }: ScopeBadgeProps) {
    const { tenantName } = useTenant();
    const { scope, storeName } = useStoreScope();

    const isCompany = scope === "company";
    const Icon = isCompany ? Boxes : Box;
    const label = isCompany
        ? tenantName || "Company"
        : storeName || "Loading...";

    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-mono bg-background text-foreground border border-border mb-1 w-fit",
                className
            )}
            // className={cn(
            //     "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground w-fit bg-muted/50 mb-1",
            //     className
            // )}
        >
            {showIcon && <Icon size={14} />}
            <span>{label}</span>
        </div>
    );
}
