---
name: patch-notes
description: Write the release notes for a version bump in apps/seller or apps/backoffice. Use when bumping either app's version, when asked to "add patch notes", or when a change has shipped and the notes are owed. Decides what in a diff a user could actually notice, then writes one short line per change.
---

# Patch notes

Notes live in `apps/<app>/lib/patch-notes.ts` as a typed array, newest first.
They are written in the same commit that bumps the version, because that is the
only moment anyone knows what changed — **and because a version that deploys
without its note can never show that note again.** See "One commit, not two"
below before splitting them.

The type is in `packages/ui/custom/PatchNotes.tsx`:

```ts
{ version: string; date: string; entries: { kind: "added" | "improved" | "fixed"; text: string }[] }
```

## 1. Find the version's window

A bump commit does not sit on the change it describes. `5.4.0` is a standalone
`chore(seller): 5.3.0 -> 5.4.0` commit landing *after* six feature commits, and
those six are its contents.

```bash
# the bump commits for this app, newest first
git log -p --format='COMMIT %h %ad %s' --date=short -- apps/<app>/package.json \
  | grep -E '^COMMIT|^\+    "version"'

# what a version contains: after the previous bump, through this one
git log --format='%h %s' <prev-bump>..<this-bump> -- apps/<app> packages
```

Shared-package work counts for both apps. A `packages/shell` fix gets a line in
each list, worded for that reader — not copied.

## 2. Decide what a user could notice

This is the step the skill exists for. Most of a diff is invisible.

**Include:** new screens or controls, changed behaviour they will hit, bugs they
could have reported, speed they can feel, wording on screens they read.

**Exclude:** refactors, renames, type changes, dependency bumps, CI and build
work, migrations with no visible effect, performance work nobody notices,
internal logging.

**Never guess from the commit message alone.** `chore(seller): 5.4.0 -> 5.4.1`
looks empty; its window contained the fix for analytics charts that were
returning 500s. Read the window, then decide.

If nothing in the window is user-visible, **write nothing**. That version gets
no card and the sequence has a gap, which is correct.

## 3. Write the lines

Almost nobody reads release notes. The few who do are checking one thing — did
the thing that annoyed me get fixed — and everything here serves them finding
their line in about four seconds.

- **One line each.** No qualifier, no reason, no second clause. If it needs two
  sentences to be understood, it needs a Callout on a screen instead.
- **Five entries maximum**, and three for a backfilled release. More than that
  is describing the release rather than announcing it.
- **Start with the subject the reader cares about**, usually them or the thing
  on screen: "You can now…", "The orders list…".
- **Ordinary words.** The audience includes people reading English as a second
  language — the notes are English in both apps, so the sentence has to survive
  that. "You can now close a pay period that owes nothing", never "payout
  periods with a zero balance may now be finalised without disbursement".
- **No internals.** No file, table, column, flag, library or package names, and
  no version numbers inside the sentence.
- **Kinds:** `added` for something new, `improved` for something that existed
  and is now better, `fixed` for something that was wrong. Never "changed" —
  it tells the reader a thing is different without telling them whether that is
  good news.

Good:

```ts
{ kind: "fixed", text: "The orders list updates right after you place an order." }
{ kind: "improved", text: "The app starts faster." }
```

Bad — internals, two clauses, and nothing the reader can act on:

```ts
{ kind: "improved", text: "Refactored the SWR key in useStoreOrders so the list revalidates after a mutation, improving perceived latency." }
```

## 4. Write it in

Prepend to the array in `apps/<app>/lib/patch-notes.ts` with the new version
string and today's date in `yyyy-mm-dd`. The `version` must match
`apps/<app>/package.json` exactly.

Then check the other app. A change that touched shared packages usually owes a
line on both sides, and both apps get a version bump when a change touches both.

### One commit, not two

The bump in `package.json` and the entry in `patch-notes.ts` go in the same
commit. Not as a convention — because splitting them loses the note.

The What's New screen remembers the last version a reader dismissed and shows
every release above it. If `5.4.7` deploys with the bump but no entry, readers
on that build compute an empty list, see nothing, and are recorded as having
seen `5.4.7`. When the entry lands a commit later it is already below their
mark, so it never appears — not on the next release, not ever. The release
announces itself to nobody and there is no way to replay it.

The same applies to a bump that arrives with no note *because nothing was
user-visible*. That is fine and intended: no entry, no card, nothing withheld.
The failure is only a note that exists but arrives late.

## Editing published notes

A note that shipped is history. Correct one only if it is wrong or misleading —
never to add something that was forgotten. That belongs in the next release or
nowhere.
