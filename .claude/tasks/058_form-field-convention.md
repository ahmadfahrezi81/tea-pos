# Task 058 — One way to draw a form field

Came out of a UI-uniformity pass across the seller app. The trigger was small:
the New Store Expense screen had no required marker, while New Claim two taps
away had one. Neither screen was wrong on its own — there was simply no
convention for either to follow.

---

## What was actually wrong

Nine screens rendered a labelled field, and every one of them hand-wrote it:

```tsx
<div className="space-y-1.5">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("manage.type")}</p>
    <SelectInput … />
</div>
```

Copied nine times, it had drifted nine ways:

- **Two label colours.** `text-gray-500` on five screens, `text-gray-900` on
  four. Nothing distinguished them; whichever screen was written last won.
- **Three ways to say required.** A red `*` (`SinglePhotoStep`), a red word
  "Required" next to a grey "(optional)" (`manage/open`), and the word
  "(optional)" baked into the translation string itself (`claims.notesLabel`
  was literally `"Notes (optional)"`). Most screens said nothing at all.
- **Helper text under some fields and not others** — "Cash on hand at the start
  of the day" restated its own label.

The marker being absent was not a decision anywhere. It was the default.

## The rule

**A labelled form field is a `Field`.** One component, in
`packages/ui/custom/Field.tsx`:

```tsx
<Field label={t("manage.amount")} required>
    <NumberInput … />
</Field>
```

- Label is `text-xs font-semibold text-gray-900 uppercase tracking-wide`.
- **Required is marked with a red asterisk; optional is unmarked.** Writing
  "(optional)" put the longest word on the least important fields and left the
  required ones looking bare.
- No helper text. If a field needs a sentence to explain it, the label is wrong.

### Why a wrapper and not a `label` prop

Two reasons, both load-bearing:

1. The label sits above **six** controls — `TextInput`, `NumberInput`,
   `ReadOnlyInput`, `SelectInput`, `Textarea`, `PhotoPicker`. A prop means
   implementing the same label six times.
2. Some fields **swap their control by state**. The claim Date is a skeleton,
   then a "no worked dates" message, then a `SelectInput`, then a
   `ReadOnlyInput` — all under one label. A wrapper spans that; a prop cannot.

The label is a `<p>`, not a `<label>`: `TextInput` and `NumberInput` already
render their own `<label>` shell, and nesting two labels is invalid HTML.

### The asterisk has to be true

Every `required` was read off the screen's own submit gate, not guessed:

| Screen | Marked | From |
| ------ | ------ | ---- |
| `manage/expense/add` | Amount | `isValid = amount > 0 && …` |
| `manage/request/add` | Type | `disabled={!selectedType}` |
| `manage/report/add` | Type, Notes | `isValid = !!resolvedType && notes.trim().length > 0` |
| `more/map/add` | Location | `disabled={!selectedLocation}` |
| `more/reimbursements/add` | Type, Amount, Date | `isValid = !!selectedTypeId && amount > 0 && …` |
| `manage/open` | Balance; Photo `required={!skipPhotos}` | `canSubmit` |
| `SinglePhotoStep` | Quantity, Attachment | step gate |
| `account/details/edit`, `account/payroll-info/edit` | *nothing* | save accepts empty |

The account screens are the interesting row. Bank details *feel* required, but
nothing enforces it — so nothing is marked. **A marker that disagrees with the
submit button teaches the reader to ignore the marker.**

## Editable, locked, and neither

The same pass gave the three input shells one visual grammar. All of them:
`p-4 px-3`, `border-2 border-gray-100`, `rounded-2xl`, `bg-gray-50`, value at
`text-2xl font-bold`.

| Shell | Trailing icon | Means |
| ----- | ------------- | ----- |
| `TextInput`, `NumberInput` | ✏️ pencil, when there is a value | you can change this |
| `ReadOnlyInput` (new) | 🔒 padlock | you cannot |

The pencil only appears **once the field holds a value**, and hides on focus. An
empty field shows a placeholder and already reads as an input; a filled one
reads as a display tile, which is exactly when the hint is needed. It hides on
focus because by then it has done its job. Both are pure CSS off the wrapper —
`group-focus-within:hidden`.

`NumberInput` also gained a **content-width input**: a hidden mirror span is
measured so the unit sits beside the number (`2.000 pcs`) instead of being
pinned to the far edge. `field-sizing: content` would do this in one CSS line
but is Chromium-only, and iOS is not a rounding error here.

