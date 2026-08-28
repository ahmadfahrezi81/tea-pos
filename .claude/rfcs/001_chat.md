# RFC 001 — Chat

| | |
|---|---|
| **Status** | Draft. Not accepted. Nothing built |
| **Date** | 2026-08-28 |
| **Author** | Session with Claude, following task 062 |
| **Affects** | `apps/seller`, `packages/features`, `packages/services`, `packages/utils/realtime`, new migrations |
| **Spawns** | Tasks, once accepted. This file is not one |

---

## 1. Summary

Build **Slack, minus direct messages, minus user-created groups**: channels,
flat threads, system events posted into channels the way a Slack bot posts, and
push notifications.

Rollout is staged. **The schema is not.** The capability is in the data model
from the first migration; what changes between phases is which surfaces render
and which flags are on.

---

## 2. Context

The seller nav has had a `/mobile/chats` root tab pointing at a ComingSoon
placeholder for a while — deliberately not prefetched, because warming it costs
a full proxy run to render nothing.

The question that started this was whether the realtime layer could carry a chat
feature. It could not: `SupabaseRealtimeAdapter` had never once reported a
connection state, and channels leaked for the lifetime of the tab. Fixing that
became **task 062**, now shipped. This is the feature that motivated it.

---

## 3. Goals

- One surface where staff see what is happening across their stores.
- System events and human messages in **one stream**, one ordering, one unread
  model.
- Push notifications that reach an Android phone that is not open on the app.
- A schema that does not need rewriting when the composer ships.

### Non-goals

| Not doing | Why |
|---|---|
| Direct messages | Out of scope by decision |
| User-created groups | Lifecycle, not permissions — nobody deletes a dead group and there is no moderation tooling |
| Mentions, typing indicators | Each changes the schema when it arrives anyway. **Reactions are in scope — see 4 and 5.3b** |
| Thread-level unread | Phase 2 at the earliest |
| Deriving chat from `tenant_activity_logs` | See §5.1 |

---

## 4. Rollout

**Read-only is a rollout stage, not a channel property.** Every channel is a
real chat channel from the first migration; what changes is who may post, and
that is a column, not a deploy.

```sql
post_policy text not null default 'none'
    check (post_policy in ('none','admin','members'))
```

`none` — nobody posts, system events only. `admin` — `ADMIN` role only.
`members` — anyone in the channel. Flipping #general from `none` to `admin` on
the day you want to start posting is an `update`, not a release.

| Phase | Ships | Mechanism |
|---|---|---|
| **1** | Read-only. System events only, both channels | `feature-chat`, all channels `post_policy = 'none'` |
| **2** | **Reactions.** Staff can react but not type | `feature-chat-reactions` |
| **3** | Admin posts in #general | `#general.post_policy = 'admin'` |
| **4** | Everyone posts, threads open | `post_policy = 'members'`, `feature-chat-compose` |
| **5** | Admin-created `custom` channels, if ever wanted | — |

**Reactions before the composer** is a suggestion, not a requirement. Reacting
is a far lower-commitment first interaction than typing: it gets staff used to
opening the tab without asking them to compose anything, and it produces signal
about whether anyone is reading. Typing first asks for the harder behaviour
before the habit exists.

### 4.0 The two channels

| Kind | Scope | Members | Post policy | Analogue |
|---|---|---|---|---|
| `general` | One per tenant | Everyone in the tenant | `none` → `admin` → `members` | Slack's `#general` |
| `store` | One per store | `user_store_assignments` for that store | `none` → `members` | A team channel |

There is one tenant today. The channel is still keyed on `tenant_id` because
everything else in this codebase is, and because the day there are two, nothing
about this has to change.

### 4.1 Why phase 1 is not a view over `tenant_activity_logs`

It was the first proposal in this discussion and it was wrong.

