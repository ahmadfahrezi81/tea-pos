# RFC 001 — Chat

| | |
|---|---|
| **Status** | Draft. Not accepted. Nothing built |
| **Date** | 2026-08-28, simplified after review |
| **Follows** | Task 062 — realtime adapter fix |
| **Affects** | `apps/seller`, `packages/features`, `packages/services`, `packages/utils/realtime`, new migrations |
| **Spawns** | Tasks, once accepted. This file is not one |

---

## 1. Summary

A tenant-wide **#general** and one channel per store. Flat threads, six
reactions, and system events written into channels as ordinary messages.
Everything notifies.

**Rollout is staged; the schema is not.** Who may post is a column, so opening a
channel up is an `update`, not a release.

---

## 2. Context

The seller nav has had a `/mobile/chats` root tab pointing at a ComingSoon
placeholder for a while — deliberately not prefetched, because warming it costs
a full proxy run to render nothing.

The question that started this was whether the realtime layer could carry chat.
It could not: `SupabaseRealtimeAdapter` had never once reported a connection
state, and channels leaked for the lifetime of the tab. Fixing that became
**task 062**, now shipped.

---

## 3. Goals

- One surface where staff see what is happening across their stores.
- System events and human messages in **one stream** — one ordering, one unread
  model, one notification path.
- Push notifications that reach an Android phone that is not open on the app.
- A schema that does not need rewriting when people start typing.

### Non-goals

| Not doing | Why |
|---|---|
| Direct messages | Out of scope by decision |
| User-created groups | Lifecycle, not permissions — nobody deletes a dead group and there is no moderation tooling |
| Admin-created custom channels | Two channel kinds is the whole design. Cut as scope that nobody asked for |
| Mentions, typing indicators, editing | Each changes the schema when it arrives anyway |
| Thread-level unread | Channel-level is enough |
| Payroll events in chat | A payout is one person's pay and every channel here has more than one reader. It stays on `/mobile/more/earnings` |

---

## 4. Rollout

**Read-only is a rollout stage, not a channel property.** Every channel is a real
chat channel from the first migration; what changes is who may post.

```sql
post_policy text not null default 'none'
    check (post_policy in ('none','admin','members'))
```

| Phase | Ships | Mechanism |
|---|---|---|
| **1** | Read-only. System events only | `feature-chat`; every channel `post_policy = 'none'` |
| **2** | Reactions. Staff can react but not type | `feature-chat-reactions` |
| **3** | Posting, threads, push retry | `post_policy` → `admin`, later `members` |

Two flags, not three. Opening posting up is a data change, so it needs no flag
of its own — which also keeps the flag list short, and 060 already found the
declared flags drifting out of sync with PostHog.

**Reactions before typing** is deliberate. Reacting is a far lower-commitment
first interaction: it gets staff used to opening the tab without asking them to
compose anything, and it shows whether anyone is reading.

### 4.1 The two channels

| Kind | Scope | Members | Post policy |
|---|---|---|---|
| `general` | One per tenant | Everyone in the tenant | `none` → `admin` → `members` |
| `store` | One per store | `user_store_assignments` for that store | `none` → `members` |

There is one tenant today. Channels are still keyed on `tenant_id` because
everything else in this codebase is.

### 4.2 An admin is just a user

There is no announcement type, no special routing, no separate permission model.
An admin posting in #general writes an ordinary message that renders under their
name, the way everyone's does. `post_policy = 'admin'` is a phase, not a class of
message.

**The only visual distinction is system versus person**, and `author_type`
already carries it: a system message renders with a badge marking it automated.
That is a rendering decision, not a schema one.

### 4.3 Why not just render the activity log

Every phase-1 event is already logged — `store_opened` and `store_closed` are
both in the `ActivityLogType` enum. A screen reading that table is a day's work
and needs no new tables at all.

The problem is phase 3. Adding chat then means **two sources, two orderings, and
two unread models** to reconcile in the UI forever, and that merge never gets
cleaned up. One table where a system event and a seller's message differ only by
`author_type` costs slightly more now and nothing later.

**This is the single largest cost in the RFC.** If phase 3 is genuinely
uncertain, it deserves another look.

---

## 5. Data model

Sketch, not a migration. Column names checked against `packages/db/types.ts`.

### 5.1 `chat_channels`