## Where the shared controls live now

`SelectInput` and `Textarea` moved to `packages/ui/custom/` with the rest. They
were sitting in `app/…/home/manage/_components/shared/`, which meant the claims
screen imported them as `../../../home/manage/_components/shared/SelectInput` —
a path that says "this is manage's, and I am stealing it".

`PhotoPicker` moved to `apps/seller/components/shared/` instead, **not** into
`packages/ui`: it depends on `useT` and `lib/compressPhoto`, and `packages/ui`
has no i18n by design (see the note on `SettingsRow`). Same fix for the ugly
import path without dragging app concerns into the UI package.

## Backoffice, same rule

`TextInput` and `NumberInput` live in `packages/ui`, so the pencil and the new
shell reached backoffice whether or not anyone looked at it. Rather than leave it
half-converted, the same pass ran there: **5 screens, 14 fields**, all on `Field`.

Backoffice has no i18n, so labels are plain strings — `<Field label="Name">`.

It had three label styles of its own (`text-sm font-medium text-gray-700` on the
type forms, `text-xs …text-gray-500 uppercase` on the pay screen, `…text-gray-400
uppercase` on staff screens), and it had its own way of saying optional: a grey
`Optional` chip beside "Note for staff". Same fix — the chip is gone and the
gated fields are starred.

Stars, again read off each screen's gate:

| Screen | Marked | From |
| ------ | ------ | ---- |
| `commission-types/add` | Name, Slug | `disabled={!name \|\| !slug}` |
| `commission-types/[id]/edit` | Name | `disabled={!name}` |
| `claim-types/add` | Name, Slug | `disabled={!name \|\| !slug}` |
| `claim-types/[id]/edit` | Name | `disabled={!name}` |
| `payouts/[payoutId]/pay` | Transfer Screenshot | `disabled={locked \|\| (!isSkip && !proofFile)}` |

Also here: the raw `<textarea>` on the pay screen became the shared `Textarea`,
and the two read-only rows on `claim-types/[id]/edit` (Amount, Decided by)
became `ReadOnlyInput`, so they carry the padlock instead of merely looking
inert.

**Left alone deliberately:** three search boxes and a native `<input
type="month">`. They are inline chrome, not labelled fields — a `Field` around a
search box would be the convention applied past the point where it means
anything.

### A validation gap this surfaced, and closed

`claim-types/add` shows "Minimum hours worked" when Decided by is `auto`, where
the threshold is what makes the claim fire at all — but `handleSave` did not
require it. A zero there produced a claim type that could never trigger.

The convention refused to paper over it. Marking the field required while the
button accepted an empty one would have made the asterisk a lie, so the gate was
added instead: `needsThreshold = claimSource === "auto"` feeds both `isValid` on
the footer and a guard in `handleSave`, and the field is `required={needsThreshold}`.

`auto_submit` is deliberately *not* covered — it only prefills a claim for admin
review, so a missing threshold there is harmless.

**This is the convention doing its job.** The bug had been sitting in that form
since it was written; nobody found it by reading the form. It surfaced because
something finally asked, field by field, *is this required, and who says so?*

## Known gap

`SelectInput` and `Textarea` still wear the **old, smaller** shell — `border`,
`rounded-xl`, `p-3`, `text-base` — against the big shell everything else now
uses. On New Store Expense the Type select is visibly thinner than the Amount
field below it.

Converging them is not mechanical: `text-2xl` is right for an amount and wrong
for a notes textarea, so the third shell needs a deliberate size decision rather
than a find-and-replace. Left for a follow-up on purpose.

## Files

- New: `packages/ui/custom/Field.tsx`, `packages/ui/custom/ReadOnlyInput.tsx`
- Moved: `SelectInput.tsx`, `Textarea.tsx` → `packages/ui/custom/`;
  `PhotoPicker.tsx` → `apps/seller/components/shared/`
- Changed: `NumberInput.tsx`, `TextInput.tsx`, 10 seller screens, 5 backoffice screens
- Translations: `(optional)` / `(opsional)` removed from `claims.notesLabel` and
  `claims.receiptPhoto`; `earnings.receiptAndNote` added
- Deleted keys: `manage.required`, `manage.optional`, `manage.openingBalanceDesc`,
  `manage.openingPhotoDesc`, `earnings.proofLabel`, `earnings.paymentNote`
- Added keys: `manage.quantityLabel`, `manage.attachmentLabel` — the close-day
  photo steps were the last field labels still hardcoded in English
