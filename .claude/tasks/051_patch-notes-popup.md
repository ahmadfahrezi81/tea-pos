# Task 051 — A full-page "what's new" after an update, terms-and-conditions style

**Status: planned, not started.** Follow-up to [[050_patch-notes]]. Nothing
pushed to staging.

Task 050 built the always-available screen: `More → Patch Notes`, a list a
reader opens on purpose. This task adds the other half — a screen that finds the
reader, once, when they land on a version whose notes they have not seen.

Sanity-checked against `packages/shell/useAppUpdate.ts`,
`InactivityRefreshPopup.tsx`, `MobileShell.tsx` and both apps'
`mobile/layout.tsx` on 2026-08-17, twice. Corrections from both passes are
folded in below and called out where the correction matters — the second pass
found that the dead-code removal is larger than the first pass claimed, that the
`ready` gate it asked for is not reachable from where the screen mounts, and
that the first-run rule as written made the feature unable to announce itself.

---

## What happens to the existing update sheet

The sheet has two reasons today, from `useAppUpdate`:

| Reason | Meaning | Button does |
|---|---|---|
| `"update"` | This page is running **old JS**. Genuinely behind. | `location.reload()` — a real document fetch |
| `"updated"` | This page **already is** the new build. Only its server data is stale. | `router.refresh()` — no reload at all |

**`"update"` keeps its sheet.** The page is stale, the user has to be asked
before a reload drops whatever is on screen, and none of that changes.

**`"updated"` loses its sheet, and the full-page notes take its place.** This is
the sheet described in conversation as the "fake" one — it appears, it says "a
new version is ready, refresh to load it", and behind the button it does not
refresh anything, because the new version is already what is running. It asks
for a tap to perform a no-op and then returns the reader to where they were.
Replacing it with the notes is the point of this task: same moment, same
trigger, but now the tap buys something — the reader finds out what actually
changed.

So the two flows are:

**Flow A — page was stale.** Bottom sheet appears (unchanged) → tap Refresh →
`location.reload()` → new bundle boots → version differs from stored → full-page
notes.

**Flow B — page loaded fresh on a new build.** No sheet at all. Straight to the
full-page notes.

Both end in the same screen; only Flow A has a sheet in front of it.

### Every flow, so the behaviour can be checked as a whole

The two above are the headline cases. The full set, once the version key and the
build key are both in play:

| # | Situation | Sheet | What's New |
|---|---|---|---|
| 1 | Tab open all shift, deploy **with** a version bump | yes | yes, after the reload |
| 2 | As 1, but the reader **declines** the sheet | yes, once | not now — at the next cold start |
| 3 | Cold start onto a newer version | no | yes |
| 4 | Cold start, same version as last time | no | no |
| 5 | Deploy with **no** version bump (hotfix, revert, redeploy) | yes, if the tab is stale | no |
| 6 | Version bumped but the release earned no card | as 1 or 5 | no |
| 7 | First ever run, or first run of the release shipping this | no | yes — newest card only |
| 8 | Returning after six months | no | yes — every card above their mark |
| 9 | Storage blocked (private mode, cookies off) | no | no |
| 10 | Same person on two devices | per device | per device |

**2 — declining postpones, it never cancels.** The sheet writes
`tea-pos:declined-build-id` and stops offering *that build*; the page carries on
running its old JS, so the version has not changed for it and What's New has
nothing to say yet. The next cold start lands on the new bundle and the notes
appear there. The two keys survive each other because they ask different
questions — one about builds, one about versions.

**5 — the sheet still fires without a bump, and should.** A stale tab genuinely
is behind, whatever the version says. What is silent afterwards is What's New:
the version did not move, so there are no notes, so there is nothing to tell
anyone.

**8 — six months is long enough that the key may not survive.** Browsers evict
site storage. A returning reader with an evicted key is not case 8 at all, it is
case 7, and they get one card instead of twenty. Nothing to fix — it degrades in
the harmless direction.

**10 — the key is per device, and that is correct.** It records what *this*
screen has shown, not what the person knows. The till and the phone each say it
once.

### The knock-on: most of `useAppUpdate` goes with it

