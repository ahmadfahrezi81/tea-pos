# Task 050 — Patch notes

**Status: phase 1 written 2026-08-17 — renderer, both screens, both backfills,
and the skill. Phase 2 (the "new" dot) not started.** Opened 2026-08-17.

Where things landed, against the design below:

| Piece | Where |
|---|---|
| Type + renderer | `packages/ui/custom/PatchNotes.tsx` |
| Seller data | `apps/seller/lib/patch-notes.ts` — 17 releases, 5.0.2 → 5.4.5 |
| Backoffice data | `apps/backoffice/lib/patch-notes.ts` — 7 releases, 1.0.0 → 1.0.6 |
| Screens | `app/[tenantSlug]/mobile/more/patch-notes/page.tsx` in both apps |
| Skill | `.claude/skills/patch-notes/SKILL.md` — first skill in the repo |

One deviation from the plan below: the type lives with the renderer in
`packages/ui`, not in `packages/features/patch-notes/schema.ts`. That package is
Zod schemas for things crossing the wire; patch notes are a static import that
never does, so a schema there would have been ceremony. The seller's
`EmptyPatchNotes` placeholder and its `patchNotes.*` translation keys are gone.

Both apps already have the screen and the menu row — `More → Patch Notes` —
and both render `ComingSoon`. This is about what goes in them and where the text
lives.

---

## The shape of the answer

**Repo files, not database rows. A typed TypeScript array, not markdown and not
JSON. One list per app. English only.**

Each of those is a decision against a plausible alternative, so each is argued
below rather than asserted.

### Why not the database

Patch notes describe a build. They are true of version 1.0.6 and false of
1.0.5, and the only moment anyone knows what changed is the moment the version
is bumped — in a commit, in a pull request, next to the diff being described.

Put them in a table and that link breaks in both directions: staging can show
notes for a build it is not running, production can run a build whose notes were
never written, and editing a note silently rewrites the history of a release
that already shipped. A row also cannot be reviewed. A file in the PR that bumps
the version can.

The runtime argument points the same way. The notes screen is in a PWA that has
to work on a phone with no signal; a file is in the bundle already, a table is a
fetch with a spinner and an error state.

**"How do we make it editable?"** — by editing the file and shipping it, which
is the same act as shipping the build it describes. An in-app editor is only
worth building if someone who cannot open a PR needs to write the notes. Nobody
here is in that position: the person bumping the version is the person writing
the notes.

### Why not markdown, and why not JSON either

Markdown is a format that permits headings, tables, links and images — none of
which belong in a three-line release note, all of which someone will eventually
reach for. It also needs a renderer on a phone screen to display text that has
no formatting in it. The structure we actually want is small and fixed: a
version, a date, and a few short lines each tagged with what kind of change it
was.

JSON would hold that structure, and is the obvious next guess. A `.ts` file
holding the same array is better for three reasons: `kind` is checked against
the three allowed values as it is typed rather than at runtime, comments can sit
in the file next to the entries, and the array imports straight into the bundle
with no fetch and no parse.

```ts
type PatchNoteKind = "added" | "improved" | "fixed";

interface PatchNote {
    version: string;   // exactly the string in package.json
    date: string;      // yyyy-mm-dd, the day it shipped
    entries: { kind: PatchNoteKind; text: string }[];
}
```

The type lives in `packages/features/patch-notes/schema.ts`; the renderer in
`packages/ui`; the data in each app, because the data is the part that differs.

```ts
// apps/backoffice/lib/patch-notes.ts — newest first.
export const patchNotes: PatchNote[] = [
    {
        version: "1.0.6",
        date: "2026-08-17",
        entries: [
            { kind: "added", text: "You can now close a pay period that owes nothing, without paying it." },
            { kind: "improved", text: "Pay unlocks on the last day of the period, so nobody is paid early." },
            { kind: "fixed", text: "The back button no longer gets stuck after the app refreshes itself." },
        ],
    },
];
```

### English in both apps

Decided 2026-08-17, and worth writing down because it cuts against the rest of
the seller app: the notes are English only, in both apps, and the bilingual type
is not built.

The cost is real — an Indonesian-speaking seller lands on the one English screen
in an app that is otherwise fully translated. The whole mitigation is the voice
rule below. Short, plain, ordinary words survive a reader who is working in
their second language; "disbursement" does not. If that turns out not to be
enough, the fix is a second string per entry, and the shape above takes it
without disturbing anything already written.

### Why one list per app

Different audiences and different version series. Backoffice 1.0.6 and seller
5.4.5 shipped the same afternoon and share three packages, but the seller does
not care that the payouts list gained a filter and the owner does not care that
the order screen restores its scroll.

A change that both feel gets a line in each list, worded for that reader. That
is duplication of text, not of meaning, and it is the correct kind.

---

## What a note says

Bullets. One line each, starting with a verb, saying what the reader can now do
or what has stopped going wrong.

- **Between one and five per release.** More than five means the release is
  being described rather than announced.
- **User-visible only.** Refactors, dependency bumps, CI, and performance work
  nobody can feel do not appear. A version with nothing to say simply does not
  appear in the list — silent gaps in the version sequence are correct and
  expected.
- **No internals.** No file names, no table names, no flag names, no library
  names, no version numbers inside the sentence.
