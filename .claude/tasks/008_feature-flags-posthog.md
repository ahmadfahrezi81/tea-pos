# Task 008 — Feature Flags + Analytics with PostHog

## Goal

Add PostHog to the seller app for two things at once:
1. **Feature flags** — kill-switches and per-store/per-role targeting, evaluated server-side
2. **Analytics** — page views, user events, funnels

This replaces the GrowthBook plan. PostHog covers both in one SDK with a generous free tier (1M events/month).

## What PostHog gives you vs what it doesn't

**Covers:**
- Feature flags (FE + BE) ✅
- Page view / event analytics ✅
- User identification and properties ✅

**Does NOT cover:**
- Error tracking (JS crashes, unhandled API errors) → Sentry for that later
- Uptime monitoring → Betterstack/UptimeRobot later
- Server performance (slow queries, p95 latency) → out of scope for now

---

## Architecture Decision

The seller app follows a thin-FE pattern — the frontend renders what the backend gives it. So **feature flags are evaluated server-side** in API routes, not in the browser. If a flag is off, the API route either rejects the request or omits the data. The FE never checks flags itself.

PostHog's browser SDK (`posthog-js`) is still installed — for analytics only, not for flag evaluation.

```
Flag evaluation:  API route (posthog-node) → flag on/off → include/exclude in response
Analytics:        Browser (posthog-js)     → page views, events
```

---

## Implementation Plan

### 1. PostHog account setup
- Create account at posthog.com
- Choose region: **US** (`https://us.i.posthog.com`). PostHog only has US and EU — no SEA region. US is closer to Indonesia than EU. Flag evaluation is server-to-server (Vercel Singapore → PostHog US) and analytics are fire-and-forget, so neither is user-facing latency.
- Note down two keys:
  - **Project API Key** (`phc_xxx`) — used in both FE and BE, safe to expose publicly
  - **Personal API Key** — only needed if using PostHog REST API directly (not needed here)

### 2. Install packages

```bash
pnpm --filter seller add posthog-js        # browser SDK
pnpm --filter seller add posthog-node      # server SDK for API routes
```

### 3. Frontend provider — `apps/seller/lib/context/PostHogContext.tsx`

Wraps the app, initializes analytics. Does NOT evaluate flags.

```tsx
"use client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogContextProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Guard required: React 18 Strict Mode double-invokes effects in dev.
        // posthog.init() is not idempotent — second call throws without this check.
        if (posthog.__loaded) return;
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
            person_profiles: "identified_only",
            capture_pageview: false,       // manual below — App Router doesn't auto-fire
            disable_session_recording: true,
        });
    }, []);

    // Track page views on route change (required for Next.js App Router)
    useEffect(() => {
        if (!pathname) return;
        posthog.capture("$pageview", { $current_url: window.location.href });
    }, [pathname, searchParams]);

    // Identify user once logged in
    useEffect(() => {
        if (!user) {
            posthog.reset();  // clear identity on logout
            return;
        }
        posthog.identify(user.id, {
            email: user.email,
            name: user.fullName,
            role: user.role,
        });
    }, [user]);

    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

Notes:
- `posthog.__loaded` guard is required — without it React Strict Mode double-fires the effect in dev and the second `posthog.init()` call throws
- `disable_session_recording: true` — explicitly off; PostHog enables it by default on paid plans
- `posthog.reset()` on logout clears the identity so the next user's session isn't attributed to the previous one
- `capture_pageview: false` because App Router route changes don't trigger the default pageview capture — handled manually above

> **Preferred alternative (Next.js 15.3+, and this app is on 16.2.4):** PostHog recommends initializing via `instrumentation-client.ts` instead of a context provider. It runs once before the app mounts, is lighter, and avoids the Strict Mode issue entirely. Check PostHog docs for the `instrumentation-client.ts` pattern before implementing — it may be cleaner than the provider approach above.

### 4. Wire provider into layout

`AuthProvider` lives in the root layout (`apps/seller/app/layout.tsx`) — it's already a parent of everything. `StoreProvider` lives in the mobile layout (`apps/seller/app/[tenantSlug]/mobile/layout.tsx`).

`PostHogContextProvider` needs both `useAuth()` and `useStore()`, so it goes inside `StoreProvider` in the mobile layout:

```tsx
// apps/seller/app/[tenantSlug]/mobile/layout.tsx
export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
        <StoreProvider>
            <PostHogContextProvider>   {/* ← add here */}
                <FastOrderModeProvider>
                    <ToastProvider>
                        <MobileLayoutClient>
                            {children}
                            <InactivityRefreshPopup />
                        </MobileLayoutClient>
                    </ToastProvider>
                </FastOrderModeProvider>
            </PostHogContextProvider>
        </StoreProvider>
    );
}
```

### 5. Server-side flag client — `apps/seller/lib/flags.ts`

Per PostHog's official Vercel/serverless docs: **create a new client per request, not a singleton.** Serverless environments can freeze mid-flight before async `capture` completes — a singleton carries stale state across requests and can lose events. This app is on Next.js 16.2.4 so `after()` is available — use it to ensure shutdown completes after the response is sent without hanging it.

```ts
import { PostHog } from "posthog-node";
import { after } from "next/server";

