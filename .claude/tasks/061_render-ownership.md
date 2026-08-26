# Task 061 — Render ownership: the third question

**Status: Phase 1 shipped 2026-08-26. Phases 2 and 3 designed, not built.** Comes out of task 060's page
spread. 060 says *what* the reading shows; this says *why the rules did not catch
it*, and what rule to add.

**Phase 0 is 060's Item 3 instrumentation, and it gates Phases 2 and 3.** Phase 1
— the rule and the audit — does not depend on it and is worth doing either way.

**This task does not rest on 060's diagnosis.** 060 tried to explain *why* the
page rows cost what they cost and has since retracted its mechanism. The argument
here is independent of that: it is about what can be **prerendered**, which is
decided by `cookies()`, not by which layout re-renders on which navigation. If
060's blend hypothesis is right, this task becomes *more* relevant, not less —
the blend is expensive precisely because every one of those renders is dynamic.

---

## Nothing here is badly built, and that is the point

`app/layout.tsx:72` reads two cookies, parses one, and passes them as props to
two client providers. Microseconds, with the reasoning written above it.
`MobileLayout` is the same story with a TTL on each read and a paragraph
justifying each TTL.

**Both files obey both existing rules, completely.** The 5-layer table and the
boot tiers are followed to the letter. And the most expensive line on the whole
CPU board is a page render.

So this is not a discipline problem. It is a **coverage** problem: there is a
third question, neither rule asks it, and following both rules perfectly does not
protect you from it.

---

## The two questions the codebase already asks

| Rule | Question | Why it had to be written down |
|---|---|---|
| 5-layer table | *What may this code touch?* | It did not, really — capability is visible in the import list, which is why that rule works so well |
| Boot path tiers | *What does one read cost?* | Invisible. `MobileLayout` reads like it runs once per open |

## The one it does not

> **What is this render personal to — and how far down the tree does that reach?**

Here is the sting, and it is worth stating precisely because it makes the tier
table look wrong when it is not:

**`cookies()` is Tier 0. Free. No I/O.** That classification is correct. The read
costs nothing.

**And it is the most expensive call in the application.** One `cookies()` at
`app/layout.tsx:72` marks the whole subtree dynamic — every screen, every tab
switch, every boot, permanently. Nothing below the root layout can be
prerendered, which is why `public/launch.html` had to be a hand-written file in
`public/` instead of a Next route. That file's own comment says so, and nobody
connected it to the CPU bill.

**Tier 0 prices the read and not its blast radius.** Blast radius is a property
of *position in the tree*, and the tier table has no column for position.

### The missing axis

|  | **Stable** | **Fresh** |
|---|---|---|
| **Shared** | prerendered — CDN, zero server | ISR / tag-revalidated |
| **Personal** | keyed cache | **rendered per request** |

Every screen in both apps sits in the bottom-right cell. Not because the screens
are personal — the shell, the nav and the product grid are identical for every
user and are client components regardless; `home/pos/page.tsx` is four lines
returning `<POS />` — but because **one node near the root put them there**.

> **Confirmed by the build, 2026-08-26**, so this is not an inference. `pnpm
> build` marks **all 34** `/[tenantSlug]/*` routes in seller `ƒ (Dynamic) —
> server-rendered on demand`, and reports **zero** static or prerendered routes
> in the app. Not one screen in either app is prerenderable today. Re-run the
> build after any phase here; that count is the scoreboard.

---

## The rule

Paste-ready for CLAUDE.md, as a new section beside **Boot Path**:

> ### Render ownership
>
> The tiers price a read. They do not price **where** it sits, and for a Tier 0
> read that is the only thing that matters.
>
> **A cookie read is free where it sits and costs everything below it. Its
> position in the tree is part of its price.**
>
> Reading a cookie or a header marks the whole subtree dynamic. Nothing under it
> can be prerendered, cached at the edge, or precached by the service worker —
> permanently, for every screen below, whether or not those screens are personal
> at all.
>
> So classify a render the way you classify a read:
>
> |  | **Stable** | **Fresh** |
> |---|---|---|
> | **Shared** | prerendered — CDN, zero server | ISR / tag-revalidated |
> | **Personal** | keyed cache | rendered per request |
>
> **The operational rule: a server component that reads a cookie or a header must
> not take `children`.** Personal reads happen in leaves. A trunk that needs a
> personal value gets it from a dynamic *sibling*, not by reading it and wrapping
> the tree.
>
> This is greppable, which is the only reason it will survive:
>
> ```bash
> # apps/admin is archived — never include it, or this returns 8 and two of
> # the hits are in a dead app.
> grep -lE "cookies\(\)|headers\(\)|getRequestUser|getCurrentTenantId" \
>     $(find apps/seller/app apps/backoffice/app \
>         -name "layout.tsx" -o -name "template.tsx")
> ```
>
> Any hit that also renders `children` is a violation. Six exist today; see task
> 061 for why each one is there and which are safe to move.

