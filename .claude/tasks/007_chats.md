# Task 007 — Chats

## Overview

Replace the unused inbox + broken notifications system with a Slack-like chat system. Every store gets a channel. The tenant gets a general channel. Every user gets a personal direct channel for system messages (payout, shift summary) that admins can also reply in.

**What this replaces:**

- `/mobile/notifications` route + all its components → deleted
- `notification_events` + `notification_reads` tables → dropped
- `packages/features/notifications/` schemas → replaced
- `packages/services/notifications.ts` → replaced by `channels.ts`
- The "Inbox" tab → renamed to "Chats"

**The mental model:** One store = one Slack channel. System events auto-post (like GitHub/Jira integrations in Slack). Users can type free-form messages. Anyone in the channel can reply. @mentions for basic tagging.

---

## Channel Types

| Type      | One per | Members                                         | Who can post         |
| --------- | ------- | ----------------------------------------------- | -------------------- |
| `store`   | Store   | Users from `user_store_assignments` (auto)      | System + any member  |
| `general` | Tenant  | All users from `user_tenant_assignments` (auto) | System + any member  |
| `direct`  | User    | Target user + all ADMINs (auto)                 | System + ADMINs only |

Direct channels are created lazily — first time a system message needs to reach a specific user. Admins are auto-members of all direct channels so they can reply. Store and general channel membership is driven entirely by the existing assignment tables — no manual management needed.

Admin RLS override (broader store visibility, cross-channel access) is out of scope for V1 — handle in a follow-up with a service-role policy or `role = 'ADMIN'` RLS bypass.

---

## Message Types

| `type`   | `user_id`  | Description                        |
| -------- | ---------- | ---------------------------------- |
| `user`   | profile id | Free-form text typed by a user     |
| `system` | null       | Auto-posted by the app on an event |

System messages have an `event_type` and rich `metadata`. They render as formatted cards. User messages render as Slack-style bubbles.

---

## System Event Routing

| Trigger                         | `event_type`              | → Channel                             | Inline media        |
| ------------------------------- | ------------------------- | ------------------------------------- | ------------------- |
| Store opened                    | `store_opened`            | Store channel                         | —                   |
| Daily summary closed            | `daily_summary_closed`    | Store channel                         | —                   |
| Supply request submitted        | `supply_requested`        | Store channel                         | Photo (if attached) |
| Supply request status updated   | `supply_request_updated`  | Store channel                         | —                   |
| Expense created                 | `expense_created`         | Store channel                         | Photo (if attached) |
| Incident reported               | `incident_reported`       | Store channel                         | Photo (if attached) |
| Incident report status updated  | `incident_report_updated` | Store channel                         | —                   |
| Daily summary closed (personal) | `shift_summary`           | Each session-holder's direct channel  | —                   |
| Payroll period → `paid`         | `payout_ready`            | Each entitled seller's direct channel | —                   |

---

## Data Model

### New tables

```sql
-- One row per channel
channels
  id             uuid PK
  tenant_id      uuid → tenants
  store_id       uuid → stores      (null for general + direct)
  type           text  CHECK IN ('store', 'general', 'direct')
  target_user_id uuid → profiles    (non-null only when type = 'direct')
  name           text               (store name, 'General', or user's full_name)
  created_at     timestamptz
  UNIQUE(tenant_id, store_id)
  UNIQUE(tenant_id, type) WHERE type = 'general'
  UNIQUE(tenant_id, target_user_id) WHERE type = 'direct'

-- Who is in each channel, tracks last-read position
channel_members
  id           uuid PK
  channel_id   uuid → channels
  user_id      uuid → profiles
  last_read_at timestamptz  (null = never read)
  created_at   timestamptz
  UNIQUE(channel_id, user_id)

-- The messages themselves
channel_messages
  id          uuid PK
  channel_id  uuid → channels
  tenant_id   uuid → tenants
  user_id     uuid → profiles  (null = system message)
  content     text             (null for system messages)
  type        text  CHECK IN ('user', 'system')
  event_type  text             (null for user messages)
  metadata    jsonb DEFAULT '{}'
  ref_id      uuid
  ref_table   text
  created_at  timestamptz

-- FCM push tokens
push_tokens
  id         uuid PK
  user_id    uuid → profiles
  token      text
  platform   text  CHECK IN ('web', 'android', 'ios')
  created_at timestamptz
  updated_at timestamptz
  UNIQUE(user_id, token)
```

**Indexes:**

