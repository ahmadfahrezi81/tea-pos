"use client";

import { usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTenantSlug } from "@/lib/tenant-url";
import React from "react";

export function DynamicBreadcrumb() {
    const pathname = usePathname();
    const { url } = useTenantSlug();

    // Generate breadcrumb segments from pathname
    const generateBreadcrumbs = () => {
        const segments = pathname.split("/").filter(Boolean);

        // Find the admin index and take everything after it
        const adminIndex = segments.findIndex((seg) => seg === "admin");
        const breadcrumbSegments = segments.slice(adminIndex);

        return breadcrumbSegments.map((segment, index) => {
            const isLast = index === breadcrumbSegments.length - 1;
            const href = url(
                `/admin${breadcrumbSegments
                    .slice(1, index + 1)
                    .map((s) => `/${s}`)
                    .join("")}`
            );

            // Capitalize and format segment name
            const label = segment
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

            return {
                label: label === "Admin" ? "Home" : label,
                href: href,
                isLast,
            };
        });
    };

    const breadcrumbs = generateBreadcrumbs();

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.href}>
                        <BreadcrumbItem
                            className={index === 0 ? "hidden md:block" : ""}
                        >
                            {crumb.isLast ? (
                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={crumb.href}>
                                    {crumb.label}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>

                        {/* Only render separator if not the last crumb */}
                        {!crumb.isLast && (
                            <BreadcrumbSeparator className="hidden md:block" />
                        )}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