---

## The audit — six violations, three per app, symmetric

Run 2026-08-26. Every layout in both apps that reads a cookie *and* renders
`children`:

| File | Reads | For | Verdict |
|---|---|---|---|
| `seller/app/layout.tsx:72` | `cookies()` — `x-user-info`, `locale` | `AuthProvider` / `LanguageProvider` props | **Blocked** — see `<html lang>` below |
| `seller/app/[tenantSlug]/layout.tsx:11` | `getCurrentTenantId()` | `notFound()` on failure, nothing else | **Cheapest, likely deletable** |
| `seller/app/[tenantSlug]/mobile/layout.tsx:89,98,117` | tenant, user, `selectedStoreId` + 2 Tier 1 reads | providers + SWR seed | **The one that matters** |
| `backoffice/app/layout.tsx:65` | `cookies()` | same as seller | Blocked, same reason |
| `backoffice/app/[tenantSlug]/layout.tsx:16` | `getCurrentTenantId()` | `notFound()` | Same as seller |
| `backoffice/app/[tenantSlug]/mobile/layout.tsx:50` | `getCurrentTenantId()` + 1 Tier 1 read | `PayFrequencyProvider` | Same shape, one read lighter |

**`[tenantSlug]/layout.tsx` is worth a second look on its own merits.** It reads a
cookie purely to call `notFound()` — a guard, not a data read — and the proxy
already validates tenant access on the same paths before this ever renders. If
that is genuinely redundant, deleting it removes a dynamic marker from two apps
for free. **Verify against `proxy.ts` before deleting**; a guard that looks
redundant and is not is exactly the kind of thing this repo has been bitten by.

---

## The shape

Instead of *trunk reads cookie, then wraps children*:

```tsx
<AuthProvider>                             {/* client, starts empty */}
    <Suspense><AuthCookies /></Suspense>   {/* dynamic leaf — reads cookies, hydrates it */}
    {children}                             {/* prerenderable */}
</AuthProvider>
```

The provider stops receiving its value as a prop from a parent and receives it
from a dynamic **sibling**. `children` leaves the dynamic region.

Both providers are already `"use client"` and already take `initialUser` /
`initialLocale`, so the change is smaller than it sounds: the value arrives by a
different route, not in a different form.

---

## Four things that make this harder than it looks

1. **`<html lang={initialLocale}>` — `seller/app/layout.tsx:85`.** An attribute on
   the outermost element cannot be streamed in from a hole. Options: accept
   `lang="en"` and correct it on the client, or leave the root layout dynamic and
   convert only `[tenantSlug]/mobile/layout`. **Take the second.** Less pure,
   much safer, and it is where the cost actually is.
2. **`MobileLayout`'s two `unstable_cache` reads are Tier 1, not Tier 0.** Real
   I/O. Making the trunk static relocates them into the dynamic hole; it does not
   delete them. 060's Item 3 still applies and is not superseded by this task.
3. **A frame where the user is not yet known.** Already handled —
   `MobileLayoutClient` gates on `ready` and the boot loader covers the shell
   until then. Tasks 052 and 056 make this refactor *safer* than it would have
   been six months ago, which is the argument for doing it now rather than a
   reason to fear it.
4. **PPR is unverified against `proxy.ts`.** This is the one that sets the order
   of everything below.

---

## Phases — and the order is not the obvious one

### Phase 0 — measure. Gate Phases 2 and 3 on it.

060's Item 3 instrumentation, which must report the **full-document vs RSC-segment
split**, not only `MobileLayout`'s own milliseconds.

Read it like this:

| Phase 0 says | What this task does |
|---|---|
| `MobileLayout` is 30–40ms | Proceed. The trunk is the cost and PPR removes it from the static half |
| Layout is cheap, **full documents dominate** | **Proceed, and it matters more** — a prerendered shell is exactly what makes a full document cheap |
| Layout is cheap and documents are rare | Stop at Phase 1. The cost is cold starts or serialization, and neither is addressed here |