Every phase-1 event is already logged — `store_opened`, `store_closed`,
`payroll_payout_updated` are all in the `ActivityLogType` enum. A feed screen
reading that table is a day's work and needs no new tables at all.

The problem is phase 2. Adding chat then means **two sources, two orderings, and
two unread models** to reconcile in the UI forever, and that merge never gets
cleaned up. One table where a system event and a seller's message differ only by
`author_type` costs slightly more now and nothing later.

**If phase 2 is genuinely uncertain, this decision deserves another look** — it
is the single largest cost in the RFC.

---

## 5. Data model

Sketch, not a migration. Column names checked against `packages/db/types.ts`.

### 5.1 `chat_channels`

```sql
create table chat_channels (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid not null references tenants(id) on delete cascade,
    kind        text not null check (kind in ('general','store','custom')),
    store_id    uuid references stores(id) on delete cascade,
    name        text not null,
    post_policy text not null default 'none'
                check (post_policy in ('none','admin','members')),
    is_archived boolean not null default false,
    created_at  timestamptz not null default now(),

    -- store channels have a store; the other kinds must not
    constraint chat_channels_store_matches_kind
        check ((kind = 'store') = (store_id is not null))
);

create unique index chat_channels_one_general_per_tenant
    on chat_channels (tenant_id) where kind = 'general';

create unique index chat_channels_one_per_store
    on chat_channels (store_id) where kind = 'store';

```

`custom` is in the enum and nothing creates one. Costs nothing now, saves a
migration if phase 3 happens.

### 5.2 `chat_messages` — the whole model is here

```sql
create table chat_messages (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid not null references tenants(id) on delete cascade,
    channel_id  uuid not null references chat_channels(id) on delete cascade,

    -- Flat threads, Slack-style: a reply points at the root, never at another
    -- reply. Roots have this null. Arbitrary nesting is unreadable on a phone
    -- and there is no way back out of it once rows exist.
    thread_root_id uuid references chat_messages(id) on delete cascade,

    author_type text not null check (author_type in ('user','system')),
    author_id   uuid references users(id),   -- null for system
    event_type  text,                        -- 'store_opened' etc; null for user
    body        text,
    metadata    jsonb not null default '{}'::jsonb,

    -- denormalised, so the channel list needs no subquery per row
    reply_count   integer not null default 0,
    last_reply_at timestamptz,

    edited_at   timestamptz,
    deleted_at  timestamptz,
    created_at  timestamptz not null default now(),

    constraint chat_messages_author_matches_type check (
        (author_type = 'user'   and author_id is not null and event_type is null)
     or (author_type = 'system' and author_id is null     and event_type is not null)
    ),

    constraint chat_messages_replies_are_flat
        check (thread_root_id is null or reply_count = 0)
);

-- the channel view: roots only, newest first
create index chat_messages_channel_roots_idx
    on chat_messages (channel_id, created_at desc)
    where thread_root_id is null and deleted_at is null;

-- the thread view
create index chat_messages_thread_idx
    on chat_messages (thread_root_id, created_at)
    where thread_root_id is not null;
```

Both indexes are partial and match the two queries exactly; deleted rows are in
neither. **`channel_id` leads rather than `tenant_id`** for the reason 044 gave
for `store_id`: a channel belongs to exactly one tenant, so the tenant column
only adds width. Worth being deliberate about — 044 found `store_orders` had no
`store_id` index at all.

**A user can reply in a thread on a system message.** That is the Slack
behaviour, and modelling events as messages gives it away free: a seller can ask
"why did the store open late?" on the `store_opened` event itself.

### 5.3 `chat_reads`

```sql
create table chat_reads (
    tenant_id    uuid not null references tenants(id) on delete cascade,
    user_id      uuid not null references users(id) on delete cascade,
    channel_id   uuid not null references chat_channels(id) on delete cascade,
    last_read_at timestamptz not null default now(),
    primary key (user_id, channel_id)
);
```

