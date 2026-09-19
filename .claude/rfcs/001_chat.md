# RFC 001 — Chat

| Field | Value |
|---|---|
| **Status** | Draft. Not accepted. Nothing built |
| **Date** | 2026-08-28, simplified after review. 2026-09-17, four channel kinds |
| **Follows** | Task 062 — realtime adapter fix |
| **Affects** | `apps/seller`, `packages/features`, `packages/services`, `packages/utils/realtime`, new migrations |
| **Spawns** | Tasks, once accepted. This file is not one |

---

## 1. Summary

Four kinds of channel over one message table. Flat threads, six reactions,
typing indicators, and system events written into channels as ordinary messages.
Everything notifies.

Each kind is one relation:

| Kind | Relation |
|---|---|
| `personal` | user ↔ system |
| `general` | user ↔ tenant |
| `store` | user ↔ their store |
| `private` | user ↔ a group an admin assembled |

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
| Direct messages | A two-person conversation is a `private` channel with two members. No separate mechanism |
| User-created groups | Lifecycle, not permissions — nobody deletes a dead group and there is no moderation tooling. **Admin**-created groups are in scope; see §4.1 |
| Mentions, formatting | Each changes the schema when it arrives anyway |
| Thread-level unread | Channel-level is enough |
| Presence — "who is online" | A different Supabase feature (`channel.track()`) that `RealtimeManager` does not expose, and whose state must be re-tracked on every reconnect. A separate decision from typing; see §7.2 |

### Two reversals, 2026-09-17

Both were cut for reasons that no longer hold. Recorded here rather than quietly
edited away.

**Admin-created channels are in.** Cut on 2026-08-28 as "scope that nobody asked
for." What asked for it: an owner-to-stakeholder conversation about a payout fits
neither `general` — every seller reads it — nor `store`, which is the wrong set
of people and the wrong topic.

**Payroll events are in**, in the `personal` channel only. The original reason
for dropping them was that *"a payout is one person's pay and every channel here
has more than one reader."* A `personal` channel has exactly one reader, so that
objection evaporates rather than being overruled.

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
| **1** | Read-only. System events only, in `store` and `personal` channels | `feature-chat`; every channel `post_policy = 'none'` |
| **2** | Reactions. Staff can react but not type | `feature-chat-reactions` |
| **3** | Posting, threads, typing, edit/delete, `private` channels, push retry | `post_policy` → `admin`, later `members` |

`store` and `personal` channels carry system events from phase 1, so the feature
is useful before anyone can type. A `private` channel exists only because an
admin created it for a conversation, so it has no phase-1 or phase-2 meaning and
arrives whole in phase 3 — its schema still lands in the first migration.

Two flags, not three. Opening posting up is a data change, so it needs no flag
of its own — which also keeps the flag list short, and 060 already found the
declared flags drifting out of sync with PostHog.

**Reactions before typing** is deliberate. Reacting is a far lower-commitment
first interaction: it gets staff used to opening the tab without asking them to
compose anything, and it shows whether anyone is reading.

### 4.1 The four channels

`kind` encodes exactly one thing: **how membership is derived.** Who may post is
`post_policy`, which is orthogonal to it and moves over time.

| Kind | Relation | Members | Post policy |
|---|---|---|---|
| `personal` | user ↔ system | That one user | `none`, permanently |
| `general` | user ↔ tenant | Everyone in the tenant | `none` → `admin` → `members`? (§12) |
| `store` | user ↔ their store | `user_store_assignments` for that store | `none` → `members` |
| `private` | user ↔ a group an admin assembled | `chat_channel_members`, explicit | `admin` → `members` |

**`personal` is a notification inbox, read-only for its life.** Payout paid,
claim approved, claim rejected — anything the product needs to tell one person
and nobody else. It is also the reason this codebase never grows a second
notification system: `chat_messages` and `chat_reads` already give such an event
a durable row, an ordering and an unread count, which is exactly what the removed
`notification_events` / `notification_reads` tables would have duplicated.

The cheaper alternative — send a push, deep-link to `/mobile/more/earnings`,
store nothing — is rejected on §11.2's own evidence. On this hardware a push is a
hint, not a delivery: Doze delays it, MIUI and ColorOS kill it, a denied
permission is permanent, and clearing site data drops the subscription silently.
A payout notification that exists only as a push is one a good share of these
users will never see. §7.1's rule applies unchanged — **the row is the truth, the
push is the nudge.**

