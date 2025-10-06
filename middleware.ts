// // import { createServerClient, type CookieOptions } from "@supabase/ssr";
// // import { NextResponse, type NextRequest } from "next/server";

// // export async function middleware(request: NextRequest) {
// //     let response = NextResponse.next({
// //         request: {
// //             headers: request.headers,
// //         },
// //     });

// //     const supabase = createServerClient(
// //         process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// //         {
// //             cookies: {
// //                 get(name: string) {
// //                     return request.cookies.get(name)?.value;
// //                 },
// //                 set(name: string, value: string, options: CookieOptions) {
// //                     request.cookies.set({
// //                         name,
// //                         value,
// //                         ...options,
// //                     });
// //                     response = NextResponse.next({
// //                         request: {
// //                             headers: request.headers,
// //                         },
// //                     });
// //                     response.cookies.set({
// //                         name,
// //                         value,
// //                         ...options,
// //                     });
// //                 },
// //                 remove(name: string, options: CookieOptions) {
// //                     request.cookies.set({
// //                         name,
// //                         value: "",
// //                         ...options,
// //                     });
// //                     response = NextResponse.next({
// //                         request: {
// //                             headers: request.headers,
// //                         },
// //                     });
// //                     response.cookies.set({
// //                         name,
// //                         value: "",
// //                         ...options,
// //                     });
// //                 },
// //             },
// //         }
// //     );

// //     const {
// //         data: { user },
// //     } = await supabase.auth.getUser();

// //     // Protect dashboard and admin routes
// //     if (
// //         (request.nextUrl.pathname.startsWith("/dashboard") ||
// //             request.nextUrl.pathname.startsWith("/admin/dashboard")) &&
// //         !user
// //     ) {
// //         return NextResponse.redirect(new URL("/login", request.url));
// //     }

// //     // Redirect authenticated users away from auth pages
// //     if (
// //         (request.nextUrl.pathname === "/login" ||
// //             request.nextUrl.pathname === "/signup") &&
// //         user
// //     ) {
// //         // Update redirect to go to admin dashboard instead of just admin
// //         return NextResponse.redirect(new URL("/admin/dashboard", request.url));
// //     }

// //     return response;
// // }

// // export const config = {
// //     matcher: [
// //         "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
// //     ],
// // };

// // import { createServerClient, type CookieOptions } from "@supabase/ssr";
// // import { NextResponse, type NextRequest } from "next/server";

// // export async function middleware(request: NextRequest) {
// //     let response = NextResponse.next({
// //         request: {
// //             headers: request.headers,
// //         },
// //     });

// //     const supabase = createServerClient(
// //         process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// //         {
// //             cookies: {
// //                 get(name: string) {
// //                     return request.cookies.get(name)?.value;
// //                 },
// //                 set(name: string, value: string, options: CookieOptions) {
// //                     request.cookies.set({
// //                         name,
// //                         value,
// //                         ...options,
// //                     });
// //                     response = NextResponse.next({
// //                         request: {
// //                             headers: request.headers,
// //                         },
// //                     });
// //                     response.cookies.set({
// //                         name,
// //                         value,
// //                         ...options,
// //                     });
// //                 },
// //                 remove(name: string, options: CookieOptions) {
// //                     request.cookies.set({
// //                         name,
// //                         value: "",
// //                         ...options,
// //                     });
// //                     response = NextResponse.next({
// //                         request: {
// //                             headers: request.headers,
// //                         },
// //                     });
// //                     response.cookies.set({
// //                         name,
// //                         value: "",
// //                         ...options,
// //                     });
// //                 },
// //             },
// //         }
// //     );

// //     const {
// //         data: { user },
// //     } = await supabase.auth.getUser();

// //     // Get user profile to check role (assuming you have a profiles table)
// //     let userRole = null;
// //     if (user) {
// //         const { data: profile } = await supabase
// //             .from("profiles") // adjust table name if different
// //             .select("role")
// //             .eq("id", user.id)
// //             .single();

// //         userRole = profile?.role;

// //         console.log("Profile:", profile);
// //     }

// //     const isAdmin = userRole === "ADMIN";

// //     // Allow access to /admin (login page) - this should be open for everyone
// //     if (request.nextUrl.pathname === "/admin") {
// //         // If user is already authenticated and is admin, redirect to dashboard
// //         if (user && isAdmin) {
// //             return NextResponse.redirect(
// //                 new URL("/admin/dashboard", request.url)
// //             );
// //         }
// //         return response;
// //     }