- `channel_messages(channel_id, created_at ASC, id ASC)`
- `channel_members(user_id)`
- `channel_members(channel_id)`
- `push_tokens(user_id)`

**Unread tracking:** `last_read_at` on `channel_members`. Unread count = `COUNT(*) WHERE created_at > last_read_at`. No per-message read rows — Slack/Discord pattern.

**@mentions (V1):** Text-only. Typing `@` shows member picker, inserts `@Name` into content. Renderer highlights in blue. No separate DB table.

**Edit/delete (V2):** Not in scope now. Add `edited_at timestamptz` and `deleted_at timestamptz` to `channel_messages` in a follow-up migration.

### Dropped tables

`notification_events` and `notification_reads` — confirm no live deps before dropping.

---

## Metadata shapes by event_type

```ts
store_opened: {
    (userId, userName, storeId, storeName, openedAt);
}
daily_summary_closed: {
    (dailySummaryId, storeId, storeName, date, totalCups, totalSales, closedBy);
}
supply_requested: {
    (requestId, type, notes, photoUrl, storeId, storeName, userId, userName);
}
supply_request_updated: {
    (requestId, type, status, storeId, storeName);
}
expense_created: {
    (expenseId,
        expenseType,
        amount,
        photoUrl,
        storeId,
        storeName,
        userId,
        userName);
}
incident_reported: {
    (reportId,
        title,
        category,
        description,
        photoUrl,
        storeId,
        storeName,
        userId,
        userName);
}
incident_report_updated: {
    (reportId, title, category, status, storeId, storeName);
}
shift_summary: {
    (dailySummaryId,
        payrollPeriodId,
        storeId,
        storeName,
        date,
        totalCups,
        grossPay,
        ratePerCup);
}
payout_ready: {
    (payrollPeriodId, startDate, endDate, totalGrossPay, entryCount);
}
```

---

## UI Design

### Channel list (`/mobile/inbox`)

Modelled on **Slack mobile** — full-screen list, channels ordered by most recent message.

```
Chats

# Store Kota        Ahmad opened the store    9:14 AM  ●
# Store BSD         Supply request submitted  Yesterday
# General       3   Ahmad: We're running...   Mon
  Ahmad · You       Your shift summary...     Sun
```

Each row:

- `#` icon for store/general, avatar initial circle for direct
- **Bold name + bold preview if unread**
- Last message preview truncated to one line
- Relative timestamp (9:14 AM / Yesterday / Mon)
- Unread count badge (filled circle)

Tap → `/mobile/inbox/[channelId]`

Empty state: _"No chats yet. Open a store to get started."_

---

### Channel thread (`/mobile/inbox/[channelId]`)

Modelled on **Slack mobile** — full-width messages, avatar left, not bubble style.

**Header:**

```
← Store Kota                            3 members
```

**Message layout:**

```
[AV]  Ahmad                              9:14 AM
      Let me know when the ice arrives

[AV]  Siti                               9:16 AM
      On my way, 30 mins

[AV]  Ahmad                              9:22 AM
      Got it, thanks
```

Rules:

- Avatar: 32–40px circle with initials (or photo). Left-aligned.
- Name bold dark, timestamp small gray, right-aligned same line as name.
- Message text below, indented to align under name.
- **Consecutive messages same sender within 5 min:** collapse avatar + name, just show indented text. Time on tap-to-reveal.
- System messages never collapse — always show full Tea POS header.
- Date dividers: `── Today ──`, `── Yesterday ──`, `── 19 May ──` centered.
- Unread divider: `── New Messages ──` in accent color, above first unread on open.

**System messages (Slack bot style):**

```
[🍵]  Tea POS  App                       9:14 AM
      🏪  Ahmad opened the store
```

```
[🍵]  Tea POS  App                       9:45 AM
      📦  Supply Request — Ice
          Ahmad Fahrezi · "We're running out fast"
          [photo thumbnail 200px wide]
```

```
[🍵]  Tea POS  App                       18:31
      🧾  Shift Summary — Tue 19 May
          You sold 47 cups at Store Kota
          Earnings: Rp 94,000  ·  tap to view →
```

System messages: slightly different background tint (like Slack bot messages), same left-aligned layout. Not tappable except `shift_summary` and `payout_ready` → `/mobile/account/earnings/[payrollPeriodId]`.

