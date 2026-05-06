// //middleware.ts
// import { createServerClient, type CookieOptions } from "@supabase/ssr";
// import { NextResponse, type NextRequest } from "next/server";

// // Helper to set user info cookie
// function setUserCookie(response: NextResponse, userId: string, role: string) {
//     response.cookies.set("x-user-info", JSON.stringify({ id: userId, role }), {
//         httpOnly: false,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         maxAge: 60 * 60 * 24,
//         path: "/",
//     });
// }

// // Helper to detect old/unsupported browsers
// function isOldBrowser(userAgent: string): boolean {
//     if (!userAgent) return false;

//     const ua = userAgent.toLowerCase();

//     // Check for old Chrome versions (< 109) - aligns with modern web APIs
//     const chromeMatch = ua.match(/chrome\/(\d+)/);
//     if (chromeMatch && parseInt(chromeMatch[1]) < 109) {
//         return true;
//     }

//     // Check for old Android (< 8.0) - tested that Android 6 doesn't work
//     const androidMatch = ua.match(/android\s+(\d+)/);
//     if (androidMatch && parseInt(androidMatch[1]) < 8) {
//         return true;
//     }

//     // Check for old iOS (< 13) - needs modern web features
//     const iosMatch = ua.match(/os\s+(\d+)_/);
//     if (iosMatch && parseInt(iosMatch[1]) < 13) {
//         return true;
//     }

//     // Check for Internet Explorer
//     if (ua.includes("msie") || ua.includes("trident/")) {
//         return true;
//     }

//     // Check for old Firefox (< 78) - ESR baseline
//     const firefoxMatch = ua.match(/firefox\/(\d+)/);
//     if (firefoxMatch && parseInt(firefoxMatch[1]) < 78) {
//         return true;
//     }

//     // Check for old Safari (< 13)
//     const safariMatch = ua.match(/version\/(\d+).*safari/);
//     if (safariMatch && parseInt(safariMatch[1]) < 13) {
//         return true;
//     }

//     return false;
// }

// export async function middleware(request: NextRequest) {
//     let response = NextResponse.next({
//         request: {
//             headers: request.headers,
//         },
//     });

//     const supabase = createServerClient(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//         {
//             cookies: {
//                 get(name: string) {
//                     return request.cookies.get(name)?.value;
//                 },
//                 set(name: string, value: string, options: CookieOptions) {
//                     request.cookies.set({ name, value, ...options });
//                     response = NextResponse.next({
//                         request: { headers: request.headers },
//                     });
//                     response.cookies.set({ name, value, ...options });
//                 },
//                 remove(name: string, options: CookieOptions) {
//                     request.cookies.set({ name, value: "", ...options });
//                     response = NextResponse.next({
//                         request: { headers: request.headers },
//                     });
//                     response.cookies.set({ name, value: "", ...options });
//                 },
//             },
//         },
//     );

//     const pathname = request.nextUrl.pathname;

//     // ============================================================================
//     // SKIP OLD BROWSER CHECK FOR LEGACY CLIENT AND STATIC ASSETS
//     // ============================================================================
//     if (
//         pathname.startsWith("/lite-legacy-client") ||
//         pathname.startsWith("/old-browser") ||
//         pathname.startsWith("/_next") ||
//         pathname.startsWith("/api") ||
//         pathname.startsWith("/auth")
//     ) {
//         // Allow access to legacy client and static resources
//         return response;
//     }

//     // ============================================================================
//     // OLD BROWSER DETECTION FOR MOBILE ROUTES
//     // ============================================================================
//     const pathSegments = pathname.split("/").filter(Boolean);
//     const tenantSlug = pathSegments[0];
//     const isMobileRoute = pathname.includes("/mobile");

//     if (isMobileRoute) {
//         const userAgent = request.headers.get("user-agent") || "";

//         if (isOldBrowser(userAgent)) {
//             // Redirect to old browser warning page
//             return NextResponse.redirect(
//                 new URL(`/old-browser?tenant=${tenantSlug}`, request.url),
//             );
//         }
//         // }

