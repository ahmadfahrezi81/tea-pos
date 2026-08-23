# Task 052 — Instant launch splash

**Status: designed, not built.** Opened 2026-08-23 after the owner reported that
opening the installed PWA shows white on iOS and a stuttering logo on Android,
despite the earlier boot-time work. Design agreed in discussion; the work list at
the bottom is what remains.

The goal, in the owner's words: *"I'd rather the user wait inside the loader
longer."* This task does not try to make the app boot faster. It tries to make
the app **look opened** immediately, and to move the waiting inside a screen we
control.

---

## The problem

The loader lives in `apps/seller/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx:104-128`,
passed to `MobileShell` as the `overlay` prop and gated on `!shellReady`.

That location is the whole problem. It sits at the bottom of this chain:

| # | Request | What has to happen |
|---|---|---|
| 1 | `GET /` | Not in the proxy matcher. `app/page.tsx` server-redirects to `/login`. |
| 2 | `GET /login` | Proxy runs. Session valid, so `proxy.ts:191` queries `user_tenant_assignments`, then redirects to `/:slug/mobile/home/pos`. |
| 3 | `GET /:slug/mobile/home/pos` | Proxy runs again, `TenantLayout` reads the tenant cookie, `MobileLayout` awaits pay frequency, page SSRs. |

`manifest.json` sets `"start_url": "/"`, so a cold launch pays all three. **No
pixel is painted until step 3 responds.** On iOS that is white for the whole
chain, because Safari renders no splash from a web manifest — it only honours
`apple-touch-startup-image`, and none are declared.

Two smaller findings from the same read:

- **`next.config.ts:21` sets `dynamicStartUrl: true`.** That tells next-pwa the
  start URL is auth-dependent, so the service worker caches it NetworkFirst — a
  cold launch is *designed* to wait on the network. This setting directly
  opposes the goal.
- **`manifest.json:28` declares `icon-512x512.png` with `"purpose": "maskable"`.**
  Android crops maskable icons to a safe zone, roughly 20% off each edge. The
  artwork is full-bleed, so Android's generated splash shaves it. This is the
  "chop" and it is **a separate bug from everything else in this task** — see
  Adjacent work.

### What is *not* the problem

Caching the logo. The blank is three server navigations, not an image download.
No amount of asset caching helps a navigation that is waiting on TTFB.

---

## The design

A static document, outside Next, outside the proxy, precached by the service
worker, set as the PWA entry point.

1. **`apps/seller/public/launch.html`** — hand-written, roughly 1KB, inlined CSS
   copied from `globals.css:45-61` (`loading-track` / `loading-bar`). Logo and
   bar paint with zero JavaScript and zero network.
2. **Precache it.** Files in `public/` already enter the precache manifest. Set
   `dynamicStartUrl: false` in `next.config.ts:21` and `"start_url": "/launch.html"`
   in `manifest.json`. A cold launch then reads the document off disk.
3. **Hand off.** An inline script checks the JS-readable `x-user-info` cookie and
   `location.replace()`s to `/login` (the proxy routes onward from there).
4. **Offline fallback.** If the onward navigation fails, show a "no connection"
   state rather than a browser error page.

### Why not put the splash in the root layout

This was the first instinct and it is wrong, for a concrete reason.

`apps/seller/app/layout.tsx:72` calls `await cookies()`. In the App Router that
opts the **entire tree** out of static rendering. A React `/launch` page under
that layout can never be prerendered, therefore never precached, therefore never
instant — which was the only point.

The cookie read is load-bearing (`initialUser` hydration, `locale`, the `lang`
attribute), so it is not something to delete casually. Hence: a static file
outside React.

### The cost of that choice, stated plainly

One hard navigation from `launch.html` into the app, and the loading bar restarts
from frame 0 at that moment. Background, logo, and position are identical, so it
reads as one continuous screen — but the bar visibly jumps back.

Mitigation, if it proves annoying: `launch.html` writes an animation start
timestamp to `sessionStorage`, and the React loader begins its animation at that
offset. Roughly five lines. **Build without it first and see whether anyone
notices.**

The bar CSS then exists in two places. Comment both, each pointing at the other.

---

## Flows

**Logged in, online — the common case**

1. Tap icon; the OS opens `start_url`
2. Service worker serves precached `launch.html`. Logo and bar paint. No network.
3. Inline script reads `x-user-info` — present — and replaces to `/login`
4. Proxy queries assignments (`proxy.ts:191`), redirects to `/:slug/mobile/home/pos`
5. `MobileLayoutClient`'s loader continues on the same white background
6. Stores and user resolve, `shellReady` flips, loader lifts