// //     // Protect all /admin/* routes - require authentication AND admin role
// //     if (request.nextUrl.pathname.startsWith("/admin/")) {
// //         if (!user) {
// //             return NextResponse.redirect(new URL("/admin", request.url));
// //         }

// //         if (!isAdmin) {
// //             // Redirect non-admin users to mobile or wherever appropriate
// //             return NextResponse.redirect(new URL("/mobile", request.url));
// //         }
// //     }

// //     // Keep your existing dashboard and login/signup logic
// //     if (
// //         (request.nextUrl.pathname.startsWith("/dashboard") ||
// //             request.nextUrl.pathname.startsWith("/admin/dashboard")) &&
// //         !user
// //     ) {
// //         return NextResponse.redirect(new URL("/login", request.url));
// //     }

// //     if (
// //         (request.nextUrl.pathname === "/login" ||
// //             request.nextUrl.pathname === "/signup") &&
// //         user
// //     ) {
// //         // If user is admin, send to admin dashboard, otherwise to regular dashboard
// //         if (isAdmin) {
// //             return NextResponse.redirect(
// //                 new URL("/admin/dashboard", request.url)
// //             );
// //         } else {
// //             return NextResponse.redirect(new URL("/mobile", request.url));
// //         }
// //     }

// //     return response;
// // }

// // export const config = {
// //     matcher: [
// //         "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
// //     ],
// // };

// // import { createServerClient, type CookieOptions } from "@supabase/ssr";
// // import { NextResponse, type NextRequest } from "next/server";

// // export async function middleware(request: NextRequest) {
// //     let response = NextResponse.next({
// //         request: {
// //             headers: request.headers,
// //         },
// //     });

// //     const supabase = createServerClient(
// //         process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// //         {
// //             cookies: {
// //                 get(name: string) {
// //                     return request.cookies.get(name)?.value;
// //                 },
// //                 set(name: string, value: string, options: CookieOptions) {
// //                     request.cookies.set({
// //                         name,
// //                         value,
// //                         ...options,
// //                     });
// //                     response = NextResponse.next({
// //                         request: {
// //                             headers: request.headers,
// //                         },
// //                     });
// //                     response.cookies.set({
// //                         name,
// //                         value,
// //                         ...options,
// //                     });
// //                 },
// //                 remove(name: string, options: CookieOptions) {
// //                     request.cookies.set({
// //                         name,
// //                         value: "",
// //                         ...options,
// //                     });
// //                     response = NextResponse.next({
// //                         request: {
// //                             headers: request.headers,
// //                         },
// //                     });
// //                     response.cookies.set({
// //                         name,
// //                         value: "",
// //                         ...options,
// //                     });
// //                 },
// //             },
// //         }
// //     );

// //     const pathname = request.nextUrl.pathname;

// //     // Early return for non-protected routes - no auth check needed
// //     if (
// //         !pathname.startsWith("/admin") &&
// //         !pathname.startsWith("/dashboard") &&
// //         pathname !== "/login" &&
// //         pathname !== "/signup"
// //     ) {
// //         return response;
// //     }

// //     // Only check user auth for protected routes
// //     const {
// //         data: { user },
// //     } = await supabase.auth.getUser();

// //     // Handle login/signup redirects
// //     if (pathname === "/login" || pathname === "/signup") {
// //         if (!user) {
// //             return response;
// //         }

// //         // Only fetch role if user is logged in and we need to redirect
// //         const { data: profile } = await supabase
// //             .from("profiles")
// //             .select("role")
// //             .eq("id", user.id)
// //             .single();

// //         const isAdmin = profile?.role === "ADMIN";

// //         return NextResponse.redirect(
// //             new URL(isAdmin ? "/admin/dashboard" : "/mobile", request.url)
// //         );
// //     }

// //     // Handle /admin (login page)
// //     if (pathname === "/admin") {
// //         if (!user) {
// //             return response;
// //         }

// //         // Only fetch role to check if we should redirect to dashboard
// //         const { data: profile } = await supabase
// //             .from("profiles")
// //             .select("role")
// //             .eq("id", user.id)
// //             .single();

// //         if (profile?.role === "ADMIN") {
// //             return NextResponse.redirect(
// //                 new URL("/admin/dashboard", request.url)
// //             );
// //         }
// //         return response;
// //     }