//         // // ============================================================================
//         // // TENANT HANDLING
//         // // ============================================================================
//         // if (
//         //     tenantSlug &&
//         //     ![
//         //         "api",
//         //         "login",
//         //         "signup",
//         //         "docs",
//         //         "_next",
//         //         "unauthorized",
//         //         "old-browser",
//         //     ].includes(tenantSlug)
//         // ) {
//         //     const { data: tenant } = await supabase
//         //         .from("tenants")
//         //         .select("id")
//         //         .eq("slug", tenantSlug)
//         //         .single();

//         //     if (tenant?.id) {
//         //         response.cookies.set("x-tenant-id", tenant.id, {
//         //             httpOnly: true,
//         //             secure: process.env.NODE_ENV === "production",
//         //             sameSite: "lax",
//         //             maxAge: 60 * 60 * 24,
//         //         });
//         //     }
//         // } else {
//         //     response.cookies.delete("x-tenant-id");
//         // }

//         // // ============================================================================
//         // // AUTH HANDLING
//         // // ============================================================================
//         // const {
//         //     data: { user },
//         // } = await supabase.auth.getUser();

//         // if (user) {
//         //     const { data: profile } = await supabase
//         //         .from("profiles")
//         //         .select("role")
//         //         .eq("id", user.id)
//         //         .single();

//         //     setUserCookie(response, user.id, profile?.role || "SELLER");
//         // }

//         // ============================================================================
//         // TENANT + AUTH IN PARALLEL
//         // ============================================================================
//         const RESERVED = [
//             "api",
//             "login",
//             "signup",
//             "docs",
//             "_next",
//             "unauthorized",
//             "old-browser",
//         ];
//         const shouldResolveTenant =
//             tenantSlug && !RESERVED.includes(tenantSlug);

//         const [
//             {
//                 data: { user },
//             },
//             tenantResult,
//         ] = await Promise.all([
//             supabase.auth.getUser(),
//             shouldResolveTenant
//                 ? supabase
//                       .from("tenants")
//                       .select("id")
//                       .eq("slug", tenantSlug)
//                       .single()
//                 : Promise.resolve({ data: null }),
//         ]);

//         if (tenantResult.data?.id) {
//             response.cookies.set("x-tenant-id", tenantResult.data.id, {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === "production",
//                 sameSite: "lax",
//                 maxAge: 60 * 60 * 24,
//             });
//         } else if (!shouldResolveTenant) {
//             response.cookies.delete("x-tenant-id");
//         }

//         if (user) {
//             const cached = request.cookies.get("x-user-info")?.value;
//             const cachedRole = cached ? JSON.parse(cached).role : null;

//             if (cachedRole) {
//                 setUserCookie(response, user.id, cachedRole); // refresh TTL, no DB call
//             } else {
//                 const { data: profile } = await supabase
//                     .from("profiles")
//                     .select("role")
//                     .eq("id", user.id)
//                     .single();
//                 setUserCookie(response, user.id, profile?.role || "SELLER");
//             }
//         }

//         // ============================================================================
//         // HANDLE LOGIN/SIGNUP PAGES
//         // ============================================================================
//         if (pathname === "/login" || pathname === "/signup") {
//             if (!user) {
//                 return response;
//             }

//             // Fetch user's tenant assignments
//             const { data: tenantAssignments } = await supabase
//                 .from("user_tenant_assignments")
//                 .select("tenant_id, tenants(slug)")
//                 .eq("user_id", user.id);

//             if (!tenantAssignments || tenantAssignments.length === 0) {
//                 return NextResponse.redirect(
//                     new URL("/unauthorized?reason=no-tenant", request.url),
//                 );
//             }

//             const tenantsData = tenantAssignments[0].tenants;
//             const firstTenant = Array.isArray(tenantsData)
//                 ? tenantsData[0]
//                 : tenantsData;

