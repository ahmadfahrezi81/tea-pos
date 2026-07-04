# Task 034 — Shared Error Display (Bottom Sheet), Backoffice First

> **Status:** Steps 1–6 shipped in both `backoffice` and `seller` (the "backoffice
> first" sequencing in this doc reflects the original plan, but seller followed
> immediately after in the same work session). Step 7 (remaining call sites) and
> the `error.tsx`/`global-error.tsx` boundary are still open. See the addendum
> at the bottom for a new, separate piece of scope: a generic toast for GET
> failures, which hasn't been built yet.

## Context

Both apps currently show errors with the same duplicated, low-effort pattern:

```ts
} catch (err) {
    setError(err instanceof Error ? err.message : "Failed to save");
}
```

...rendered as a small inline `<p className="text-sm text-red-500">`. ~15+ call
sites across both apps do this independently. It has no status code, is easy to
miss, and gives a user nothing worth screenshotting when something breaks.

Since `backoffice` and `seller` are both in-house apps sharing `packages/services`
and `packages/ui`, the fix should be one shared primitive used by both — built
once in `packages/ui`, wired into `backoffice` now, dropped into `seller` later
with no new component work.

### What's actually broken today (not just "toast vs. bottom sheet")

1. **Production logging is a no-op.** `apps/*/lib/utils/logger.ts`:
   ```ts
   const DEBUG = process.env.NODE_ENV === "development";
   export const logger = {
       error: (message, error) => { if (DEBUG) console.error(...); },
   };
   ```
   `handleError()` in both `lib/api/response.ts` calls `logger.error()` on every
   caught exception — but in production this does *nothing*. Right now a 500
   in prod is logged nowhere at all.

   This is orthogonal to what the client receives, though — every route already
   returns a real response body via `ok()`/`err()` regardless of logging, so the
   frontend always has something to show. Logging only affects what shows up in
   Vercel's console for the developer. Given that, don't log everything: 4xx
   (bad input, unauthorized, not found, duplicate submission, etc.) are expected
   traffic, not bugs — logging every one of those is just noise against the
   host's log volume/retention with nothing actionable in it. Only 5xx (unexpected
   server failures) are worth logging unconditionally. See the revised
   `handleError()` below.

2. **Status codes exist but die at the fetch boundary.** `packages/services/*.ts`
   already has a real (if inconsistent) convention:
   ```ts
   throw Object.assign(new Error("Payout not found"), { status: 404 });
   ```
   Seller's `apiFetch` reads `res.status` and attaches it to the thrown error;
   backoffice's `apiFetch` doesn't even do that — it throws a bare `Error` with
   just a message. Either way, nothing downstream ever reads `.status` — grep
   confirms zero client-side consumers of it today.

3. **No error boundary in either app.** No `error.tsx` / `global-error.tsx` in
   `apps/backoffice/app` or `apps/seller/app`. An uncaught render error shows
   Next's default page, not anything in-house.

4. **Theme divergence between apps** — `apps/backoffice/app/globals.css` only
   defines `--background/--foreground/--border/--input/--ring/--brand`.
   `apps/seller/app/globals.css` defines the full shadcn token set
   (`--primary`, `--card`, `--destructive`, etc.). This is exactly why
   `packages/ui/components/switch.tsx` rendered invisibly in backoffice earlier
   today (`bg-primary` resolved to nothing). **Any shared component built here
   must use raw Tailwind palette classes (`bg-red-500`, `text-gray-400`, the
   shared `brand` token) — never shadcn semantic tokens.**

---

## Design

### 1. `packages/utils/errors.ts` (new)

A shared normalizer so any thrown value — `ApiError`, plain `Error`, a
Supabase `PostgrestError`, or a raw string — becomes one predictable shape on
the client:

```ts
export class ApiError extends Error {
    status: number;
    /** e.g. "PUT /api/payroll/commission-types/abc123" — set by apiFetch at throw time. */
    route?: string;
    constructor(message: string, status = 500, route?: string) {
        super(message);
        this.status = status;
        this.route = route;
    }
}

export function toApiError(err: unknown, fallbackMessage = "Something went wrong"): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof Error) {
        const status = (err as Error & { status?: number }).status ?? 500;
        return new ApiError(err.message, status);
    }
    if (typeof err === "string") return new ApiError(err);
    return new ApiError(fallbackMessage);
}
```

Services keep throwing `Object.assign(new Error(msg), { status })` — that
already satisfies `toApiError`'s duck-typed check (`.status` present). No need
to touch every service throw site in this task; new/touched service code
should prefer `throw new ApiError(msg, status)` going forward for clarity.

### 2. Server response layer — `apps/backoffice/lib/api/response.ts`