export function getFlagClient(): PostHog {
    return new PostHog(process.env.POSTHOG_API_KEY!, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        flushAt: 1,
        flushInterval: 0,
    });
}

export async function isFlagEnabled(
    flag: string,
    userId: string,
    properties?: Record<string, string>,
): Promise<boolean> {
    const client = getFlagClient();
    try {
        // Note: isFeatureEnabled() is deprecated — use evaluateFlags() for new code.
        // See open question #5 before extending this pattern.
        const result = await client.isFeatureEnabled(flag, userId, {
            personProperties: properties,
        });
        after(() => client.shutdown());  // ensure flush completes after response
        return result ?? false;
    } catch {
        await client.shutdown();
        return false;  // fail open — flag off on error
    }
}
```

> The app is on Next.js 16.2.4 so `after()` is available. Do not remove it.

Usage in an API route:

```ts
// apps/seller/app/api/payments/qris/route.ts
const enabled = await isFlagEnabled("qris", user.id, {
    role: user.role,
    tenantId,
    storeId,
});
if (!enabled) return NextResponse.json({ error: "Not available" }, { status: 403 });
```

### 6. Update `isEnabled()` in `packages/features/shared/features.ts`

Keep it as-is — it stays as the env-var fallback for contexts without a user ID (e.g. middleware, build-time checks). `isFlagEnabled()` from step 5 is the new runtime path for API routes.

```
isEnabled('qris')           → env-var check, no user context, for middleware/build
isFlagEnabled('qris', userId) → PostHog server-side, for API routes, has user context
```

### 7. Add env vars to `.env`

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx    # browser-safe, same project API key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phc_xxxxxxxxxxxx            # server-side only, not exposed to browser
```

Both `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_API_KEY` use the same value (the project API key). They are separate env vars so server-only code uses `POSTHOG_API_KEY` (no `NEXT_PUBLIC_` prefix means Next.js never bundles it into the client) even though the key itself is not a secret.

---

## How Flags Reach the Frontend

The FE never calls PostHog directly. The pattern is:

1. **BE evaluates the flag** in the API route using `isFlagEnabled()`
2. **BE bakes the result into the response** as a requirements/config field
3. **FE renders based on that field** — it just sees a boolean, has no idea PostHog exists

Example for `require_closing_photo`:

```ts
// API route: GET /api/summaries/requirements  (or part of the close-day response)
const requirePhoto = await isFlagEnabled("require_closing_photo", user.id, {
    storeId,
    tenantId,
});
return ok({ requirePhoto });

// FE component
const { requirePhoto } = useSummaryRequirements();
{requirePhoto && <PhotoUploadStep />}
```

