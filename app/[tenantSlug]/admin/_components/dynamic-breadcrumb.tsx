// // // "use client";

// // // import { usePathname } from "next/navigation";
// // // import {
// // //     Breadcrumb,
// // //     BreadcrumbItem,
// // //     BreadcrumbLink,
// // //     BreadcrumbList,
// // //     BreadcrumbPage,
// // //     BreadcrumbSeparator,
// // // } from "@/components/ui/breadcrumb";
// // // import { useTenantSlug } from "@/lib/tenant-url";
// // // import React from "react";

// // // export function DynamicBreadcrumb() {
// // //     const pathname = usePathname();
// // //     const { url } = useTenantSlug();

// // //     // Generate breadcrumb segments from pathname
// // //     const generateBreadcrumbs = () => {
// // //         const segments = pathname.split("/").filter(Boolean);

// // //         // Find the admin index and take everything after it
// // //         const adminIndex = segments.findIndex((seg) => seg === "admin");
// // //         const breadcrumbSegments = segments.slice(adminIndex);

// // //         return breadcrumbSegments.map((segment, index) => {
// // //             const isLast = index === breadcrumbSegments.length - 1;
// // //             const href = url(
// // //                 `/admin${breadcrumbSegments
// // //                     .slice(1, index + 1)
// // //                     .map((s) => `/${s}`)
// // //                     .join("")}`
// // //             );

// // //             // Capitalize and format segment name
// // //             const label = segment
// // //                 .split("-")
// // //                 .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
// // //                 .join(" ");

// // //             return {
// // //                 label: label === "Admin" ? "Home" : label,
// // //                 href: href,
// // //                 isLast,
// // //             };
// // //         });
// // //     };

// // //     const breadcrumbs = generateBreadcrumbs();

// // //     return (
// // //         <Breadcrumb>
// // //             <BreadcrumbList>
// // //                 {breadcrumbs.map((crumb, index) => (
// // //                     <React.Fragment key={crumb.href}>
// // //                         <BreadcrumbItem
// // //                             className={index === 0 ? "hidden md:block" : ""}
// // //                         >
// // //                             {crumb.isLast ? (
// // //                                 <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
// // //                             ) : (
// // //                                 <BreadcrumbLink href={crumb.href}>
// // //                                     {crumb.label}
// // //                                 </BreadcrumbLink>
// // //                             )}
// // //                         </BreadcrumbItem>

// // //                         {/* Only render separator if not the last crumb */}
// // //                         {!crumb.isLast && (
// // //                             <BreadcrumbSeparator className="hidden md:block" />
// // //                         )}
// // //                     </React.Fragment>
// // //                 ))}
// // //             </BreadcrumbList>
// // //         </Breadcrumb>
// // //     );
// // // }

// // // "use client";

// // // import { usePathname } from "next/navigation";
// // // import {
// // //     Breadcrumb,
// // //     BreadcrumbItem,
// // //     BreadcrumbLink,
// // //     BreadcrumbList,
// // //     BreadcrumbPage,
// // //     BreadcrumbSeparator,
// // // } from "@/components/ui/breadcrumb";
// // // import { useTenantSlug } from "@/lib/tenant-url";
// // // import { Box, Boxes } from "lucide-react";
// // // import React from "react";

// // // export function DynamicBreadcrumb() {
// // //     const pathname = usePathname();
// // //     const { url } = useTenantSlug();

// // //     // Generate breadcrumbs as usual
// // //     const generateBreadcrumbs = () => {
// // //         const segments = pathname.split("/").filter(Boolean);
// // //         const adminIndex = segments.findIndex((seg) => seg === "admin");
// // //         const breadcrumbSegments = segments.slice(adminIndex);

// // //         return breadcrumbSegments.map((segment, index) => {
// // //             const isLast = index === breadcrumbSegments.length - 1;
// // //             const href = url(
// // //                 `/admin${breadcrumbSegments
// // //                     .slice(1, index + 1)
// // //                     .map((s) => `/${s}`)
// // //                     .join("")}`
// // //             );