// //     // Protect /admin/* routes
// //     if (pathname.startsWith("/admin/")) {
// //         if (!user) {
// //             return NextResponse.redirect(new URL("/admin", request.url));
// //         }

// //         // Only now do we check the role for admin routes
// //         const { data: profile } = await supabase
// //             .from("profiles")
// //             .select("role")
// //             .eq("id", user.id)
// //             .single();

// //         if (profile?.role !== "ADMIN") {
// //             return NextResponse.redirect(new URL("/mobile", request.url));
// //         }
// //     }

// //     // Protect dashboard routes
// //     if (pathname.startsWith("/dashboard")) {
// //         if (!user) {
// //             return NextResponse.redirect(new URL("/login", request.url));
// //         }
// //     }

// //     return response;
// // }

// // export const config = {
// //     matcher: ["/admin/:path*", "/mobile/:path*", "/login", "/signup"],
// // };

// // import { createServerClient, type CookieOptions } from "@supabase/ssr";
// // import { NextResponse, type NextRequest } from "next/server";

// // export async function middleware(request: NextRequest) {
// //     let response = NextResponse.next({
// //         request: {
// //             headers: request.headers,
// //         },
// //     });

// //     const supabase = createServerClient(
// //         process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// //         {
// //             cookies: {
// //                 get(name: string) {
// //                     return request.cookies.get(name)?.value;
// //                 },
// //                 set(name: string, value: string, options: CookieOptions) {
// //                     request.cookies.set({
// //                         name,
// //                         value,
// //                         ...options,
// //                     });
// //                     response = NextResponse.next({
// //                         request: {
// //                             headers: request.headers,
// //                         },
// //                     });
// //                     response.cookies.set({
// //                         name,
// //                         value,
// //                         ...options,
// //                     });
// //                 },
// //                 remove(name: string, options: CookieOptions) {
// //                     request.cookies.set({
// //                         name,
// //                         value: "",
// //                         ...options,
// //                     });
// //                     response = NextResponse.next({
// //                         request: {
// //                             headers: request.headers,
// //                         },
// //                     });
// //                     response.cookies.set({
// //                         name,
// //                         value: "",
// //                         ...options,
// //                     });
// //                 },
// //             },
// //         }
// //     );

// //     const pathname = request.nextUrl.pathname;

// //     // ============================================================================
// //     // TENANT HANDLING - Extract tenant slug and set tenant_id cookie
// //     // ============================================================================
// //     const pathSegments = pathname.split("/").filter(Boolean);
// //     const tenantSlug = pathSegments[0];

// //     // If we have a tenant slug in the URL (not api, login, signup, docs, etc.)
// //     if (
// //         tenantSlug &&
// //         !["api", "login", "signup", "docs", "_next"].includes(tenantSlug)
// //     ) {
// //         // Look up tenant ID from slug
// //         const { data: tenant } = await supabase
// //             .from("tenants")
// //             .select("id")
// //             .eq("slug", tenantSlug)
// //             .single();

// //         if (tenant?.id) {
// //             // Set tenant_id cookie for API routes to use
// //             response.cookies.set("x-tenant-id", tenant.id, {
// //                 httpOnly: true,
// //                 secure: process.env.NODE_ENV === "production",
// //                 sameSite: "lax",
// //                 maxAge: 60 * 60 * 24, // 24 hours
// //             });
// //         }
// //     } else {
// //         // Clear tenant cookie if no valid tenant in URL
// //         response.cookies.delete("x-tenant-id");
// //     }

// //     // ============================================================================
// //     // AUTH HANDLING - Your existing logic, updated for new paths
// //     // ============================================================================

// //     // Early return for non-protected routes - no auth check needed
// //     // Updated to check for tenant-prefixed paths
// //     const isProtectedRoute =
// //         pathname.startsWith(`/${tenantSlug}/admin`) ||
// //         pathname.startsWith(`/${tenantSlug}/mobile`) ||
// //         pathname === "/login" ||
// //         pathname === "/signup";

// //     if (!isProtectedRoute) {
// //         return response;
// //     }

// //     // Only check user auth for protected routes
// //     const {
// //         data: { user },
// //     } = await supabase.auth.getUser();

// //     // Handle login/signup redirects
// //     if (pathname === "/login" || pathname === "/signup") {
// //         if (!user) {
// //             return response;
// //         }