- `err()` stays as-is — `{ error: message }`. **No body format change needed**:
  the HTTP status code is already carried by the response status line itself
  (`res.status` in `fetch`), so there's nothing to duplicate into the JSON.
  The only real gap was the client never reading `res.status` (fixed in #3).
- `handleError()` only logs 5xx, always (regardless of env). 4xx is never
  logged server-side — it's expected traffic, not signal:
  ```ts
  export function handleError(route: string, error: unknown) {
      const apiError = toApiError(error);
      if (apiError.status >= 500) {
          logger.error(`${route} → ${apiError.status}`, apiError);
      }
      return err(apiError.message, apiError.status);
  }
  ```
- `apps/backoffice/lib/utils/logger.ts`: drop the `DEBUG` gate specifically on
  `.error` (keep `.warn`/`.info` dev-only — they're noisy, errors aren't). Since
  `handleError` now only calls `.error()` for 5xx, this means: 5xx always
  logged in every env, 4xx never logged server-side at all. That's the actual
  fix for "logging the status code and the whys" without the Vercel-noise
  concern — signal without volume.

### 3. Client fetch layer — `apps/backoffice/lib/api/client.ts`

`apiFetch` throws a real `ApiError` instead of a bare `Error`. Method + URL are
captured here, once, at the only place that actually knows them — not passed
in manually by every one of the ~15+ call sites (that would drift: a route
string only correct until the next refactor renames the endpoint):

```ts
import { ApiError } from "@tea-pos/utils/errors";

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(
            (body as { error?: string }).error ?? `Request failed: ${res.status}`,
            res.status,
            `${options?.method ?? "GET"} ${url}`,
        );
    }
    return res.json() as Promise<T>;
}
```

### 4. UI primitive — `packages/ui/custom/ErrorSheet.tsx` (new, shared)

Same bottom-sheet visual language already used everywhere else in both apps
(`rounded-t-2xl`, drag handle, `X` close) — raw Tailwind palette only, no
semantic tokens.

Content:
- A friendly headline mapped from status code (fallback to generic):
  ```ts
  const STATUS_TITLE: Record<number, string> = {
      400: "That request didn't look right",
      401: "You've been signed out",
      403: "You don't have permission for that",
      404: "We couldn't find that",
      422: "That didn't go through",
      500: "Something broke on our end",
  };
  ```
- A status chip (`500 · Server Error`) — small, monospace, next to the headline.
- The raw message from the server, as-is.
- A monospace "details" block, laid out to be legible in a screenshot:
  ```
  2026-07-06 14:32:11
  PUT /api/payroll/commission-types/abc123
  500 Internal Server Error
  Failed to upsert payroll user info
  ```
- "Copy details" button (`navigator.clipboard.writeText`) — belt-and-suspenders
  next to the screenshot use case.
- Single "Dismiss" button. No retry affordance — keep this presentational only,
  callers decide whether to retry.

Props: `isOpen`, `onClose`, `error: ApiError | null` — `route` comes off
`error.route` (set by `apiFetch`), nothing extra for the caller to pass.

### 5. `ErrorSheetProvider` / `useErrorSheet()` — `apps/backoffice/lib/context/ErrorSheetContext.tsx` (new)

Same shape as the existing `ToastContext` (`apps/backoffice/lib/context/ToastContext.tsx`,
mounted in `apps/backoffice/app/[tenantSlug]/mobile/layout.tsx`) — add
`ErrorSheetProvider` alongside `ToastProvider` in that same layout file:

```ts
const { showError } = useErrorSheet();
// ...
} catch (err) {
    showError(err); // route/status/message all come off the ApiError already
}
```

`ToastContext` stays as-is for success/info messages — this doesn't replace
toasts wholesale, just error handling specifically.

**Important distinction inside the 5 forms being migrated (step 6 below):** each
one uses the same `error` state for two different things —
pre-flight client-side validation (`setError("Name and slug are required.")`,
no network call, no status code) and the actual caught API error in the
`catch` block (`setError(err instanceof Error ? err.message : "Failed to save")`).
Only the second one — the real `catch` — should move to `showError()`. The
validation message should stay inline as-is (or become a toast); routing a
plain "please fill in the name field" through a full bottom sheet would be a
UX regression, not an improvement.

---

## Rollout (this task, backoffice only)

1. Add `packages/utils/errors.ts`.
2. Update `apps/backoffice/lib/api/response.ts` + `lib/utils/logger.ts` per above.
3. Update `apps/backoffice/lib/api/client.ts` `apiFetch`.
4. Add `packages/ui/custom/ErrorSheet.tsx`.
5. Add `apps/backoffice/lib/context/ErrorSheetContext.tsx`, wire `ErrorSheetProvider`
   alongside `ToastProvider` in `apps/backoffice/app/[tenantSlug]/mobile/layout.tsx`.
6. Migrate the 5 payroll forms touched earlier today (commission-types add/edit,
   claim-types add/edit, staff `[userId]`) — route only the `catch` block's
   `setError(err instanceof Error ? ...)` to `showError(err)`. Leave the
   pre-flight validation `setError("Name and slug are required.")` calls as
   inline text, unchanged — see the distinction called out in section 5.
   Natural first batch since they're already open and share the exact
   `FormFooter` + confirm-sheet pattern this builds on.
7. Leave remaining backoffice call sites (payouts mark-as-paid, etc.) as a
   follow-up mechanical pass once this is proven in production.

**Explicitly out of scope for this task:** the `seller` app. `ErrorSheet` lives
in `packages/ui` specifically so wiring it into seller later is just steps
3 + 5 + 6 repeated there — no new component work.

**Noted but not built now:** `error.tsx` / `global-error.tsx` Next.js boundaries
for uncaught render errors, so a genuine crash also gets a screenshot-friendly
surface instead of Next's default error page. Worth a follow-up task once the
`ApiError`/`ErrorSheet` primitives exist to route into.

---

## Verification

- Trigger a real 4xx and a real 5xx from the backoffice UI, confirm the bottom
  sheet shows the right status, message, and a screenshot-legible details
  block in both cases:
  - **4xx**: edit a commission/claim type, then delete it from another tab
    before saving — `updatePayrollCommissionType`/`updatePayrollClaimType`
    throw a 404 (`packages/services/payroll-claim-types.ts:91`,
    `payroll-commission-types.ts:49`) for a not-found id.
  - **5xx**: temporarily throw a plain `Error` in a service (e.g. duplicate a
    claim-type slug — `createPayrollClaimType` at
    `packages/services/payroll-claim-types.ts:52` currently throws a bare
    `new Error(...)` on the unique-constraint violation with no `.status`,
    which is exactly a 500 today, not a 4xx as one might expect for a
    duplicate/conflict. Worth flagging as a separate follow-up — a 409/422
    would be more correct — but out of scope for this task, which is about
    display, not reclassifying every service throw site).
- Confirm the server console actually logs the error in a production build
  (`next build && next start`), not just `next dev`.
- Confirm `ErrorSheet` renders correctly — i.e. no invisible elements from
  relying on a token backoffice doesn't define (the `Switch` mistake from
  earlier today).