Note the middle row: the outcome that kills 060's Item 3 *strengthens* this task.
They are not the same bet.

### Phase 1 — write the rule, run the audit — **DONE 2026-08-26**

Landed as a **Render ownership** section in CLAUDE.md, directly beneath the boot
budget, carrying the rule, the 2x2, and the audit grep.

Two things learned while doing it, both worth keeping:

- **The audit grep must exclude `apps/admin`.** As first written it globbed
  `apps/*/app` and returned eight files, two of them in the archived app. It is
  pinned to `apps/seller/app apps/backoffice/app` in both this file and
  CLAUDE.md. It now returns exactly the six.
- **`react-hooks/purity` rejects `performance.now()` inside a component**, which
  is right — the React Compiler is on in seller. Task 060's instrumentation was
  restructured to time the reads inside a plain async helper rather than suppress
  the rule. Anything measuring a server component from the inside will hit this;
  extract, do not disable.

A rule that exists only in a task file decays; that is why 058 and 059 were
promoted into CLAUDE.md, and why this one went there on the day it was agreed.

### Phase 2 — PPR spike, one route, staging, behind config. **Go / no-go.**

`ppr` and `cacheComponents` are both valid config keys in the installed Next
16.2.4 — checked against `next/dist/server/config-schema`, not from memory.

What the spike has to answer, in order, stopping at the first no:

1. Does a PPR-enabled route still authorise correctly through `proxy.ts`? The
   proxy runs on the request, the shell comes from the CDN — **confirm a signed-out
   or wrong-tenant request cannot be served a prerendered shell belonging to a
   tenant.** This is the security question and it comes first.
2. Does the prerendered shell interact safely with the service worker? A shell
   that is precached must be *impersonal*, exactly as `launch.html` is. The
   `dynamicStartUrl` bug in `d9dac11` is the precedent: a cached document that
   captured one session and replayed it to everyone.
3. Does the boot sequence tasks 052 and 056 tuned still hold — same number of
   requests, same paint order, no second logo moment?
4. Only then: does it actually reduce Active CPU on that route?

**Any no ends the task at Phase 1.**

### Phase 3 — the boundary refactor. Only if Phase 2 says yes.

`[tenantSlug]/mobile/layout.tsx` first, seller only, backoffice after it has run
on staging for a week.

### Why this order, stated plainly

**The refactor has no performance payoff without PPR.** A dynamic API anywhere in
a route opts the whole route out of static rendering, so a trunk with no
`cookies()` in it *still renders per request* unless PPR is on. Doing Phase 3
first would mean rebuilding both apps' layouts for a payoff that may not exist.

Prove the payoff, then refactor into it. Phase 1 is the exception — it is pure
maintainability and pays on the day it lands.

---

## Verification

1. **Phase 1.** The grep in the rule returns exactly the six known files, and the
   table in this task matches. Re-run it in review; that is the enforcement.
2. **`[tenantSlug]/layout.tsx` deletion**, if taken: request a tenant the signed-in
   user has no assignment for and confirm it is still refused, and that the
   refusal looks the same to the user. Then a slug that does not exist at all.
   Both apps.
3. **Phase 2.** The four questions above, answered in writing, in this file,
   before any Phase 3 code exists.
4. **Phase 3.** `pnpm lint && pnpm build` clean on both apps. Then the boot
   budget in CLAUDE.md re-counted by hand — it is the artefact this task is most
   likely to invalidate, and a stale budget is worse than none.
5. **Scoreboard.** A reading after a full window, **with the window length
   recorded** — three readings have now failed to. Expect the page rows to move
   and the API rows not to.

---

## What would make me stop and re-plan

- **Phase 0 measuring a cheap layout *and* few full-document renders.** That is
  the only combination that kills this task — see the table in Phase 0. A cheap
  layout on its own does not.
- **Any of Phase 2's first three questions answering no.** Particularly the first
  two: a prerendered shell that can leak across tenants or sessions is not a
  performance trade, it is a defect, and there is no version of this task worth
  that.
- **The `<html lang>` workaround turning out to be load-bearing.** If leaving the
  root layout dynamic means `[tenantSlug]/mobile/layout` cannot be static either
  — because the dynamic marker propagates down rather than being scoped per
  segment — then Phase 3 has no reachable target and the whole approach needs
  rethinking rather than adjusting. **Establish this in Phase 2, cheaply**, before
  anything else in that phase.