//             if (!firstTenant?.slug) {
//                 return NextResponse.redirect(
//                     new URL("/unauthorized?reason=invalid-tenant", request.url),
//                 );
//             }

//             // Check if user has seller role
//             const { data: storeAssignments } = await supabase
//                 .from("user_store_assignments")
//                 .select("role")
//                 .eq("user_id", user.id);

//             const hasSeller = storeAssignments?.some(
//                 (a) => a.role === "seller",
//             );

//             const targetPath = hasSeller
//                 ? `/${firstTenant.slug}/mobile/pos`
//                 : `/${firstTenant.slug}/mobile/profile`;

//             return NextResponse.redirect(new URL(targetPath, request.url));
//         }

//         // ============================================================================
//         // HANDLE /{tenant}/mobile ROOT
//         // ============================================================================
//         if (pathname === `/${tenantSlug}/mobile`) {
//             if (!user) {
//                 return NextResponse.redirect(
//                     new URL(`/${tenantSlug}/mobile/profile`, request.url),
//                 );
//             }

//             const { data: storeAssignments } = await supabase
//                 .from("user_store_assignments")
//                 .select("role")
//                 .eq("user_id", user.id);

//             const hasSeller = storeAssignments?.some(
//                 (a) => a.role === "seller",
//             );

//             const targetPath = hasSeller
//                 ? `/${tenantSlug}/mobile/pos`
//                 : `/${tenantSlug}/mobile/profile`;

//             return NextResponse.redirect(new URL(targetPath, request.url));
//         }

//         // ============================================================================
//         // PROTECT TENANT-PREFIXED ROUTES
//         // ============================================================================
//         const isProtectedRoute =
//             pathname.startsWith(`/${tenantSlug}/admin`) ||
//             pathname.startsWith(`/${tenantSlug}/mobile`);

//         if (!isProtectedRoute) {
//             return response;
//         }

//         if (!user) {
//             return NextResponse.redirect(new URL("/login", request.url));
//         }

//         // // Verify tenant exists
//         // const { data: tenant } = await supabase
//         //     .from("tenants")
//         //     .select("id")
//         //     .eq("slug", tenantSlug)
//         //     .single();

//         // if (!tenant?.id) {
//         //     return NextResponse.redirect(
//         //         new URL("/unauthorized?reason=tenant-not-found", request.url),
//         //     );
//         // }

//         // Verify tenant exists (already fetched above)
//         const tenantId =
//             tenantResult.data?.id ?? request.cookies.get("x-tenant-id")?.value;

//         if (!tenantId) {
//             return NextResponse.redirect(
//                 new URL("/unauthorized?reason=tenant-not-found", request.url),
//             );
//         }

//         // Check user assignment to this tenant
//         const { data: userTenantAssignment } = await supabase
//             .from("user_tenant_assignments")
//             .select("id")
//             .eq("user_id", user.id)
//             .eq("tenant_id", tenantId)
//             .single();

//         if (!userTenantAssignment) {
//             // User doesn't belong - redirect to their valid tenant
//             const { data: validTenantAssignments } = await supabase
//                 .from("user_tenant_assignments")
//                 .select("tenant_id, tenants(slug)")
//                 .eq("user_id", user.id)
//                 .limit(1)
//                 .single();

//             if (validTenantAssignments?.tenants) {
//                 const tenantsData = validTenantAssignments.tenants;
//                 const validTenant = Array.isArray(tenantsData)
//                     ? tenantsData[0]
//                     : tenantsData;

//                 if (!validTenant?.slug) {
//                     return NextResponse.redirect(
//                         new URL(
//                             "/unauthorized?reason=invalid-tenant",
//                             request.url,
//                         ),
//                     );
//                 }

//                 const { data: storeAssignments } = await supabase
//                     .from("user_store_assignments")
//                     .select("role")
//                     .eq("user_id", user.id);

//                 const hasSeller = storeAssignments?.some(
//                     (a) => a.role === "seller",
//                 );