// // //             const label = segment
// // //                 .split("-")
// // //                 .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
// // //                 .join(" ");

// // //             return {
// // //                 label: label === "Admin" ? "Dashboard" : label,
// // //                 href,
// // //                 isLast,
// // //             };
// // //         });
// // //     };

// // //     const breadcrumbs = generateBreadcrumbs();

// // //     return (
// // //         <Breadcrumb>
// // //             <BreadcrumbList>
// // //                 {/* Home */}
// // //                 {/* <BreadcrumbItem>
// // //                     <BreadcrumbLink href={url("/admin")}>Home</BreadcrumbLink>
// // //                 </BreadcrumbItem>
// // //                 <BreadcrumbSeparator /> */}

// // //                 {/* Company Name badge (fixed for now) */}
// // //                 <BreadcrumbItem>
// // //                     <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
// // //                         <Boxes size={16} />
// // //                         <span>Company Name</span>
// // //                     </div>
// // //                 </BreadcrumbItem>
// // //                 <BreadcrumbSeparator />

// // //                 <BreadcrumbItem>
// // //                     <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
// // //                         <Box size={16} />
// // //                         <span>Store Name</span>
// // //                     </div>
// // //                 </BreadcrumbItem>
// // //                 <BreadcrumbSeparator />

// // //                 {/* Current Page (e.g. Stores) */}
// // //                 <BreadcrumbItem>
// // //                     <BreadcrumbPage>
// // //                         {breadcrumbs[breadcrumbs.length - 1]?.label || "Stores"}
// // //                     </BreadcrumbPage>
// // //                 </BreadcrumbItem>
// // //             </BreadcrumbList>
// // //         </Breadcrumb>
// // //     );
// // // }

// // "use client";

// // import React from "react";
// // import { usePathname } from "next/navigation";
// // import {
// //     Breadcrumb,
// //     BreadcrumbItem,
// //     BreadcrumbLink,
// //     BreadcrumbList,
// //     BreadcrumbPage,
// //     BreadcrumbSeparator,
// // } from "@/components/ui/breadcrumb";
// // import { useTenantSlug } from "@/lib/tenant-url";
// // import { Box, Boxes } from "lucide-react";
// // import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider";

// // export function DynamicBreadcrumb() {
// //     const pathname = usePathname();
// //     const { url } = useTenantSlug();
// //     const { scope, storeId } = useStoreScope();

// //     const [mounted, setMounted] = React.useState(false);
// //     React.useEffect(() => setMounted(true), []);

// //     const humanize = (segment: string) =>
// //         segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// //     const generateBreadcrumbs = React.useCallback(() => {
// //         const segments = pathname.split("/").filter(Boolean);
// //         const adminIndex = segments.findIndex((seg) => seg === "admin");
// //         if (adminIndex === -1) return [];

// //         const afterAdmin = segments.slice(adminIndex + 1);
// //         const breadcrumbSegments =
// //             scope === "store" && afterAdmin.length
// //                 ? afterAdmin.slice(1)
// //                 : afterAdmin;

// //         return breadcrumbSegments.map((segment, index) => {
// //             const isLast = index === breadcrumbSegments.length - 1;
// //             const pathPrefix =
// //                 scope === "store" && storeId ? `/admin/${storeId}` : "/admin";
// //             const href = url(
// //                 `${pathPrefix}/${breadcrumbSegments
// //                     .slice(0, index + 1)
// //                     .join("/")}`
// //             );
// //             return {
// //                 label: humanize(segment),
// //                 href,
// //                 isLast,
// //             };
// //         });
// //     }, [pathname, scope, storeId, url]);

// //     const breadcrumbs = generateBreadcrumbs();

// //     if (!mounted) {
// //         return (
// //             <nav
// //                 aria-label="breadcrumb"
// //                 className="text-sm"
// //                 data-testid="breadcrumb-skeleton"
// //             >
// //                 <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
// //                     <Boxes size={16} />
// //                     <span>Company Name</span>
// //                 </div>
// //             </nav>
// //         );
// //     }