```sql
create table chat_channels (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid not null references tenants(id) on delete cascade,
    kind        text not null check (kind in ('general','store')),
    store_id    uuid references stores(id) on delete cascade,
    name        text not null,
    post_policy text not null default 'none'
                check (post_policy in ('none','admin','members')),
    created_at  timestamptz not null default now(),

    -- store channels have a store; general must not
    constraint chat_channels_store_matches_kind
        check ((kind = 'store') = (store_id is not null))
);

create unique index chat_channels_one_general_per_tenant
    on chat_channels (tenant_id) where kind = 'general';

create unique index chat_channels_one_per_store
    on chat_channels (store_id) where kind = 'store';
```

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

    deleted_at  timestamptz,
    created_at  timestamptz not null default now(),

    constraint chat_messages_author_matches_type check (
        (author_type = 'user'   and author_id is not null and event_type is null)
     or (author_type = 'system' and author_id is null     and event_type is not null)
    )
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
only adds width.

**No `reply_count` column, and no trigger to maintain one.** An earlier draft
denormalised the reply count so the channel list would need no subquery per row.
That pays off at fifty channels; this list is one #general plus one per store —
**eleven rows at ten stores.** Count on read.

**No `edited_at`.** There is no edit UI planned, and adding the column now
guesses at a design nobody has made.

**A user can reply in a thread on a system message.** That is the Slack
behaviour, and modelling events as messages gives it away free: a seller can ask
"why did we open late?" on the `store_opened` event itself.

### 5.3 `chat_reads`

```sql
create table chat_reads (
    tenant_id    uuid not null references tenants(id) on delete cascade,
    user_id      uuid not null references users(id) on delete cascade,
    channel_id   uuid not null references chat_channels(id) on delete cascade,
    last_read_at timestamptz not null default now(),
    notify_level text not null default 'all'
                 check (notify_level in ('all','humans','none')),
    primary key (user_id, channel_id)
);
```

The tab badge is one query on cold open, incremented locally from realtime
pushes after that. **This is the piece that quietly becomes a poll if left to
later**, which is why it is in phase 1 even though phase 1 has no composer.

`notify_level` is described in §8.6. It is unused until phase 2.

### 5.4 `chat_message_reactions`

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
one message, once. A double-tap is an upsert that changes nothing; un-reacting
is a delete on the same key. No counter to keep in sync.

Counts aggregate on read.

### 5.5 The emoji set — fixed, and deliberately old

**No emoji picker.** Six reactions, fixed, in a row under each message. A full
picker is a heavy component on a phone, sellers use this between customers, and
a fixed set renders in a stable order so counts changing never reflows the
message.

**Pick emoji from an old Unicode version.** Older Android devices carry older
emoji fonts and anything recent renders as a tofu box.

| Emoji | Unicode | Year | Means |
|---|---|---|---|
| 👍 | 6.0 | 2010 | Acknowledged |
| ❤️ | 1.1 | 1993 | Appreciation |
| 😂 | 6.0 | 2010 | Levity |
| 🎉 | 6.0 | 2010 | A good number |
| 🙏 | 6.0 | 2010 | Thanks |
| ✅ | 6.0 | 2010 | Handled |

All safe to the oldest device likely in the field. By contrast 🫡 is Unicode
14.0 (2021) and is a blank square on Android 10.

The set is a constant in code. Changing it later leaves old reactions in the
database with emoji no longer offered — fine; they still render, they just
cannot be added again.

### 5.6 Membership — derived, no table

```sql
create view chat_channel_members as
    select c.id as channel_id, c.tenant_id, a.user_id
      from chat_channels c
      join user_tenant_assignments a on a.tenant_id = c.tenant_id
     where c.kind = 'general'
    union all
    select c.id, c.tenant_id, a.user_id
      from chat_channels c
      join user_store_assignments a on a.store_id = c.store_id
     where c.kind = 'store';
```

No join table, no invite flow, nothing to drift out of sync with
`user_store_assignments`.

**Do not reference this view directly from an RLS policy.** A view in a policy is
re-evaluated per row, and the general branch joins every user in the tenant.
Wrap it in a `security definer` function returning channel ids for `auth.uid()`
so it evaluates once per query. Same work as the plain view; avoids a known trap.

### 5.7 `user_push_subscriptions`

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

### 5.8 `push_deliveries` — phase 3, not phase 1

A ledger of which recipient got which push, so a failed send can be retried.
**Deferred**, and the reason is worth recording because an earlier draft got it
backwards.

