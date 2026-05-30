# Task 014 — Storage Bucket Separation

## Goal

Every file upload — daily summary photos, incident reports, supply requests, and reimbursement receipts — currently lands in a single `daily-photos` bucket. Three of the four features have no tenant isolation in their paths. RLS can't be meaningfully scoped when unrelated features share a bucket. The fix is to give each feature its own bucket with a consistent, tenant-scoped path structure.

> **Status: READY TO EXECUTE**

---

## Current State (the mess)

`/api/upload` hardcodes `BUCKET = "daily-photos"`. Callers pass a `prefix` string that becomes a subfolder. The result:

| Feature | Bucket | Actual path in storage | Tenant-scoped? | URL served as |
|---|---|---|---|---|
| Daily summary photos | `daily-photos` | `{tenantId}/{storeId}/{date}/{type}/{ts}.ext` | ✓ | Signed URL |
| Incident reports | `daily-photos` | `incident-reports/{ts}-{rand}.ext` | ✗ | Public URL |
| Supply requests | `daily-photos` | `supply-requests/{ts}-{rand}.ext` | ✗ | Public URL |
| Reimbursements | `daily-photos` | `reimbursements/{userId}/{ts}-{rand}.ext` | partial (user, no tenant) | Public URL |

The `incident-reports` and `supply-requests` top-level folders visible in the bucket UI are a symptom of this — they have no tenant prefix, so all tenants' files sit in the same flat namespace.

---

## Target State

Four separate buckets, each tenant-scoped:

| Bucket | Owns | Path format |
|---|---|---|
| `daily-photos` | Open/close day photos | `{tenantId}/{storeId}/{date}/{type}/{ts}.ext` — **unchanged** |
| `store-reports` | Incident report photos | `{tenantId}/{storeId}/{date}/{ts}.ext` |
| `store-requests` | Supply request photos | `{tenantId}/{storeId}/{date}/{ts}.ext` |
| `reimbursements` | Reimbursement receipts | `{tenantId}/{userId}/{date}/{ts}.ext` |

All four buckets are **public** (consistent with current behaviour — photo URLs are stored directly in DB rows and displayed without auth). If private buckets with signed URLs are wanted for reports/requests/reimbursements in the future, that's a separate task.

---

## What needs to change

### Part A — Create buckets via migration

Supabase buckets can be created in SQL by inserting into `storage.buckets`. RLS policies on `storage.objects` can also be set in the same migration.

Create migration:
```
supabase migration new add_feature_storage_buckets
```

```sql
-- Create new feature buckets (public, matching existing daily-photos behaviour)
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('store-reports',  'store-reports',  true),
    ('store-requests', 'store-requests', true),
    ('reimbursements', 'reimbursements', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies — use DO $$ guards because CREATE POLICY IF NOT EXISTS requires PG17
-- and Supabase runs PG15. Safe to re-run the migration.

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload store-reports') THEN
        CREATE POLICY "Authenticated users can upload store-reports"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'store-reports');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store reports are publicly readable') THEN
        CREATE POLICY "Store reports are publicly readable"
        ON storage.objects FOR SELECT TO public
        USING (bucket_id = 'store-reports');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload store-requests') THEN
        CREATE POLICY "Authenticated users can upload store-requests"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'store-requests');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store requests are publicly readable') THEN
        CREATE POLICY "Store requests are publicly readable"
        ON storage.objects FOR SELECT TO public
        USING (bucket_id = 'store-requests');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload reimbursements') THEN
        CREATE POLICY "Authenticated users can upload reimbursements"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'reimbursements');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Reimbursements are publicly readable') THEN
        CREATE POLICY "Reimbursements are publicly readable"
        ON storage.objects FOR SELECT TO public
        USING (bucket_id = 'reimbursements');
    END IF;
END $$;
```

> **Note:** `daily-photos` already exists and its policies are unchanged. Don't touch it.

---

### Part B — Update `/api/upload` to be bucket-aware