// //         // Only fetch role if user is logged in and we need to redirect
// //         const { data: profile } = await supabase
// //             .from("profiles")
// //             .select("role")
// //             .eq("id", user.id)
// //             .single();

// //         const isAdmin = profile?.role === "ADMIN";

// //         // Redirect to tenant-prefixed path
// //         return NextResponse.redirect(
// //             new URL(
// //                 isAdmin ? "/tealicious/admin/dashboard" : "/tealicious/mobile",
// //                 request.url
// //             )
// //         );
// //     }

// //     // Protect /{tenant}/admin/* routes
// //     if (pathname.startsWith(`/${tenantSlug}/admin`)) {
// //         if (!user) {
// //             return NextResponse.redirect(new URL("/login", request.url));
// //         }

// //         // Check if user has admin role
// //         const { data: profile } = await supabase
// //             .from("profiles")
// //             .select("role")
// //             .eq("id", user.id)
// //             .single();

// //         if (profile?.role !== "ADMIN") {
// //             return NextResponse.redirect(
// //                 new URL(`/${tenantSlug}/mobile`, request.url)
// //             );
// //         }
// //     }

// //     // Protect /{tenant}/mobile routes
// //     if (pathname.startsWith(`/${tenantSlug}/mobile`)) {
// //         if (!user) {
// //             return NextResponse.redirect(new URL("/login", request.url));
// //         }
// //     }

// //     return response;
// // }

// // export const config = {
// //     matcher: [
// //         "/:tenantSlug/admin/:path*",
// //         "/:tenantSlug/mobile/:path*",
// //         "/login",
// //         "/signup",
// //     ],
// // };

// import { createServerClient, type CookieOptions } from "@supabase/ssr";
// import { NextResponse, type NextRequest } from "next/server";

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
//                     request.cookies.set({
//                         name,
//                         value,
//                         ...options,
//                     });
//                     response = NextResponse.next({
//                         request: {
//                             headers: request.headers,
//                         },
//                     });
//                     response.cookies.set({
//                         name,
//                         value,
//                         ...options,
//                     });
//                 },
//                 remove(name: string, options: CookieOptions) {
//                     request.cookies.set({
//                         name,
//                         value: "",
//                         ...options,
//                     });
//                     response = NextResponse.next({
//                         request: {
//                             headers: request.headers,
//                         },
//                     });
//                     response.cookies.set({
//                         name,
//                         value: "",
//                         ...options,
//                     });
//                 },
//             },
//         }
//     );

//     const pathname = request.nextUrl.pathname;

//     // ============================================================================
//     // TENANT HANDLING - Extract tenant slug and set tenant_id cookie
//     // ============================================================================
//     const pathSegments = pathname.split("/").filter(Boolean);
//     const tenantSlug = pathSegments[0];

//     // If we have a tenant slug in the URL (not api, login, signup, docs, etc.)
//     if (
//         tenantSlug &&
//         !["api", "login", "signup", "docs", "_next", "unauthorized"].includes(
//             tenantSlug
//         )
//     ) {
//         // Look up tenant ID from slug
//         const { data: tenant } = await supabase
//             .from("tenants")
//             .select("id")
//             .eq("slug", tenantSlug)
//             .single();

//         if (tenant?.id) {
//             // Set tenant_id cookie for API routes to use
//             response.cookies.set("x-tenant-id", tenant.id, {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === "production",
//                 sameSite: "lax",
//                 maxAge: 60 * 60 * 24, // 24 hours
//             });
//         }
//     } else {
//         // Clear tenant cookie if no valid tenant in URL
//         response.cookies.delete("x-tenant-id");
//     }

//     // ============================================================================
//     // AUTH HANDLING - New multi-tenant flow
//     // ============================================================================

//     // Get user for auth checks
//     const {
//         data: { user },
//     } = await supabase.auth.getUser();

//     // ============================================================================
//     // HANDLE LOGIN/SIGNUP PAGES
//     // ============================================================================
//     if (pathname === "/login" || pathname === "/signup") {
//         if (!user) {
//             // Not logged in - show login/signup page
//             return response;
//         }

//         // User is logged in - fetch their tenant assignments
//         const { data: tenantAssignments } = await supabase
//             .from("user_tenant_assignments")
//             .select("tenant_id, tenants(slug)")
//             .eq("user_id", user.id);

//         // No tenant assignments - redirect to error page
//         if (!tenantAssignments || tenantAssignments.length === 0) {
//             return NextResponse.redirect(
//                 new URL("/unauthorized?reason=no-tenant", request.url)
//             );
//         }