The tab badge is one query on cold open, incremented locally from realtime
pushes after that. **This is the piece that quietly becomes a poll if left to
later**, which is why it is in phase 1 even though phase 1 has no composer.

### 5.3b `chat_message_reactions`

```sql
create table chat_message_reactions (
    tenant_id  uuid not null references tenants(id) on delete cascade,
    message_id uuid not null references chat_messages(id) on delete cascade,
    user_id    uuid not null references users(id) on delete cascade,
    emoji      text not null,   -- the literal Unicode string, e.g. '👍'
    created_at timestamptz not null default now(),
    primary key (message_id, user_id, emoji)
);

create index chat_message_reactions_message_idx
    on chat_message_reactions (message_id);
```

The composite primary key is the whole concurrency story: one user, one emoji,
one message, once. A double-tap is an upsert that changes nothing, and removing
a reaction is a delete on the same key. No counter to keep in sync.

**Counts are aggregated on read**, not denormalised. A thread view loads at most
a few dozen messages and the aggregation is a grouped count on an indexed
column. Unlike `reply_count` — which the *channel list* needs and would
otherwise pay a subquery per row for — nothing renders a reaction count without
already having the message.

### 5.3c The emoji set — fixed, and deliberately old

**No emoji picker.** Six reactions, fixed, rendered as a row under each message.

- A full picker is a heavy component on a phone, and sellers use this between
  customers.
- A fixed set renders in a stable order, so counts changing never reflows the
  message.
- Slack's picker is a desktop-first affordance, and Slack needs it because it
  also supports uploaded `:team-emoji:`. We do not.

**Pick emoji from an old Unicode version.** Older Android devices carry older
emoji fonts and anything recent renders as a tofu box — a real constraint here,
where the fleet is mid-range Android of varying age.

| Emoji | Unicode | Year |
|---|---|---|
| 👍 | 6.0 | 2010 |
| ❤️ | 1.1 | 1993 |
| 😂 | 6.0 | 2010 |
| 🎉 | 6.0 | 2010 |
| 🙏 | 6.0 | 2010 |
| ✅ | 6.0 | 2010 |

All safe to the oldest device likely in the field. By contrast 🫡 is Unicode
14.0 (2021) and is a blank square on Android 10.

The set is a constant in code, not a table. Changing it later leaves old
reactions in the database with emoji no longer offered — which is fine, they
still render; they just cannot be added again.

### 5.4 Membership — derived, no table

```sql
create view chat_channel_members as
    select c.id as channel_id, c.tenant_id, a.user_id
      from chat_channels c
      join user_tenant_assignments a on a.tenant_id = c.tenant_id
     where c.kind = 'announcement'
    union all
    select c.id, c.tenant_id, a.user_id
      from chat_channels c
      join user_store_assignments a on a.store_id = c.store_id
     where c.kind = 'store';
```

No join table, no invite flow, nothing to drift out of sync with
`user_store_assignments`, and one definition of "who is in this channel" feeding
both RLS and push fan-out.

**Do not reference this view directly from an RLS policy.** A view in a policy is
re-evaluated per row, and the general branch joins every user in the
tenant. Wrap it in a `security definer` function returning channel ids for
`auth.uid()` so it evaluates once per query.

### 5.5 `user_push_subscriptions`

```sql
create table user_push_subscriptions (
    id           uuid primary key default gen_random_uuid(),
    tenant_id    uuid not null references tenants(id) on delete cascade,
    user_id      uuid not null references users(id) on delete cascade,
    endpoint     text not null unique,   -- push service URL, vendor-specific
    p256dh       text not null,          -- client public key, for encryption
    auth         text not null,          -- client auth secret
    user_agent   text,
    last_seen_at timestamptz not null default now(),
    created_at   timestamptz not null default now()
);

create index user_push_subscriptions_user_idx on user_push_subscriptions (user_id);
```