`apps/seller/app/api/upload/route.ts` — replace the hardcoded `BUCKET` with a validated `bucket` param from the request, and auto-prefix the path with `tenantId` from auth context:

```diff
- const BUCKET = "daily-photos";
+ const ALLOWED_BUCKETS = ["store-reports", "store-requests", "reimbursements"] as const;
+ type AllowedBucket = typeof ALLOWED_BUCKETS[number];
+
+ // Only allow path segments that are safe: UUIDs, dates (YYYY-MM-DD), alphanumeric, dash, underscore.
+ // Rejects anything with "..", "//" or characters outside the allowed set.
+ function isSafeSubPath(s: string): boolean {
+     return s === "" || /^[a-zA-Z0-9\-_/]+$/.test(s) && !s.includes("..");
+ }

  export async function POST(request: NextRequest) {
      const user = await getRequestUser();
      if (!user) return unauthorized();

+     const tenantId = await getCurrentTenantId();
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
-     const prefix = (formData.get("prefix") as string | null) ?? "uploads";
+     const bucket = formData.get("bucket") as string | null;
+     const rawSubPath = (formData.get("subPath") as string | null) ?? "";

+     if (!bucket || !(ALLOWED_BUCKETS as readonly string[]).includes(bucket)) {
+         return badRequest("Invalid or missing bucket");
+     }
+     if (!isSafeSubPath(rawSubPath)) {
+         return badRequest("Invalid subPath");
+     }

      ...

+     // Validate storeId segment belongs to this tenant when subPath starts with a storeId.
+     // store-reports and store-requests always pass subPath as "{storeId}/{date}".
+     // reimbursements pass "{userId}/{date}" — no store ownership check needed.
+     if ((bucket === "store-reports" || bucket === "store-requests") && rawSubPath) {
+         const storeId = rawSubPath.split("/")[0];
+         const { count } = await supabase
+             .from("stores")
+             .select("id", { count: "exact", head: true })
+             .eq("id", storeId)
+             .eq("tenant_id", tenantId);
+         if (!count) return badRequest("Store not found");
+     }

-     const storagePath = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
+     const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
+     const storagePath = rawSubPath
+         ? `${tenantId}/${rawSubPath}/${filename}`
+         : `${tenantId}/${filename}`;

-     const { error: uploadError } = await supabase.storage.from(BUCKET).upload(...)
+     const { error: uploadError } = await supabase.storage.from(bucket as AllowedBucket).upload(...)
      ...
-     const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
+     const { data: urlData } = supabase.storage.from(bucket as AllowedBucket).getPublicUrl(storagePath);
```

---

### Part C — Update callers

Three pages need to pass `bucket` + `subPath` instead of `prefix`:

**`report/add/page.tsx`:**
```diff
  form.append("file", photoFile);
- form.append("prefix", "incident-reports");
+ form.append("bucket", "store-reports");
+ form.append("subPath", `${selectedStoreId}/${todayStr}`);
```

`todayStr` is not currently in the page — add `const todayStr = useMemo(() => getTodayLocalStr(), [])` and import `getTodayLocalStr` from `@tea-pos/utils/time`.

**`request/add/page.tsx`:**
```diff
  form.append("file", photoFile);
- form.append("prefix", "supply-requests");
+ form.append("bucket", "store-requests");
+ form.append("subPath", `${selectedStoreId}/${todayStr}`);
```

Same — add `const todayStr = useMemo(() => getTodayLocalStr(), [])` and the import.

**`reimbursements/add/page.tsx`:**
```diff
  form.append("file", photoFile);
- form.append("prefix", `reimbursements/${user.id}`);
+ form.append("bucket", "reimbursements");
+ form.append("subPath", `${user.id}/${date}`);
```

`date` is already state in this page (the reimbursement date the user selected).

---

### Part D — Existing files (no action needed)