//         // Pick first tenant and redirect to mobile
//         const firstTenant = tenantAssignments[0].tenants as {
//             slug: string;
//         } | null;
//         if (firstTenant?.slug) {
//             return NextResponse.redirect(
//                 new URL(`/${firstTenant.slug}/mobile`, request.url)
//             );
//         }

//         // Fallback if tenant data is malformed
//         return NextResponse.redirect(
//             new URL("/unauthorized?reason=invalid-tenant", request.url)
//         );
//     }

//     // ============================================================================
//     // PROTECT TENANT-PREFIXED ROUTES
//     // ============================================================================
//     const isProtectedRoute =
//         pathname.startsWith(`/${tenantSlug}/admin`) ||
//         pathname.startsWith(`/${tenantSlug}/mobile`);

//     if (!isProtectedRoute) {
//         // Not a protected route - allow access
//         return response;
//     }

//     // Protected route - check if user is logged in
//     if (!user) {
//         return NextResponse.redirect(new URL("/login", request.url));
//     }

//     // User is logged in - verify they belong to this tenant
//     const { data: tenant } = await supabase
//         .from("tenants")
//         .select("id")
//         .eq("slug", tenantSlug)
//         .single();

//     if (!tenant?.id) {
//         // Tenant doesn't exist - redirect to error
//         return NextResponse.redirect(
//             new URL("/unauthorized?reason=tenant-not-found", request.url)
//         );
//     }

//     // Check if user has assignment to this tenant
//     const { data: userTenantAssignment } = await supabase
//         .from("user_tenant_assignments")
//         .select("id")
//         .eq("user_id", user.id)
//         .eq("tenant_id", tenant.id)
//         .single();

//     if (!userTenantAssignment) {
//         // User doesn't belong to this tenant - redirect to their first valid tenant
//         const { data: validTenantAssignments } = await supabase
//             .from("user_tenant_assignments")
//             .select("tenant_id, tenants(slug)")
//             .eq("user_id", user.id)
//             .limit(1)
//             .single();

//         if (validTenantAssignments?.tenants) {
//             const validTenant = validTenantAssignments.tenants as {
//                 slug: string;
//             };
//             return NextResponse.redirect(
//                 new URL(`/${validTenant.slug}/mobile`, request.url)
//             );
//         }

//         // No valid tenants - redirect to error
//         return NextResponse.redirect(
//             new URL("/unauthorized?reason=no-access", request.url)
//         );
//     }

//     // User belongs to this tenant - allow access
//     return response;
// }