Delete the row on `404` or `410` from the endpoint. That is the only mechanism
the push service has for saying a subscription is dead.

### 5.6 `chat_notifications` — optional, recommended

```sql
create table chat_notifications (
    id         uuid primary key default gen_random_uuid(),
    message_id uuid not null references chat_messages(id) on delete cascade,
    user_id    uuid not null references users(id) on delete cascade,
    status     text not null default 'pending'
               check (status in ('pending','sent','failed','skipped')),
    error      text,
    sent_at    timestamptz,
    created_at timestamptz not null default now(),
    unique (message_id, user_id)
);
```

Keeps fan-out off the request path and makes failures retryable. The `unique`
stops a retry double-notifying. One row per recipient per message is heavy at
Slack scale and entirely fine here.

---

## 6. API contract

Follows the five-layer pattern in CLAUDE.md without exception:
**service → api route → api client → hook → component.**

Schemas live in `packages/features/chat/schema.ts`. All routes call
`getRequestUser()` and `getCurrentTenantId()`, use `getServiceClient()`, and
**filter every query on the resolved `tenantId` plus the caller's channel
membership** — the service-role client bypasses RLS, so that filter is the only
protection. Never take a `channelId` on trust; check membership.

### 6.1 Endpoints

| Method | Path | Phase | Purpose |
|---|---|---|---|
| `GET` | `/api/chat/channels` | 1 | Channels the caller belongs to, with unread counts |
| `GET` | `/api/chat/channels/[channelId]/messages` | 1 | Thread roots, newest first, cursor-paginated |
| `GET` | `/api/chat/messages/[messageId]/replies` | 1 | One thread, oldest first |
| `POST` | `/api/chat/channels/[channelId]/read` | 1 | Move `last_read_at` |
| `POST` | `/api/chat/messages` | 2 | Post a root or a reply |
| `PATCH` | `/api/chat/channels/[channelId]` | 2 | Mute (`mutedUntil`) |
| `PUT` | `/api/chat/messages/[messageId]/reactions` | 2 | Add one reaction |
| `DELETE` | `/api/chat/messages/[messageId]/reactions` | 2 | Remove one reaction |
| `POST` | `/api/chat/push/subscriptions` | 1 | Upsert by `endpoint` |
| `DELETE` | `/api/chat/push/subscriptions` | 1 | Remove by `endpoint` |

### 6.2 Schemas

```ts
// packages/features/chat/schema.ts

export const ChannelKind = z.enum(["general", "store", "custom"]);
export const AuthorType = z.enum(["user", "system"]);

export const ChannelResponse = z.object({
    id: z.uuid(),
    kind: ChannelKind,
    storeId: z.uuid().nullable(),
    name: z.string(),
    unreadCount: z.number().int(),
    lastMessageAt: z.iso.datetime().nullable(),
    mutedUntil: z.iso.datetime().nullable(),
});
export const ChannelListResponse = z.array(ChannelResponse);

export const MessageResponse = z.object({
    id: z.uuid(),
    channelId: z.uuid(),
    threadRootId: z.uuid().nullable(),
    authorType: AuthorType,
    authorId: z.uuid().nullable(),
    authorName: z.string().nullable(),      // embed, lifted like ACTIVE_SESSION_COLUMNS
    authorAvatarUrl: z.string().nullable(),
    eventType: z.string().nullable(),
    body: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()),
    replyCount: z.number().int(),
    lastReplyAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    // aggregated on read; `mine` drives the toggled state without a second query
    reactions: z.array(z.object({
        emoji: z.string(),
        count: z.number().int(),
        mine: z.boolean(),
    })),
});

export const ReactionInput = z.object({ emoji: z.enum(REACTION_SET) });

export const ListMessagesQuery = z.object({
    channelId: z.uuid(),
    before: z.iso.datetime().optional(),   // cursor: created_at of the oldest seen
    limit: z.coerce.number().int().min(1).max(50).default(25),
});

export const MessageListResponse = z.object({
    messages: z.array(MessageResponse),
    nextCursor: z.iso.datetime().nullable(),
});

// Phase 2
export const CreateMessageInput = z.object({
    channelId: z.uuid(),
    threadRootId: z.uuid().nullable().default(null),
    body: z.string().min(1).max(4000),
});

export const MarkReadInput = z.object({ readAt: z.iso.datetime().optional() });

export const PushSubscriptionInput = z.object({
    endpoint: z.url(),
    p256dh: z.string(),
    auth: z.string(),
    userAgent: z.string().optional(),
});
```

