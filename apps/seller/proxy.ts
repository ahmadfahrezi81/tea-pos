import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Constants ────────────────────────────────────────────────────────────────

const RESERVED_SLUGS = new Set([
    "api",
    "login",
    "docs",
    "_next",
    "unauthorized",
]);
const STATIC_PREFIXES = ["/_next", "/api", "/auth", "/icons", "/manifest"];

// Roles allowed to access the seller app.
// DRIVER and SUPPLIER have their own separate apps.
const ALLOWED_ROLES = new Set(["USER", "ADMIN"]);

const USER_COOKIE_TTL = 60 * 60 * 24 * 7; // 7 days
const TENANT_COOKIE_TTL = 60 * 60 * 24; // 24h
const TENANT_ACCESS_TTL = 60 * 60; // 1h

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setUserCookie(
    response: NextResponse,
    userId: string,
    role: string,
    fullName = "",
    email = "",
    avatarUrl = "",
    preferredLanguage = "en",
) {
    response.cookies.set(
        "x-user-info",
        JSON.stringify({ id: userId, role, fullName, email, avatarUrl, preferredLanguage }),
        {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: USER_COOKIE_TTL,
            path: "/",
        },
    );
}

function setTenantAccessCookie(response: NextResponse, key: string) {
    response.cookies.set("x-tenant-access", key, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: TENANT_ACCESS_TTL,
        path: "/",
    });
}

