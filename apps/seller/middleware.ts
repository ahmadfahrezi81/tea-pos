import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Constants ────────────────────────────────────────────────────────────────

const RESERVED_SLUGS = ["api", "login", "docs", "_next", "unauthorized"];

const STATIC_PREFIXES = ["/_next", "/api", "/auth", "/icons", "/manifest"];

const ALLOWED_ROLES = ["USER", "ADMIN"];

const USER_COOKIE_TTL = 60 * 60 * 24 * 7; // 7 days
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

const redirect = (path: string, req: NextRequest) =>
    NextResponse.redirect(new URL(path, req.url));

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static assets
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

    // Cache tenant ID in cookie
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
            );
        } else {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role, full_name, email")
                .eq("id", user.id)
                .single();
            setUserCookie(
                response,
                user.id,
                profile?.role ?? "USER",
                profile?.full_name ?? "",
                profile?.email ?? "",
            );
        }
    }

    // ── /login ────────────────────────────────────────────────────────────────
    if (pathname === "/login") {
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

        return redirect(`/${firstTenant.slug}/mobile/pos`, request);
    }

    // ── /{tenant}/mobile root ─────────────────────────────────────────────────
    if (pathname === `/${tenantSlug}/mobile`) {
        if (!user) return redirect("/login", request);
        return redirect(`/${tenantSlug}/mobile/pos`, request);
    }

    // ── Protect mobile routes ─────────────────────────────────────────────────
    const isProtected = pathname.startsWith(`/${tenantSlug}/mobile`);

    if (!isProtected) return response;
    if (!user) return redirect("/login", request);
    if (!tenantId)
        return redirect("/unauthorized?reason=tenant-not-found", request);

    // Check role is allowed
    const cached = request.cookies.get("x-user-info")?.value;
    const role = cached ? JSON.parse(cached).role : null;
    if (role && !ALLOWED_ROLES.includes(role))
        return redirect("/unauthorized?reason=no-access", request);

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

    return redirect(`/${validTenant.slug}/mobile/pos`, request);
}

export const config = {
    matcher: ["/:tenantSlug/mobile/:path*", "/:tenantSlug/mobile", "/login"],
};