| event_type                | Icon | Text                                                 |
| ------------------------- | ---- | ---------------------------------------------------- |
| `store_opened`            | 🏪   | "Ahmad opened the store"                             |
| `daily_summary_closed`    | 📋   | "Store closed · X cups · Rp Y sales"                 |
| `supply_requested`        | 📦   | "Supply Request — [type]" + name + notes + photo     |
| `supply_request_updated`  | 📦   | "Supply request [acknowledged / fulfilled]"          |
| `expense_created`         | 💸   | "Expense — [type] · Rp X" + name                     |
| `incident_reported`       | ⚠️   | "Incident — [title]" + name + description + photo    |
| `incident_report_updated` | ⚠️   | "'[title]' has been [acknowledged / resolved]"       |
| `shift_summary`           | 🧾   | "Shift Summary — [date]" + cups + earnings + tap CTA |
| `payout_ready`            | 💰   | "Payout — [dates] · Rp X paid" + tap CTA             |

Photo thumbnails: `max-w-[200px]`, tap to full-screen lightbox.

**Composer:**

```
┌──────────────────────────────────────────────┐
│  Message #store-kota...              [Send]  │
└──────────────────────────────────────────────┘
```

- Expands to multi-line as user types
- Send disabled when empty
- Typing `@` opens member picker overlay above input
- Direct channel non-ADMIN: replace composer with `"Only admins can reply here"`

**Pull-to-refresh** + auto-poll every 15s. No WebSocket for V1.

Empty state: _"No messages yet. Events in this store will appear here automatically."_

---

## Implementation Phases

### Phase 0 — DB migration

**T0a — Create new tables**

```bash
supabase migration new add_channels_tables
```

Create `channels`, `channel_members`, `channel_messages`, `push_tokens` with all FKs, constraints, unique indexes.

RLS policies:

- `channel_messages` SELECT: member of channel
- `channel_messages` INSERT (user): `auth.uid() = user_id AND type = 'user'` + member check
- `channel_messages` INSERT (system): service role bypasses RLS
- `channel_members` SELECT: `user_id = auth.uid()`
- `channel_members` UPDATE: `user_id = auth.uid()` (last_read_at only)
- `channels` SELECT: member of channel
- `push_tokens` SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`

**T0b — Seed channels for existing data**

- For each store: INSERT `channels` (type=store, name=store.name), INSERT `channel_members` from `user_store_assignments`
- For each tenant: INSERT `channels` (type=general, name='General'), INSERT `channel_members` from `user_tenant_assignments`

**T0c — Drop old notification tables**

```bash
supabase migration new drop_notification_tables
```

Drop `notification_reads`, then `notification_events`.

---

### Phase 1 — Service layer

**File:** `packages/services/channels.ts`

```ts
findOrCreateStoreChannel(supabase, { tenantId, storeId, storeName }): Promise<Channel>
findOrCreateGeneralChannel(supabase, { tenantId }): Promise<Channel>
findOrCreateDirectChannel(supabase, { tenantId, targetUserId }): Promise<Channel>
syncChannelMembers(supabase, { channelId, userIds }): Promise<void>

postSystemMessage(supabase, {
  channelId, tenantId, eventType, metadata, refId?, refTable?
}): Promise<ChannelMessage>

postUserMessage(supabase, {
  channelId, tenantId, userId, content
}): Promise<ChannelMessage>

