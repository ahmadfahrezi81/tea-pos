# Task 032 — Auto Claims Fixes + `auto_submit` Source

## Context

Two bugs found in `packages/services/payroll-claims.ts` →
`createAutoClaimsForDailySummary`, surfaced during a sanity check before
enabling auto claims in production. Also adding a third `claim_source` type
(`auto_submit`) to support auto-submission without system-decided approval.

---

## Bug 1 — `auto_threshold_hours` is `integer`, decimals silently truncated

**Migration:** `20260616163907_payroll_auto_claims.sql`

```sql
add column auto_threshold_hours integer;
```

PostgreSQL rounds any decimal input to the nearest integer. Setting
`auto_threshold_hours = 0.1` stores `0`, and `totalHours >= 0` is always
true for anyone who had a session — every user gets auto-approved regardless
of how long they worked. Also blocks real use cases like a "4.5 hour half-day"
threshold.

---

## Bug 2 — Disabled claim types still fire

**File:** `packages/services/payroll-claims.ts:221–226`

`is_enabled` is never checked in the eligibility query. If an admin disables
a claim type, auto-claims still fire for every seller who worked that day.

---

## Feature — `auto_submit` claim source

Three `claim_source` values instead of two:

| `claim_source` | Who submits | Status at insert | Admin reviews? | Threshold? |
|---|---|---|---|---|
| `manual` | Employee | `pending` | Yes | No |
| `auto` | System at day close | `approved` or `rejected` | No | Required |
| `auto_submit` | System at day close | `pending` | Yes | Not needed |

Use cases:
- **Lunch allowance** → `auto_submit`: system submits daily for every seller
  who worked, admin approves in bulk on payday. No threshold needed.
- **Attendance bonus** → `auto`: threshold = 0, zero admin overhead, auto-approved
  for anyone who had a session.

The current `null` threshold approach was considered but rejected — using a
sentinel value like `-1` to signal "submit as pending" would make the schema
unreadable and require UI workarounds. The correct tool is a proper enum value.

---

## Migration (one migration, all three changes)

```sql
-- 1. Widen threshold column to support decimals
alter table payroll_claim_configs
  alter column auto_threshold_hours type numeric;

-- 2. Add auto_submit to the claim_source enum
alter table payroll_claim_configs
  drop constraint payroll_claim_types_claim_source_check,
  add constraint payroll_claim_types_claim_source_check
    check (claim_source in ('manual', 'auto', 'auto_submit'));

-- 3. Keep threshold required for 'auto' only — auto_submit is exempt
-- (existing constraint already scoped to claim_source != 'auto', no change needed)
```

Run `pnpm types:db` after pushing to regenerate `packages/db/types.ts`.

---

## Code changes — `packages/services/payroll-claims.ts`

### Fix 1: add `is_enabled` filter + widen source filter to include `auto_submit`

`.in()` is never used on embedded/joined columns in this codebase — PostgREST
support is untested. Drop the `claim_source` filter from the DB query entirely
and handle it in JS instead. This is also more future-proof if a fourth source
type is ever added.

```ts
// Before
const { data: eligibilityRows } = await supabase
    .from("payroll_user_claim_assignments")
    .select("claim_config_id, payroll_claim_configs!inner(id, frequency, amount, claim_source, auto_threshold_hours)")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("payroll_claim_configs.claim_source", "auto");

// After
const { data: eligibilityRows } = await supabase
    .from("payroll_user_claim_assignments")
    .select("claim_config_id, payroll_claim_configs!inner(id, frequency, amount, claim_source, auto_threshold_hours)")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("payroll_claim_configs.is_enabled", true);

// Then filter claim_source in JS — exclude manual, include auto + auto_submit
// (and any future auto-family types without touching this query again)
const autoTypes = (
    (eligibilityRows ?? []) as unknown as Array<{ payroll_claim_configs: AutoType }>
).map((r) => r.payroll_claim_configs)
 .filter((t) => t.claim_source !== "manual");
```

### Fix 2: branch on `claim_source` when deciding status

```ts
// Before
if (type.auto_threshold_hours === null) {
    console.warn(`...skipping`);
    continue;
}
const status = totalHours >= type.auto_threshold_hours ? "approved" : "rejected";

// After
let status: string;
if (type.claim_source === "auto_submit") {
    status = "pending";
} else {
    if (type.auto_threshold_hours === null) {
        console.warn(`[payroll] Auto claim type ${type.id} has no auto_threshold_hours — skipping`);
        continue;
    }
    status = totalHours >= type.auto_threshold_hours ? "approved" : "rejected";
}
```

---

## Implementation order

1. Write migration with all three SQL changes above
2. Push migration manually
3. Run `pnpm types:db`
4. Update `createAutoClaimsForDailySummary` in `payroll-claims.ts` (both fixes)

---

## Late-close safety note (not a bug)

If a store forgets to close on Monday and closes Tuesday instead:

- Sessions fetched by `daily_summary_id` — correct sessions, not date range ✓
- Claim `date` stamped from `summary.date` — not today ✓
- Payout window uses `summary.date` — lands in the right bi-weekly block ✓
- `totalHours` will be inflated (could show 24+ hours) but claim amounts are
  fixed so no financial effect — only `hours_worked` audit field is unrealistic.
  Acceptable.