---

## Addendum — Generic toast for GET/fetch failures (not yet built)

### Why this is separate from `ErrorSheet`

Confirmed earlier in this task: `ErrorSheet` only fires where `showError()` is
called explicitly, which is exactly the ~14 user-initiated POST/PUT save flows
across both apps. GET/data-loading failures (every `useSWR()` call — commission
types, staff list, payouts, etc.) surface nothing today; the UI just silently
shows an empty state or spins forever.

Agreed reasoning for keeping these separate rather than also using
`ErrorSheet`: a save failure is a direct answer to something the user just did
and deserves an interrupting bottom sheet; a background list load failing is
ambient, SWR already retries it automatically, and popping a full-screen sheet
every time a background refresh hiccups (especially on the seller PWA's
shop-floor wifi) would be worse than the current silence. A plain, generic
toast — "couldn't load the latest data" — is the right weight: visible, but
not blocking.

### Feasibility — confirmed before designing

Both apps already wrap their entire tree in a root `<SWRConfig>`:

```ts
// apps/backoffice/app/layout.tsx
<SWRConfig value={{ dedupingInterval: 5000, revalidateOnFocus: false }}>

// apps/seller/app/layout.tsx
<SWRConfig value={{ dedupingInterval: 5000, revalidateOnFocus: false, errorRetryCount: 3 }}>
```

SWR's `onError` config option fires globally for every failed `useSWR()` call
in the tree, with no per-hook changes needed. This means the "reusable
everywhere" property falls out for free — none of the many existing
`useSWR()` call sites (`usePayrollCommissionTypes`, `useTenantUsers`,
`usePayouts`, etc., and every future one) need to change at all.

### The one real problem: retry spam

By default SWR calls `onError` on **every failed attempt**, including
automatic retries — backoffice has no `errorRetryCount` set (unlimited
retries with backoff), seller caps it at 3. Wiring a toast directly to
`onError` naively means one network blip on one resource could pop 3+ toasts
in a row. Needs a per-key cooldown: track the last-shown timestamp per SWR
key in a `Map`, skip showing again for the same key within a window (e.g.
10s). This turns "one flaky resource" into "at most one toast per 10s," not
"one toast per retry."