listChannels(supabase, { tenantId, userId }): Promise<ChannelWithUnread[]>
listMessages(supabase, { channelId, limit?, before? }): Promise<ChannelMessage[]>
getChannelMembers(supabase, { channelId }): Promise<Profile[]>
markChannelRead(supabase, { channelId, userId }): Promise<void>
```

Notes:

- `listChannels` joins last message + unread count in one query
- `listMessages` sorts `ORDER BY created_at ASC, id ASC`
- All `postSystemMessage` call sites: fire-and-forget with `.catch((e) => console.error('[channels] postSystemMessage failed:', e))`
- After every `postSystemMessage`, call `sendPushToChannelMembers` (see Phase 9)

---

### Phase 2 — Remove old notification system

Files to delete:

- `apps/seller/app/[tenantSlug]/mobile/notifications/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/notifications/[id]/weather/page.tsx`
- `apps/seller/app/api/notifications/route.ts`
- `apps/seller/app/api/notifications/[id]/read/route.ts`
- `packages/services/notifications.ts`
- `packages/features/notifications/schema.ts`
- `packages/features/notifications/openapi.ts`
- `apps/seller/lib/api/notifications.ts`
- `apps/seller/lib/hooks/notifications/useNotifications.ts`
- `apps/seller/app/api/cron/weather/notify/route.ts`

Keep untouched: `/api/cron/weather/fetch`, `/api/cron/weather/realtime`, `/api/weather`.

Remove from `navigation.ts`: all `/mobile/notifications*` entries and the `notifications/*` wildcard in `resolveRoute`.

Remove from `MobileLayoutClient.tsx`: `router.prefetch` call for `/mobile/notifications`.

Run `pnpm lint` — fix all dangling imports before proceeding.

---

### Phase 3 — API routes

New directory: `apps/seller/app/api/chats/`

| Route                             | Method | Auth   | Description                                  |
| --------------------------------- | ------ | ------ | -------------------------------------------- |
| `/api/chats`                      | GET    | User   | List user's channels with unread counts      |
| `/api/chats/[channelId]/messages` | GET    | Member | Paginated messages (`?before=<id>&limit=50`) |
| `/api/chats/[channelId]/messages` | POST   | Member | Post a user message                          |
| `/api/chats/[channelId]/read`     | PATCH  | Member | Set `last_read_at = now()`                   |
| `/api/chats/[channelId]/members`  | GET    | Member | List members (for @mention picker)           |

Zod schemas in `packages/features/chats/schema.ts`:

- `ChannelResponse`, `ChannelListResponse`
- `ChannelMessageResponse`, `ChannelMessageListResponse`
- `PostMessageInput` — `{ content: z.string().min(1).max(2000) }`

---

### Phase 4 — Wire system message dispatch

**Store opened** → `packages/services/sessions.ts`, `openStore()`, after session INSERT. Also `resumeSession()` no_session edge case.

**Daily summary closed (store)** → `apps/seller/app/api/summaries/route.ts`, PUT handler, after `updateSummary` returns with `closedAt`. Post `daily_summary_closed` to store channel.

**Shift summary (personal)** → `packages/services/payroll.ts`, `createPayrollEntries()`, after each entry INSERT. Post `shift_summary` to each user's direct channel.

**Supply request submitted** → `packages/services/requests.ts`, `createSupplyRequest()`, after INSERT. Post `supply_requested` to store channel.

**Supply request status updated** → new `updateSupplyRequest()` in `packages/services/requests.ts` + new `apps/seller/app/api/requests/[id]/route.ts` PATCH. Post `supply_request_updated` to store channel.

**Expense created** → `packages/services/expenses.ts`, `createExpense()`, after `recalcSummary`. Query `daily_summary_photos WHERE expense_id = expenseData.id LIMIT 1` for `photoUrl`. Post `expense_created` to store channel.

**Incident reported** → `packages/services/reports.ts`, `createIncidentReport()`, after INSERT. Post `incident_reported` to store channel with `photoUrl` from params.

**Incident report status updated** → new `updateIncidentReport()` in `packages/services/reports.ts` + new `apps/seller/app/api/reports/[id]/route.ts` PATCH. Post `incident_report_updated` to store channel.

**Payroll period → paid** → `packages/services/payroll.ts`, `updatePayrollPeriod()`. When `status === 'paid'`: fetch `start_date`, `end_date`; query all entries for that period; group by `user_id` in JS; dispatch all users concurrently with `Promise.all`.

All dispatches fire-and-forget.

---

### Phase 5 — API client + hooks

**`apps/seller/lib/api/chats.ts`**

```ts
export const chatsApi = {
    listChannels: () => apiFetch("/api/chats"),
    listMessages: (
        channelId: string,
        params?: { before?: string; limit?: number },
    ) => apiFetch(`/api/chats/${channelId}/messages`, { params }),
    postMessage: (channelId: string, body: PostMessageInput) =>
        apiFetch(`/api/chats/${channelId}/messages`, { method: "POST", body }),
    markRead: (channelId: string) =>
        apiFetch(`/api/chats/${channelId}/read`, { method: "PATCH" }),
    listMembers: (channelId: string) =>
        apiFetch(`/api/chats/${channelId}/members`),
};
```

**Hooks:**

- `lib/hooks/chats/useChannels.ts` — SWR, `refreshInterval: 60_000`, `revalidateOnFocus: false`
- `lib/hooks/chats/useChannelMessages.ts` — SWR, `refreshInterval: 15_000`, optimistic insert on `postMessage`
- `lib/hooks/chats/useChannelMembers.ts` — SWR, no auto-refresh

---

### Phase 6 — Navigation updates

**`config/navigation.ts`:**

1. Rename tab label `"Inbox"` → `"Chats"`, swap icon → `MessageSquareIcon`
2. Remove all `/mobile/notifications*` entries
3. Add:
    ```ts
    "/mobile/inbox/*": {
      title: "Chat",
      subPage: true,
      inlineHeader: false,
      parent: "/mobile/inbox",
    }
    ```
4. Update `resolveRoute` — remove `notifications/*` wildcard, add `inbox/*` wildcard

**`MobileLayoutClient.tsx`:** Remove `/mobile/notifications` prefetch.

---

### Phase 7 — Channel list UI

**`apps/seller/app/[tenantSlug]/mobile/inbox/page.tsx`**

Components:

- `_components/ChannelList.tsx`
- `_components/ChannelRow.tsx` — icon, bold name if unread, preview, timestamp, badge

Tap → `router.push(url('/mobile/inbox/' + channel.id))`

---

### Phase 8 — Channel thread UI

**`apps/seller/app/[tenantSlug]/mobile/inbox/[channelId]/page.tsx`**

Components:

- `_components/MessageList.tsx` — oldest top, newest bottom; date dividers; "Load earlier" button at top; "New Messages" divider
- `_components/SystemMessageCard.tsx` — all event_type variants, icon + text + optional photo thumbnail
- `_components/UserMessage.tsx` — Slack mobile style: avatar left, name + time header, text below; consecutive collapse within 5 min
- `_components/MessageComposer.tsx` — text input + Send; hidden for non-ADMIN in direct channels, replaced with label
- `_components/MentionPicker.tsx` — overlay on `@`, from `useChannelMembers`

On mount: `markRead`. On pull-to-refresh: re-fetch + `markRead`.

---

### Phase 9 — Push notifications (FCM)

**Setup:**

1. Create Firebase project, enable FCM
2. Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` to env
3. Add `firebase-admin` to server dependencies
4. Generate VAPID key pair, add `NEXT_PUBLIC_FIREBASE_VAPID_KEY` to env
5. Add `firebase` (client SDK) to app dependencies

**Service worker:**

`apps/seller/public/firebase-messaging-sw.js` — handles background push messages, shows browser notification when app is not in foreground.

**Client-side token registration:**

`lib/hooks/usePushPermission.ts`:

- On app load (after auth), call `Notification.requestPermission()`
- If granted, get FCM token via `getToken(messaging, { vapidKey })`
- POST token to `/api/push/register` → upserts into `push_tokens`
- Re-register on token refresh

**`/api/push/register` (POST):**

- Auth required
- Body: `{ token: string, platform: 'web' }`
- Upserts into `push_tokens` for `auth.uid()`

**`packages/services/push.ts`:**

```ts
sendPushToChannelMembers(supabase, firebaseAdmin, {
  channelId,
  title,       // e.g. "Store Kota"
  body,        // e.g. "Ahmad opened the store"
  data?,       // { channelId } for deep link on tap
}): Promise<void>
```

- Fetch all `push_tokens` for channel members (excluding sender)
- Call FCM `sendEachForMulticast` with token list
- Fire-and-forget, `.catch((e) => console.error('[push] failed:', e))`
- Remove stale tokens (FCM returns `messaging/registration-token-not-registered`) from `push_tokens`

**When to send push:**

- After every `postSystemMessage` call in `channels.ts`
- After every `postUserMessage` call in `channels.ts`
- Title = channel name, body = message preview (truncated 100 chars)
- Tap notification → deep links to `/mobile/inbox/[channelId]`

**Permission UX:**

- Do not prompt on first app load — too aggressive
- Prompt after user first sends a message, or on a dedicated "Enable notifications" banner in the Chats screen
- Show a soft in-app prompt first explaining why, then trigger `requestPermission()`

---

## Open Questions / V2

1. **Channel member sync on assignment change** — Add Postgres trigger on `user_store_assignments` INSERT/DELETE to keep `channel_members` in sync automatically.
2. **Edit/delete messages** — Add `edited_at` and `deleted_at` to `channel_messages`. Soft-delete only (hide from UI, keep in DB).
3. **Admin cross-channel access** — RLS bypass for `role = 'ADMIN'` so admins can see all store channels regardless of `user_store_assignments`.
4. **Pagination UX** — "Load earlier" button at top (recommended over infinite scroll — simpler, more reliable on slow connections).
5. **General channel seeded message** — Start empty. No welcome message.