// //     return (
// //         <Breadcrumb>
// //             <BreadcrumbList>
// //                 {/* Company badge */}
// //                 <BreadcrumbItem>
// //                     <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
// //                         <Boxes size={16} />
// //                         <span>Company Name</span>
// //                     </div>
// //                 </BreadcrumbItem>

// //                 {(scope === "store" || breadcrumbs.length > 0) && (
// //                     <BreadcrumbSeparator />
// //                 )}

// //                 {/* Store badge */}
// //                 {scope === "store" && (
// //                     <>
// //                         <BreadcrumbItem>
// //                             <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
// //                                 <Box size={16} />
// //                                 <span>{storeId}</span>
// //                             </div>
// //                         </BreadcrumbItem>
// //                         {breadcrumbs.length > 0 && <BreadcrumbSeparator />}
// //                     </>
// //                 )}

// //                 {/* Dynamic crumbs */}
// //                 {breadcrumbs.length > 0 ? (
// //                     breadcrumbs.map((crumb, i) => (
// //                         <React.Fragment key={i}>
// //                             <BreadcrumbItem>
// //                                 {crumb.isLast ? (
// //                                     <BreadcrumbPage>
// //                                         {crumb.label}
// //                                     </BreadcrumbPage>
// //                                 ) : (
// //                                     <BreadcrumbLink href={crumb.href}>
// //                                         {crumb.label}
// //                                     </BreadcrumbLink>
// //                                 )}
// //                             </BreadcrumbItem>
// //                             {!crumb.isLast && <BreadcrumbSeparator />}
// //                         </React.Fragment>
// //                     ))
// //                 ) : (
// //                     <>
// //                         <BreadcrumbSeparator />
// //                         <BreadcrumbItem>
// //                             <BreadcrumbPage>Dashboard</BreadcrumbPage>
// //                         </BreadcrumbItem>
// //                     </>
// //                 )}
// //             </BreadcrumbList>
// //         </Breadcrumb>
// //     );
// // }

// // "use client";

// // import React from "react";
// // import { usePathname } from "next/navigation";
// // import {
// //     Breadcrumb,
// //     BreadcrumbItem,
// //     BreadcrumbLink,
// //     BreadcrumbList,
// //     BreadcrumbPage,
// //     BreadcrumbSeparator,
// // } from "@/components/ui/breadcrumb";
// // import { useTenantSlug } from "@/lib/tenant-url";
// // import { Box, Boxes } from "lucide-react";
// // import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider";

// // export function DynamicBreadcrumb() {
// //     const pathname = usePathname();
// //     const { url } = useTenantSlug();
// //     const { scope, storeId, storeName } = useStoreScope(); // ✅ now also pulling storeName

// //     const [mounted, setMounted] = React.useState(false);
// //     React.useEffect(() => setMounted(true), []);

// //     const humanize = (segment: string) =>
// //         segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// //     const generateBreadcrumbs = React.useCallback(() => {
// //         const segments = pathname.split("/").filter(Boolean);
// //         const adminIndex = segments.findIndex((seg) => seg === "admin");
// //         if (adminIndex === -1) return [];

// //         const afterAdmin = segments.slice(adminIndex + 1);
// //         const breadcrumbSegments =
// //             scope === "store" && afterAdmin.length
// //                 ? afterAdmin.slice(1)
// //                 : afterAdmin;

// //         return breadcrumbSegments.map((segment, index) => {
// //             const isLast = index === breadcrumbSegments.length - 1;
// //             const pathPrefix =
// //                 scope === "store" && storeId ? `/admin/${storeId}` : "/admin";
// //             const href = url(
// //                 `${pathPrefix}/${breadcrumbSegments
// //                     .slice(0, index + 1)
// //                     .join("/")}`
// //             );
// //             return {
// //                 label: humanize(segment),
// //                 href,
// //                 isLast,
// //             };
// //         });
// //     }, [pathname, scope, storeId, url]);