//                 const targetPath = hasSeller
//                     ? `/${validTenant.slug}/mobile/pos`
//                     : `/${validTenant.slug}/mobile/profile`;

//                 return NextResponse.redirect(new URL(targetPath, request.url));
//             }

//             return NextResponse.redirect(
//                 new URL("/unauthorized?reason=no-access", request.url),
//             );
//         }

//         return response;
//     }
// }

// export const config = {
//     matcher: [
//         "/:tenantSlug/admin/:path*",
//         "/:tenantSlug/mobile/:path*",
//         "/:tenantSlug/mobile",
//         "/login",
//         "/signup",
//     ],
// };

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Constants ────────────────────────────────────────────────────────────────

const RESERVED_SLUGS = [
    "api",
    "login",
    "signup",
    "docs",
    "_next",
    "unauthorized",
    "old-browser",
];
const STATIC_PREFIXES = [
    "/_next",
    "/api",
    "/auth",
    "/lite-legacy-client",
    "/old-browser",
    "/icons",
    "/manifest",
];
const USER_COOKIE_TTL = 60 * 60 * 24 * 7; // 7 days — matches Supabase refresh token
const TENANT_COOKIE_TTL = 60 * 60 * 24; // 24h

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setUserCookie(
    response: NextResponse,
    userId: string,
    role: string,
    fullName = "",
    email = "",
) {
    response.cookies.set(
        "x-user-info",
        JSON.stringify({ id: userId, role, fullName, email }),
        {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: USER_COOKIE_TTL,
            path: "/",
        },
    );
}

function isOldBrowser(userAgent: string): boolean {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    const check = (re: RegExp, min: number) => {
        const m = ua.match(re);
        return m ? parseInt(m[1]) < min : false;
    };
    return (
        check(/chrome\/(\d+)/, 109) ||
        check(/android\s+(\d+)/, 8) ||
        check(/os\s+(\d+)_/, 13) ||
        check(/firefox\/(\d+)/, 78) ||
        check(/version\/(\d+).*safari/, 13) ||
        ua.includes("msie") ||
        ua.includes("trident/")
    );
}