**Cursor is `created_at`, not an offset.** A feed that grows while you read it
double-renders rows under offset pagination, and this one grows on its own from
system events.

### 6.3 Services

`packages/services/chat.ts`

```ts
listChannelsForUser(supabase, { tenantId, userId })
listChannelMessages(supabase, { tenantId, userId, channelId, before, limit })
listThreadReplies(supabase, { tenantId, userId, messageId })
markChannelRead(supabase, { tenantId, userId, channelId, readAt })
postUserMessage(supabase, { tenantId, userId, channelId, threadRootId, body })
postSystemMessage(supabase, { tenantId, channelId, eventType, metadata })
addReaction(supabase, { tenantId, userId, messageId, emoji })
removeReaction(supabase, { tenantId, userId, messageId, emoji })
upsertPushSubscription(supabase, { tenantId, userId, endpoint, p256dh, auth })
deletePushSubscription(supabase, { endpoint })
```

`postSystemMessage` is the one called from other services. Everything else is
reached only through a route.

### 6.4 Hooks

`apps/seller/lib/hooks/chat/`

| Hook | Key | Notes |
|---|---|---|
| `useChannels()` | `chat-channels` | Powers the tab badge. Revalidate on realtime nudge |
| `useChannelMessages(channelId)` | `chat-messages-${channelId}` | `useSWRInfinite`, cursor from `nextCursor` |
| `useThread(messageId)` | `chat-thread-${messageId}` | Loaded on open, not with the channel |
| `useMarkRead(channelId)` | — | Mutation, debounced |
| `usePushSubscription()` | — | Permission state plus subscribe/unsubscribe |

**No hook sets `refreshInterval`.** 062 is the reason that is worth writing
down: `Infinity` is not an off switch, and a conditional interval is how it got
into `useSession` twice.

---

## 7. Realtime contract

Rows are the truth; realtime is only the nudge that says *go read*. A broadcast
is fire-and-forget — a sleeping phone misses it and nothing knows. **Never
deliver message content over broadcast alone.**

| | |
|---|---|
| Topic | `chat:<channelId>` |
| Event | `message:new` |
| Payload | `{ messageId, channelId, threadRootId }` — ids only, no body |
| Client action | `mutate()` the affected SWR key. Never write the payload into cache |

Do not repeat `useSession`'s `mutate(update, false)`, which writes whatever
arrives into the cache unvalidated. On a public channel that is a spoofing
vector; on a private one it is still an unvalidated write.

Once channels are private, prefer **broadcast from the database** — a trigger
calling `realtime.broadcast_changes()` — over `postgres_changes`. Better
scaling, and it is what Supabase now recommends.

---

## 8. Push notifications

### 8.1 Web Push with VAPID, not Firebase

VAPID (RFC 8292) is one keypair: public key in the client, private key
server-side. The browser returns an endpoint plus two encryption keys; the
server POSTs an encrypted payload to that endpoint, signed with the private key.
No vendor account, no SDK.

**The deciding fact: on Chrome for Android, Web Push is already delivered
through Google Play Services — the same pipe FCM uses.** Firebase on top of that
is a dependency for something the platform already provides.

- Chrome for Android has had Web Push since 2015, and Chrome updates through the
  Play Store independently of the OS — so "older Android" is mostly irrelevant.