This means: if you turn off the flag in the PostHog dashboard for a specific store, the next time that store's close-day flow loads, `requirePhoto` comes back `false` and the photo step disappears — no FE code change, no deploy.

> **Don't** check `require_closing_photo` directly in the close-day mutation API route (the one that saves the summary). Check it in a requirements/config endpoint that the FE loads before rendering the flow. Otherwise the FE has no way to know the step should be hidden.

---

## Flags to Create in PostHog Dashboard

| Flag | Default | Targeting notes |
|---|---|---|
| `qris` | off | Replaces `isEnabled("qris")` env-var |
| `new-dashboard` | off | Replaces `isEnabled("new-dashboard")` env-var |
| `export-pdf` | off | Replaces `isEnabled("export-pdf")` env-var |
| `skip-photos` | off | Replaces `isEnabled("skip-photos")` — currently used in open/close store flows |
| `require_closing_photo` | on | New flag; can be turned off per `storeId` |

---

## Analytics Events to Add (Day 1)

Start small — just the high-value ones:

| Event | Where | Properties |
|---|---|---|
| `order_created` | after successful order | `{ total_amount, item_count, store_id }` |
| `store_opened` | after open store flow | `{ store_id }` |
| `store_closed` | after close day flow | `{ store_id }` |
| `login` | after auth success | auto (PostHog captures this) |

More can be added later — don't instrument everything upfront.

---

## Open Questions / Concerns

**1. Flag evaluation latency — decision: per-request is fine for now**
`isFeatureEnabled()` makes a network call to PostHog (~50-200ms on cold start, cached on warm instances). For `qris` and `require_closing_photo`, the flag check happens on flows that already involve DB writes — the extra latency is invisible. If it ever becomes a problem, the fix is a module-level in-memory cache with a 60s TTL in `lib/flags.ts`. Do not pre-optimise this.

**2. `isEnabled()` vs `isFlagEnabled()` coexistence**
Two flag sources remain: env-var (`isEnabled`) and PostHog (`isFlagEnabled`). Middleware and any code in `packages/` will still use `isEnabled()` since they can't call PostHog without a userId. Accept this split consciously — don't try to unify them for now.

**3. PostHog outside the mobile layout**
`PostHogContextProvider` lives inside the mobile layout. Pages outside it (`/login`, `/unauthorized`) won't have it — but PostHog is initialized globally via `posthog.init()` so direct `posthog.capture()` calls still work there, just without the React context.

**4. Per-request client and `after()` requirement**
The task uses per-request instantiation per PostHog's official Vercel/serverless guidance — `flushAt: 1` + `flushInterval: 0` ensures events flush immediately, and `after(() => client.shutdown())` ensures the flush completes after the response is sent without hanging it. The app is on Next.js 16.2.4 so `after()` is available. If analytics events go missing in production, this is the first thing to check — confirm `after()` is wired up in every route that calls `isFlagEnabled()`.

**5. `isFeatureEnabled()` is deprecated**
PostHog now recommends `evaluateFlags()` for new code. The `isFlagEnabled()` wrapper in this task still uses `isFeatureEnabled()` — it works during the deprecation period but don't build more on top of it. Before implementing, check the current PostHog Node SDK docs for the `evaluateFlags()` signature and update the wrapper accordingly.

---

## Session Start — Read These First

```
apps/seller/app/[tenantSlug]/mobile/layout.tsx     — where to wire the provider
apps/seller/app/api/stores/route.ts                — getCurrentTenantId() from "@tea-pos/utils/server-config/tenant" — same import for isFlagEnabled
packages/features/shared/features.ts              — current isEnabled() — keep untouched
apps/seller/lib/context/AuthContext.tsx            — user shape
apps/seller/lib/context/StoreContext.tsx           — selectedStoreId
```

Run this before starting to see all current `isEnabled()` callsites:
```bash
grep -rn "isEnabled(" apps/seller packages/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```