**Logged out**

Steps 1-2 identical. This is the clearest win: today a logged-out user stares at
white through the entire redirect chain. No `x-user-info` cookie, so the script
sends them to `/login`, where `proxy.ts:188` returns the response unmodified and
`AuthForm` renders.

**Offline**

Steps 1-2 identical — the splash paints from cache with no network at all. The
onward navigation then fails. Without a fallback the splash would collapse into a
browser error page, which is worse than today's blank. Owner's call: any
reasonable fallback screen is fine.

**Session expired, cookie still alive**

`x-user-info` lasts 7 days; the Supabase session can die sooner. The script routes
as if logged in, the proxy finds no session and sends them to `/login`. Correct
outcome, one wasted hop. Unavoidable without asking the server, which would
defeat the purpose.

**Deep link, or not installed**

`launch.html` never runs; `/` still server-redirects. Behaviour unchanged.

---

## Rules this design must hold

- **`launch.html` stays impersonal, permanently.** It is one cached document
  shared by every account that uses the device. No name, no store, no avatar. The
  current loader is already just a logo and a bar, so this is a rule to keep, not
  a defect to fix.
- **`x-user-info` is a routing hint, never authorization.** The splash uses it
  only to guess a destination. `proxy.ts` remains the sole authority, and nothing
  is gated on it client-side.

---

## Considered and rejected for v1

**Remembering the tenant slug in `localStorage`** so the splash can jump straight
to `/:slug/mobile/home/pos`, skipping the `/login` hop and the
`user_tenant_assignments` query at `proxy.ts:189`.

Rejected because the saved slug goes stale — a user removed from a tenant, or
whose session outlived their assignment, gets sent somewhere they cannot go and
is bounced again by `proxy.ts:256`, sometimes ending up with *more* hops than
before. Ship without it, measure whether the hop is actually felt, and revisit.

**`apple-touch-startup-image`.** Would cover the pre-service-worker frame on iOS.
Owner explicitly does not care about that frame. Noted so nobody re-derives it.

---

## Verified against the code, 2026-08-23 — two claims were wrong

**`/launch.html` is outside the proxy.** `proxy.ts:278` matches only
`/:tenantSlug/mobile/:path*`, `/:tenantSlug/mobile`, and `/login`. A
single-segment path matches none of them. Confirmed, both apps.

**Backoffice needs the identical change.** Same `"start_url": "/"`, same
`dynamicStartUrl: true`, same `await cookies()` in `app/layout.tsx:65`, same
`app/page.tsx` redirect to `/login`, same `/login` proxy branch. Confirmed.

### Correction 1 — the build command matters, and `next build` is the wrong one

`package.json` defines `"build": "next build --webpack && node
../../scripts/assert-service-worker.mjs"`. Next 16 defaults to **Turbopack**, and
next-pwa is a **webpack** plugin: run bare `next build` and the plugin never
executes, no service worker is emitted, and `public/sw.js` is silently left at
whatever a previous webpack build produced. The `assert-service-worker.mjs` guard
in that script exists because someone has been caught by this before.

This was discovered the hard way. An earlier round of "verification" in this task
read a `public/sw.js` dated six days earlier and drew conclusions from it. **Any
claim about precache contents is worthless unless `pnpm build` ran first and
`sw.js` has a fresh mtime.**

### Correction 2 — HTML in `public/` is NOT precached

The earlier note here said files in `public/` enter the precache manifest
automatically. That is true for images and JSON and false for HTML: after a real
`--webpack` build, `launch.html` was absent from `sw.js` until named explicitly
via `workboxOptions.additionalManifestEntries`. It is now precached with the
build id as its revision, so a deploy replaces it.

### Correction 3 — the icons are not precached either, so the logo is inlined

The same fresh `sw.js` contains **no** `/icons/*` entries. A `src` pointing at
`/icons/icon-192x192.png` would therefore be a network fetch on exactly the cold,
possibly offline launch this file exists to cover — the logo would be the one
thing missing from the screen whose entire job is showing the logo.

Both `launch.html` files now inline the PNG as a `data:` URI. ~3KB of base64,
zero external references, and a logo that cannot fail to appear.

---

## Work list