// //     const breadcrumbs = generateBreadcrumbs();

// //     if (!mounted) {
// //         return (
// //             <nav
// //                 aria-label="breadcrumb"
// //                 className="text-sm"
// //                 data-testid="breadcrumb-skeleton"
// //             >
// //                 <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
// //                     <Boxes size={16} />
// //                     <span>Company Name</span>
// //                 </div>
// //             </nav>
// //         );
// //     }

// //     return (
// //         <Breadcrumb>
// //             <BreadcrumbList>
// //                 {/* Company badge */}
// //                 <BreadcrumbItem>
// //                     <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
// //                         <Boxes size={16} />
// //                         <span>Company Name</span>
// //                     </div>
// //                 </BreadcrumbItem>

// //                 {(scope === "store" || breadcrumbs.length > 0) && (
// //                     <BreadcrumbSeparator />
// //                 )}

// //                 {/* ✅ Store badge now shows storeName instead of storeId */}
// //                 {scope === "store" && (
// //                     <>
// //                         <BreadcrumbItem>
// //                             <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
// //                                 <Box size={16} />
// //                                 <span>{storeName || "Loading..."}</span>
// //                             </div>
// //                         </BreadcrumbItem>
// //                         {breadcrumbs.length > 0 && <BreadcrumbSeparator />}
// //                     </>
// //                 )}

// //                 {/* Dynamic crumbs */}
// //                 {breadcrumbs.length > 0 ? (
// //                     breadcrumbs.map((crumb, i) => (
// //                         <React.Fragment key={i}>
// //                             <BreadcrumbItem>
// //                                 {crumb.isLast ? (
// //                                     <BreadcrumbPage>
// //                                         {crumb.label}
// //                                     </BreadcrumbPage>
// //                                 ) : (
// //                                     <BreadcrumbLink href={crumb.href}>
// //                                         {crumb.label}
// //                                     </BreadcrumbLink>
// //                                 )}
// //                             </BreadcrumbItem>
// //                             {!crumb.isLast && <BreadcrumbSeparator />}
// //                         </React.Fragment>
// //                     ))
// //                 ) : (
// //                     <>
// //                         <BreadcrumbSeparator />
// //                         <BreadcrumbItem>
// //                             <BreadcrumbPage>Dashboard</BreadcrumbPage>
// //                         </BreadcrumbItem>
// //                     </>
// //                 )}
// //             </BreadcrumbList>
// //         </Breadcrumb>
// //     );
// // }

// "use client";

// import React from "react";
// import { usePathname } from "next/navigation";
// import {
//     Breadcrumb,
//     BreadcrumbItem,
//     BreadcrumbLink,
//     BreadcrumbList,
//     BreadcrumbPage,
//     BreadcrumbSeparator,
// } from "@/components/ui/breadcrumb";
// import { useTenantSlug } from "@/lib/tenant-url";
// import { Box, Boxes } from "lucide-react";
// import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider";
// import { useTenant } from "@/app/[tenantSlug]/TenantProvider"; // ✅ import tenant context

// export function DynamicBreadcrumb() {
//     const pathname = usePathname();
//     const { url } = useTenantSlug();
//     const { scope, storeId, storeName } = useStoreScope();
//     const { tenantName } = useTenant(); // ✅ get tenant name from provider

//     const [mounted, setMounted] = React.useState(false);
//     React.useEffect(() => setMounted(true), []);

//     const humanize = (segment: string) =>
//         segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

//     const generateBreadcrumbs = React.useCallback(() => {
//         const segments = pathname.split("/").filter(Boolean);
//         const adminIndex = segments.findIndex((seg) => seg === "admin");
//         if (adminIndex === -1) return [];

//         const afterAdmin = segments.slice(adminIndex + 1);
//         const breadcrumbSegments =
//             scope === "store" && afterAdmin.length
//                 ? afterAdmin.slice(1)
//                 : afterAdmin;

