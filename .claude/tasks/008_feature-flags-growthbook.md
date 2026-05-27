# Task 008 — Feature Flagging with GrowthBook

## Goal

Integrate GrowthBook as the feature flagging layer for the seller app. Replace (or wrap) the existing `isEnabled()` utility with GrowthBook-backed flag evaluation, supporting kill-switches in production and fine-grained targeting by user, role, tenant, and store.

## Why GrowthBook

- Cloud-hosted free tier, no self-hosting required
- Unlimited feature flags on free plan
- Client-side SDK evaluates flags locally after a single config fetch — no per-request latency
- Supports rich targeting rules (user ID, role, tenant, store, custom attributes)
- Dashboard UI for toggling flags without a code deploy
- Open source — can self-host later if needed without rewriting the integration

## Core Use Cases

1. **Kill-switch in production** — if a new feature has a bug, flip it off in the GrowthBook dashboard immediately, no deploy needed
2. **QA / internal whitelisting** — enable a flag only for specific user IDs or users with role `QA` so they can test unreleased features
3. **Per-store targeting** — e.g. disable `require_closing_photo` for specific self-owned stores that don't need photo proof. Each store has a `storeId` in context so rules like "OFF when storeId is in [store-abc, store-xyz]" work out of the box
4. **Per-tenant rollout** — gradually roll out a feature to specific tenants before enabling globally

## Context Object

When initializing GrowthBook (or evaluating a flag), pass the full user + session context:

```ts
{
  userId: profile.id,
  role: profile.role,           // "ADMIN" | "USER" | "DRIVER" | "SUPPLIER"
  tenantId: string,
  storeId: selectedStoreId,     // from StoreContext
}
```

This enables targeting rules on any of these dimensions from the dashboard UI without touching code.

## Existing Pattern to Replace / Wrap

Currently in `packages/features/shared/features.ts`:

```ts
isEnabled('qris')  // purely env-var driven, no user/store context
```

Known flags in use: `qris`, `new-dashboard`, `export-pdf`

The goal is to keep `isEnabled()` as the call site (so existing code doesn't need to change everywhere) but back it with GrowthBook, falling back to the env-var behaviour if GrowthBook is not initialised.

## Implementation Plan

### 1. GrowthBook account setup
- Create free account at growthbook.io
- Create a new project for `tea-pos`
- Note down the **Client Key** (for the SDK) and **API Host** (default: `https://cdn.growthbook.io`)
- Re-create existing flags (`qris`, `new-dashboard`, `export-pdf`) in the dashboard so there's no regression

### 2. Install SDK
```bash
pnpm --filter seller add @growthbook/growthbook-react
```

### 3. GrowthBook provider — `apps/seller/lib/context/GrowthBookContext.tsx`

Wrap the app with `GrowthBookProvider`. Initialise with the client key and update attributes whenever the user/store context changes:

```tsx
"use client";
import { GrowthBook, GrowthBookProvider } from "@growthbook/growthbook-react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useStore } from "@/lib/context/StoreContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";

const gb = new GrowthBook({
  apiHost: process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST,
  clientKey: process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY,
  enableDevMode: process.env.NODE_ENV !== "production",
});

export function GrowthBookContextProvider({ children }) {
  const { profile } = useAuth();
  const { selectedStoreId } = useStore();
  const { tenantId } = useTenantSlug();  // however tenantId is resolved

  useEffect(() => {
    gb.loadFeatures({ autoRefresh: true });
  }, []);

  useEffect(() => {
    if (!profile) return;
    gb.setAttributes({
      userId: profile.id,
      role: profile.role,
      tenantId,
      storeId: selectedStoreId ?? undefined,
    });
  }, [profile, tenantId, selectedStoreId]);

  return <GrowthBookProvider growthbook={gb}>{children}</GrowthBookProvider>;
}
```

Add `autoRefresh: true` so flag changes in the dashboard propagate without a page reload.

### 4. Add env vars

```env
NEXT_PUBLIC_GROWTHBOOK_API_HOST=https://cdn.growthbook.io
NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY=sdk-xxxxxxxxxxxxx
```

### 5. Update `isEnabled()` in `packages/features/shared/features.ts`

Keep the existing signature but check GrowthBook first:

```ts
import { useFeatureIsOn } from "@growthbook/growthbook-react";

// React hook version (use in components)
export function useFlag(flag: string): boolean {
  return useFeatureIsOn(flag);
}

// Keep isEnabled() for non-React / server contexts, driven by env var as before
export function isEnabled(flag: string): boolean { ... }
```

Components that need reactive flag checks should migrate to `useFlag()`. The existing `isEnabled()` stays for non-React contexts.

### 6. Wire provider into layout

In `apps/seller/app/[tenantSlug]/mobile/layout.tsx` (or the root layout), wrap with `GrowthBookContextProvider` inside the existing `StoreProvider` and `AuthProvider` so the attributes are available.

### 7. Example — per-store photo requirement flag

In GrowthBook dashboard:
- Flag name: `require_closing_photo`
- Default: ON
- Rule: OFF when `storeId` is in `[<store-id-1>, <store-id-2>]`

In the close day flow:
```ts
const requirePhoto = useFlag("require_closing_photo");
```

No code change needed to add/remove stores from the exemption list — update the rule in the dashboard.

## Flags to Create in Dashboard (Day 1)

| Flag | Default | Notes |
|------|---------|-------|
| `qris` | off | Match current env-var behaviour |
| `new-dashboard` | off | Match current env-var behaviour |
| `export-pdf` | off | Match current env-var behaviour |
| `require_closing_photo` | on | Can be turned off per store |

## Notes

- `autoRefresh: true` polls GrowthBook CDN every ~60s — flags update in production without a deploy or reload
- Keep `isEnabled()` as a fallback for any server-side or non-React usage
- The GrowthBook client key is safe to expose publicly (it's read-only, no secrets)
- Dev mode enables the GrowthBook Chrome extension for local flag overrides during development