- [ ] `apps/seller/public/launch.html` — logo, bar, inline CSS, inline redirect script
- [ ] Offline fallback state inside `launch.html`
- [ ] `manifest.json` — `start_url` to `/launch.html`
- [ ] `next.config.ts` — `dynamicStartUrl: false`
- [ ] Cross-referencing comments on both copies of the bar CSS
- [ ] Verify against `next build` — the service worker is disabled in dev, so
      none of this is testable with `pnpm dev`
- [ ] Mirror all of the above to `apps/backoffice`
- [ ] Version bump plus patch notes for both apps

---

## Adjacent work found while reading — separate tasks, not this one

**Android maskable icon crop.** `manifest.json:28` marks the full-bleed 512px
icon as maskable. Needs a second PNG with roughly 40% safe-zone padding, leaving
the current file as `purpose: "any"` only. Small, self-contained, and fixes a
visible defect independently of this task.

**`shellReady` waits on a client HTTP round trip.**
`MobileLayoutClient.tsx:35` holds the loader until `storesData !== undefined`,
and `useStores` (`lib/hooks/stores/useStores.ts`) is a client SWR fetch to
`/api/stores` that cannot start until hydration finishes. So the loader stays up
for: TTFB, plus bundle download and parse, plus hydration, plus a full HTTP
round trip. Fetching stores in `MobileLayout` and passing them as SWR
`fallbackData` would let `shellReady` be true on first paint and delete that
round trip from the critical path entirely. **Probably the largest single boot
win available, and independent of the splash work.**

**Dead code.** `packages/utils/server-config/tenant.ts` opens with about 48 lines
of commented-out migration scaffolding. Pure noise in a file read on every
request path.

---

## Built 2026-08-23

- `apps/seller/public/launch.html`, `apps/backoffice/public/launch.html` — logo
  inlined as a data URI, bar CSS copied from each app's `globals.css` (seller
  `#2563eb`; backoffice `oklch(0.646 0.222 41.116)`, the literal value of
  `--accent-primary`, since this file loads no stylesheet), offline state, and a
  redirect script.
- `manifest.json` in both — `start_url` to `/launch.html`.
- `next.config.ts` in both — `dynamicStartUrl: false`, plus the
  `additionalManifestEntries` line correction 2 turned out to require.

**The redirect script does not read a cookie.** The plan had it checking
`x-user-info` to choose a destination, which was pointless: both answers are
`/login`. The proxy already forks there — `proxy.ts:188` renders the sign-in form
when there is no user, and redirects a valid session on to its tenant. So the
splash never has to know who is looking at it, which is also the strongest
possible guarantee that it stays impersonal.

**Offline** keys off `navigator.onLine === false`, the one direction that is
reliable, and listens for `online` to continue by itself. A false positive just
means the navigation fails the way it would have anyway.

### Verification

`pnpm build` clean in both apps, service worker emitted, `launch.html` present in
both `sw.js` files, both documents free of external references.

**Not verified on a device.** Nobody has installed the PWA and watched a cold
launch. The hand-off from this bar to the React one — same background, same logo,
animation restarting from frame 0 — has been reasoned about but not seen.

---

## Regression on staging, 2026-08-23 — `dynamicStartUrl: false` was wrong

Reported within minutes of the push: sessions not persisting, and no loader.

`dynamicStartUrl: false` reads as "the start URL is a static file now, so cache
it" — which is true of `/launch.html` and irrelevant, because next-pwa's
start-URL handling targets **`/`**, not the manifest's `start_url`. With the flag
off, `/` was added to the precache manifest (three entries, build revision) and
served from cache from then on. `/` redirects through the proxy — to a signed-in
tenant, or to `/login` — so the service worker captured whichever of those it
happened to fetch and replayed it to everyone. A cached logged-out `/login`
presents exactly as "my login does not persist".

Reverted to `dynamicStartUrl: true` in both apps, with a comment on the option
saying not to turn it off. Verified against a fresh `pnpm build`: the `/` entries
are gone and `/launch.html` is still precached, because the splash never depended
on this setting — it is named in `additionalManifestEntries`.

**The lesson worth keeping:** the reasoning was about the manifest's `start_url`,
while the option acts on the app's root path. Two different things that both get
called "the start URL".

### The missing loader was not a second bug

With 053 seeding the store list, `shellReady` is true on the first render, so the
React loader never appears — that is the feature working. The splash was absent
for a different reason: `start_url` is read at install time, so an already
installed PWA keeps launching at `/` until it is removed and re-added. Between
the two, a correctly working build shows no loader at all, which reads as
breakage. Worth saying out loud when this ships.