- **No home-screen install required on Android.** Notifications work from a plain
  tab. iOS does require install.
- Needs Google Play Services. Fine for this market.

Firebase earns its place when there are real native apps, or when topic-based
fan-out beats looping over endpoints. Neither is true, and moving later is not a
rewrite.

### 8.2 Delivery

1. `postUserMessage` / `postSystemMessage` inserts the row.
2. Trigger or route enqueues `chat_notifications` rows for
   `chat_channel_members` minus the author.
3. A worker drains the queue and POSTs to each endpoint.
4. `404`/`410` → delete the subscription row. Other errors → `failed`, retry.

**Payload is an id and a short title.** The limit is ~4KB, and message bodies do
not belong in a push.

### 8.3 What the notification looks like

| | Icon and name | Attribution |
|---|---|---|
| Installed (WebAPK) | Yours | None — looks native |
| Tab only | Your icon in the body | Chrome badge and origin line |

Sellers are onboarded with the app installed for them, so this is the installed
row. Worth keeping that true.

The status bar is separate: Android shows the `badge` icon there, and it must be
**monochrome on a transparent background**. Without one, Android renders a
generic grey bell.

### 8.4 The settings toggle

An asymmetry shapes the whole design:

- Permission **can** be requested from a toggle — an explicit gesture is what the
  API wants.
- It **cannot be revoked** from JS. `Notification.permission` is read-only.
- It **cannot be re-prompted** once denied. Chrome silently ignores repeats.

So the toggle is two things stacked: an app-level preference, freely toggleable
both ways, and a browser permission that only moves `default → granted`.

| Toggle | Permission | Behaviour |
|---|---|---|
| ON | `default` | `requestPermission()`. Granted: subscribe, store endpoint, preference true. Denied: bottom sheet |
| ON | `denied` | Do not call anything — it does nothing. Bottom sheet straight away |
| OFF | any | `pushManager.getSubscription()` → `unsubscribe()`, delete the row, preference false |

**The real off switch is the subscription row, not the browser permission.**
Delete it and nothing is sent, regardless of what Chrome thinks.

Reuse the `PhotoPicker` pattern — `components/shared/PhotoPicker.tsx` already
does `navigator.permissions.query` with a guard for its absence, and already has
the `"permission"` / `"generic"` Drawer bottom sheet. Same shape, different copy.

**Show the real state, not just the preference.** Permission `denied` with the
preference true should render as off with a "fix in settings" affordance.

### 8.6 Collapse by channel

A Web Push notification carries a `tag`. **A notification with the same tag
replaces the previous one** rather than stacking beside it.

```ts
self.registration.showNotification(title, {
    tag: channelId,        // one live slot per channel
    renotify: false,       // replacing must not buzz again
    body,                  // "Store A · 15 new"
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-monochrome.png",
    data: { channelId, messageId },
});
```

Fifteen messages in one channel become one notification line that updates in
place. An admin on ten stores holds **ten** slots, not a hundred and fifty.

`renotify: false` is the half people forget: without it the replacement
re-buzzes, and the collapse gains nothing except a tidier shade.

### 8.7 Notification level, per channel

Not a mute toggle. Mute is all-or-nothing, which is why Slack does not use one
as its primary control.

```sql
notify_level text not null default 'all'
    check (notify_level in ('all','humans','none'))
```

Column lives on `chat_reads`, beside `last_read_at`.

| Level | Pushes | For |
|---|---|---|
| `all` | Everything | A seller on one store. Default |
| `humans` | `author_type = 'user'` only; system events bump the badge | An admin across many stores |
| `none` | Nothing. Badge only | A channel someone is not working today |

**`humans` is the useful tier, and it works without mentions existing** — which
matters, because mentions are a non-goal. A store opening is informational; a
colleague asking a question is not. `author_type` already draws that line, so
the setting costs one column and one `where` clause in the fan-out.