That draft justified the table on **latency** — that inline fan-out would put ten
HTTPS round trips in front of a seller's POST. That is true of inline fan-out
and false of this table: **`after()` is what solves latency** (§8.2), and it does
so with no table at all.

So the table buys retry, and nothing else. At phase 1 — two system events per
store per day, nobody typing — a rare dropped notification costs almost nothing.
It earns its place when messages carry actual conversation.

```sql
-- phase 3
create table push_deliveries (
    message_id uuid not null references chat_messages(id) on delete cascade,
    user_id    uuid not null references users(id) on delete cascade,
    status     text not null default 'pending'
               check (status in ('pending','sent','failed','skipped')),
    sent_at    timestamptz,
    created_at timestamptz not null default now(),
    primary key (message_id, user_id)
);

create index push_deliveries_pending_idx
    on push_deliveries (created_at) where status = 'pending';
```

The primary key stops a retry double-notifying. `skipped` is a real outcome
rather than a failure — it is what `notify_level` produces.

### 5.9 Retention

| Table | Policy | Why |
|---|---|---|
| `chat_messages` | **Keep forever** | ~47k rows a year at ten stores. Cursor pagination does not care how large the table is |
| `chat_message_reactions` | Keep forever | Smaller still |
| `push_deliveries` | **Delete `sent` rows after 30 days** | One row per *recipient* per message — it grows five times faster than messages, and nothing ever reads it back |

The arithmetic, since the two figures elsewhere in this file look like they
disagree: **two system events per store per day** is just `store_opened` plus
`store_closed`. The owner's estimate of **10–15 messages per store per day** is
the total including people talking. They stack — 2 system, 8–13 human.

At ten stores that is ~130 messages a day, ~47k a year. `push_deliveries` at five
members per channel would be ~650 a day, ~237k a year — which is the only number
here that argues for a sweep, and it is one line in the cron that already exists.

---

## 6. API contract

Follows the five-layer pattern in CLAUDE.md without exception:
**service → api route → api client → hook → component.**

Schemas live in `packages/features/chat/schema.ts`. All routes call
`getRequestUser()` and `getCurrentTenantId()`, use `getServiceClient()`, and
**filter every query on the resolved `tenantId` plus the caller's channel
membership** — the service-role client bypasses RLS, so that filter is the only
protection. Never take a `channelId` on trust.

### 6.1 Endpoints

| Method | Path | Phase | Purpose |
|---|---|---|---|
| `GET` | `/api/chat/channels` | 1 | Channels the caller belongs to, with unread counts |
| `GET` | `/api/chat/channels/[channelId]/messages` | 1 | Thread roots, newest first, cursor-paginated |
| `GET` | `/api/chat/messages/[messageId]/replies` | 1 | One thread, oldest first |
| `POST` | `/api/chat/channels/[channelId]/read` | 1 | Move `last_read_at` |
| `POST` | `/api/chat/push/subscriptions` | 1 | Upsert by `endpoint` |
| `DELETE` | `/api/chat/push/subscriptions` | 1 | Remove by `endpoint` |
| `PUT` | `/api/chat/messages/[messageId]/reactions` | 2 | Add one reaction |
| `DELETE` | `/api/chat/messages/[messageId]/reactions` | 2 | Remove one reaction |
| `PATCH` | `/api/chat/channels/[channelId]` | 2 | Set `notify_level` |
| `POST` | `/api/chat/messages` | 3 | Post a root or a reply |

### 6.2 Schemas