- **Plain words, and this one carries weight** — the audience includes people
  reading English as a second language, so the sentence has to survive that.
  "You can now close a pay period that owes nothing" — not "added `skipped`
  status to payouts", and not "payout periods with a zero balance may now be
  finalised without disbursement".

Kinds are the three that mean something to a reader: **added** (something new),
**improved** (something that already existed, now better), **fixed** (something
that was wrong). Not "changed", which says nothing.

### Shorter than feels right

Confirmed 2026-08-17, and it is the governing rule when any other rule here
conflicts with it: **almost nobody reads release notes.** The few who do are
checking one thing — did the thing that annoyed me get fixed. Everything on the
screen is in service of that reader finding their line in about four seconds.

So: one line per entry, and the line fits on a phone without wrapping three
times. Cut the qualifier, cut the reason, cut the second clause. If a change
genuinely needs two sentences to be understood, it needs a screen with a
Callout on it, not a longer patch note.

"Pay unlocks on the last day of the period" beats "Pay now unlocks on the last
day of the pay period, so that staff can't be paid before the period has
finished."

---

## Where it appears

Phase 1 is the existing screen: newest release first, version and date as the
group header, entries beneath with their kind as a small tag or coloured dot.
The current build's own version gets a marker, so a reader can see where they
are in the list.

Phase 2, if it earns itself: a "new" dot on the More tab until the reader has
opened the notes for the version they are running, held in `localStorage`
against the last version seen. The update sheet already tells people a new build
exists — a link from that sheet into this screen is the natural pairing, and the
reason to build phase 2 at all.

---

## The skill

`.claude/skills/patch-notes/SKILL.md` — invoked when bumping a version, since
that is the moment the notes are owed. The directory does not exist yet; this
would be the first skill in the repo.

What it has to encode, because these are the parts that go wrong when a human or
a model writes notes freehand:

1. Read the diff for that app since its last version bump — the bump commits are
   the boundaries, and `git log` for `apps/<app>/package.json` finds them.
2. Decide what is user-visible. Most of a diff is not. This is the step that
   needs judgement and therefore the step the skill exists for.
3. Draft entries in the voice above, respecting the limits: five entries, one
   line, verb first, no internals, ordinary words.
4. Insert at the top of the app's notes file with the version and today's date;
   leave the file alone entirely if nothing user-visible shipped.
6. Remind that the version bump itself is a separate edit, and that both apps
   bump when a change touches both.

---

## The backfill — how far back

Settled 2026-08-17. The screen must not launch empty, and the bump history is
lopsided, so the two apps get different answers. Version dates come from the
bump commits themselves, so they are real rather than reconstructed.

**Backoffice: all of it.** Seven versions — `1.0.0` (2026-06-03, the app's
arrival) then `1.0.1` through `1.0.6` on 16–17 August. Every one has a feature
commit behind it that can be read. Complete history for the price of six cards.

**Seller: back to `5.0.2`, 2026-07-25, and no further.** The boundary is not a
count, it is where the record stops supporting the claim. From 25 July the
commit messages describe features — earnings cards, the demo-store toggle, the
tea waste chart, chart breakdowns. Before that they are `up version`,
`Up version`, `up version update claude.md`. Writing notes from those means
inventing what a user noticed in May, which is worse than having no note.

That is roughly 10–12 cards, because a version with nothing user-visible gets no
card — the rule about silent gaps applies to the backfill exactly as it applies
going forward.

**Which versions are empty cannot be guessed from the bump commit.** Checked
2026-08-17 against the log, and this is the trap: `5.4.1` is a bare
`chore(seller): 5.4.0 -> 5.4.1` commit, but the window behind it contains
`fix(analytics): rebuild product-sales and day-of-week off indexed reads` —
charts that were returning 500s and now load. That is a card. A first pass at
this document had listed `5.4.1` as chore-only on the strength of its bump
message alone, which was wrong. Every window gets read.

### Defining a version's window

Bumps do not sit on the change they describe. `5.4.0` is a standalone chore
commit landing *after* six feature commits, and those six are its contents.

So the window for version *N* is: commits after the bump commit for version
*N-1*, through the bump commit for *N* inclusive, filtered to `apps/<app>` plus
the shared packages. Shared-package work belongs to both apps and gets a line in
each list, worded for that reader — the shell's update-sheet and startup work in
August is exactly this, and appears on both sides.

**Backfilled cards cap at three entries, not five.** Nobody reads July's release
to learn what changed; they read it to see the app has a history. Three lines
carry that and keep the scroll short.

**Rejected: a rollup card** ("Earlier: various improvements") to close off the
pre-July gap. It is the obvious move and it is fiction dressed as history. If
the list should acknowledge its own edge, one grey line under the last card —
*Earlier versions aren't listed* — says it without pretending.

---

## Open, to settle before writing code

- **Does an entry ever get corrected after release?** Editing a shipped note is
  rewriting history; adding a new note is not. Suggest: corrections are allowed
  only for wrong or misleading text, never to add something forgotten.
- **Does the list ever get trimmed?** It only matters once the file is large
  enough to be worth a reader's scroll or the bundle's weight, and it is not
  close. Suggest: keep everything, revisit if it ever reaches that.

*(The "how far back do we backfill" question is settled above.)*