### 8.5 Onboarding checklist

All three while the device is in hand, because all three are hard to fix
remotely:

1. Install the PWA.
2. **Grant the notification permission.** Installing does not grant it, and
   Android 13+ adds its own runtime prompt. **A denial is sticky** — Chrome will
   not re-prompt, and clearing it means walking someone through site settings
   over the phone. Prompting on first message is the worst version of this: a
   reflexive "Block" costs that seller permanently.
3. Whitelist Chrome in battery settings.

---

## 9. System events are written explicitly

The tempting version is a trigger on `tenant_activity_logs` mirroring certain
types into `chat_messages`. **Do not.**

`tenant_activity_logs` is an audit trail. `chat_messages` is a product surface.
Couple them and every change to what gets audited becomes a user-visible change,
and you can never log something without broadcasting it to staff.

Instead call `postSystemMessage()` beside the existing `log()` calls. Explicit,
and each call site chooses its destination — which matters, because the
destination is not the same for every event.

### 9.1 Event routing

| Event | Channel | Why |
|---|---|---|
| `store_opened`, `store_closed` | That store's channel | Naturally scoped to the people who work there |
| Admin announcements | `general` | Written by a human, not a system event |

**Payroll events are deliberately not here.** A payout is one person's pay, and
every channel in this design is read by more than one person. Rather than invent
a private destination for a single event type, payroll stays where it already
lives — `/mobile/more/earnings`. If that changes, it needs its own decision, not
a routing row.

**Scoping is the volume control.** A seller assigned to one store sees two
system events a day plus their own payouts. Nobody is subscribed to every
store's opens unless they are assigned to every store.

### 9.2 A system message is a normal message

Decided, 2026-08-28. There is no second class of row and no reduced surface:

- **Repliable.** A seller can ask "why did we open late?" on the `store_opened`
  event itself, and the reply is a thread on it.
- **Reactable.** Same six emoji, same table.
- **Notifies.** Like everything else — see §8.

The only difference from a human message is `author_type = 'system'`, which
changes how it renders and nothing else.

---

## 10. Prerequisites

In the order they block things.

| # | What | Blocks |
|---|---|---|
| 1 | Private channels + RLS on `realtime.messages` | All of chat. **Also a live spoofing risk on the session gate today** |
| 2 | Membership as a `security definer` function | RLS re-evaluates a bare view per row |
| 3 | `reply_count` trigger | A denormalised counter drifts without one |
| 4 | Manifest `name` → the real product name | Baked into the WebAPK at install |
| 5 | Monochrome badge icon | Android status bar renders a grey bell without it. Referenced as `/icons/badge-monochrome.png` in §8.6 |
| 6 | Supabase concurrent-peak check | One channel per user per shift is the real cost |

**Item 1 should be done regardless of whether this RFC is accepted.**

---

## 11. Concerns

Ordered by how much they would change the plan.

### 11.1 Channels are public today — a live risk, not a future one

Nothing in `supabase/migrations/` touches `realtime.messages`, and
`SupabaseRealtimeAdapter` creates channels with no `{ config: { private: true } }`.
Any client holding the anon key — which ships in the browser bundle — can
subscribe to `store:<any-uuid>` on **any tenant**, and can send on it.

For chat that is disqualifying. It is also a spoofing vector on the session gate
right now: forge a `session:changed` and you flip someone's POS. Small in
practice — it needs a store UUID — but real.

### 11.2 OEM battery killers, and they hit this market hardest

Xiaomi/MIUI, Oppo/ColorOS, Vivo all aggressively kill background processes.
Notifications arrive late or not at all until Chrome is whitelisted. **Firebase
does not fix this** — same delivery path. Plan a support note, not a code fix.

Related, and equally unfixable in code: **Doze** delays delivery on an idle
phone (`urgency: high` helps, does not guarantee), and **clearing site data
kills the subscription silently** — no error, no event. Re-subscribe on every app
boot and upsert by endpoint; cheap, and it self-heals cases nobody would
otherwise notice.