const redirect = (path: string, req: NextRequest) =>
    NextResponse.redirect(new URL(path, req.url));

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip DB work entirely for static assets
    if (
        STATIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
        pathname === "/favicon.ico"
    ) {
        return NextResponse.next({ request: { headers: request.headers } });
    }

    let response = NextResponse.next({ request: { headers: request.headers } });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name) => request.cookies.get(name)?.value,
                set: (name, value, options: CookieOptions) => {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove: (name, options: CookieOptions) => {
                    request.cookies.set({ name, value: "", ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value: "", ...options });
                },
            },
        },
    );

    const tenantSlug = pathname.split("/").filter(Boolean)[0];
    const shouldResolveTenant =
        tenantSlug && !RESERVED_SLUGS.includes(tenantSlug);

    // ── Old browser check (no DB needed) ─────────────────────────────────────
    if (pathname.includes("/mobile")) {
        const ua = request.headers.get("user-agent") || "";
        if (isOldBrowser(ua))
            return redirect(`/old-browser?tenant=${tenantSlug}`, request);
    }

    // ── Tenant + auth in parallel ─────────────────────────────────────────────
    const [
        {
            data: { user },
        },
        tenantResult,
    ] = await Promise.all([
        supabase.auth.getUser(),
        shouldResolveTenant
            ? supabase
                  .from("tenants")
                  .select("id")
                  .eq("slug", tenantSlug)
                  .single()
            : Promise.resolve({ data: null }),
    ]);

    // Cache tenant ID in cookie for subsequent requests
    const tenantId =
        tenantResult.data?.id ??
        request.cookies.get("x-tenant-id")?.value ??
        null;

    if (tenantResult.data?.id) {
        response.cookies.set("x-tenant-id", tenantResult.data.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: TENANT_COOKIE_TTL,
        });
    } else if (!shouldResolveTenant) {
        response.cookies.delete("x-tenant-id");
    }

    // Set user cookie — use cached role to skip profiles DB call on warm requests
    if (user) {
        const cached = request.cookies.get("x-user-info")?.value;
        const cachedRole = cached ? JSON.parse(cached).role : null;

        if (cachedRole) {
            const cachedData = JSON.parse(cached!);
            setUserCookie(
                response,
                user.id,
                cachedRole,
                cachedData.fullName ?? "",
                cachedData.email ?? "",
            ); // refresh TTL, no DB call
        } else {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role, full_name, email")
                .eq("id", user.id)
                .single();
            setUserCookie(
                response,
                user.id,
                profile?.role ?? "SELLER",
                profile?.full_name ?? "",
                profile?.email ?? "",
            );
        }
    }

    // ── /login and /signup ────────────────────────────────────────────────────
    if (pathname === "/login" || pathname === "/signup") {
        if (!user) return response;

        const { data: tenantAssignments } = await supabase
            .from("user_tenant_assignments")
            .select("tenant_id, tenants(slug)")
            .eq("user_id", user.id);

        if (!tenantAssignments?.length)
            return redirect("/unauthorized?reason=no-tenant", request);

        const firstTenant = Array.isArray(tenantAssignments[0].tenants)
            ? tenantAssignments[0].tenants[0]
            : tenantAssignments[0].tenants;

        if (!firstTenant?.slug)
            return redirect("/unauthorized?reason=invalid-tenant", request);

        const { data: storeAssignments } = await supabase
            .from("user_store_assignments")
            .select("role")
            .eq("user_id", user.id);

        const targetPath = storeAssignments?.some((a) => a.role === "seller")
            ? `/${firstTenant.slug}/mobile/pos`
            : `/${firstTenant.slug}/mobile/profile`;

        return redirect(targetPath, request);
    }

    // ── /{tenant}/mobile root ─────────────────────────────────────────────────
    if (pathname === `/${tenantSlug}/mobile`) {
        if (!user) return redirect(`/${tenantSlug}/mobile/profile`, request);

        const { data: storeAssignments } = await supabase
            .from("user_store_assignments")
            .select("role")
            .eq("user_id", user.id);

        const targetPath = storeAssignments?.some((a) => a.role === "seller")
            ? `/${tenantSlug}/mobile/pos`
            : `/${tenantSlug}/mobile/profile`;

        return redirect(targetPath, request);
    }

    // ── Protect tenant routes ─────────────────────────────────────────────────
    const isProtected =
        pathname.startsWith(`/${tenantSlug}/admin`) ||
        pathname.startsWith(`/${tenantSlug}/mobile`);

    if (!isProtected) return response;
    if (!user) return redirect("/login", request);
    if (!tenantId)
        return redirect("/unauthorized?reason=tenant-not-found", request);

    // Verify user belongs to this tenant
    const { data: userTenantAssignment } = await supabase
        .from("user_tenant_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .single();

    if (userTenantAssignment) return response;

    // User doesn't belong here — find their valid tenant and redirect
    const { data: validAssignment } = await supabase
        .from("user_tenant_assignments")
        .select("tenant_id, tenants(slug)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!validAssignment?.tenants)
        return redirect("/unauthorized?reason=no-access", request);

    const validTenant = Array.isArray(validAssignment.tenants)
        ? validAssignment.tenants[0]
        : validAssignment.tenants;

    if (!validTenant?.slug)
        return redirect("/unauthorized?reason=invalid-tenant", request);

    const { data: storeAssignments } = await supabase
        .from("user_store_assignments")
        .select("role")
        .eq("user_id", user.id);

    const targetPath = storeAssignments?.some((a) => a.role === "seller")
        ? `/${validTenant.slug}/mobile/pos`
        : `/${validTenant.slug}/mobile/profile`;

    return redirect(targetPath, request);
}

export const config = {
    matcher: [
        "/:tenantSlug/admin/:path*",
        "/:tenantSlug/mobile/:path*",
        "/:tenantSlug/mobile",
        "/login",
        "/signup",
    ],
};