function setTenantIdCookie(response: NextResponse, slug: string, id: string) {
    response.cookies.set("x-tenant-id", `${slug}:${id}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: TENANT_COOKIE_TTL,
    });
}

/**
 * The same slug `x-tenant-id` already carries, minus the httpOnly flag, so
 * `public/launch.html` can read it.
 *
 * The splash is a static file with no way to ask who is looking at it, so
 * without this it has to send everyone to /login and wait for the server to
 * look their tenant up — a whole extra page load on every cold open, plus the
 * `user_tenant_assignments` query that goes with it. With it, the splash goes
 * straight to the tenant.
 *
 * Readable by scripts on purpose, and safe to be: the slug is the first segment
 * of every URL in the app. Nothing is trusted from it either — it only chooses
 * where to navigate, and this proxy still authorises that navigation on arrival,
 * so a stale or edited value gets corrected rather than believed.
 */
function setTenantSlugCookie(response: NextResponse, slug: string) {
    response.cookies.set("x-tenant-slug", slug, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: TENANT_COOKIE_TTL,
        path: "/",
    });
}

const redirectTo = (path: string, req: NextRequest) =>
    NextResponse.redirect(new URL(path, req.url));

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static assets early — no auth needed
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
    const shouldResolveTenant = tenantSlug && !RESERVED_SLUGS.has(tenantSlug);

    // Tenant slugs are immutable, so a cached slug:id pair never goes stale —
    // skip the DB lookup entirely once the cookie already matches this slug.
    const [cachedTenantSlug, cachedTenantId] =
        request.cookies.get("x-tenant-id")?.value?.split(":") ?? [];
    const tenantCacheHit =
        shouldResolveTenant &&
        cachedTenantSlug === tenantSlug &&
        !!cachedTenantId;

    // ── Auth + tenant lookup in parallel ─────────────────────────────────────
    const [
        {
            data: { user },
        },
        tenantResult,
    ] = await Promise.all([
        supabase.auth.getUser(),
        shouldResolveTenant && !tenantCacheHit
            ? supabase
                  .from("tenants")
                  .select("id")
                  .eq("slug", tenantSlug)
                  .single()
            : Promise.resolve({ data: null }),
    ]);

    // ── Tenant cookie ─────────────────────────────────────────────────────────
    const tenantId = tenantCacheHit
        ? cachedTenantId
        : (tenantResult.data?.id ?? null);

    if (tenantCacheHit) {
        setTenantIdCookie(response, tenantSlug, cachedTenantId);
        setTenantSlugCookie(response, tenantSlug);
    } else if (tenantResult.data?.id) {
        setTenantIdCookie(response, tenantSlug, tenantResult.data.id);
        setTenantSlugCookie(response, tenantSlug);
    } else if (!shouldResolveTenant) {
        response.cookies.delete("x-tenant-id");
        response.cookies.delete("x-tenant-slug");
    }

    // ── Role resolution ───────────────────────────────────────────────────────
    // Always fetch fresh from DB — role changes must take effect immediately.
    // No fallback: unknown or missing role = denied.
    let resolvedRole: string | null = null;
    let resolvedStatus: string | null = null;
    if (user) {
        const avatarUrl = (user.user_metadata?.avatar_url as string) ?? "";
        const { data: profile } = await supabase
            .from("users")
            .select("role, status, full_name, email, preferred_language")
            .eq("id", user.id)
            .single();

        resolvedRole = profile?.role ?? null;
        resolvedStatus = profile?.status ?? null;

        if (resolvedRole) {
            setUserCookie(
                response,
                user.id,
                resolvedRole,
                profile?.full_name ?? "",
                profile?.email ?? "",
                avatarUrl,
                profile?.preferred_language ?? "en",
            );
            response.cookies.set("locale", profile?.preferred_language ?? "en", {
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: USER_COOKIE_TTL,
                path: "/",
            });
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
            return redirectTo("/unauthorized?reason=no-tenant", request);

        const firstTenant = Array.isArray(tenantAssignments[0].tenants)
            ? tenantAssignments[0].tenants[0]
            : tenantAssignments[0].tenants;

        if (!firstTenant?.slug)
            return redirectTo("/unauthorized?reason=invalid-tenant", request);

        return redirectTo(`/${firstTenant.slug}/mobile/home/pos`, request);
    }

    // ── /{tenant}/mobile root ─────────────────────────────────────────────────
    if (pathname === `/${tenantSlug}/mobile`) {
        if (!user) return redirectTo("/login", request);
        return redirectTo(`/${tenantSlug}/mobile/home/pos`, request);
    }

    // ── Protect mobile routes ─────────────────────────────────────────────────
    const isProtected = pathname.startsWith(`/${tenantSlug}/mobile`);
    if (!isProtected) return response;

    if (!user) return redirectTo("/login", request);
    if (!tenantId)
        return redirectTo("/unauthorized?reason=tenant-not-found", request);

    // Role check — must pass before anything else, no exceptions
    if (!resolvedRole || !ALLOWED_ROLES.has(resolvedRole))
        return redirectTo("/unauthorized?reason=no-access", request);

    // Account status — only "active" may use the app. Anything else
    // (inactive/suspended/pending) is locked out immediately. Allowlist so a
    // future status defaults to denied. Reason carries the status for messaging.
    if (resolvedStatus !== "active")
        return redirectTo(
            `/unauthorized?reason=${resolvedStatus ?? "no-access"}&tenant=${tenantSlug}`,
            request,
        );

    // ── Tenant access cache ───────────────────────────────────────────────────
    // Role check already passed above — safe to use cache now
    const tenantAccessKey = `${user.id}:${tenantId}`;
    if (request.cookies.get("x-tenant-access")?.value === tenantAccessKey) {
        setTenantAccessCookie(response, tenantAccessKey);
        return response;
    }

    // ── Verify tenant membership ──────────────────────────────────────────────
    const { data: userTenantAssignment } = await supabase
        .from("user_tenant_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .single();

    if (userTenantAssignment) {
        setTenantAccessCookie(response, tenantAccessKey);
        return response;
    }

    // User doesn't belong to this tenant — redirect to their valid one
    const { data: validAssignment } = await supabase
        .from("user_tenant_assignments")
        .select("tenant_id, tenants(slug)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!validAssignment?.tenants)
        return redirectTo("/unauthorized?reason=no-access", request);

    const validTenant = Array.isArray(validAssignment.tenants)
        ? validAssignment.tenants[0]
        : validAssignment.tenants;

    if (!validTenant?.slug)
        return redirectTo("/unauthorized?reason=invalid-tenant", request);

    return redirectTo(`/${validTenant.slug}/mobile/home/pos`, request);
}

export const config = {
    matcher: ["/:tenantSlug/mobile/:path*", "/:tenantSlug/mobile", "/login"],
};