**The first draft under-counted this.** It said the removal was `justUpdated`,
its `useState`, its mount effect and the `COPY_FOR.updated` entry, and that
`handleRefresh` would collapse to `markReloading()` + `location.reload()`. The
cascade runs one step further than that, and the last step is the one worth
knowing before starting.

`useAppUpdate` computes `"updated"` from a `justUpdated` flag, set when the
stored `tea-pos:build-id` differs from the bundle's. `BUILD_ID_KEY` has exactly
three touch points — a read at line 97, a write at line 101, a write inside
`markReloading` at line 166. The read at 97 is the **only** one. Delete the
mount effect and the key has no reader left, so:

- the write at 101 stores something nothing will ever consult,
- `markReloading`'s write is likewise unread, so `markReloading` is dead,
- and the call to it in `handleRefresh` is dead with it.

`handleRefresh` therefore collapses to **`location.reload()` alone**, not to
`markReloading()` + reload.

Worth being sure about, because it looks unsafe: `markReloading` exists so the
freshly loaded page does not open a *second* sheet about the update the user
just accepted. But that second sheet is the `"updated"` one, which this task is
removing. The `"update"` sheet cannot recur after a reload for a different
reason entirely — the new bundle's inlined `NEXT_PUBLIC_BUILD_ID` now equals
what `/api/version` serves, so the comparison at line 128 simply does not fire.
Nothing was holding it back except that equality, and the equality survives.

So the removal is: `justUpdated` and its `useState`, the mount effect, the
`BUILD_ID_KEY` constant, `markReloading` and its call site, the `"updated"`
member of `UpdateReason`, the `COPY_FOR.updated` entry, and the `useRouter`
import plus the `router.refresh()` branch. What is left is a hook that polls
`/api/version`, returns `"update"` or `null`, and persists a decline — one
`useState` instead of two, one `localStorage` key instead of two.

Note the case this creates: a deploy that changes `buildId` **without** a
version bump (a hotfix, a revert, a redeploy) will now say nothing at all on a
freshly loaded page. That is correct. There is no version bump, so there are no
notes, so there is nothing to tell the reader — and the old behaviour was to
interrupt them anyway to say a nonspecific "something is new".

---

## Tracking "last version seen"

One `localStorage` key, following the existing naming in `useAppUpdate`:

```
tea-pos:last-seen-version   ← the version whose notes the reader dismissed
```

Read and written through `try`/`catch` helpers, but **not** the ones in
`useAppUpdate.ts` lines 42–57 as-is. Those collapse "the key is not there" and
"the read threw" into the same `null`, which was harmless for that hook and is
not harmless here.

### A failed read is not a first run

`localStorage` access throws outright in private mode and with cookies blocked.
`useAppUpdate`'s helper catches and returns `null`, which is correct for it: a
`null` there means "nothing remembered", and nothing remembered means say
nothing. Silence is the safe direction.

Here the safe direction is inverted. A `null` means "no key", and "no key" now
means *show the newest card* — so a device whose storage always throws looks
like a first run on every single open. The screen appears, the reader dismisses
it, the write throws too, nothing is remembered, and the next open is identical.
It never stops.

So the read reports three states, not two:

```ts
type Stored = { ok: true; value: string | null } | { ok: false };

function readVersion(): Stored {
    try {
        return { ok: true, value: localStorage.getItem(LAST_SEEN_KEY) };
    } catch {
        // Storage is unavailable, not empty. We cannot record a dismissal, so
        // showing the screen would mean showing it again on every open.
        return { ok: false };
    }
}
```

`{ ok: false }` renders nothing at all. `{ ok: true, value: null }` is the
genuine first run and shows the newest card. The distinction costs one type and
removes the only way this screen can become permanent.

### Why a separate key, rather than riding on the update hook

`useAppUpdate` already answers "did the build change since last mount", which
looks like the same question, so the first instinct is to reuse it. Two reasons
not to, and they compound:

**It would be suppressed by design.** `markReloading()` writes the **new** build
id into `tea-pos:build-id` *immediately before* `location.reload()`, so the
fresh page does not open a second sheet announcing the update the user just
asked for (`useAppUpdate.ts` lines 162–167). A patch-notes check riding on that
flag would be silenced by the very same line — **Flow A would never fire.**

