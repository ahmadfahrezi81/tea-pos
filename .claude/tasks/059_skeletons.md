# Task 059 — Skeletons that read as loading, not as broken

Follows task 058, same session. The forms had been made uniform; the loading
states they sit inside had not.

---

## What was wrong

53 skeleton sites across both apps, every one hand-written from
`animate-pulse`. Four faults, in order of how much they cost:

**1. The pulse was on the card, not on the bars.** `Orders.tsx` was the clearest
case:

```tsx
<div className="bg-white rounded-2xl p-3.5 animate-pulse space-y-3">
```

The white card itself faded to 50% and back. A card breathing in and out reads
as *broken*, not as *loading*. The bars inside it were already grey and already
still — all the animation did was undo that.

**2. Everything pulsed in lockstep.** `animate-pulse` is a 2s opacity cycle with
no offset, so three cards of four bars each were twelve elements strobing as one
block. A synchronised flash reads as a rendering fault. A sweep has a direction,
so it reads as motion toward completion.

**3. Four greys, no system.** `bg-gray-100`, `bg-gray-200`, `bg-white`,
`bg-white/60`, chosen per file. The same store row used gray-100 while the
orders row used gray-200 for the identical job.

**4. Half of them were featureless blobs.** `h-64 bg-gray-100 rounded-xl` says
only "wait". The good pattern already existed in this codebase — `MyStores` drew
an icon square plus two lines of different widths — it just was not the default.

And a fifth, quieter one: on a white card, gray-100 at 50% opacity is a couple of
percent of contrast. The animation was close to invisible on a phone outdoors,
which is where this app is used.

## The fix

`packages/ui/custom/Skeleton.tsx` — `Skeleton`, `SkeletonText`,
`SkeletonValue`, `SkeletonChart`. The motion lives in each app's `globals.css`
as `.skeleton`, next to the existing `indeterminate` keyframes.

**A sweeping highlight, not an opacity pulse.** It runs on a background gradient
rather than a pseudo-element, so a skeleton can be any element and needs no
overflow container. `--skeleton-delay` staggers rows: list items pass their
index, so the highlight travels down the list instead of firing at once.

`prefers-reduced-motion: reduce` drops the animation and keeps the base colour,
which still says "not content yet" on its own.

`SkeletonChart` replaces the grey-slab-plus-spinner the four analytics charts
used. That pairing said two things at once — "nothing here" and "still working" —
and neither of them said *a chart is coming*. Bar heights come from a fixed
pattern so the shape is stable across renders rather than jittering on every
revalidation.

## Where a skeleton is allowed

This is the part that is not cosmetic. From the boot path in task 056:

```
launch.html → proxy → layout → hydrate → boot loader → ready → SKELETON → content
```

Three loading visuals run in sequence and they are not interchangeable:

| Stage | Shows | Owner |
| ----- | ----- | ----- |
| pre-JS | logo | `launch.html`, from the precache |
| pre-`ready` | logo | boot loader overlay |
| post-`ready` | skeleton | the screen's own hook |

**A skeleton may only exist after `ready`.** Before that the boot loader covers
the whole shell, and a skeleton underneath it is work nobody sees. The logo→logo
handoff is why the open feels continuous: `launch.html` and the boot loader paint
the same 192px icon.

It follows that **data seeded into SWR by `BootFallback` never needs a skeleton**
— the store list is in the cache at first paint, so `useStores()` reports
`isLoading: false` and the branch never runs. `MyStores` keeps its skeleton as
the fallback for when the layout's cached read failed and seeded nothing; it is
dead code on a healthy boot, which is the correct amount of code for that case.

## Files

- New: `packages/ui/custom/Skeleton.tsx`; `.skeleton` + `@keyframes
  skeleton-sweep` in both apps' `globals.css`
- Deleted: `apps/{seller,backoffice}/components/shared/SkeletonValue.tsx` — the
  same file twice, now one export from the shared module
- Changed: 21 screens across both apps; all 53 sites converted

The only `animate-pulse` left in either app is two status dots in `CartDrawer`,
which mark a pending payment. That is a live indicator, not a placeholder, and a
pulse is right for it.
