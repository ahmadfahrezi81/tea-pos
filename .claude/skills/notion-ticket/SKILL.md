---
name: notion-ticket
description: Write or fix a ticket in the Notion "Tasks" database. Use when the owner drops a one-line ask ("add a spinner to submit buttons"), asks to "make a ticket", pastes a Notion task URL, or when an existing ticket has to be filled in before work starts. Turns a sentence into a ticket with a scope a reader can disagree with, without inventing anything the owner did not say.
---

# Notion tickets

The ticket is the agreement about **what** and **why**. It is written before any
code, and it is the thing the owner reads to say "no, not that". The local file
in `.claude/tasks/` is the plan for **how** — a different document, written later,
much longer. Keeping them apart is the point: a ticket that already contains the
implementation cannot be argued with, only obeyed.

**The ticket is drafted by Claude and approved by the owner.** So every sentence
in it is either something the owner said, or something marked as an assumption
they can strike out. There is no third category.

## Where it lives

| | |
| --- | --- |
| Database | `Tasks`, under the `Project planner` page |
| Data source | `collection://2a795a71-5405-818e-9200-000b95a067d4` |
| Database page | `https://app.notion.com/p/2a795a715405819d813ae68e74ea7976` |

Create with `notion-create-pages` against that data source; edit with
`notion-update-page`. The database's default template is blank, so the body
skeleton below is the only template there is.

## 1. Before creating: check it does not exist

One search, by the nouns in the ask — not by the sentence.

```
notion-search / notion-query-data-sources on the Tasks data source
```

A near-duplicate is edited, not forked. Two tickets for one change is how a
change ships twice and gets reverted once.

## 2. Fields

Read-only, never write: `Formula`, `Created time`, `Last edited time`.

| Field | Rule |
| --- | --- |
| **Task name** | `<Task Type>: <name>` — e.g. `Chore: Select and Textarea join the shared field shell`. At most ~10 words after the prefix. The *ask* goes in the body |
| **Task Type** | Required. Judged from the ask, never asked about — rubric below. Exact options, typos included: `Chore`, `Feat`, `AdHoc`, `Disscussion`, `Bug`, `Deployement`, `Test`, `RFC` |
| **Priority** | Required. Judged from the ask, never asked about — rubric below |
| **Status** | `Planning`, always — a drafted ticket is waiting on the owner, not on nobody. Every move after that is the owner's; Claude does not touch this field again |
| **Description** | Required, and it opens with `[claude]`. One line, ≤ 100 characters including that tag — the board reader's answer to *what is this* without opening the page. It adds what the title had to drop; it never restates it |
| **Project** | Relation. Set it — an unlinked ticket is invisible in the "By project" view, which is the view the owner actually uses |
| **Assignee** | The owner, unless told otherwise |
| **Due** | Only if the owner gave a date. An invented deadline is a lie in a field that sorts |
| **MR URL** | Filled when the PR opens, not before |
| **Parent-task / Sub-tasks** | One ticket, one merge. An ask needing two merges becomes a parent with sub-tasks, each with its own scope — not one ticket with two halves |

**The title is a handle, not the request.** A title that carries the whole ask
cannot be read in a board column, and it guarantees an empty body, which is where
the scope was supposed to be. `A button that does actions like post, delete, or
put. Any submit please add a spinner inside the button and make it into a
component` is the ask; `Spinner inside every submit button` is the title.

### Judging Task Type and Priority

Both are decided here, from the ask and the repo, and stated to the owner with
the reason in one clause. Neither is ever handed back as a question: the owner
wrote the ask, so what these fields need is already in it or in the code, and a
ticket parked on a dropdown is a ticket nobody is working on.

**Task Type** — pick by *why the ask exists*, never by how it will be built.
"Make it a component" is method; it decides nothing.

| Type | The ask is |
| --- | --- |
| `Bug` | Something is wrong or broke. There is a right behaviour and the app is not doing it |
| `Feat` | A behaviour that does not exist yet and a user will see |
| `Chore` | Internal, or visible only as consistency. Refactor, rename, convention rollout, dead code, dependency, a look brought in line — nothing a *user's task* changes |
| `AdHoc` | A one-off with no lasting rule: a backfill, a script run, a number to pull |
| `Disscussion` | The deliverable is a decision, not a diff |
| `RFC` | The deliverable is a written design, landing in `.claude/rfcs/` |
| `Deployement` | Release, environment, hosting, CI, service-worker rollout |
| `Test` | The deliverable is the test or the verification |

Mixed asks are common, usually a `Feat` half and a `Chore` half. One type still
wins: the one the owner would still name if the other half were already done.
Split the ticket only if both halves need their own merge.

The tie-break for the case that looks like all three: **if the app does nothing
new and nobody's task changes, it is `Chore` — even when the pixels move.**

**The prefix in the title is the type, spelled the same way.** `Chore: …`,
`Feat: …`, `Bug: …`, `Disscussion: …`, `Deployement: …`. It duplicates the
property on purpose: the property is invisible in a search result, a link
preview, a backlink and a pasted URL, which is where tickets are usually met.
Change the type later and the title is retitled in the same edit.

**Priority** — pick by who is waiting, and what it costs them today.

