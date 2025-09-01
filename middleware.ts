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

//     const {
//         data: { user },
//     } = await supabase.auth.getUser();

//     // Protect dashboard and admin routes
//     if (
//         (request.nextUrl.pathname.startsWith("/dashboard") ||
//             request.nextUrl.pathname.startsWith("/admin/dashboard")) &&
//         !user
//     ) {
//         return NextResponse.redirect(new URL("/login", request.url));
//     }

//     // Redirect authenticated users away from auth pages
//     if (
//         (request.nextUrl.pathname === "/login" ||
//             request.nextUrl.pathname === "/signup") &&
//         user
//     ) {
//         // Update redirect to go to admin dashboard instead of just admin
//         return NextResponse.redirect(new URL("/admin/dashboard", request.url));
//     }

//     return response;
// }

// export const config = {
//     matcher: [
//         "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
//     ],
// };

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Get user profile to check role (assuming you have a profiles table)
    let userRole = null;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles") // adjust table name if different
            .select("role")
            .eq("id", user.id)
            .single();

        userRole = profile?.role;

        console.log("Profile:", profile);
    }

    const isAdmin = userRole === "ADMIN";

    // Allow access to /admin (login page) - this should be open for everyone
    if (request.nextUrl.pathname === "/admin") {
        // If user is already authenticated and is admin, redirect to dashboard
        if (user && isAdmin) {
            return NextResponse.redirect(
                new URL("/admin/dashboard", request.url)
            );
        }
        return response;
    }

    // Protect all /admin/* routes - require authentication AND admin role
    if (request.nextUrl.pathname.startsWith("/admin/")) {
        if (!user) {
            return NextResponse.redirect(new URL("/admin", request.url));
        }

        if (!isAdmin) {
            // Redirect non-admin users to mobile or wherever appropriate
            return NextResponse.redirect(new URL("/mobile", request.url));
        }
    }

    // Keep your existing dashboard and login/signup logic
    if (
        (request.nextUrl.pathname.startsWith("/dashboard") ||
            request.nextUrl.pathname.startsWith("/admin/dashboard")) &&
        !user
    ) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (
        (request.nextUrl.pathname === "/login" ||
            request.nextUrl.pathname === "/signup") &&
        user
    ) {
        // If user is admin, send to admin dashboard, otherwise to regular dashboard
        if (isAdmin) {
            return NextResponse.redirect(
                new URL("/admin/dashboard", request.url)
            );
        } else {
            return NextResponse.redirect(new URL("/mobile", request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