```ts
// packages/features/chat/schema.ts

export const ChannelKind = z.enum(["general", "store"]);
export const AuthorType  = z.enum(["user", "system"]);
export const NotifyLevel = z.enum(["all", "humans", "none"]);

export const ChannelResponse = z.object({
    id:            z.uuid(),
    kind:          ChannelKind,
    storeId:       z.uuid().nullable(),
    name:          z.string(),
    canPost:       z.boolean(),          // derived from post_policy + role
    unreadCount:   z.number().int(),
    lastMessageAt: z.iso.datetime().nullable(),
    notifyLevel:   NotifyLevel,
});
export const ChannelListResponse = z.array(ChannelResponse);

export const MessageResponse = z.object({
    id:              z.uuid(),
    channelId:       z.uuid(),
    threadRootId:    z.uuid().nullable(),
    authorType:      AuthorType,
    authorId:        z.uuid().nullable(),
    authorName:      z.string().nullable(),   // embed, lifted out
    authorAvatarUrl: z.string().nullable(),
    eventType:       z.string().nullable(),
    body:            z.string().nullable(),
    metadata:        z.record(z.string(), z.unknown()),
    replyCount:      z.number().int(),        // counted on read, not stored
    createdAt:       z.iso.datetime(),
    reactions:       z.array(z.object({
        emoji: z.string(),
        count: z.number().int(),
        mine:  z.boolean(),
    })),
});

export const ListMessagesQuery = z.object({
    channelId: z.uuid(),
    before:    z.iso.datetime().optional(),   // cursor: created_at of oldest seen
    limit:     z.coerce.number().int().min(1).max(50).default(25),
});

export const MessageListResponse = z.object({
    messages:   z.array(MessageResponse),
    nextCursor: z.iso.datetime().nullable(),
});

export const ReactionInput = z.object({ emoji: z.enum(REACTION_SET) });

// Phase 3
export const CreateMessageInput = z.object({
    channelId:    z.uuid(),
    threadRootId: z.uuid().nullable().default(null),
    body:         z.string().min(1).max(4000),
});
```

**Cursor is `created_at`, not an offset.** A feed that grows while you read it
double-renders rows under offset pagination — and this one grows on its own,
from system events, with nobody typing. Cheap now, painful to retrofit.

`canPost` is derived server-side from `post_policy` and the caller's role, so the
client never re-implements the rule.

### 6.3 Services

`packages/services/chat.ts`

```ts
listChannelsForUser(supabase, { tenantId, userId })
listChannelMessages(supabase, { tenantId, userId, channelId, before, limit })
listThreadReplies(supabase, { tenantId, userId, messageId })
markChannelRead(supabase, { tenantId, userId, channelId, readAt })
setNotifyLevel(supabase, { tenantId, userId, channelId, level })
addReaction(supabase, { tenantId, userId, messageId, emoji })
removeReaction(supabase, { tenantId, userId, messageId, emoji })
postSystemMessage(supabase, { tenantId, channelId, eventType, metadata })
postUserMessage(supabase, { tenantId, userId, channelId, threadRootId, body })
upsertPushSubscription(supabase, { tenantId, userId, endpoint, p256dh, auth })
deletePushSubscription(supabase, { endpoint })
```

`postSystemMessage` is the one called from other services. Everything else is
reached only through a route.

### 6.4 Hooks

`apps/seller/lib/hooks/chat/`

| Hook | SWR key | Notes |
|---|---|---|
| `useChannels()` | `chat-channels` | Powers the tab badge. Revalidate on realtime nudge |
| `useChannelMessages(id)` | `chat-messages-${id}` | `useSWRInfinite`, cursor from `nextCursor` |
| `useThread(id)` | `chat-thread-${id}` | Loaded on open, not with the channel |
| `useMarkRead(id)` | — | Mutation, debounced |
| `usePushSubscription()` | — | Permission state plus subscribe / unsubscribe |

**No hook sets `refreshInterval`.** 062 is why that is worth writing down:
`Infinity` is not an off switch, and a conditional interval is how it got into
`useSession` twice.

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

**Broadcast from the route, not a database trigger.** Supabase recommends
`realtime.broadcast_changes()` from a trigger, and at scale that is right — but
`postUserMessage` and `postSystemMessage` are the only things that ever insert a
message, so the route already knows. Broadcasting in the same `after()` block
that sends the push is one mechanism instead of two, with no trigger to keep in
step with the schema.

Do not repeat `useSession`'s `mutate(update, false)`, which writes whatever
arrives into the cache unvalidated.

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

### 8.2 Delivery

```ts
import { after } from "next/server";

const message = await postSystemMessage(supabase, { ... });
after(() => {
    broadcast(message);        // realtime nudge
    sendPushes(message);       // fan out to subscriptions
});
return ok(parsed.data);
```

`after()` runs once the response has been sent, in the same invocation. No new
dependency — verified present in Next 16.2.4. **The client waits on none of it.**

Phase 3 adds `push_deliveries` and a cron sweep for rows still `pending`,
covering invocations that died mid-send. Vercel's one-minute floor is far too
slow to be the primary path, and perfectly adequate as a backstop.

**Payload is an id and a short title.** The limit is ~4KB, and message bodies do
not belong in a push.

### 8.3 What the notification looks like

| | Icon and name | Attribution |
|---|---|---|
| Installed (WebAPK) | Yours | None — looks native |
| Tab only | Your icon in the body | Chrome badge and origin line |

