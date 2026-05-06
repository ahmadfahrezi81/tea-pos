// lib/tenant-url.ts
"use client";

import { usePathname } from "next/navigation";

/**
 * Helper to build tenant-aware URLs
 * Usage: tenantUrl('/admin/dashboard', 'tealicious') → '/tealicious/admin/dashboard'
 */
export function tenantUrl(path: string, tenantSlug: string): string {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `/${tenantSlug}/${cleanPath}`;
}

/**
 * Get tenant slug from current URL
 * Works on both server and client by using Next.js usePathname
 */
export function getTenantSlugFromPathname(pathname: string): string | null {
    const pathSegments = pathname.split("/").filter(Boolean);
    return pathSegments[0] || null;
}

/**
 * Hook to use in client components
 * Usage: const { tenantSlug, url } = useTenantSlug()
 */
export function useTenantSlug() {
    const pathname = usePathname(); // This works on both server and client
    const tenantSlug = getTenantSlugFromPathname(pathname);

    return {
        tenantSlug,
        url: (path: string) =>
            tenantSlug ? tenantUrl(path, tenantSlug) : path,
    };
}