**`private` is the only kind with stored membership.** That is not a violation of
§5.6; the note there explains why.

There is one tenant today. Channels are still keyed on `tenant_id` because
everything else in this codebase is.

#### Why `kind` is the whole abstraction

Four kinds is the point where someone proposes a room-type layer. Do not build
one. `kind` is a text column with a check constraint, and all three replacements
are worse here:

| Instead of `kind` | Why not |
|---|---|
| A table per kind | Duplicates every column and destroys the single `chat_messages` table, which is the whole design |
| Generic `scope_id` + "`kind` says what it points at" | Trades foreign-key integrity for one saved nullable column |
| Supertype / subtype tables | Correct in a textbook; makes rendering a list of eleven channels a three-way join |

What it actually costs is two nullable scope columns — `store_id` and `user_id`,
one kind each — under one check constraint. That is an exclusive arc, and at four
kinds it is the right trade. Ask again at eight. This will not reach eight.

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

### 4.4 Channel lifecycle

Three small decisions, all following from rules already in this file.

**Creation is explicit, not a trigger.** A seed migration creates #general, one
channel per store, and one `personal` channel per user that exists today. New
stores and new users get theirs from the create path, beside the code that
creates the row — the same reasoning as §9.1: a trigger makes channel creation
invisible, and the one place that knows a store or a user was created is the code
that created it.

**A `private` channel is created by an admin, from the app.** It is the only kind
with a creation UI, the only one a human names, and the only one whose create
route is gated on role. Every other channel exists because something else exists.

**A store channel is named after its store.** `chat_channels.name` is a copy,
not a join, so renaming a store leaves the channel stale until something updates
it. That is deliberate: the channel list must not join `stores` to render, and a
rename is rare enough to handle in the same place the rename happens.

**Deactivating a store makes its channel read-only, not gone.**
`stores.status` changing sets `post_policy = 'none'`. Nothing is deleted, the
history stays readable, and nobody can post into a store that is not operating.

No new mechanism for any of it: `post_policy` already exists, and this is the
fourth thing it does.

> `user_store_assignments` carries no status of its own, so deactivating a store
> leaves its assignments in place and members keep read access through the
> derived membership view (§5.6). If assignments are ever cleared on
> deactivation instead, members lose the channel and its history immediately —
> which is the risk §13 flags about derived membership, arriving through a side
> door.

---

## 5. Data model

Sketch, not a migration. Column names checked against `packages/db/types.ts`.

### 5.1 `chat_channels`

```sql
create table chat_channels (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid not null references tenants(id) on delete cascade,
    kind        text not null
                check (kind in ('personal','general','store','private')),

    -- exclusive arc: each scope column belongs to exactly one kind
    store_id    uuid references stores(id) on delete cascade,  -- store only
    user_id     uuid references users(id)  on delete cascade,  -- personal only

    -- null means "render from `kind` through useT()". Real text only where a
    -- human or another table supplied it.
    name        text,

    post_policy text not null default 'none'
                check (post_policy in ('none','admin','members')),
    created_by  uuid references users(id),   -- private only; null otherwise
    created_at  timestamptz not null default now(),

    constraint chat_channels_scope_matches_kind check (
        (kind = 'store'    and store_id is not null and user_id  is null)
     or (kind = 'personal' and user_id  is not null and store_id is null)
     or (kind in ('general','private') and store_id is null and user_id is null)
    ),

    -- store and private channels are named; the other two are not
    constraint chat_channels_name_matches_kind check (
        (kind in ('store','private')) = (name is not null)
    ),

    -- personal is read-only for its life. Not a phase — a property
    constraint chat_channels_personal_is_read_only check (
        kind <> 'personal' or post_policy = 'none'
    )
);

create unique index chat_channels_one_general_per_tenant
    on chat_channels (tenant_id) where kind = 'general';

create unique index chat_channels_one_per_store
    on chat_channels (store_id) where kind = 'store';

create unique index chat_channels_one_personal_per_user
    on chat_channels (tenant_id, user_id) where kind = 'personal';
```