### 11.3 Connection budget

Today one seller holds one channel while on the home screens. Chat makes it one
channel per user for a whole shift. **Check the Supabase plan's concurrent-peak
ceiling against headcount before phase 2** — this is Supabase's bill, not
Vercel's, and it is the real cost of the feature.

### 11.4 Boot path

The chats tab is currently `prefetch: false` with a comment explaining why. If
it gains real content, revisit — but note prefetching is off entirely right now
(task 057), and the unread badge must not become a Tier 2 read in a layout.
CLAUDE.md's boot-path contract applies unchanged: **a layout may only do Tier 0
and Tier 1.**

### 11.5 Flag drift

Task 060 found PostHog has 8 flags, `lib/flags.ts` declares 7, and they are not
the same 7 — `feature-fast-order` is declared in code and missing in PostHog, so
it evaluates false forever. **Fix that before adding `feature-chat`**, or the
same failure is silently possible here.

### 11.6 "Everything notifies" holds — but only with collapse

Volume estimate from the owner, 2026-08-28: **10–15 messages per store per
day**, system events included. Over a 12-hour working day:

| Stores | Messages/day | Cadence | Verdict |
|---|---|---|---|
| 1 | 10–15 | ~1 per hour | Fine |
| 3 | 30–45 | ~1 per 20 min | Noticeable |
| 10 | 100–150 | **~1 per 5–7 min** | Unusable raw |
| 20 | 200–300 | ~1 per 3 min | — |

**A seller is fine at any point on this table**; they belong to one store. The
case that breaks is an admin assigned to every store, and it breaks at exactly
the volume predicted rather than at some hypothetical scale.

The decision does not change — everything still notifies. Two mechanisms make it
survivable, and they are described in §8.6 and §8.7:

1. **Collapse by channel** with a Web Push `tag`. Nearly free, and it is the
   larger of the two: an admin on ten stores holds ten notification slots that
   update in place, not 150 that stack.
2. **A three-level per-channel setting**, `all` / `humans` / `none` — not a mute
   toggle, which is all-or-nothing and is why Slack does not use one as the
   primary control.

**Both belong in phase 2**, beside reactions. The person who needs them is the
admin, who is using the feature from day one.

### 11.6 Retention

System events accumulate forever — roughly two per store per day. No horizon is proposed. At current volume it does not matter for
years; the concern is that "scroll back to the beginning of time" becomes an
implicit promise that is expensive to withdraw.

---

## 12. Open questions

1. **Does #general go all the way to `post_policy = 'members'`, or stop at
   `admin`?** The schema supports either and the switch is one `update`, so this
   does not need answering before phase 1 — but it changes whether phase 4 exists.
2. **Do reactions apply to system events, or only to human messages?** Letting
   staff 🎉 a payout is the kind of thing that makes the tab feel alive. Letting
   them react to every store open is noise.
3. **Does a system event notify?** Every store open pushing to every seller in
   the tenant is noise. Likely: store channels notify, announcements notify,
   routine system events do not — but that is a product call.
4. **Retention horizon?** See §11.6.
5. **Is `chat_notifications` worth it in phase 1**, when phase 1 has no user
   messages and the volume is a handful of events a day? It could be added with
   the composer instead.

---

## 13. What to review hardest

- **§4.1, the phase-1 decision.** Building the full schema for a read-only feed
  is more work than rendering activity logs. The argument is entirely about phase
  2.
- **Flat threads (§5.2).** A one-way door. Flat → nested later is a data
  migration and a UI rewrite; the reverse is worse.
- **Membership derived rather than stored (§5.4).** Elegant, and it means a
  seller unassigned from a store instantly loses the channel *and its history*.
  That may be right. It may also mean losing a conversation someone needed.