The existing `incident-reports/`, `supply-requests/`, and `reimbursements/` subfolders inside `daily-photos` are left as-is. Their public URLs are stored in `store_reports.photo_url`, `store_requests.photo_url`, and `payroll_reimbursements.photo_url` and will continue to resolve. They're historical data — don't delete them.

New uploads after this change will go to the correct buckets with proper tenant paths.

---

## Execution Order

1. `supabase migration new add_feature_storage_buckets`
2. Write the SQL into the generated migration file
3. `supabase db push`
4. Verify buckets exist in Supabase dashboard (Storage → Buckets)
5. Update `apps/seller/app/api/upload/route.ts` (Part B)
6. Update the three caller pages (Part C)
7. `pnpm build --filter @tea-pos/seller` — confirm no TS errors
8. Test: submit a report/request/reimbursement with a photo, confirm file lands in correct bucket at `{tenantId}/...` path

---

## Session Start — Read These First

```
apps/seller/app/api/upload/route.ts                                      — Part B (main change)
apps/seller/app/[tenantSlug]/mobile/home/manage/report/add/page.tsx      — Part C
apps/seller/app/[tenantSlug]/mobile/home/manage/request/add/page.tsx     — Part C
apps/seller/app/[tenantSlug]/mobile/account/reimbursements/add/page.tsx  — Part C
apps/seller/app/api/summaries/photo/route.ts                             — confirm daily photos do NOT go through /api/upload; do NOT change
packages/services/summaries.ts                                            — understand daily-photos path format; do NOT change this
packages/services/reports.ts                                              — open question: does delete clean up storage?
packages/services/requests.ts                                             — open question: does delete clean up storage?
packages/services/reimbursements.ts                                       — open question: does delete clean up storage?
```

---

## Open Questions

**1. Should new buckets be private with signed URLs?**
Currently `store_reports.photo_url` and `store_requests.photo_url` store a public URL directly in the DB. Switching to private buckets would require either storing the storage path (not the URL) and generating signed URLs at display time — same as what `daily-photos` does via `listSummaryPhotos()`. Worth doing for reimbursements (personal receipts) at minimum. Deferred — treat as a follow-up once buckets are separated.

**2. Do report/request/reimbursement add pages have `selectedStoreId`?**
`report/add` and `request/add` both call `useStore()` so `selectedStoreId` is available. Reimbursements are user-level (no store context needed) — `subPath` uses `user.id/date` which is already in scope.

**3. `todayStr` availability in report/add and request/add**
Neither page currently computes `todayStr` — both need `const todayStr = useMemo(() => getTodayLocalStr(), [])` added, with `getTodayLocalStr` imported from `@tea-pos/utils/time`.

**4. Photo deletion — are storage files cleaned up?**
When a report, request, or reimbursement is deleted, does the service layer also delete the file from storage? `summaries.ts` does this correctly in `deleteSummaryPhoto()` — it removes from storage before deleting the DB row. Check `packages/services/reports.ts`, `packages/services/requests.ts`, and `packages/services/reimbursements.ts` for the same pattern. If they only delete the DB row and leave the file behind, storage will accumulate orphaned files indefinitely. This is pre-existing but becomes more visible with dedicated buckets. Fix in this task or note as a follow-up.

**5. File type whitelist gap for reimbursements**
`/api/upload` only accepts `["image/jpeg", "image/jpg", "image/webp"]`. The reimbursement add page passes `allowGallery` to `PhotoPicker`, which means users can pick HEIC photos from their iPhone camera roll — these will hit a 400. `summaries.ts` already accepts HEIC/HEIF and PNG. Either expand the whitelist in `/api/upload` to match, or confirm that `PhotoPicker` with `allowGallery` converts HEIC before upload (check the component).

**6. MAX_SIZE_MB inconsistency**
`/api/upload` caps at 2MB. `summaries.ts` caps at 1MB. Probably fine to leave different, but be deliberate — reimbursement receipts from a camera roll can be larger than 1MB. Leaving at 2MB is reasonable.