//         return breadcrumbSegments.map((segment, index) => {
//             const isLast = index === breadcrumbSegments.length - 1;
//             const pathPrefix =
//                 scope === "store" && storeId ? `/admin/${storeId}` : "/admin";
//             const href = url(
//                 `${pathPrefix}/${breadcrumbSegments
//                     .slice(0, index + 1)
//                     .join("/")}`
//             );
//             return {
//                 label: humanize(segment),
//                 href,
//                 isLast,
//             };
//         });
//     }, [pathname, scope, storeId, url]);

//     const breadcrumbs = generateBreadcrumbs();

//     if (!mounted) {
//         return (
//             <nav
//                 aria-label="breadcrumb"
//                 className="text-sm"
//                 data-testid="breadcrumb-skeleton"
//             >
//                 <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
//                     <Boxes size={16} />
//                     <span>{tenantName || "Company"}</span>
//                 </div>
//             </nav>
//         );
//     }

//     return (
//         <Breadcrumb>
//             <BreadcrumbList>
//                 {/* ✅ Tenant (company) badge now uses tenantName */}
//                 <BreadcrumbItem>
//                     <div className="inline-flex items-center gap-2 rounded-md bg-muted/40 px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer font-mono">
//                         <Boxes size={18} />
//                         <span>{tenantName || "Company"}</span>
//                     </div>
//                 </BreadcrumbItem>

//                 {(scope === "store" || breadcrumbs.length > 0) && (
//                     <BreadcrumbSeparator />
//                 )}

//                 {/* ✅ Store badge shows name */}
//                 {scope === "store" && (
//                     <>
//                         <BreadcrumbItem>
//                             {/* <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"> */}
//                             <div className="inline-flex items-center gap-2 rounded-md bg-muted/40 px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer font-mono">
//                                 <Box size={18} />
//                                 <span>{storeName || "Loading..."}</span>
//                             </div>
//                         </BreadcrumbItem>
//                         {breadcrumbs.length > 0 && <BreadcrumbSeparator />}
//                     </>
//                 )}

//                 {/* ✅ Dynamic path crumbs */}
//                 {breadcrumbs.length > 0 ? (
//                     breadcrumbs.map((crumb, i) => (
//                         <React.Fragment key={i}>
//                             <BreadcrumbItem>
//                                 {crumb.isLast ? (
//                                     <BreadcrumbPage>
//                                         {crumb.label}
//                                     </BreadcrumbPage>
//                                 ) : (
//                                     <BreadcrumbLink href={crumb.href}>
//                                         {crumb.label}
//                                     </BreadcrumbLink>
//                                 )}
//                             </BreadcrumbItem>
//                             {!crumb.isLast && <BreadcrumbSeparator />}
//                         </React.Fragment>
//                     ))
//                 ) : (
//                     <>
//                         <BreadcrumbSeparator />
//                         <BreadcrumbItem>
//                             <BreadcrumbPage>Dashboard</BreadcrumbPage>
//                         </BreadcrumbItem>
//                     </>
//                 )}
//             </BreadcrumbList>
//         </Breadcrumb>
//     );
// }

"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAllStores } from "@/lib/hooks/stores/useAllStores";
import { useTenantSlug } from "@/lib/tenant-url";
import { Box, Boxes, ChevronsUpDown, Check } from "lucide-react";
import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider";
import { useTenant } from "@/app/[tenantSlug]/TenantProvider";
import { cn } from "@/lib/utils";