**And it is the wrong question anyway.** `buildId` changes on every deploy,
including hotfixes, reverts and redeploys that ship no user-visible change and
therefore have no notes. `NEXT_PUBLIC_APP_VERSION` changes when the version is
bumped, which is exactly when notes exist. Comparing against the version is not
a workaround for the first problem; it is the correct comparison on its own.

That second reason is what makes the separation survive this task. The build-id
machinery is being deleted (above), which retires the first reason with it —
but the key stays separate regardless, because it is asking about versions and
nothing else in the app tracks those.

### The rules

```
storage unreadable           → show nothing. (See above.)
no key at all                → show the newest release only, then write current.
key present, older than now  → show the notes for every version above the key.
key present, equal or newer  → show nothing.
nothing to show either way   → write current, render nothing.
```

The last line covers a version bump that earns no card: a release with nothing a
user could notice does not appear in `patchNotes` (task 050), so the filter can
come back empty even though the version moved. Write the key anyway. Nothing was
withheld, so there is nothing to save for later, and leaving the key behind
would only make the next real release recompute the same empty answer.

### What gets written is always `NEXT_PUBLIC_APP_VERSION`

Every path that closes this screen — the gate's final tap, the `✕`, and the
silent no-cards case — writes the **running version**, never
`patchNotes[0].version`. They are not the same string and the difference is a
loop.

Suppose the app is on `5.4.8` and that release earned no card, so the newest
entry in the array is `5.4.7`. Writing `patchNotes[0].version` stores `5.4.7`.
The next mount filters for anything above `5.4.7`, finds nothing, and writes
`5.4.7` again — harmless. But now `5.4.9` ships with a card: the reader is shown
`5.4.9`, dismisses, and stores `5.4.9`. Fine. The failure is the other order — a
reader who dismisses at `5.4.8`-with-cards stores `5.4.8` correctly, but one who
dismisses a *filtered* view built from an older array position stores a version
below where they actually are, and every later mount re-shows cards they have
already dismissed. The running version is the only value that means "this reader
has now seen everything up to here", which is the question being asked.

### Comparing versions numerically, not as strings

**This was wrong in the first draft.** It said `key < current`, a plain string
comparison. That breaks the moment a component reaches double digits:
`"5.4.10" < "5.4.9"` is `true` as strings and false as versions. The seller app
is at `5.4.6` and moving fast enough to hit `5.4.10` within weeks.

Split on `.`, compare numerically, part by part:

```ts
function part(parts: number[], i: number): number {
    const value = parts[i];
    // A non-numeric segment parses to NaN, and NaN fails every comparison — a
    // newer version would read as "not newer" and the screen would silently
    // never appear. Treat anything unparseable as 0 rather than as a poison
    // value. Neither app tags releases today, so this is a guard, not a feature.
    return Number.isFinite(value) ? value : 0;
}

function isNewer(a: string, b: string): boolean {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        if (part(pa, i) !== part(pb, i)) return part(pa, i) > part(pb, i);
    }
    return false;
}
```

Three parts is enough: both apps' `package.json` versions are plain `x.y.z`.

Then the notes to show are `patchNotes.filter((n) => isNewer(n.version, stored))`.

**Filter, not an index lookup.** The stored version does not have to appear in
the array at all: a version with nothing user-visible gets no card (task 050),
and the seller list starts at `5.0.2`, so a reader could hold `5.0.1` or `5.4.2`
— neither of which is in the list. A filter handles all of those; finding the
stored version's index and slicing would return `-1` and break.

### Why first run shows one card rather than nothing

**Changed from the first draft.** It said "no key → seed it and show nothing",
copying `useAppUpdate`'s first-install guard ("A first-ever load stores the id
and says nothing", line 99). The rule is sound there and wrong here, and the
reason is specific to this feature.

The first time this code runs, **no reader has the key** — including people who
have used the app for months, because the key did not exist before. From inside
`localStorage` there is no way to tell "new install" from "existing user, first
run of this build", so whatever first run does, it does to everybody. Seeding
silently means the screen does not appear on the release that introduces it, and
the note announcing the feature is the one note the feature swallows. A release
day where the new thing is invisible reads as a bug even when it is not.

