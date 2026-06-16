# Layer-violation cleanup (pre-prod final sanity pass)

This file covers 3 instances of components bypassing the api-client/hook layers, found during a final code sanity pass before a prod deploy. All are low-risk, behavior-preserving refactors — no schema/DB changes.

## Item 1: Extract /api/upload into a proper api client + hook

### Problem

Three pages call `apiFetch("/api/upload", ...)` directly, bypassing the api-client/hook layers (violates the layered architecture in CLAUDE.md — components must not call `apiFetch` directly):

- `app/[tenantSlug]/mobile/home/manage/request/add/page.tsx` (line 50)
- `app/[tenantSlug]/mobile/home/manage/report/add/page.tsx` (line 56)
- `app/[tenantSlug]/mobile/more/reimbursements/add/page.tsx` (line 69)

Each does the same thing: build a `FormData` with `file`/`bucket`/`subPath`, POST to `/api/upload`, read back `{ url }`.

### Plan

#### 1. `apps/seller/lib/api/upload.ts` (new)

```ts
import { apiFetch } from "./client";

export const ALLOWED_UPLOAD_BUCKETS = [
    "store-reports",
    "store-requests",
    "reimbursements",
    "payroll-proofs",
] as const;
export type UploadBucket = (typeof ALLOWED_UPLOAD_BUCKETS)[number];

export const uploadApi = {
    upload: async (file: File, bucket: UploadBucket, subPath: string) => {
        const form = new FormData();
        form.append("file", file);
        form.append("bucket", bucket);
        form.append("subPath", subPath);
        return apiFetch<{ url: string }>("/api/upload", {
            method: "POST",
            body: form,
        });
    },
};
```