export function DynamicBreadcrumb() {
    const pathname = usePathname();
    const router = useRouter();
    const { url } = useTenantSlug();
    const { scope, storeId, storeName, switchStore } = useStoreScope();
    const { tenantName } = useTenant();
    const { data, isLoading } = useAllStores();

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const humanize = (segment: string) => {
        const lower = segment.toLowerCase();
        if (lower === "pos") return "POS";
        return segment
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const generateBreadcrumbs = React.useCallback(() => {
        const segments = pathname.split("/").filter(Boolean);
        const adminIndex = segments.findIndex((seg) => seg === "admin");
        if (adminIndex === -1) return [];

        const afterAdmin = segments.slice(adminIndex + 1);
        const breadcrumbSegments =
            scope === "store" && afterAdmin.length
                ? afterAdmin.slice(1)
                : afterAdmin;

        return breadcrumbSegments.map((segment, index) => {
            const isLast = index === breadcrumbSegments.length - 1;
            const pathPrefix =
                scope === "store" && storeId ? `/admin/${storeId}` : "/admin";
            const href = url(
                `${pathPrefix}/${breadcrumbSegments
                    .slice(0, index + 1)
                    .join("/")}`
            );
            return { label: humanize(segment), href, isLast };
        });
    }, [pathname, scope, storeId, url]);

    const breadcrumbs = generateBreadcrumbs();
    const stores = data?.stores || [];

    if (!mounted) return null;

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {/* Company / Tenant badge */}
                <BreadcrumbItem>
                    <div
                        onClick={() => {
                            if (scope === "store") router.push(url("/admin"));
                        }}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium font-mono transition-colors",
                            "bg-muted/60 text-foreground",
                            scope === "store" && "cursor-pointer hover:bg-muted"
                        )}
                    >
                        <Boxes size={18} className="text-current" />
                        <span>{tenantName || "Company"}</span>
                    </div>
                </BreadcrumbItem>

                {(scope === "store" || breadcrumbs.length > 0) && (
                    <BreadcrumbSeparator />
                )}

                {/* Store badge with dropdown */}
                {scope === "store" && (
                    <>
                        <BreadcrumbItem>
                            <div className="flex items-center gap-1">
                                <div className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium font-mono transition-colors bg-muted/60 text-foreground">
                                    <Box size={18} className="text-current" />
                                    <span>{storeName || "Loading..."}</span>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center justify-center rounded-md px-1 py-2 border border-border hover:bg-muted transition-colors">
                                            <ChevronsUpDown
                                                size={16}
                                                className="text-muted-foreground"
                                            />
                                        </button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent
                                        className="w-48 rounded-md p-1"
                                        align="start"
                                        sideOffset={4}
                                    >
                                        {isLoading ? (
                                            <div className="p-2 text-sm text-muted-foreground">
                                                Loading stores...
                                            </div>
                                        ) : (
                                            stores.map((s) => (
                                                <DropdownMenuItem
                                                    key={s.id}
                                                    onClick={() =>
                                                        switchStore(s.id)
                                                    }
                                                    className={cn(
                                                        "flex items-center gap-2 px-2 py-1.5 text-sm transition-colors",
                                                        storeId === s.id &&
                                                            "bg-muted"
                                                    )}
                                                >
                                                    <Box
                                                        size={14}
                                                        className="text-muted-foreground"
                                                    />
                                                    <span>{s.name}</span>
                                                    {storeId === s.id && (
                                                        <Check
                                                            size={14}
                                                            className="ml-auto text-primary"
                                                        />
                                                    )}
                                                </DropdownMenuItem>
                                            ))
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </BreadcrumbItem>

                        {breadcrumbs.length > 0 && <BreadcrumbSeparator />}
                    </>
                )}

                {/* Dynamic breadcrumbs */}
                {breadcrumbs.length > 0 ? (
                    breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={i}>
                            <BreadcrumbItem className="font-mono text-muted-foreground">
                                {crumb.isLast ? (
                                    <BreadcrumbPage>
                                        {crumb.label}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={crumb.href}>
                                        {crumb.label}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!crumb.isLast && <BreadcrumbSeparator />}
                        </React.Fragment>
                    ))
                ) : (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem className="font-mono text-muted-foreground">
                            <BreadcrumbPage>Dashboard</BreadcrumbPage>
                        </BreadcrumbItem>
                    </>
                )}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