Showing the newest release alone fixes that at a cost worth paying. An existing
user gets one card — the release they just landed on, which is exactly what the
screen is for. A brand-new install also gets one card, which is a reasonable
first-run: here is where the app is right now. Neither gets the seller app's
full 17-release history, which is the thing the guard existed to prevent, and it
is prevented by "newest only" just as completely as by "nothing at all".

So: first run shows `patchNotes[0]` and no more, then writes the key. Every run
after that is the normal filter.

### No cap on how far behind a reader is

Confirmed in conversation: six months away means six months of cards. Scrolling
handles the length and nothing is hidden.

---

## The screen

A full-page overlay, mounted where `InactivityRefreshPopup` already is: in each
app's `app/[tenantSlug]/mobile/layout.tsx`, as a sibling of `{children}` inside
`MobileLayoutClient`. **The first draft said "not inside `MobileShell`", which
is not true** — that mount point *is* the shell's children. It does not matter
for a `fixed inset-0` element, which escapes the shell's flex chrome either way,
but the sentence was describing a boundary that is not there.

The component itself lives in `packages/shell/`, beside the popup it replaces
half of. The notes array is a **prop**, following the shell's rule that data
comes from the app and machinery lives in the package — the two apps have
separate histories and separate version lines (seller `5.4.6`, backoffice
`1.0.7`), and nothing in the package should know which app it is rendering.

It reuses the `PatchNotes` renderer from `packages/ui/custom/PatchNotes.tsx`,
passed only the filtered releases; the complete history stays under More.

Two things about that reuse:

**Decide "is there anything to show" before mounting, not inside the renderer.**
`PatchNotes` returns `null` for an empty array (`PatchNotes.tsx:70`), which
looks like it handles the case and does not — the overlay around it would still
render, giving a header, a dismiss button and nothing between them. The filter
result gates the overlay itself.

**Do not pass `currentVersion`.** The "You're on this" pill earns its place on
the More screen, where the reader is scrolling history and needs to find their
own position in it. Here every card is a version they are on, and the header
states the version directly, so the pill would label all of them or restate what
is already at the top.

### Two screens, two names

The screen under More keeps **Patch Notes** — it is the archive, opened on
purpose, and the route (`/more/patch-notes`) and files already say so.

This one is **What's New**. It is not the archive; it is the greeting for one
update, and it should read as an announcement rather than as a document the
reader navigated to. The split matches what phone app stores do for the same two
surfaces, so neither name has to be learned.

The component is `packages/shell/WhatsNew.tsx`.

### It must not stack with the update sheet

`InactivityRefreshPopup` is `fixed inset-0 z-50`. Give this screen a lower layer
(`z-40`) so that if `/api/version` reports a newer build while the notes are
open — a real sequence, the poll runs every 60s on visibility — the sheet lands
on top of the notes rather than in an order nobody chose. The sheet is the more
urgent of the two: it is about the page being stale right now, where the notes
are about a version already delivered.

```
┌───────────────────────────────────────┐
│          ✨  What's New            ✕  │
│              v5.4.8                    │
├───────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │  5.4.8  · 20 Aug 2026            │  │
│  │  NEW   ...                       │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  5.4.7  · 18 Aug 2026            │  │
│  │  FIXED ...                       │  │
│  └─────────────────────────────────┘  │
│               ⋮ scrolls                │
├───────────────────────────────────────┤
│        [  Scroll to continue  ]        │
└───────────────────────────────────────┘
```

### The terms-and-conditions gate

Confirmed in conversation, and a deliberate exception to task 050's "do not
demand attention" rule — this screen earns it by appearing at most once per
version, and only to someone who either tapped Refresh or just opened the app.

One button, whose behaviour depends on whether the list overflows:

- **Fits on screen:** reads "Got it". One tap writes the version and closes.
- **Overflows:** reads "Scroll to continue". Tapping scrolls to the bottom
  without dismissing. Once the bottom is reached — by that tap *or* by the
  reader swiping there, tracked with a scroll listener so both count — it
  relabels to "Got it", and that tap writes the version and closes.

Two taps when there is more to read, one when there is not. Reaching the bottom
is what unlocks the dismiss.