| | The ask is |
| --- | --- |
| `High` | Live and hurting: money, payroll or order data wrong, a flow a seller cannot finish, a release blocked, or another ticket already in `Coding` waiting on it |
| `Medium` | Real, wanted soon, survivable meanwhile — a workaround exists, or the pain is friction rather than failure. Most volunteered asks land here |
| `Low` | Nobody is waiting. Polish, cleanup, a nice-to-have with no date on it |

Read the owner's own urgency words before the rubric — an ask carrying "kacau",
"ASAP" or "since yesterday" is `High` whatever the table says. Silence is not
`Low`; silence is `Medium`.

Two pulls specific to this repo, because both are easy to under-rate: anything
touching money — orders, payouts, commissions, claims — is at least `Medium`, and
`High` once it is live. Anything only a developer can see is at most `Medium`.

## 3. Body

**Two sections are always there. Three are earned.** In this order, and a
section with nothing true to say is **omitted**, never filled with a
placeholder.

| Section | When |
| --- | --- |
| **Why** | Always |
| **Scope** | Only when the ask has parts, or a boundary that **Done when** does not already imply |
| **Out of scope** | Only when a reader would reasonably assume something is included and it is not |
| **Done when** | Always |
| **Open questions** | Only when something genuinely blocks, or an answer would change the work |

So the floor is **Why** plus **Done when** — six or seven lines, and that is a
finished ticket, not a thin one. For a small ask a Scope section only restates
the checkboxes, and a restatement is worse than nothing: two copies of the scope
drift, and then nobody knows which one was agreed.

Caps, so a ticket cannot grow into a plan: **Why** at most 2 sentences,
**Done when** at most 5 boxes, **Scope** at most 5 bullets. Over a cap means one
of two things — it is two tickets, or the excess is *how*, which belongs in
`.claude/tasks/NNN_slug.md` and not here.

Bullets, not prose. Numbered only when the parts are things the owner will tick
through one by one.

### Why
One or two sentences: the symptom, or what the owner wants to be able to do.
Written in the owner's terms — a user, a screen, a moment. Quote them where they
were specific; their wording carries constraints that a paraphrase drops.

### Scope
What changes, in plain language, at the level of screens and behaviour. Name the
app or package (`apps/seller`, `packages/ui`) when it is already decided; never
file paths with line numbers — the ticket outlives them.

Skip it when **Done when** already says the same thing in fewer words.

### Out of scope
The section that earns the ticket, when it is needed. One line per thing a reader
would reasonably assume is included and is not — especially the obvious ones,
because "obvious" is where the extra day goes. No entry is an entry: do not pad
it with things nobody would have assumed.

### Done when
Checkboxes, each one observable from outside the code: something you can do on a
screen, or see happen. Never "the component is refactored" — that is a method,
and it is done the moment someone says it is.

### Open questions
Only genuine blockers, each with the answer you would pick if nobody replies.
A question with no proposed default is a stall, not a question. Anything you
merely assumed and can proceed on belongs in **Scope**, marked `(assumed)`.

## 4. Writing rules

- **Invent nothing.** A requirement the owner did not state is an open question
  or an `(assumed)` line. It is never plain prose in Scope — prose reads as
  agreed.
- **No implementation.** No API shapes, no props, no SQL, no file trees. If a
  technical decision must be recorded to make the scope legible, it is one
  sentence in Scope, and the reasoning goes in the local task file.
- **Short sentences, ordinary words**, same register as the app's own copy.
- **No estimates** unless the owner gave one.
- **English**, regardless of the language the ask arrived in.
- **Say it was Claude.** `Description` begins `[claude] `. The owner needs to
  know, at a glance and without opening anything, which tickets are their own
  words and which are a machine's reading of them — the second kind is the kind
  worth re-reading before it gets built. It goes in `Description` rather than the
  body because that is the field the board shows, and it goes at the front
  because a tag at the end of a truncated line is a tag nobody sees.

## 5. After writing

Re-fetch the page, then give the owner the link, the `Task Type` and `Priority`
you picked with their one-clause reason, and the two or three lines you are least
sure about. An approval means nothing if the guesses were buried.

## Worked example

The ask, verbatim: *"A button that does actions like post, delete, or put. Any
submit please add a spinner inside the button and make it into a component."*

| Field | Value |
| --- | --- |
| Task name | `Feat: Spinner inside every submit button` |
| Task Type | `Feat` — a button will do something it does not do today. The "make it a component" half is method, so it decides nothing |
| Priority | `Medium` — it touches every submit in both apps, but nothing is broken and no one is blocked |
| Description | `[claude] No feedback while a submit runs, so people press twice` |
| Status | `Planning` |

```markdown
## Why
A submit button gives no sign it was pressed, so on a slow phone the only
feedback is the screen not changing yet. People press again.

## Scope
1. A shared button that shows a spinner inside itself while its action runs,
   and cannot be pressed twice. (`packages/ui`)
2. Every button that submits, creates, updates or deletes uses it.
3. The spinner sits inside the button; the label stays put so the button does
   not change width. (assumed)

## Out of scope
- Buttons that only navigate.
- The navigation progress bar, and pull to refresh.
- Any change to what the actions themselves do.

## Done when
- [ ] Pressing a submit button shows a spinner in it until the request settles.
- [ ] A second press while it spins does nothing.
- [ ] No submit button in either app is left without it.

## Open questions
- Does the label stay visible beside the spinner, or get replaced by it?
  Default if no answer: it stays.
```
