# Task 068 — Pull to refresh stops refetching if it just did

**Status: steps 1–4 built 2026-09-19, uncommitted. Step 4's device checks are
owed — the rest is verified.** Ticket:
`Chore: Pull to refresh stops refetching if it just did`
(https://app.notion.com/p/3de95a715405808a9479fc08b2b73c33) — `Medium`.

Scope is `packages/shell`, so both apps get the change from one file.

## What the owner asked for

| # | Owner's note | Decision |
| --- | --- | --- |
| 1 | "if let say user just pulled it 10 second ago" — do not refresh | The gesture always animates; only the fetch is skipped |
| 2 | "new data roughly come in 1 min" | 30s. Owner confirmed: "30 second is fine.. even 1 min is fine" — 30 is the lower risk of the two |
| 3 | Like Slack — it allows the animation, just not the fetch | A suppressed pull must be **indistinguishable**: same spinner, same minimum spin, same top bar |

## Why the dedupe floor does not already do this

Task 067 raised the app-wide `dedupingInterval` to 30s, which sounds like it
already answers "pulled ten seconds ago". It does not, and the reason is explicit
in SWR's own source — `_internal/config-context-12s-CCVTDPOP.mjs:264`, inside
`internalMutate`:

```js
// Invalidate the key by deleting the concurrent request markers so new
// requests will not be deduped.
delete FETCH[key];
delete PRELOAD[key];
```

Both apps' refresh is `mutate(() => true)`, so **every pull deletes the dedupe
marker for every matched key and then revalidates.** Pull to refresh is the one
path in either app that `dedupingInterval` cannot bound, by design rather than by
oversight.

Cost of a pull: one request per *mounted* hook — unmounted keys have no
revalidator and are skipped. Seller's home tree mounts about twelve. Five pulls in
ten seconds is sixty requests.

## The design

### The gate lives outside React

`packages/shell/refreshGate.ts`, module scope — same doctrine as `navProgress.ts`.
A timestamp is not render state and must not cause a render.

```ts
let lastAt = 0;

export const refreshGate = {
    /** Has enough time passed that a refetch could return something new? */
    shouldFetch: () => performance.now() - lastAt >= PULL_MIN_INTERVAL_MS,
    mark: () => { lastAt = performance.now(); },
};
```

`performance.now()` rather than `Date.now()`: it is monotonic, so a clock
correction cannot leave the gate believing a refresh happened in the future and
lock the gesture out. It resets per document, which is correct — a reload refetches
everything anyway.

Add `"./refreshGate": "./refreshGate.ts"` to the shell's `exports` map.

### The window is a shell constant, not `SWR.WARM`

`PULL_MIN_INTERVAL_MS = 30_000`, beside `PULL_MIN_SPIN_MS` and the other pull
tuning.

Importing `SWR.WARM` from `@tea-pos/utils` is tempting — same number, and the
ticket argues for "one fewer number in the app". Rejected for two reasons.
`packages/shell` depends on `@tea-pos/ui` alone, and a new package edge to reuse
one integer is a bad trade. More importantly **the two numbers mean different
things**: one is how long a cache entry may be reused, the other is how often a
person may ask. They agree today by choice, not by definition. The constant says
so in a comment, so nobody "deduplicates" them later.

### The suppressed pull is indistinguishable

One branch in `release()`, and nothing after it changes:

```ts
const fetching = refreshGate.shouldFetch();
if (fetching) refreshGate.mark();
const refreshing = fetching
    ? Promise.resolve().then(onRefreshNow).catch(() => {})
    : Promise.resolve();
```

Why the rest can stay untouched:

- **`navProgress.run(refreshing)` still runs.** An already-resolved promise still
  costs a `begin()` and then a `finish()`, and finish fills, pulses and fades. The
  bar reads as a very fast refresh rather than as nothing happening.
- **`PULL_MIN_SPIN_MS` (400ms) still holds the spinner**, so the gap cannot flick
  shut. This is why no separate "fake delay" is needed — the floor that already
  exists for real refreshes covers suppressed ones for free.

Net: it spins, the bar fills, the gap closes, no request leaves the phone.

### The idle refresh marks, but is not gated

`InactivityRefreshPopup` calls `onSoftRefresh` at line 142, which is the same
`mutate(() => true)`. The ticket keeps *gating* it out of scope and this task
honours that — but it should `mark()`, or pulling two seconds after the idle sheet
refreshed refetches everything for nothing.

The asymmetry is deliberate and worth writing down, because it looks like an
oversight: **the sheet appears only after twenty minutes idle, so its refresh is
never redundant by construction. A pull can be spammed; the sheet cannot.** That
is the whole reason one is gated and the other only reports.

## Steps

### Step 1 — The gate — **built**
`packages/shell/refreshGate.ts` holds `PULL_MIN_INTERVAL_MS`, `shouldFetch()` and
`mark()`; `"./refreshGate"` added to the shell's `exports`.

**One deviation from the plan above:** the constant lives in `refreshGate.ts`, not
beside the other `PULL_*` constants in `MobileShell.tsx`. The gate is the only
thing that reads it, and a number read in one file belongs in that file — the
alternative was passing the window in as an argument, which makes a gate that can
be called with two different windows and silently disagree with itself.
`MobileShell`'s constants block carries a one-line pointer so the pull's numbers
are still findable together.

### Step 2 — Wire the pull — **built**
`MobileShell.tsx:559`. Three lines, and everything after them untouched.

### Step 3 — Mark on the idle refresh — **built**
`InactivityRefreshPopup.tsx:145`, above the `navProgress.run` — so both apps get it
without either app's `InactivityRefresh` changing.

### Step 4 — Verify — **partly done**

Static, 2026-09-19: `tsc` clean on both apps, both build, no new lint (the two
setState-in-effect errors in backoffice's config edit pages predate this).
`refreshGate` is imported in exactly two places and read in exactly two.

Still owed, and all of it needs a phone:
- **Network panel, not the screen:** two pulls inside 30s send requests on the
  first only. On seller home that is ~12 requests, then 0.
- The second pull animates, holds at least 400ms, fills the top bar, and closes —
  no visible difference from the first.
- A pull after 30s fetches normally.
- `prefers-reduced-motion` on: still suppressed, still settles.
- Tap **Refresh Now** on the idle sheet, then pull immediately: no requests.
- Both apps.

### Step 5 — Version bump and patch notes — **done: neither**
**Neither.** A user cannot perceive this: the gesture looks identical whether or
not it fetched. A version that announces nothing is wrong; see 067 step 7 and the
`patch-notes` skill.

## Not in scope

- **Gating the idle refresh.** Reason above; it would need its own ticket and a
  different argument.
- **Which keys a refresh touches.** `mutate(() => true)` stays as it is.
- **Where the gesture is offered** — task 069.
- **A force gesture** (pull twice to insist). Owner declined: a gesture nobody can
  discover is worth less than a rule that is easy to describe.