### Design — revised: one home per app, not a second provider

Original draft below had the fetch-toast logic in its own shared
`packages/ui/custom/SWRErrorToast.tsx` component, wired via a second provider
in `mobile/layout.tsx`. Revised per explicit feedback: mutation errors
(bottom sheet) and fetch errors (toast) are "doing the same thing" —
both are the app's answer to "how do we tell the user something broke" —
just two different presentations for two different trigger sources. They
should live in one place so there's a single spot to open when touching
error-display behavior, not two files that both need updating in lockstep.

Consolidated: fold the fetch-error toast directly into the **existing**
`apps/{app}/lib/context/ErrorSheetContext.tsx` — the same file that already
holds `ErrorSheetProvider` and `showError()`. It already sits below
`ToastProvider` in `mobile/layout.tsx` (so `useToast()` is already reachable
there) and below where the nested `SWRConfig` would need to go anyway.

The only genuinely cross-app piece is the cooldown/dedup bookkeeping — pure
logic, no JSX — which belongs in `packages/utils/errors.ts` (already the
shared home for `ApiError`/`toApiError`) as a small factory function:

```ts
// packages/utils/errors.ts (addition)
const FETCH_ERROR_COOLDOWN_MS = 10_000;

/** Returns a gate function: true if a fetch error for this key should be shown now, false if still in cooldown. */
export function createFetchErrorGate(cooldownMs = FETCH_ERROR_COOLDOWN_MS) {
    const lastShown = new Map<string, number>();
    return (key: string): boolean => {
        const now = Date.now();
        const last = lastShown.get(key) ?? 0;
        if (now - last < cooldownMs) return false;
        lastShown.set(key, now);
        return true;
    };
}
```

`apps/{app}/lib/context/ErrorSheetContext.tsx` (revised — one file, both
behaviors):

```tsx
"use client";
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { SWRConfig } from "swr";
import { ErrorSheet } from "@tea-pos/ui/custom/ErrorSheet";
import { toApiError, createFetchErrorGate, type ApiError } from "@tea-pos/utils/errors";
import { useToast } from "@/lib/context/ToastContext";

interface ErrorSheetContextValue {
    showError: (err: unknown) => void;
}

const ErrorSheetContext = createContext<ErrorSheetContextValue | null>(null);

export function ErrorSheetProvider({ children }: { children: ReactNode }) {
    const [error, setError] = useState<ApiError | null>(null);
    const { showToast } = useToast();
    const canShowFetchError = useRef(createFetchErrorGate()).current;

    const showError = useCallback((err: unknown) => {
        setError(toApiError(err));
    }, []);

    return (
        <ErrorSheetContext.Provider value={{ showError }}>
            <SWRConfig
                value={{
                    onError: (_err, key) => {
                        if (!canShowFetchError(key)) return;
                        showToast("Couldn't load the latest data — check your connection.", "error");
                    },
                }}
            >
                {children}
            </SWRConfig>
            <ErrorSheet isOpen={error !== null} onClose={() => setError(null)} error={error} />
        </ErrorSheetContext.Provider>
    );
}

export function useErrorSheet() {
    const ctx = useContext(ErrorSheetContext);
    if (!ctx) throw new Error("useErrorSheet must be used within an ErrorSheetProvider");
    return ctx;
}
```

`mobile/layout.tsx` in both apps **doesn't change at all** beyond what it
already has — it already mounts `<ErrorSheetProvider>` below `ToastProvider`
for the bottom-sheet feature; that single provider now also carries the
fetch-toast behavior internally. No second provider, no bridge component.

Message stays deliberately generic and singular — no status code, no
per-error detail, no "which resource failed" — this is explicitly the
lightweight counterpart to the bottom sheet, not a second copy of it.

### Rollout

1. Add `createFetchErrorGate` to `packages/utils/errors.ts`.
2. Update `apps/backoffice/lib/context/ErrorSheetContext.tsx` per above —
   add the nested `SWRConfig` + `useToast()` wiring. `mobile/layout.tsx`
   unchanged.
3. Same edit to `apps/seller/lib/context/ErrorSheetContext.tsx`.
4. No other file needs to change — every existing and future `useSWR()` call
   picks this up automatically.

### Verification

- Throttle network to Offline in DevTools on any page backed by `useSWR`
  (e.g. commission-types list), confirm exactly **one** toast appears, not
  one per retry attempt.
- Re-enable network, confirm the page recovers on next revalidation with no
  further toast.
- Confirm a normal, successful page load shows no toast.
- Confirm the existing action-triggered `ErrorSheet` (POST/PUT saves) still
  works unchanged, and that `showError()` and the fetch-toast can both fire
  independently without interfering with each other.