Sellers are onboarded with the app installed for them, so this is the installed
row.

The status bar is separate: Android shows the `badge` icon there, and it must be
**monochrome on a transparent background**. Without one, Android renders a
generic grey bell.

### 8.4 Collapse by channel

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

Fifteen messages in one channel become one line that updates in place. An admin
on ten stores holds **ten** slots, not a hundred and fifty. `renotify: false` is
the half people forget — without it the replacement re-buzzes.

### 8.5 Notification level, per channel

Not a mute toggle. Mute is all-or-nothing, which is why Slack does not use one
as its primary control.

| Level | Pushes | For |
|---|---|---|
| `all` | Everything | A seller on one store. Default |
| `humans` | `author_type = 'user'` only; system events bump the badge | An admin across many stores |
| `none` | Nothing. Badge only | A channel someone is not working today |

`humans` splits on `author_type`, which is the only distinction that exists — an
admin's message is a human message like anyone else's (§4.2). One column, one
`where` clause in the fan-out.

### 8.6 The settings toggle

An asymmetry shapes the whole design:

- Permission **can** be requested from a toggle — an explicit gesture is what the
  API wants.
- It **cannot be revoked** from JS. `Notification.permission` is read-only.
- It **cannot be re-prompted** once denied. Chrome silently ignores repeats.

| Toggle | Permission | Behaviour |
|---|---|---|
| ON | `default` | `requestPermission()`. Granted: subscribe, store endpoint. Denied: bottom sheet |
| ON | `denied` | Do not call anything — it does nothing. Bottom sheet straight away |
| OFF | any | `getSubscription()` → `unsubscribe()`, delete the row |

**The real off switch is the subscription row, not the browser permission.**
Delete it and nothing is sent, regardless of what Chrome thinks.

Reuse the `PhotoPicker` pattern — `components/shared/PhotoPicker.tsx` already
does `navigator.permissions.query` with a guard for its absence, and already has
the `"permission"` / `"generic"` Drawer bottom sheet.

**Show the real state, not just the preference.** Permission `denied` should
render as off with a "fix in settings" affordance.

### 8.7 Onboarding checklist

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

## 9. System events

### 9.1 Written explicitly, not by a trigger

The tempting version is a trigger on `tenant_activity_logs` mirroring certain
types into `chat_messages`. **Do not.**

`tenant_activity_logs` is an audit trail. `chat_messages` is a product surface.
Couple them and every change to what gets audited becomes a user-visible change,
and you can never log something without broadcasting it to staff.

Instead call `postSystemMessage()` beside the existing `log()` calls in
`openStore` and `endSession`. Explicit, and each call site chooses its
destination.

### 9.2 Routing

| Event | Channel |
|---|---|
| `store_opened`, `store_closed` | That store's channel |

**Scoping is the volume control.** A seller assigned to one store sees two system
events a day. Nobody is subscribed to every store's opens unless they are
assigned to every store.

### 9.3 A system message is a normal message

Repliable, threadable, reactable, and it notifies — like everything else. The
only difference is `author_type = 'system'`, which renders a badge marking it
automated and changes nothing else.

---

## 10. Prerequisites

| # | What | Blocks |
|---|---|---|
| 1 | Private channels + RLS on `realtime.messages` | All of chat. **Also a live spoofing risk on the session gate today** |
| 2 | Membership as a `security definer` function | RLS re-evaluates a bare view per row |
| 3 | Manifest `name` → the real product name | Baked into the WebAPK at install |
| 4 | Monochrome badge icon | Android status bar renders a grey bell without it |
| 5 | Supabase concurrent-peak check | One channel per user per shift is the real cost |

**Item 1 should be done regardless of whether this RFC is accepted.**

---

## 11. Concerns

### 11.1 Channels are public today — a live risk, not a future one

Nothing in `supabase/migrations/` touches `realtime.messages`, and
`SupabaseRealtimeAdapter` creates channels with no `{ config: { private: true } }`.
Any client holding the anon key — which ships in the browser bundle — can
subscribe to `store:<any-uuid>` on **any tenant**, and can send on it.

For chat that is disqualifying. It is also a spoofing vector on the session gate
right now: forge a `session:changed` and you flip someone's POS. Small in
practice — it needs a store UUID — but real.

### 11.2 OEM battery killers, and they hit this market hardest

