# Task 066 — One shared action button

**Status: steps 1–4 and 6 built 2026-09-19, uncommitted. Step 5 is all that is
left and it needs a device.** Steps 1–3 are the first merge, step 4 the second.
Ticket:
`Feat: One shared action button that cannot fire twice`
(https://app.notion.com/p/3df95a715405803ab29dffa9a6f1cb04) — `Medium`.

Scope is `packages/ui` and both apps, so seller and backoffice both bump.

**Priority is `Medium`, not `High`.** The worst hole is Generate New QR firing
twice, and QRIS is still behind `feature-qris` and pointed at the Xendit sandbox,
so no real payment can be doubled yet. Backoffice's approve is live and is money,
but it already has a guard — what it is missing is only the spinner. Revisit when
QRIS ships.

## What the owner asked for

| # | Owner's note | Decision |
| --- | --- | --- |
| 1 | A button that posts, deletes or puts must show a spinner inside itself | Yes, and it must also refuse the second press |
| 2 | Make it a component — the buttons are not shared today | One component in `packages/ui`, adopted by every mutating button in both apps |
| 3 | It has to work on a slow device | The guard latches in a ref before the request; busy is an attribute write, not React state; the spinner is CSS on `transform` |
| 4 | Concern: adopting it could break the button styles | **The component owns behaviour, never looks.** Every call site keeps its own classes, and "nothing moved" is step 5 |
| 5 | Spinner, text, or both? | Spinner always. A label only for a long multi-stage wait, or when motion is reduced |

## How it ships

**Steps 1–3 are one merge. Step 4 is a second.** Steps 2 and 3 are the buttons
with an actual gap. Step 4 rewires five that already behave correctly, so it
carries regression risk with nothing visible to show for it — that belongs in a
diff that can be reverted on its own.

## Step 1 — Build `ActionButton` — **built**

`packages/ui/custom/ActionButton.tsx`, plus the keyframe beside `.skeleton` in
both apps' `globals.css`. No call sites change in this step. `packages/ui` is
already in both apps' `transpilePackages`.

```tsx
<ActionButton
    action={handleSave}                  // () => Promise<void> | void
    onError={showError}                  // the app's ErrorSheet; see decision 6
    disabled={!isValid}
    className="w-full py-4 bg-brand …"   // the call site's existing classes, unchanged
    busyLabel={t("account.saving")}      // optional; long waits only
>
    {t("common.save")}
</ActionButton>
```

Seven decisions, each with a cheaper-looking alternative that is wrong.

An eighth appeared while building. **`action` returning `false` releases the
button.** Logout asks `window.confirm` first, and a user who backs out has sent
nothing — without an escape hatch that button would sit busy for good, since by
decision 5 a resolved action keeps the latch. `false` means *nothing was sent*.

**1. The guard is a ref, latched before the request — not `disabled`.**
`disabled` only takes effect after React commits. On a slow phone two taps land
in the same tick, before that commit, and both run. The handler sets
`inFlight.current = true` synchronously and returns early if it is already set.
`disabled` stays as well, for the look. `FormFooter` has this same hole today; it
is only hidden because nobody taps that fast.

**2. Busy is an attribute written imperatively, not React state.**
The spinner is always in the DOM at `opacity: 0`. The click handler writes
`data-busy="true"` on the button element before awaiting and clears it in a
`finally`. CSS does the rest.

The whole task rests on this, so the reason has to survive: **rendering the
spinner from state needs a commit, and a commit is exactly what a slow device
withholds.** A `busy` state flag can land after the request has already resolved
— feedback arriving too late to be feedback. One attribute write happens in the
tap's own tick, whatever React is doing. Same pattern and same reason as
`navProgress.ts` in `packages/shell`: one attribute on one always-mounted node,
animation in CSS, no re-render. Do not drive this with `useState`.

**3. The spinner is overlaid, never in the flow.**
It is absolutely positioned and centred over the button; the label stays where it
is and goes to `opacity: 0`. Nothing enters the layout, so the button cannot
change width — which matters for the auto-width ones (POS fast-order Confirm,
Simulate, Generate New QR) where an 18px spinner plus `gap-2` would visibly grow
the button. The button gets `relative`, and that is the only class the component
adds.

`busyLabel` opts into the spinner-beside-label layout that `FormFooter` and close
day already use, so those call sites keep the exact look they have now.

Building it turned up one wrinkle. The label has to be wrapped in a span to be
faded at all — most of these buttons hold a bare string, and a text node cannot
be styled. Fading the button's children directly, with
`[data-busy] > :not(.action-overlay)`, silently misses every one of them: the
selector matches elements, and a string is not one. The spinner would have sat on
top of a fully visible label. So the wrapper carries `display: inherit` along
with `align-items`, `justify-content` and `gap`, which keeps an icon-beside-a-word
button laid out exactly as it was instead of collapsing the pair into a single
flex item.


**4. The spinner is the liveness signal; the label is not.**
A frozen "Processing…" and a hung app are the same pixels, so text cannot say
*the app is alive* — only motion can. A `transform`-only CSS keyframe runs on the
compositor and keeps turning while the main thread commits. So: a spinner
everywhere, and a label only where it earns its place —

- a long, multi-stage wait that needs explaining, which is what `FormFooter`'s
  `loadingLabel` already does for close day and mark as paid;
- under `prefers-reduced-motion`, where the spin is suppressed and the label is
  the only signal left. The component supplies `common.loading` ("Loading…",
  present in both locales) when the call site passed none.

Animate `transform` only. No `width`, no `opacity` keyframe, no JS loop.

**5. Busy clears on failure. It does not clear on success.**
This is a hole in the buttons that look correct today —
`home/manage/open/page.tsx:51`:

```ts
navigation.push(url("/mobile/home/manage"));
} catch (err) { showError(err); }
finally { setIsSubmitting(false); }
```

The `finally` re-enables the button at once, but the navigation takes time — that
is the premise of task 065. So Open Store sits enabled on the old screen for the
whole gap, and a second tap opens the store again. Only the partial unique index
on active sessions stops it, which is luck rather than design.

So: a rejected action clears the latch, a resolved one does not. The button stays
busy until it unmounts or the screen changes. Call sites that legitimately stay
put — backoffice's approve and reject, which only update a row — pass
`resetOnSuccess`.

**6. `onError`, and the call sites stop catching.**
Not about the message. Every handler today is shaped
`try { await … } catch (err) { showError(err) } finally { setIsSubmitting(false) }`,
with the catch *inside* the function that would be passed as `action`. Such a
function never rejects, so the component would read every failure as a success
and, by decision 5, hold the button busy for good — locking out the retry that is
the entire point of failing. So the rejection has to reach the component: the
call site drops its `try`/`catch`/`finally` and passes `onError={showError}`.
A site that passes no `onError` gets the rejection re-thrown, because a swallowed
error is worse than the duplicate press this task exists to prevent.

Error *display* stays at the call site on purpose. `showError` comes from the
app's `ErrorSheetContext`, and `packages/ui` has no app context by design — the
same reason `PhotoPicker` is not in that package.

**7. The spinner is sized in `em`, not pixels.**
`SummaryPhotoThumbnail.tsx:92` is a 36px icon button and `FormFooter` is a
full-width `py-4` bar; one pixel size cannot serve both. `em` tracks the button's
own text size, and icon-only buttons, which have no text to track, pass an
explicit size.

Also in the component, because there is nowhere else it can live once:
`aria-busy` while it runs — neither app sets it anywhere today, and it is the
same attribute write as `data-busy`.

## Step 2 — Seller's gaps — **built**

| File | Line | Button | Today |
| --- | --- | --- | --- |
| `app/[tenantSlug]/mobile/home/pos/_components/CartDrawer.tsx` | 351 | Generate New QR | **No guard at all.** `createQrisPayment` (`lib/hooks/payments/useQrisPayment.ts:90`) checks only store and cart |
| `app/[tenantSlug]/mobile/account/_components/Account.tsx` | 88 | Logout | **No guard at all.** `await signOut()` posts to `/api/auth/signout` |
| `app/[tenantSlug]/mobile/account/details/edit/page.tsx` | 72 | Save | `disabled`, label swap, no spinner |
| `app/[tenantSlug]/mobile/account/payroll-info/edit/page.tsx` | 141 | Save | `disabled`, label swap, no spinner |
| `app/[tenantSlug]/mobile/home/pos/_components/CartDrawer.tsx` | 230 | Confirm order | `disabled`, label swap, no spinner |
| `app/[tenantSlug]/mobile/home/pos/_components/POS.tsx` | 135 | Confirm order (fast-order mode) | same |
| ~~`CartDrawer.tsx` 387~~ | — | ~~Simulate Payment~~ | **Left alone.** Its `simulating` flag is a 5-second cooldown after the call, not an in-flight state, and this component has no way to express that. Staging-only, so the gap costs nothing |

Each keeps its `className` verbatim. The diff per site is the tag name, `action=`,
`onError={showError}`, and the removal of its local `isSaving` / `processing`
state together with the `try`/`catch`/`finally` around it — fewer lines out than
in. Logout and Generate New QR gain a guard they never had.

## Step 3 — Backoffice's two gaps — **built**

| File | Line | Button | Today |
| --- | --- | --- | --- |
| `app/[tenantSlug]/mobile/pay/payouts/[payoutId]/page.tsx` | 509 (sheet), triggers at 406–455 | Approve / Reject | `disabled={!!busyId}`, `"Saving..."`, no spinner. **This approves money** |
| `components/shared/FormFooter.tsx` | 101 | the confirm sheet's Save | `disabled={isLoading}`, label swap, no spinner |

Both pass `busyLabel` so their sheets keep their shape, and both pass
`resetOnSuccess` because the screen behind the sheet stays.

**One style line did change, in these two only:** each gained
`flex items-center justify-center gap-2`, which a spinner beside a label needs
and which the main `FormFooter` button already had. Both hold a single centred
string, so the rendering is the same — but it is a class change, and step 5's
screenshots should confirm it rather than assume it.

**The latch dies with the element, so the row keeps its own.** A remount — an
optimistic `mutate` reordering rows — drops both the ref and the attribute.
`busyId` (`pay/payouts/[payoutId]/page.tsx:79`) stays exactly where it is. The
two guard different things: the component guards one button's own double tap,
`busyId` guards the row surviving a re-render.

**The layer violation on that page was fixed too** (owner asked, 2026-09-19).
It called `payrollApi` and `apiFetch` straight from the component. Now
`usePayslip` owns the three writes — `reviewDay`, `setCommissionStatus`,
`setClaimStatus` — along with the optimistic paint, the refetch-before-re-throw,
and the once-per-mount payout upsert that used to sit in a `useEffect` with an
eslint-disable. `payrollApi.updateClaimStatus` is the typed client the raw
`apiFetch` should always have gone through, and the row types moved to the hook
that produces them, which removed a `PayslipShape` cast and an `"payout" in`
check from the page.

Its two siblings were fixed in the same pass. `pay/page.tsx` now settles through
`usePayslip`'s `settlePayout` and uploads through a new `useUpload` /
`lib/api/upload.ts` pair mirroring seller's, rather than hand-building a
`FormData` in the component. `claim-types/[id]/edit/page.tsx` was calling the
eligibility `PUT` directly while `usePayrollClaimConfigs` already exposed
`setEligibility` — it uses that now.

**No component under `apps/backoffice/app` calls an api client or `apiFetch` any
more.** What remains, and is a bigger and separate job: several backoffice hooks
call `apiFetch` themselves instead of going through an api client —
`usePayrollClaimConfigs` is the clearest case. The layer below the one this task
touched.

## Step 4 — Rewire the ones that already work — **built** *(second merge)*

Seller: `FormFooter`, close day's Confirm and Next, `TakeOverCard`, `AuthForm`,
`SummaryPhotoThumbnail`. Backoffice: `FormFooter`'s main button and `AuthForm`.
Nothing here looks different afterwards. It exists so there is one guard rather
than several that agree by coincidence — including the ref latch, which none of
them had.

**`PhotoPicker` is out.** Both copies were on the list and neither sends
anything: they compress and preview, and the upload happens on the form's submit,
which is already covered. Its spinner is compression, not a request.

**The step was bigger than the list, and this is why.** `FormFooter` cannot wrap
its button in an `ActionButton` while its call sites still catch their own
errors: a handler that catches never rejects, so by decision 5 a failed submit
would leave the footer button busy for good. So `FormFooter` gained `onError` and
`resetOnSuccess` pass-throughs, and **all twelve of its call sites** — six in each
app — dropped their `try`/`catch`/`finally` and their `isSubmitting` state and now
pass `onError`. That is the step's real size: the footer is one component, but its
contract reaches every form in both apps.

Three smaller things the code demanded:

- **`action` now receives the click event.** `SummaryPhotoThumbnail`'s delete sits
  on top of a thumbnail that opens the viewer, so it needs
  `e.stopPropagation()` — without the event that tap would both delete the photo
  and open it.
- **`.action-swap` needed the same `display: inherit` treatment as
  `.action-label`.** Both `AuthForm` buttons hold a Google icon beside a word, and
  wrapping that pair in a plain span collapsed it into one flex item and ate the
  `gap-3`.
- **Close day keeps its `isSubmitting` state**, but only to gate the Back button
  beside it. It releases that flag in the `catch` and re-throws, so the button
  clears itself while Back becomes usable again — and there is no `finally`,
  because on success the screen is leaving.

Errors do not all go to the same place, which is why `onError` is a prop rather
than something the component reaches for: the payout confirm screen and
`TakeOverCard` show their failures inline, everything else hands them to
`ErrorSheet`.

## Step 5 — Verify — **not done: needs a device and eyes**

`tsc` passes on both apps, `eslint` reports nothing new on any touched file, and
both apps build with the service worker emitted. The lint findings that remain in
`close/page.tsx`, `map/add/page.tsx` and the two backoffice config edit pages
were there before this task. Everything below is still owed.


- Screenshots of every touched button, before and after, idle and disabled. Any
  difference other than the spinner is a bug in this task.
- Throttled device: two fast taps on Logout, Generate New QR, and Approve in
  backoffice send exactly one request each. Read the network panel, not the UI.
- Under CPU throttling the spinner appears on the **tap**, not when the response
  lands. If it shows up late, something is driving it from state.
- The spinner keeps turning across a navigation commit.
- A button whose action navigates stays busy until the screen changes. Open Store
  is the case to check.
- With `prefers-reduced-motion` on, a still button shows a label instead.
- On a real iPhone, a button that disables mid-press must not keep its
  `active:scale-*` or `active:opacity-*` until touchend. A stuck press state is
  exactly the "it ruined the look" failure this task promised not to cause.

## Step 6 — Version bump and patch notes — **built**

Seller 5.4.18, backoffice 1.0.19 — one bump for the whole task, made in the merge
that ships first. Step 4 needed no edit to those notes: it changes nothing a
reader can see, and the two lines already cover what step 2 and 3 did. Both apps owe a line because both change; see the `patch-notes` skill,
and the bump and the note go in one commit. Something like "Buttons now show a
spinner while they work and can't be pressed twice."

---

## Context that belongs to no step

### What the audit found

`packages/ui/components/button.tsx` (shadcn) exists and is imported **zero**
times by either app. Every button is hand-rolled: **68** in seller, **58** in
backoffice. So four different busy states are in the codebase at once:

| Treatment | Where |
| --- | --- |
| Spinner beside the label | `FormFooter` in both apps, close day's Confirm and Next |
| Spinner replaces the label | `TakeOverCard.tsx:107`, seller `AuthForm.tsx:45`, `SummaryPhotoThumbnail.tsx:92` |
| Label text swap only | 5 in seller (step 2), 2 in backoffice (step 3) |
| Nothing at all | `Account.tsx:88` Logout, `CartDrawer.tsx:351` Generate New QR |

Correct today and only rewired for consistency in step 4: everything behind
`FormFooter` — seller's open store, close day, add expense, add request, add
report, add claim, map feedback; backoffice's mark as paid and its two config
edit pages — plus login and the photo pickers.

### Why the styles cannot be touched here

| | Seller | Backoffice |
| --- | --- | --- |
| `disabled:opacity-*` variants | 3 (`40`, `50`, `60`) | 3 (`40` ×10, `50`, `60`) |
| Press feedback variants | 6 | 7 |

Thirteen decisions with no single owner. Picking one is a design call and its own
ticket; picking one *by accident*, inside this change, is how the adoption gets
reverted.

### The two `FormFooter` copies have already diverged

Seller's is the original. Backoffice's grew a confirm bottom sheet, a `gray`
variant and `pb-8`. A third implementation is already half-born, which is the
argument for the core landing in `packages/ui` now rather than after the next
copy. Merging the two copies is **not** in scope — they share a core, and the
sheet and the variants stay where they are.

### Deliberately left alone

- **Seller's language picker.** `LanguageContext.tsx:38` fires
  `usersApi.updateLanguage` and forgets it while the UI updates optimistically.
  A spinner there would be a regression.
- **A success state** — a tick, a colour flash. Scope creep, and the screen
  changing already says it worked.
- **`type="button"`** matters in principle but not here: neither app contains a
  single `<form>`. Set it, and do not think of it as a feature.
- **`touch-action: manipulation`** — already global in both apps' `globals.css`.
- **A minimum spinner duration.** Considered and dropped, owner's call. Decision
  5 removed most of the need, since a button that never clears on success cannot
  flash, leaving only the failure path and the two `resetOnSuccess` sites. And on
  a slow device the floor never engages, because a slow response is already past
  it — a timer and an unmount-cleanup path that only ever run on fast hardware.
  If approve and reject flash once this is live, it returns as a prop on those
  two, not as a default.
- **Idempotency keys on the mutating routes.** The real fix for a duplicate
  payment, as against making it harder to trigger. Parked: QRIS is behind
  `feature-qris` and hits the Xendit sandbox, so there is nothing real to
  double yet. Revisit with the payout routes when QRIS ships.
