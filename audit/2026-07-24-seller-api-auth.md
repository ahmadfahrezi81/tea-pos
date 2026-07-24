# Seller App — API Authentication Audit

**Date:** 2026-07-24
**Scope:** `apps/seller` — how API routes authenticate and authorize requests
**Type:** Read-only audit (no code changed)
**Context:** Internal-only app, non-technical staff users. Findings are ranked with
that low-threat context in mind — several items are "architecturally weak but low
real risk today." Kept as a reference for if/when the app expands or opens to
less-trusted users.

---

## By the numbers

| Metric | Count |
| --- | --- |
| Total API route files | **48** |
| Routes that check identity (`getRequestUser`) | 27 |
| Routes with **no** identity check at all | **21** |
| Routes using **service-role** client (bypasses RLS) | **41** |
| Routes that validate the real token (`auth.getUser`) | **0** |
| Routes using an RLS-respecting client | **0** |
| Routes doing **role-based authorization** | **0** (role only feeds feature flags) |

---

## How auth works today

One strong link (middleware) and one weak handoff (routes trust its output).

```
NAVIGATION (page load)
  proxy.ts → supabase.auth.getUser()   ← validates the REAL token ✅
           → fetches role + status FRESH from DB ✅
           → writes cookies:
                x-user-info   (id, role, name, email)  httpOnly:FALSE, 7-day TTL
                x-tenant-id   (slug:id)                 httpOnly:true,  24h TTL

API CALL (/api/*)  — skips the proxy entirely (matcher excludes /api)
  getRequestUser() → just JSON.parses the x-user-info COOKIE  ← no token, no DB ❌
  getServiceClient() → service role, RLS bypassed              ← no DB-level backstop ❌
```

**Key point:** the middleware *does* real authentication and is the actual gate for
page loads. The weakness is that API routes trust the cookies the middleware
produced instead of re-verifying — and one of those cookies (`x-user-info`) is
client-readable and writable.

### Relevant source

- `apps/seller/proxy.ts` — middleware; validates token, resolves role/status fresh,
  sets `x-user-info` (`httpOnly: false`) and `x-tenant-id` (`httpOnly: true`).
- `apps/seller/lib/auth/get-request-user.ts` — reads + `JSON.parse`s the
  `x-user-info` cookie. No token validation, no DB call.
- `apps/seller/lib/supabase/service.ts` — `getServiceClient()`; service-role key,
  explicitly "bypasses RLS".
- `packages/utils/server-config/tenant.ts` — `getCurrentTenantId()`; reads the
  `x-tenant-id` cookie.

---

## Findings (ranked)

### 1. API routes never re-validate the token — MEDIUM (practical)
A suspended or revoked user keeps working until the `x-user-info` cookie expires,
up to **7 days**. This is the gap behind the "suspend an employee" work: the proxy
blocks their *page loads*, but their *API calls* (e.g. an already-open POS tab
hitting `POST /api/orders`) still succeed because routes never re-check status.

### 2. Identity cookie is client-writable — LOW today / architecturally the soft spot
`x-user-info` is set `httpOnly: false`, so client JS can read *and write* it, yet
it is the sole source of identity + role for 27 endpoints running under the service
role. In principle a user could edit the cookie to change their own `id`/`role`.
Low real risk here (internal, non-technical staff), but it's the textbook
"never trust client-supplied identity" smell.

### 3. Everything runs under the service role — LOW now / free safety net unused
41 of 48 routes use the service-role client, so **RLS is bypassed for all app
traffic**. CLAUDE.md calls RLS "the source of truth for access control," but the app
never exercises it. RLS today only protects against direct anon-key access to
Supabase, not against a bug in your own routes. Defense-in-depth is effectively off.

### 4. 21 routes check no identity at all — LOW
Mostly GETs (analytics, summaries, activity logs), plus cron and the QRIS webhook.
They are tenant-scoped by the `x-tenant-id` cookie, so exposure is mostly reads
within a tenant. Worth knowing which endpoints these are.

### 5. No role-based authorization — INFORMATIONAL
`role` is only read to evaluate feature flags (`isFlagEnabled`). There is no
"only ADMIN can do X" enforcement. Fine while all staff have equal powers; revisit
when roles should mean different permissions.

---

## How to make it better (future roadmap)

Guiding principle: **authenticate at every trust boundary, never trust a value the
client can set, and default to least privilege (RLS) rather than god-mode
(service role).** In rough priority order:

1. **One shared `requireUser()` API helper (the big win).** Validate the *real*
   Supabase token server-side (an SSR client bound to the request's auth cookie →
   `auth.getUser()`), then fetch `role, status` fresh from the DB and reject anyone
   not `active`. Swap it into the mutating routes. Kills findings #1 and #2 at once —
   you stop trusting the forgeable cookie for authorization, and status/role become
   always fresh. No realtime needed for enforcement.

   ```ts
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) return unauthorized();
   const { data: profile } = await supabase
       .from("users").select("role, status").eq("id", user.id).single();
   if (!profile || profile.status !== "active") return forbidden();
   ```

2. **Demote `x-user-info` to a display-only cookie** (name/avatar for UI), never an
   authorization source. Identity-for-authz always comes from the token.

3. **Least privilege for DB access.** Use an RLS-respecting client (anon key + the
   user's JWT) for user-scoped operations; reserve the service-role client for
   genuinely privileged jobs (cron, webhooks). Then even a coding mistake can't
   cross tenants — Postgres enforces it.

4. **A `requireRole('ADMIN')` helper** for admin-only endpoints, once roles should
   diverge in power.

5. **Shorten the identity cookie TTL** (7 days is long) so even without token
   validation, revocation propagates faster.

---

## Mental model to take forward

Middleware auth is great for the *front door*, but **every endpoint is its own
door.** In a bigger or hostile-user app you re-check identity at each one from
something unforgeable (the token), fetch authority fresh, and let RLS be your
seatbelt. This app has a well-built front door; the lesson is that the API doors
currently assume the front door already handled it.

---

## Related work at time of audit

- `proxy.ts` now blocks non-`active` users on navigation (allowlist: only `active`
  passes) and redirects to `/unauthorized?reason=<status>&tenant=<slug>`.
- `app/unauthorized/page.tsx` shows status-specific messaging + a "Try again"
  button (hard navigation to re-run the proxy).
- **Not yet done:** the API-layer enforcement described above, and the optional
  realtime subscription for instant reaction during the idle window.