**Constraints encode permanent truths; phases do not.** `general`, `store` and
`private` all move through `post_policy` as the rollout proceeds, so nothing
constrains them — that is §4's "read-only is a rollout stage, not a channel
property." `personal` is the one kind where read-only genuinely *is* the
property, so it gets a constraint.

**`name` is nullable on purpose.** It is a real stored value for `store` — copied,
not joined (§4.4) — and for `private`, where an admin typed it. For `general` and
`personal` it is a constant, and storing `'General'` or `'Notifications'` would
hard-code English into a product that ships en and id. Those rows carry `null`
and the client renders the label from `kind` through `useT()`.

**Locking `notify_level` needs no column.** A `personal` channel cannot be muted
(§8.5), but that follows from `kind`. Do not store what the discriminator already
says.

### 5.2 `chat_messages` — the whole model is here

**Identical across all four kinds.** A `personal` channel holds only `system`
rows, a `private` channel holds mostly `user` rows, and neither needs a column
the other does not. Same table, same constraint, same two indexes. That the kinds
cost nothing here is the whole return on §4.3.

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

    -- both null until someone acts on the message. Neither is ever unset
    edited_at   timestamptz,
    deleted_at  timestamptz,
    created_at  timestamptz not null default now(),

    constraint chat_messages_author_matches_type check (
        (author_type = 'user'   and author_id is not null and event_type is null)
     or (author_type = 'system' and author_id is null     and event_type is not null)
    ),

    -- a system message has no author, so nobody can have edited it
    constraint chat_messages_system_is_never_edited check (
        author_type = 'user' or edited_at is null
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
That pays off at fifty channels, and nobody here has fifty: a seller sees three —
#general, their store, their own `personal` — and an admin across ten stores sees
about fifteen once a few `private` channels exist. Count on read.

**`edited_at` — reversed on 2026-09-17.** This entry used to say there was no
edit UI planned and that the column would be guessing at a design nobody had
made. There is a design now (§6.5), so the column is real. It is null until
someone edits, and it is never unset.

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

### 5.6 Membership — derived for three kinds, stored for one

```sql
create table chat_channel_members (          -- `private` channels only
    tenant_id  uuid not null references tenants(id) on delete cascade,
    channel_id uuid not null references chat_channels(id) on delete cascade,
    user_id    uuid not null references users(id) on delete cascade,
    added_by   uuid not null references users(id),
    added_at   timestamptz not null default now(),
    primary key (channel_id, user_id)
);

create view chat_channel_members_all as
    -- personal: the channel row already names its one member
    select c.id as channel_id, c.tenant_id, c.user_id
      from chat_channels c
     where c.kind = 'personal'
    union all
    select c.id, c.tenant_id, a.user_id
      from chat_channels c
      join user_tenant_assignments a on a.tenant_id = c.tenant_id
     where c.kind = 'general'
    union all
    select c.id, c.tenant_id, a.user_id
      from chat_channels c
      join user_store_assignments a on a.store_id = c.store_id
     where c.kind = 'store'
    union all
    select m.channel_id, m.tenant_id, m.user_id
      from chat_channel_members m;
```

For three of the four kinds there is no join table, no invite flow, and nothing
to drift out of sync with `user_store_assignments`.

**The stored table does not contradict that.** The argument this section was
written to make is against a table that *duplicates* another table: rows for
`store` channels would be a cache of `user_store_assignments`, and caches drift.
`chat_channel_members` duplicates nothing — no other table knows who is in a
private channel, so the table **is** the truth. The rule is *do not cache
membership*, not *never store it*.

For the same reason, do not materialise the derived branches into the table for
uniformity's sake. That is precisely the drift this section exists to refuse.

Adding a member is therefore an invite flow, which §4.4's earlier draft did not
have: an admin-gated route, a UI, and a decision about what a new member can read
— open question 1 in §12.

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

### 5.10 What a message can contain

The question that comes up on every re-read, answered in one place.

| Capability | Phase | Notes |
|---|---|---|
| Plain text | 3 | 4000 characters, per `CreateMessageInput` |
| Emoji typed into the text | 3 | Ordinary Unicode. The six-emoji limit in §5.5 governs **reactions**, not what a keyboard may send |
| Reactions | 2 | Six, fixed |
| Flat thread replies | 3 | §5.2 |
| Edit | 3 | Author only, sets `edited_at`. See §6.5 |
| Delete | 3 | Always soft, sets `deleted_at`, renders a tombstone. See §6.5 |
| A deep link to a screen | 1 | Structured, never a stored URL. Below |
| Photo attachment | **later** | Wanted, and deliberately not phase 3. Below |
| Voice notes, mentions, formatting, search, pinning, read receipts, link previews | — | None planned |

#### Deep links are structured, never URLs

In a PWA every screen has a route, so a deep link is only a navigation. What gets
*stored* still matters. A system message points at its subject with

```jsonc
metadata: { "refTable": "payroll_payouts", "refId": "<uuid>" }
```

and the client builds the href. That is the shape `tenant_activity_logs` already
uses — `log()` takes `refId` and `refTable` — so it is a pattern this codebase
has rather than a new one.

Never store the path. Every route in both apps is prefixed
`/:tenantSlug/mobile/…`, routes get renamed, and the same event may need a
different destination in a different context. A stored URL is stale the first
time any of those happens.

A deep link is a navigation, not a grant: the destination screen still runs its
own auth. `/mobile/more/earnings` is where a payout lives (§3) and it stays
there — the `personal` channel message points at it rather than reproducing it.

**A push notification needs the same target, and that costs real code:** see
§8.4.

#### Photo attachments — wanted, deliberately later

The use case is a `store` channel. Something goes wrong, a seller photographs it,
and the conversation happens around the photo. That is real and it will be built.

It is not in phase 3, and **deferring it costs nothing** — which is the entire
reason. Every other deferral in this file had to be argued down to a cost; this
one has none. An `attachments jsonb` column is additive and nullable, so adding
it later is one `alter table`: no backfill, no data migration, nothing to
reconcile. Contrast flat threads (§5.2) or the channel kinds (§4.1), which are
structure and rows and must be right in the first migration. **An additive
nullable column is the one thing that is genuinely cheap to retrofit, which makes
it the one thing worth leaving out.**

When it arrives the parts already exist: `PhotoPicker.tsx`, `lib/compressPhoto.ts`,
`POST /api/upload`, and ibb.co configured as an image host. The open choice then
is a jsonb column against a `chat_message_attachments` table — and a table only
earns its place if a channel ever needs a gallery view.

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
| `PATCH` | `/api/chat/messages/[messageId]` | 3 | Edit a message. **Author only**; see §6.5 |
| `DELETE` | `/api/chat/messages/[messageId]` | 3 | Soft-delete a message. **Author only**; see §6.5 |
| `POST` | `/api/chat/channels` | 3 | Create a `private` channel. **Admin only** |
| `POST` | `/api/chat/channels/[channelId]/members` | 3 | Add members to a `private` channel. **Admin only** |
| `DELETE` | `/api/chat/channels/[channelId]/members` | 3 | Remove a member. **Admin only** |

**Typing has no endpoint and never will.** It is client-to-client over the socket
and never reaches a route or a row; see §7.2.

### 6.2 Schemas

```ts
// packages/features/chat/schema.ts

export const ChannelKind = z.enum(["personal", "general", "store", "private"]);
export const AuthorType  = z.enum(["user", "system"]);
export const NotifyLevel = z.enum(["all", "humans", "none"]);

export const ChannelResponse = z.object({
    id:            z.uuid(),
    kind:          ChannelKind,
    storeId:       z.uuid().nullable(),
    name:          z.string().nullable(),     // null: label comes from `kind`
    canPost:       z.boolean(),          // derived from post_policy + role
    canManageMembers: z.boolean(),       // private + admin, server-derived
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

export const EditMessageInput = z.object({
    body: z.string().min(1).max(4000),
});

// Phase 3 — private channels
export const CreateChannelInput = z.object({
    name:      z.string().min(1).max(80),
    memberIds: z.array(z.uuid()).min(1),
});

export const ChannelMembersInput = z.object({
    userIds: z.array(z.uuid()).min(1),
});

// Ephemeral. Never persisted, never parsed in a route — a shape for the two
// ends of a broadcast to agree on, and nothing else.
export const TypingEvent = z.object({
    userId: z.uuid(),
    name:   z.string(),
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
editMessage(supabase, { tenantId, userId, messageId, body })
softDeleteMessage(supabase, { tenantId, userId, messageId })
createPrivateChannel(supabase, { tenantId, createdBy, name, memberIds })
addChannelMembers(supabase, { tenantId, channelId, addedBy, userIds })
removeChannelMember(supabase, { tenantId, channelId, userId })
ensurePersonalChannel(supabase, { tenantId, userId })
upsertPushSubscription(supabase, { tenantId, userId, endpoint, p256dh, auth })
deletePushSubscription(supabase, { endpoint })
```

`ensurePersonalChannel` is called from the user-create path (§4.4) and is
idempotent against the unique index, so backfilling a user who predates the
feature is the same call.

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
| `useTyping(id)` | — | **No SWR key.** Component state fed by the socket; see §7.2 |

**No hook sets `refreshInterval`.** 062 is why that is worth writing down:
`Infinity` is not an off switch, and a conditional interval is how it got into
`useSession` twice.

### 6.5 Editing and deleting

Both belong to the author, and **delete is always soft.** The `deleted_at` column
and the two partial indexes in §5.2 were written for this from the first draft;
only the routes were missing.

| Action | Who | Effect |
|---|---|---|
| Edit | The author, nobody else | Rewrites `body`, sets `edited_at`. No history kept |
| Delete | The author, nobody else | Sets `deleted_at`. The row stays forever |

```
PATCH  /api/chat/messages/[messageId]   { body }   — author only
DELETE /api/chat/messages/[messageId]              — author only, soft
```

**A system message is neither editable nor deletable.** It has no author, so
there is nobody holding the right. The constraint in §5.2 enforces half of that
and the route enforces the rest.

**A deleted message renders as a tombstone, not as a gap.** Threads are flat and
a root can carry replies, so a root that simply vanished would orphan them. The
row surviving is what makes the tombstone possible — which is a second reason
delete is soft, beside the one you asked for.

**An edit re-broadcasts but never re-notifies.** `message:updated` goes out so
open clients refetch (§7.1); no push is sent. Nobody's phone should buzz because
a typo was fixed.

**No edit history** — one `edited_at`, the same as WhatsApp. Storing prior
versions is a different feature needing its own justification. See open question
4: this surface now carries conversations that behave somewhat like records.

**Author only, not admins.** An admin deleting someone else's message is
moderation, and §3 refuses user-created groups partly *because* no moderation
tooling exists. Granting it here would be the first piece of building that, so it
is open question 5 rather than a default.

---

## 7. Realtime contract

Both apps already hold a WebSocket. Supabase Realtime **is** one — Phoenix
channels over a single socket, joined in `SupabaseRealtimeAdapter.subscribe()`,
carrying the session gate today. Chat adds topics, not transport: no second
socket, no chat server, no new dependency.

Two classes of traffic ride it and **they take opposite rules.** Applying one
class's discipline to the other is the failure this section exists to prevent.

| | Durable (§7.1) | Ephemeral (§7.2) |
|---|---|---|
| Example | a message | someone is typing |
| Stored | a row in `chat_messages` | never. No table, no column |
| Server involvement | route inserts, then broadcasts | **none.** Client to client |
| A missed delivery is | a bug a refetch must heal | correct behaviour |
| Expiry | never | ~5s, on a client timer |
| Touches SWR | `mutate()` only, never the payload | never. Component state |

### 7.1 Durable — messages

Rows are the truth; realtime is only the nudge that says *go read*. A broadcast
is fire-and-forget — a sleeping phone misses it and nothing knows. **Never
deliver message content over broadcast alone.**

| Field | Value |
|---|---|
| Topic | `chat:<channelId>` |
| Events | `message:new`, `message:updated`, `message:deleted` |
| Payload | `{ messageId, channelId, threadRootId }` — ids only, no body, on all three |
| Client action | `mutate()` the affected SWR key. Never write the payload into cache |

The three events carry the same payload and prompt the same action: **go read.**
`message:updated` and `message:deleted` exist because an edit or a delete has to
reach other open clients (§6.5), not because either needs different handling.

**Broadcast from the route, not a database trigger.** Supabase recommends
`realtime.broadcast_changes()` from a trigger, and at scale that is right — but
`postUserMessage` and `postSystemMessage` are the only things that ever insert a
message, so the route already knows. Broadcasting in the same `after()` block
that sends the push is one mechanism instead of two, with no trigger to keep in
step with the schema.

Do not repeat `useSession`'s `mutate(update, false)`, which writes whatever
arrives into the cache unvalidated.

### 7.2 Ephemeral — typing

| Field | Value |
|---|---|
| Topic | `chat:<channelId>` — the same joined channel, not a second subscription |
| Event | `typing` |
| Payload | `{ userId, name }` |
| Sender | **one broadcast per 3s** while keys move. Never per keystroke |
| Receiver | a `Map<userId, timestamp>`; drop entries older than 5s on a 1s tick |
| Server | never sees it |

**The throttle is the whole engineering.** One broadcast per keystroke is the
obvious thing to write and is roughly twelve times the traffic. There is no
`stopped typing` event: expiry does that job, and a phone that sleeps mid-word
clears itself. Firing one clear on submit or blur is an optimisation, not a
requirement.

**Render the indicator outside the message list.** It updates once a second, and
a list that re-renders with it is a list that re-renders every second on a phone.

Typing earns its place because of what this surface is now for. An owner and a
stakeholder going back and forth about a payout is a *synchronous* conversation,
and synchronous conversation is the only condition under which a typing indicator
pays for itself. On `store` channels alone it would be dead weight — see §11.8
for what it costs.

**Presence is not this.** "Who is online" needs `channel.track()` and
`presenceState()`, which `RealtimeManager` does not expose and whose state must
be re-tracked after every reconnect. Typing needs no interface change; presence
does. Out of scope (§3) as a separate decision.

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

| Install state | Icon and name | Attribution |
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

**`data` is the navigation target**, and acting on it is a `notificationclick`
handler in the service worker: call `clients.matchAll()` first, focus an app
window that is already open and navigate it, and only call `clients.openWindow()`
when there is none. Skipping the match is how a tap ends up with the PWA open
twice. The href itself is built from `{ refTable, refId }`, never from a stored
URL — §5.10.

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

**A `personal` channel cannot be muted.** Its level is fixed at `all`, derived
from `kind` rather than stored (§5.1): a payout notification is not something to
opt out of. Every other kind is the user's choice.

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
| `payroll_payout_updated` — paid | The recipient's `personal` channel |
| `claim_status_updated` — approved or rejected | The claimant's `personal` channel |

Payroll events reach exactly one reader, which is the only reason they are
admissible here at all (§3). They are written by the same rule as everything
else: a `postSystemMessage()` call beside the existing `log()` in the service
that changes the payout or the claim — never a trigger on `tenant_activity_logs`
(§9.1).

**Milestones — "hit 100 cups" and the like — are deferred, not designed.** Nothing
in the codebase computes one today. When they arrive the call site is
`createPayrollCommissions()` on close-day, which already holds `total_cups`; it
must not be the order-creation path, which is hot and would fire mid-shift. The
threshold needs a definition nobody has written: per day, per pay period, or
lifetime — and only lifetime needs a running total that does not exist.

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

### 11.7 A private channel's confidentiality rests on one `where` clause

§6 already requires every route to filter on the resolved `tenantId` plus the
caller's membership, because `getServiceClient()` bypasses RLS. With `private`
channels that filter stops being tenant isolation and becomes **the
confidentiality of a payout conversation between named people.** Same line of
code, far worse failure.

Treat membership filtering in `/api/chat/*` as the highest-risk code in the
feature: never take a `channelId` on trust, never take a member list from a body
without re-checking that the caller is an admin of that tenant, and cover it with
tests rather than with review.

### 11.8 Ephemeral traffic scales with conversation, not with events

Every other number in this file scales with stores or with days. Typing scales
with how much people talk, and it is the first thing here that does.

A worked evening — four people, thirty messages, a 3s throttle, ~15s to compose:

| Traffic | Sends | Deliveries |
|---|---|---|
| Messages | 30 | 90 |
| Typing | 150 | 450 |

So typing runs about **five times the realtime traffic of the messages it
accompanies.** That ratio sounds alarming and is not: ~13.5k deliveries a month
if that evening repeats daily, against an allowance in the millions. It is also
self-limiting in a way a heartbeat is not — an idle channel sends nothing at all.

Check it against the same Supabase quota as §11.4, and check it again if the
throttle is ever loosened.

---

## 12. Open questions

**Five.** Everything from the original review stays answered; that record is
below.

| # | Question | Why it has to be decided before the first migration |
|---|---|---|
| 1 | **What does a new member of a `private` channel see?** All history, or only from `added_at`? | Partial history means a `visible_from` column on `chat_channel_members` and a filter on every read. Retrofitting it once rows exist is a migration plus a UI change. Someone added to a payout channel in March either can or cannot read January |
| 2 | **Does `#general` ever reach `post_policy = 'members'`?** | Answered "yes, eventually" on 2026-08-28 and now reopened. A tenant-wide room across every seller is mostly noise, and §3 refuses user-created groups partly because there is **no moderation tooling** — which applies to an open `#general` just as well. Nothing forces the call now: `none` → `admin` ships either way and `members` is an `update` |
| 3 | **Does a `personal` channel ever become repliable?** | Read-only is decided (§4.1) and this is where it will drift — *"why is my payout short?"* is a good feature. But replies need readers, so the channel becomes "one staff member plus every admin," which changes both the constraint and the membership branch. Deciding this late is the expensive direction |
| 4 | **Is editing time-limited, and is an edit history kept?** §6.5 currently allows an edit at any time and keeps none | WhatsApp allows fifteen minutes. This surface now carries payout conversations between an owner and stakeholders, which behave closer to records than to chat: unbounded editing means what someone agreed to can be rewritten afterwards with only an `edited_at` to show for it. A window, a history, or neither — but by decision, not by default |
| 5 | **May an admin delete another person's message?** §6.5 says author only | That is moderation, and §3 refuses user-created groups partly *because* there is no moderation tooling. Say no and a bad message in #general is permanent; say yes and the tooling now exists and has to be designed. Only the schema is neutral — `deleted_at` does not care who set it |

### Answered

| Question | Answer | Date |
|---|---|---|
| Are system messages repliable, threadable, reactable? | **Yes, all three.** A system message is a normal message; `author_type` renders a badge and changes nothing else | 2026-08-28 |
| Do system events send a push? | **Yes. Everything notifies.** One surface, and anything shown there reaches the user. §8.4 and §8.5 make it survivable at admin volume | 2026-08-28 |
| Does #general reach `post_policy = 'members'`? | **Yes, eventually.** `none` → `admin` → `members`, rolled out slowly | 2026-08-28 |
| Are admin messages a separate kind? | **No. An admin is just a user.** No announcement type, no special routing. Only system-versus-person is distinguished | 2026-08-28 |
| Where do payroll events go? | ~~Nowhere. Dropped~~ — **superseded 2026-09-17**, see below | 2026-08-28 |
| What is the retention horizon? | **Messages forever; `push_deliveries` swept at 30 days.** See §5.9 | 2026-08-28 |
| Is `push_deliveries` worth it in phase 1? | **No — deferred to phase 3.** `after()` solves latency; the table only buys retry. See §5.8 | 2026-08-28 |
| Who creates the channels, and when? | **A seed migration, then the store-create path.** Explicit, not a trigger. See §4.4 | 2026-08-28 |
| What happens when a store is deactivated? | **The channel goes read-only.** `post_policy = 'none'`; history stays. See §4.4 | 2026-08-28 |
| What is a store channel called? | **The store's name**, copied onto the channel rather than joined | 2026-08-28 |
| Do we need a second WebSocket, or a chat server? | **No.** Supabase Realtime is a WebSocket, already open, already carrying the session gate. Chat adds topics, not transport | 2026-09-17 |
| Are typing indicators in? | **Yes, phase 3.** The socket exists; the whole cost is the throttle. See §7.2 and §11.8 | 2026-09-17 |
| Are admin-created channels in scope? | **Yes — `private`.** Admin creates, admin invites. Reverses a non-goal; see §3 | 2026-09-17 |
| Where do payroll events go? | **The recipient's `personal` channel.** Reverses the 2026-08-28 answer, whose stated reason — every channel has more than one reader — stopped being true | 2026-09-17 |
| Is `personal` read-only? | **Yes, for its life** — a check constraint, not a phase. Whether that ever changes is open question 3 | 2026-09-17 |
| Do we need a room-type abstraction over `kind`? | **No.** `kind` is the abstraction: one text column, one check constraint, two nullable scope columns. See §4.1 | 2026-09-17 |
| What can a message actually contain? | **Plain text, 4000 characters.** Emoji typed into it are ordinary Unicode — the six-emoji limit is about reactions only. Full list in §5.10 | 2026-09-17 |
| Can a message carry a photo? | **Yes, but later** — not phase 3. An additive nullable column is the one genuinely cheap retrofit, which is exactly why it is the thing deferred. See §5.10 | 2026-09-17 |
| How does a message link to a screen? | **`{ refTable, refId }` in `metadata`**, never a stored URL; the client builds the href. Same shape `tenant_activity_logs` already uses. From a push it needs a `notificationclick` handler — §8.4 | 2026-09-17 |
| Can a message be edited or deleted? | **Both, by the author.** `edited_at` reverses the 2026-08-28 decision; delete is always soft and renders a tombstone. See §6.5 | 2026-09-17 |

---

## 13. What to review hardest

- **§4.3, the phase-1 decision.** Building this schema for a read-only feed is
  more work than rendering activity logs. The argument is entirely about phase 3
  — and it got stronger rather than weaker: `personal` channels make this table
  the notification system too, so the alternative is now *three* sources to
  reconcile instead of two.
- **Flat threads (§5.2).** A one-way door. Flat → nested later is a data
  migration and a UI rewrite; the reverse is worse.
- **Membership derived rather than stored (§5.6)** — for `store` channels
  specifically. A seller unassigned from a store instantly loses the channel *and
  its history*. That may be right. It may also mean losing a conversation someone
  needed. `private` channels do not have the problem: removal there is deliberate.
- **No edit history (§6.5).** A one-way door of the quiet kind — versions you
  never stored cannot be recovered. If this surface genuinely carries payout
  agreements, the day someone disputes what was said is the day the absence gets
  discovered. Open question 4.
- **The scope re-growth itself.** The 2026-08-28 simplification pass cut custom
  channels and personal channels. Both are back seven weeks later. The
  justifications are in §3 and they are real — a use case appeared that a two-kind
  model could not hold — but a design that re-grows what it cut deserves one
  deliberate look before the first migration, because after that the kinds are
  rows.

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-28 | First draft |
| 2026-08-28 | `announcement` → `general`; `post_policy`; reactions added |
| 2026-08-28 | Personal channels and payroll routing dropped; notification volume costed |
| 2026-08-28 | Channel lifecycle decided (§4.4). **No open questions remain** |
| 2026-08-28 | **Simplification pass.** Cut `custom` channels, `is_archived`, `edited_at`, the `reply_count` denormalisation and its trigger, one feature flag, and the database broadcast trigger. `push_deliveries` deferred to phase 3 after the latency argument for it turned out to be wrong. Five phases became three; six prerequisites became five |
| 2026-09-17 | **Message capabilities.** New §5.10 answers what a message may contain, and new §6.5 adds edit plus soft delete — reversing the "No `edited_at`" decision and giving `deleted_at` the routes it had been missing since the first draft. Deep links specified as `{ refTable, refId }` in `metadata` rather than stored URLs, matching `tenant_activity_logs`, with the `notificationclick` handler a push needs (§8.4). Photo attachments accepted but deferred past phase 3, on the grounds that an additive nullable column is the one thing cheap to retrofit. `message:updated` and `message:deleted` added to §7.1. Two further open questions: an edit window, and whether an admin may delete someone else's message |
| 2026-09-17 | **Four kinds.** `personal` (user ↔ system) and `private` (a group an admin assembled) join `general` and `store`; two non-goals reversed with their reasons recorded (§3). `chat_channel_members` added for `private` only, and §5.6 rewritten to say why that is not the cache it refuses. Typing indicators specified as a second, *ephemeral* class of realtime traffic with the opposite rules (§7.2), plus its cost (§11.8) and the confidentiality risk private channels create (§11.7). `name` made nullable so `general` and `personal` labels can be translated. Three open questions, where there had been none |