Use a few pixels of slack in the bottom check
(`scrollHeight - scrollTop - clientHeight < 8`) rather than an exact match —
sub-pixel rounding on a phone otherwise leaves the button stuck on "Scroll to
continue" with nothing left to scroll.

### And a close button in the corner

An `✕` in the top-right that writes the version and closes, at any scroll
position. The gate below stays exactly as described — this does not replace it.

It is there because of what this screen sits on top of. The overlay covers the
whole app with no backdrop to tap and no back gesture out, on a device that is
somebody's till at the start of a shift. Every route to dismissing it runs
through one measurement, `scrollHeight - scrollTop - clientHeight`, and if that
measurement is wrong on one Android WebView — a dynamic viewport resize, a
font-scale setting, a `100vh` disagreement — the button never relabels and the
app cannot be reached at all. The recovery for that is clearing site data, on a
phone, during service.

The `✕` is the second, independent way out: no scroll state, no measurement, no
condition. A reader who wants to skip can skip, which costs nothing this screen
was protecting — it appears once per version and the full history is under More
whenever they want it back.

### Boot cost

The check is a synchronous `localStorage` read and an array filter — no network,
unlike `useAppUpdate`'s deferred `/api/version` call, so it does not need that
hook's 5-second delay.

**The first draft asked it to wait for the shell's `ready` state. It cannot.**
`ready` is a prop on `MobileShell` (`MobileShell.tsx:49`), consumed inside the
component and exposed through no context; a sibling of `{children}` has no way
to read it. The choice is to plumb `ready` onto `ScrollContext` or to drop the
gate, and dropping it is right: the decision runs in a mount effect and paints
after hydration, which is already later than the boot loader, so the concern
behind `5795bc3` — the boot competing with itself — does not arise. Adding a
context field to re-derive a moment that has already passed would be machinery
for nothing.

### Chrome text follows each app's i18n

The note text stays English in both apps — settled in task 050, not reopened.
The screen's own chrome ("What's New", "Scroll to continue", "Got it") is UI
text, so it follows each app's existing rule: `useT()` in the seller app,
hardcoded English in the backoffice, which has no i18n layer.

Since the component lives in `packages/shell` and only one of its two callers
translates, the strings arrive as **props** like everything else — the seller
passes `t(...)` results, the backoffice passes literals. The package does not
import `useT`. The seller side owes new keys in **both**
`packages/utils/translations/en.ts` and `id.ts`; a key present in only one
silently falls back to English on the other, which reads as a missed
translation rather than as a crash and so tends to ship.

---

## A shared assumption worth knowing

Both apps use the same `tea-pos:` key prefix and the same key names. That is
only safe because they are separate origins. This task inherits the assumption
rather than introducing it — `tea-pos:declined-build-id` would already be
thrashing between the two apps if it were false — but if the apps are ever
served from one domain under different paths, `tea-pos:last-seen-version` breaks
in exactly the same way as the existing keys, and all of them need an app prefix
together. It would break worse, in fact: the two apps' version lines are
unrelated (seller `5.4.6`, backoffice `1.0.7`), so a shared key would have
backoffice permanently convinced it is nine major versions behind.

---

## Open before writing code

- ~~**Does anything else consume `useAppUpdate`'s `reason`?**~~ **Answered
  2026-08-17:** `InactivityRefreshPopup` is the only consumer in either app.
- ~~**Does removing the `"updated"` sheet leave `router.refresh()`
  unreachable?**~~ **Answered 2026-08-17:** yes, and more besides — see "The
  knock-on" above for the full removal list. `handleRefresh` ends as a bare
  `location.reload()`.
- **This task's own patch note.** Under the new first-run rule the release that
  ships this *does* announce itself, so it needs a note written the usual way
  (see the `patch-notes` skill) in the same commit as the version bump — one for
  each app, since both get the screen. Without it, first run shows the newest
  card and the newest card says nothing about the thing the reader is looking at.
- **Seller `5.4.2` and `5.4.3` describe behaviour this task deletes** — "You are
  told about a new version as soon as it is ready", "Only one refresh prompt
  appears when a new version is ready". Leave them. Notes are a record of what
  shipped on a date, not a description of the current build, and rewriting
  history to match today would make every past entry suspect.