// export const config = {
//     matcher: [
//         "/:tenantSlug/admin/:path*",
//         "/:tenantSlug/mobile/:path*",
//         "/login",
//         "/signup",
//     ],
// };

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Helper to set user info cookie
function setUserCookie(response: NextResponse, userId: string, role: string) {
    response.cookies.set("x-user-info", JSON.stringify({ id: userId, role }), {
        httpOnly: false, // Must be false so client can read it
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
    });
}

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                },
            },
        }
    );

    const pathname = request.nextUrl.pathname;

    // ============================================================================
    // TENANT HANDLING - Extract tenant slug and set tenant_id cookie
    // ============================================================================
    const pathSegments = pathname.split("/").filter(Boolean);
    const tenantSlug = pathSegments[0];

    // If we have a tenant slug in the URL (not api, login, signup, docs, etc.)
    if (
        tenantSlug &&
        !["api", "login", "signup", "docs", "_next", "unauthorized"].includes(
            tenantSlug
        )
    ) {
        // Look up tenant ID from slug
        const { data: tenant } = await supabase
            .from("tenants")
            .select("id")
            .eq("slug", tenantSlug)
            .single();

        if (tenant?.id) {
            // Set tenant_id cookie for API routes to use
            response.cookies.set("x-tenant-id", tenant.id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24, // 24 hours
            });
        }
    } else {
        // Clear tenant cookie if no valid tenant in URL
        response.cookies.delete("x-tenant-id");
    }

    // ============================================================================
    // AUTH HANDLING - New multi-tenant flow
    // ============================================================================

    // Get user for auth checks
    // const {
    //     data: { user },
    // } = await supabase.auth.getUser();

    // After this line:
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Add this:
    if (user) {
        // Fetch role for cookie
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        setUserCookie(response, user.id, profile?.role || "SELLER");
    }

    // ============================================================================
    // HANDLE LOGIN/SIGNUP PAGES
    // ============================================================================
    if (pathname === "/login" || pathname === "/signup") {
        if (!user) {
            // Not logged in - show login/signup page
            return response;
        }

        // User is logged in - fetch their tenant assignments
        const { data: tenantAssignments } = await supabase
            .from("user_tenant_assignments")
            .select("tenant_id, tenants(slug)")
            .eq("user_id", user.id);

        // No tenant assignments - redirect to error page
        if (!tenantAssignments || tenantAssignments.length === 0) {
            return NextResponse.redirect(
                new URL("/unauthorized?reason=no-tenant", request.url)
            );
        }

        // Pick first tenant
        // const firstTenant = tenantAssignments[0].tenants as {
        //     slug: string;
        // } | null;
        const firstTenantArray = tenantAssignments[0].tenants as
            | { slug: string }[]
            | null;
        const firstTenant = firstTenantArray?.[0] || null;

        if (!firstTenant?.slug) {
            return NextResponse.redirect(
                new URL("/unauthorized?reason=invalid-tenant", request.url)
            );
        }

        // Check if user has seller role in any store
        const { data: storeAssignments } = await supabase
            .from("user_store_assignments")
            .select("role")
            .eq("user_id", user.id);

        const hasSeller = storeAssignments?.some((a) => a.role === "seller");

        // Redirect to appropriate page based on role
        const targetPath = hasSeller
            ? `/${firstTenant.slug}/mobile/pos`
            : `/${firstTenant.slug}/mobile/profile`;

        return NextResponse.redirect(new URL(targetPath, request.url));
    }

    // ============================================================================
    // HANDLE /{tenant}/mobile ROOT - Redirect to appropriate subpage
    // ============================================================================
    if (pathname === `/${tenantSlug}/mobile`) {
        if (!user) {
            return NextResponse.redirect(
                new URL(`/${tenantSlug}/mobile/profile`, request.url)
            );
        }

        // Check if user has seller role
        const { data: storeAssignments } = await supabase
            .from("user_store_assignments")
            .select("role")
            .eq("user_id", user.id);

        const hasSeller = storeAssignments?.some((a) => a.role === "seller");

        const targetPath = hasSeller
            ? `/${tenantSlug}/mobile/pos`
            : `/${tenantSlug}/mobile/profile`;

        return NextResponse.redirect(new URL(targetPath, request.url));
    }

    // ============================================================================
    // PROTECT TENANT-PREFIXED ROUTES
    // ============================================================================
    const isProtectedRoute =
        pathname.startsWith(`/${tenantSlug}/admin`) ||
        pathname.startsWith(`/${tenantSlug}/mobile`);

    if (!isProtectedRoute) {
        // Not a protected route - allow access
        return response;
    }

    // Protected route - check if user is logged in
    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // User is logged in - verify they belong to this tenant
    const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", tenantSlug)
        .single();

    if (!tenant?.id) {
        // Tenant doesn't exist - redirect to error
        return NextResponse.redirect(
            new URL("/unauthorized?reason=tenant-not-found", request.url)
        );
    }

    // Check if user has assignment to this tenant
    const { data: userTenantAssignment } = await supabase
        .from("user_tenant_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenant.id)
        .single();

    if (!userTenantAssignment) {
        // User doesn't belong to this tenant - redirect to their first valid tenant
        const { data: validTenantAssignments } = await supabase
            .from("user_tenant_assignments")
            .select("tenant_id, tenants(slug)")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (validTenantAssignments?.tenants) {
            const validTenantArray = validTenantAssignments.tenants as {
                slug: string;
            }[];
            const validTenant = validTenantArray[0];

            // Check if user has seller role to determine target page
            const { data: storeAssignments } = await supabase
                .from("user_store_assignments")
                .select("role")
                .eq("user_id", user.id);

            const hasSeller = storeAssignments?.some(
                (a) => a.role === "seller"
            );

            const targetPath = hasSeller
                ? `/${validTenant.slug}/mobile/pos`
                : `/${validTenant.slug}/mobile/profile`;

            return NextResponse.redirect(new URL(targetPath, request.url));
        }

        // No valid tenants - redirect to error
        return NextResponse.redirect(
            new URL("/unauthorized?reason=no-access", request.url)
        );
    }

    // User belongs to this tenant - allow access
    return response;
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