Xiaomi/MIUI, Oppo/ColorOS and Vivo all aggressively kill background processes.
Notifications arrive late or not at all until Chrome is whitelisted. **Firebase
does not fix this** — same delivery path. Plan a support note, not a code fix.

Related, and equally unfixable in code: **Doze** delays delivery on an idle phone
(`urgency: high` helps, does not guarantee), and **clearing site data kills the
subscription silently** — no error, no event. Re-subscribe on every app boot and
upsert by endpoint; cheap, and it self-heals cases nobody would otherwise notice.

### 11.3 Notification volume scales with stores per user

At 10–15 messages per store per day, over a 12-hour day:

| Stores | Messages/day | Cadence | Verdict |
|---|---|---|---|
| 1 | 10–15 | ~1 per hour | Fine |
| 3 | 30–45 | ~1 per 20 min | Noticeable |
| 10 | 100–150 | **~1 per 5–7 min** | Needs collapse |

**A seller is fine at any point on this table** — they belong to one store. The
admin assigned to every store is the case that needs §8.4's collapse and §8.5's
levels, and both are phase 2.

### 11.4 Connection budget

Today one seller holds one channel while on the home screens. Chat makes it one
per user for a whole shift. **Check the Supabase plan's concurrent-peak ceiling
against headcount before phase 3** — this is Supabase's bill, not Vercel's.

### 11.5 Boot path

The chats tab is currently `prefetch: false` with a comment explaining why. If it
gains real content, revisit — but prefetching is off entirely right now (task
057), and the unread badge must not become a Tier 2 read in a layout. **A layout
may only do Tier 0 and Tier 1.**

### 11.6 Flag drift

Task 060 found PostHog has 8 flags, `lib/flags.ts` declares 7, and they are not
the same 7 — `feature-fast-order` is declared in code and missing in PostHog, so
it evaluates false forever. **Fix that before adding `feature-chat`**, or the
same silent failure is possible here.

---

## 12. Open questions

1. **Who creates the channels, and when?** A seed migration covers #general and
   the stores that exist today. New stores need a channel too — from the
   store-create path, or a trigger.
2. **What happens to a store's channel when the store is deactivated?**
   `stores.status` exists. The channel could stay readable, disappear, or go
   read-only. Nothing in this design decides it.
3. **What is a store channel called?** The store's name is the obvious answer;
   it is not written down anywhere.

### Answered

| Question | Answer | Date |
|---|---|---|
| Are system messages repliable, threadable, reactable? | **Yes, all three.** A system message is a normal message; `author_type` renders a badge and changes nothing else | 2026-08-28 |
| Do system events send a push? | **Yes. Everything notifies.** One surface, and anything shown there reaches the user. §8.4 and §8.5 make it survivable at admin volume | 2026-08-28 |
| Does #general reach `post_policy = 'members'`? | **Yes, eventually.** `none` → `admin` → `members`, rolled out slowly | 2026-08-28 |
| Are admin messages a separate kind? | **No. An admin is just a user.** No announcement type, no special routing. Only system-versus-person is distinguished | 2026-08-28 |
| Where do payroll events go? | **Nowhere. Dropped** | 2026-08-28 |
| What is the retention horizon? | **Messages forever; `push_deliveries` swept at 30 days.** See §5.9 | 2026-08-28 |
| Is `push_deliveries` worth it in phase 1? | **No — deferred to phase 3.** `after()` solves latency; the table only buys retry. See §5.8 | 2026-08-28 |

---

## 13. What to review hardest

- **§4.3, the phase-1 decision.** Building this schema for a read-only feed is
  more work than rendering activity logs. The argument is entirely about phase 3.
- **Flat threads (§5.2).** A one-way door. Flat → nested later is a data
  migration and a UI rewrite; the reverse is worse.
- **Membership derived rather than stored (§5.6).** Elegant — and it means a
  seller unassigned from a store instantly loses the channel *and its history*.
  That may be right. It may also mean losing a conversation someone needed.

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-28 | First draft |
| 2026-08-28 | `announcement` → `general`; `post_policy`; reactions added |
| 2026-08-28 | Personal channels and payroll routing dropped; notification volume costed |
| 2026-08-28 | **Simplification pass.** Cut `custom` channels, `is_archived`, `edited_at`, the `reply_count` denormalisation and its trigger, one feature flag, and the database broadcast trigger. `push_deliveries` deferred to phase 3 after the latency argument for it turned out to be wrong. Five phases became three; six prerequisites became five |