Bucket list mirrors `ALLOWED_BUCKETS` in `app/api/upload/route.ts` (kept as a literal union here since the route doesn't export its type).

#### 2. `apps/seller/lib/hooks/upload/useUpload.ts` (new)

Thin hook wrapper (no SWR needed — this is a one-shot mutation, not cached data), following the existing pattern of hooks owning the loading/error state so components stay render-only:

```ts
import { useState, useCallback } from "react";
import { uploadApi, type UploadBucket } from "@/lib/api/upload";

export function useUpload() {
    const [isUploading, setIsUploading] = useState(false);

    const upload = useCallback(async (file: File, bucket: UploadBucket, subPath: string) => {
        setIsUploading(true);
        try {
            const { url } = await uploadApi.upload(file, bucket, subPath);
            return url;
        } finally {
            setIsUploading(false);
        }
    }, []);

    return { upload, isUploading };
}
```

#### 3. Update the 3 pages

Replace the inline `FormData` + `apiFetch` block with `const { upload } = useUpload();` and:

```ts
photoUrl = await upload(photoFile, "store-requests", `${selectedStoreId}/${todayStr}`);
```

(bucket name differs per page: `store-requests`, `store-reports`, `reimbursements`)

Remove the now-unused `import { apiFetch } from "@/lib/api/client";` from each.

### Scope / risk

- No behavior change — same endpoint, same payload, same response shape.
- No DB/schema changes, no migration needed.
- Touches 3 existing pages + 2 new small files.

### Order of execution

1. Create `lib/api/upload.ts`
2. Create `lib/hooks/upload/useUpload.ts`
3. Update `request/add/page.tsx`
4. Update `report/add/page.tsx`
5. Update `reimbursements/add/page.tsx`
6. `npx tsc --noEmit` from `apps/seller` to verify clean

---

## Item 2: `usersApi.update()` called directly from a component

`app/[tenantSlug]/mobile/account/details/edit/page.tsx` calls `usersApi.update(...)` directly inside `EditForm`'s `handleSave` — same layer violation as item 1, but for a mutation instead of an upload. `useCurrentUser` already exists for the GET side; there's no mutate-side hook.

### Plan

Add an `update` method to `lib/hooks/user/useCurrentUser.ts` (keeps the GET+mutate logic in one place rather than a separate hook file, since they share the same SWR cache key):

```ts
import useSWR from "swr";
import { usersApi } from "@/lib/api/users";
import type { User, UpdateUserInput } from "@tea-pos/features/users/schema";

export function useCurrentUser() {
    const { data, error, isLoading, mutate } = useSWR<User>(
        "user",
        () => usersApi.get(),
        { revalidateOnFocus: false, dedupingInterval: 300_000 },
    );

    const update = async (input: UpdateUserInput) => {
        const updated = await usersApi.update(input);
        mutate(updated, { revalidate: false });
        return updated;
    };

    return {
        user: data ?? null,
        isLoading,
        isError: !!error,
        mutate,
        update,
    };
}
```

### Update the page

`EditPersonalDetailsPage` passes `update` down to `EditForm` instead of `mutate`; `EditForm`'s `handleSave` calls `update({...})` instead of `usersApi.update({...})` + manual `mutate()`. Remove the now-unused `import { usersApi } from "@/lib/api/users";` from the page.

### Scope / risk

- No behavior change — same endpoint, same response handling, same SWR cache key.
- Touches 1 existing file (`useCurrentUser.ts`) + 1 page.

### Order of execution (appended to the list above)

7. Add `update` to `useCurrentUser.ts`
8. Update `account/details/edit/page.tsx` to use it
9. `npx tsc --noEmit` from `apps/seller` to verify clean

---

## Item 3: Duplicated sign-out logic (raw `fetch`, copy-pasted 3x)

### Problem

The exact same sign-out block — `fetch("/api/auth/signout", { method: "POST", credentials: "include" })` followed by a redirect — is copy-pasted in 3 places:

- `app/[tenantSlug]/mobile/account/_components/AccountProfile.tsx` (line 62)
- `app/[tenantSlug]/mobile/more/_components/MobileProfile.tsx` (line 86)
- `app/unauthorized/page.tsx` (line 74)

Both `AccountProfile.tsx` and `MobileProfile.tsx` already consume `useAuth()` from `lib/context/AuthContext.tsx` — that's the natural home for a shared `signOut`.

`app/unauthorized/page.tsx` is intentionally excluded from this cleanup: it's a top-level route outside `[tenantSlug]` and not wrapped by `AuthProvider` (it has to handle the case where tenant resolution itself failed), so it can't use `useAuth()`. Touching it for consistency only would add risk to an error-handling path for no real benefit — leave its raw `fetch` as-is.

### Plan

Add `signOut` to `lib/context/AuthContext.tsx`:

```ts
import { createClient } from "@/lib/supabase";
// ...
const supabase = createClient();

interface AuthContextType {
    user: User | null;
    avatarUrl: string | null;
    isLoading: boolean;
    mutate: () => Promise<User | null | undefined>;
    signOut: () => Promise<void>;
}

// inside AuthProvider:
const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
};

return (
    <AuthContext.Provider value={{ user, avatarUrl, isLoading, mutate, signOut }}>
        {children}
    </AuthContext.Provider>
);
```

(Kept as a plain `fetch` inside the context itself — this is the one legitimate place for it, since `AuthContext` is effectively the auth layer for the client. No need for an `authApi` client file for a single endpoint with no response body.)

### Update the 2 components

- `AccountProfile.tsx`: destructure `signOut` from `useAuth()`, replace the inline `fetch(...)` call in `handleLogout` with `await signOut();` (keep the existing `router.push("/login")` after).
- `MobileProfile.tsx`: same change.

### Scope / risk

- No behavior change — same endpoint, same redirect-after-logout flow.
- Touches 1 existing file (`AuthContext.tsx`) + 2 components. `unauthorized/page.tsx` deliberately left untouched.

### Order of execution (appended to the list above)

10. Add `signOut` to `AuthContext.tsx`
11. Update `AccountProfile.tsx` to use it
12. Update `MobileProfile.tsx` to use it
13. `npx tsc --noEmit` from `apps/seller` to verify clean

---

## Other things checked, found clean (no action needed)

- **Secret leakage**: grepped for `SERVICE_ROLE_KEY`, `XENDIT_API_KEY`, `TOMORROW_IO_API_KEY` across `app/` and `lib/` — only referenced in `lib/supabase/service.ts` (server-only), never in a `"use client"` file. No leakage into the client bundle.
- **Mapbox token usage** in `more/map/add/page.tsx` (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, direct third-party `fetch` to Mapbox API): this is expected — it's a public, domain-restricted token, calling Mapbox directly from the client is the normal integration pattern, not a layering violation. Left as-is.
- **Commented-out `console.log`** in `CloseDayModal.tsx` (lines 43, 234) and a gated `console.log` in `lib/utils/logger.ts` (behind a `DEBUG` flag) — both harmless, not worth touching.
- **No TODO/FIXME/HACK markers** found anywhere in `app/` or `lib/`.
