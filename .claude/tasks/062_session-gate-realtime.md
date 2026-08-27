# Task 062 — The session gate reports a connection nobody ever measured

**Status: written 2026-08-27, rewritten 2026-08-28 after the usage questions
were answered. Nothing built.** Successor to 060's *Watch, don't act* entry on
`/api/sessions/gate`.

**One item.** Fix four bugs in `SupabaseRealtimeAdapter` so the app can tell
whether realtime is connected. A second item — stopping the gate's mount
revalidation — was scoped, costed, and **dropped**; see *Considered and
dropped*.

| | |
|---|---|
| Size | One file, plus two lines in `useSession.ts` |
| CPU saved | ~19 of 209 gate calls in a 12h window. **~1% of the bill** |
| Why it is worth doing anyway | A correctness bug on the POS interlock, a landmine armed by the obvious fix, and a shared adapter that chat would inherit |
| Blocked on | Nothing |

---

## What 060 asked, and the answer

060's *Watch, don't act*:

> **`/api/sessions/gate` — 209 invocations, the highest count on the board.**
> 43ms each, which is fine; the count is the question. […] **Measure the
> realtime connection rate before changing anything** — if realtime is up, the
> poll is idle and focus is the whole story, and those two have opposite fixes.

**The connection rate `useSession` observes is 0%, permanently, and it is
readable from source rather than measurable from a dashboard.** The adapter
assigns its connection callbacks to an object that does not have them, so
`isConnected` is initialised `false` and never changes. `useSession.ts:20-21`
therefore always takes its *fallback* branch — `dedupingInterval: 10000`,
`refreshInterval: 30000`.

So both halves of 060's either/or are true at once: the poll has never once been
idle, and focus revalidation fires as well. That question is closed; this task
takes the poll half, and *Not doing* explains why focus is a separate task.

---

## The measurement

From 060's reading, **2026-08-26, 12h window** — the first reading whose length
is on record.

| | Value |
|---|---|
| Board total, top 16 | ~87s CPU |
| `/api/sessions/gate` | **209 invocations, 9s, 43ms/inv** |
| `/[tenantSlug]/mobile/home/pos` renders | 190 |

**Gate is ~10% of the bill and the highest invocation count on the board.**

Its `ms/inv` has been flat across all three readings — 57 → 41 → 43. 044's rule
("query count is the lever") is about per-invocation cost and has nothing left
to give here. **The gate's problem is invocation count**, and after this task it
still will be — see *Not doing*.

### Where the 209 come from

209 over 12h is ~17/hour. A 30s poll running continuously in the foreground
would be 120/hour, so the timer is mostly not running: SWR skips polling while
the document is hidden (`execute()` checks `isVisible()`), and POS use is
bursty.

The three seller mounts — `home/layout.tsx:22`, `home/manage/layout.tsx:15`,
`Manage.tsx:30` — share one SWR key and mount in the same tick, so the 10s
dedupe collapses them to one request.

| Source | Estimate | Basis |
|---|---|---|
| App opens (cold cache, one mount each) | ~190 | Tracks `home/pos` renders 1:1 |
| Poll + focus, combined | ~19 | The remainder |

**~19 is a ceiling on the poll, not its size** — focus revalidation is in there
too. This task removes some part of 19, which is why the headline number is
~1%.

---

## The four bugs

All in `packages/utils/realtime/SupabaseRealtimeAdapter.ts`. The first hides the
third, which is why this has been quiet.

### a. The connection callbacks are assigned to the wrong object

```ts
this.supabase.realtime.onopen  = () => { … }   // line 29
this.supabase.realtime.onclose = () => { … }   // line 34
```

`supabase.realtime` is a `RealtimeClient`, which has no `onopen` / `onclose` of
its own — it sets `this.conn.onopen` on the underlying **WebSocket**
(`@supabase/realtime-js@2.99.2`, `RealtimeClient.js:517`). Both assignments
write unused properties. Neither fires.

Consequences:

- `setConnected(true)` at line 30 never runs.
- Line 162 in `reconnect()` is unreachable too: `reconnect()` is only called
  from `attemptReconnect()`, which is only called from the dead `onclose`.
- `isConnected` is permanently `false`. The "only poll when realtime is down"
  comment at `useSession.ts:13` describes a state the app has never been in.
- `broadcast()` logs `[Realtime] Not connected` on every session mutation
  (line 128). That warning is always false.
- `reconnect()` also reads `this.supabase.realtime?.socket` (line 159), which
  does not exist either — the property is `.conn`. A no-op even if reached.

**The realtime path itself works.** `channel.subscribe()` is independent of this
monitoring, so pushes are delivered. Only the health signal is missing.

### b. The signal already exists and is being discarded

`RealtimeChannel.subscribe(callback)` takes a status callback and wires
`CHANNEL_ERROR` and `CLOSED` into it (`RealtimeChannel.js:143-144`), then returns
`this` (line 196). Line 103 of the adapter calls it with **no callback** and
awaits a non-thenable:

```ts
await subscription.channel.subscribe();
```

The await is a no-op, and the only real health signal the library offers is
thrown away. This is the input the fix needs, and it is already there.

### c. `Infinity` is a landmine, not a disable

`Infinity` is not SWR's off value. Both uses in `useSession.ts:20-21` break, and
both break *toward more work*:

- `refreshInterval` — `swr@2.4.1`, `dist/index/index.mjs:602`:
  `if (interval && timer !== -1) timer = setTimeout(execute, interval)`.
  `Infinity` is truthy, and WebIDL converts a non-finite delay to **0**. It
  reschedules immediately, forever.
- `dedupingInterval` — line 409: `setTimeout(cleanupState, config.dedupingInterval)`,
  also 0. The `FETCH[key]` entry clears on the next macrotask, so
  `shouldStartNewRequest` (line 341) is true every time. **Dedupe is inverted.**

Net when `isConnected` is true: `execute → revalidate → real fetch → next() →
setTimeout(0) → execute`. One gate request per round trip, several per second,
per mounted hook. Tab hidden is no better — the fetch is skipped but `next()`
still spins the main thread.

**This costs nothing today and is the most dangerous thing in the file**, because
the obvious one-line fix to (a) is exactly what arms it. Anyone who spots the
dead `onopen` and repairs it in isolation turns 17 gate calls an hour into
several a second.

### d. Channels never unsubscribe

```ts
if (handlers.length === 0 && subscription.handlers.size === 0) {   // line 115
```

`handlers` is the array; `subscription.handlers` is the `Map`. After the splice
the array is empty but the Map still holds the event key, so `.size` is ≥1.
**The condition is unsatisfiable.** The channel and its subscription entry live
for the lifetime of the tab.

Switch stores three times and you hold three open channels, all still calling
`mutate` into hooks that have moved on. **This is the one item here that is a
correctness risk rather than a cost**, and *Why this matters* explains what it
costs when it goes wrong.

Two smaller leaks in the same path: `unsubscribeCallbacks` (line 121) is pushed
to on every subscribe and never read or cleared; and the async IIFE in
`useSession.ts:29-45` assigns `unsubscribe` after an await, so a cleanup running
first orphans the subscription. The second is moot only because of (d).

---

## The fix

1. **Delete the adapter's whole reconnect apparatus** —
   `setupConnectionMonitoring`, `attemptReconnect`, `reconnect`'s `setConnected`,
   `maxReconnectAttempts`, `reconnectDelay`, `reconnectTimer`.

   realtime-js already reconnects with stepped backoff: `reconnectAfterMs` walks
   `RECONNECT_INTERVALS`, then falls back to 10s
   (`RealtimeClient.js:838-841`), driven by its own `reconnectTimer`. The
   adapter's version is a second loop racing it, and it gives up permanently
   after 5 attempts while the built-in one never does — so a seller whose signal
   drops for two minutes currently loses realtime for the rest of the shift.

   **Do not write a new backoff.** If the curve needs changing, pass
   `reconnectAfterMs` in the Supabase client options.

2. **Derive `connected` from the subscribe status callback:**

   ```ts
   subscription.channel.subscribe((status: string) => {
       this.setConnected(status === "SUBSCRIBED");
   });
   ```

   Drop the `await` — `subscribe()` returns the channel, not a promise.

   **Call it once per channel, not once per event.** Line 103 sits inside
   `if (subscription.handlers.get(event)!.length === 1)`, which is true for the
   first handler of *each event*. `RealtimeChannel.subscribe` registers its
   status callbacks inside `if (this.state == closed)`
   (`RealtimeChannel.js:125-146`); a second call on an already-joined channel
   takes no error and no `else` branch — it just `return this` (line 196)
   without registering anything. A channel carrying two events would wire the
   callback for the first and silently drop it for the second. Move the
   `subscribe()` call up beside the channel creation and leave only the
   `.on("broadcast", …)` binding in the per-event branch.

3. **Fix the unsubscribe condition.** Delete the event key from the Map when its
   handler array empties, then test the Map:

   ```ts
   if (handlers.length === 0) {
       subscription.handlers.delete(event);
       if (subscription.handlers.size === 0) {
           await subscription.channel.unsubscribe();
           this.subscriptions.delete(channelName);
       }
   }
   ```

   Delete `unsubscribeCallbacks` while in the file — nothing reads it.

4. **Remove both `Infinity` sentinels** in `useSession.ts:20-21`:

   ```ts
   // dedupingInterval: deleted — the global default is already 5000
   refreshInterval: isConnected ? 0 : 30000,
   ```

   `dedupingInterval` should not be set here at all: the root `SWRConfig`
   (`app/layout.tsx:94`) already sets `dedupingInterval: 5000` for every hook in
   the app, and the override exists only to carry the `Infinity`. Deleting the
   line is the whole fix, and it removes the conditional that is how `Infinity`
   got into this file twice.

   `refreshInterval: 0` is SWR's actual off switch.

   **`revalidateOnFocus: true` stays.** It is deliberately on for this hook and
   off globally, and *Why this matters* is the reason.

5. **Fix the effect race** — capture a `cancelled` flag and unsubscribe
   immediately if cleanup ran during the await.

**Do not collapse the three mounts into a provider as part of this.** They
already dedupe to one request; it is a readability change and belongs in its own
commit if it is wanted at all.

---

## Why this matters more than ~1%

The gate is not a display value. It is the interlock deciding whether a seller
can take an order, and the failure mode is money that pays nobody.

**Nothing on the server enforces it.** `createOrder` (`orders.ts:134`) checks
that the store exists and that the user is assigned to it. **It never checks who
holds the session.** So if a client's gate is stale, the server accepts the
order.

**Payroll then drops it on the floor.** `createPayrollCommissions`
(`payroll.ts:51-76`) attributes orders by `user_id` *within that user's session
window* — `.eq("user_id", userId)`, `.gte("created_at", session.started_at)`,
`.lt("created_at", endedAt)`. An order taken by seller A after A's session was
transferred away carries `user_id = A` but a timestamp outside A's window:

- **A** gets no credit — the order is outside every session A held.
- **B** gets no credit — the order is not theirs.
- The cups are counted in the store's totals and in nobody's commission.

**How a device gets a stale gate.** Handover is `transfer_store_session`
(`sessions.ts:257`), run from the *incoming* seller's device. The outgoing
device learns it lost the session **only from the broadcast** on
`store:${storeId}`. A phone that was asleep, backgrounded, or on a dropped
WebSocket misses it.

Two things in this task bear directly on that:

- **Bug (d)** means a device that has switched stores is holding channels for
  stores it left, and its handler set for the current store is tangled with dead
  ones. Delivery of the handover broadcast is the thing being risked.
- **The adapter cannot report a disconnect**, so nothing in the app knows a
  broadcast may have been missed. With (a) fixed, that becomes a signal the app
  can act on.

What covers this today is `revalidateOnFocus: true` — background the app, come
back, the gate refetches. That is why it is on for this hook and off for the
rest of the app, and **why step 4 leaves it alone.**

---

## Considered and dropped — `revalidateIfStale: false`

Recorded so it is not re-proposed. It was the larger half of this task's first
draft, costed at ~124 fewer calls and ~6% of the bill.

The idea: ~190 of the 209 gate calls are mount revalidations, SWR refetching a
key it already has because it treats the cache as stale. 060's Item 1 fixed
exactly this on `/api/stores` with `revalidateIfStale: false`, and the gate looked
like the same shape.

**It does not survive the usage questions**, answered 2026-08-28:

| Question | Answer | Consequence |
|---|---|---|
| Do sellers move between tabs, or sit on one screen? | Mostly sit on `home/pos` | `useSession` lives in `home/layout.tsx` — it mounts once and **stays mounted**. It is not remounting as they tap around, so there is little mount revalidation to remove |
| Does a store switch reload the page? | Yes | A reload is a cold cache. `revalidateIfStale` has nothing to preserve |
| How often does a seller switch stores? | Almost never — owner only | That trigger is ~0, not part of any floor |

Put together: if sellers sit on one screen and the hook stays mounted, then the
~190 calls are **~190 separate app opens**, each starting with an empty
in-memory SWR cache. There is no cache provider anywhere in the app — root
`SWRConfig` (`app/layout.tsx:93`) sets only `dedupingInterval`,
`revalidateOnFocus` and `errorRetryCount`, and `BootFallback` seeds one key. So
each open is a cold start, and **`revalidateIfStale: false` cannot skip a fetch
that has no cached value to fall back on.**

The estimate was also built on a proxy that does not hold up: the ~85 floor came
from reading `/api/flags`' 85 invocations as "one per app load plus one per
store switch". With store switches at ~0, that number is measuring something
else.

**If it is ever revisited**, the trigger is 060's unread `[render-metrics]`
showing `home/pos` as mostly `kind=rsc`. That would mean warm caches surviving
across navigations and the analysis above being wrong about how the app is used.
Anything that turns off a gate refetch also needs a forced revalidate on every
realtime reconnect, for the reasons in *Why this matters*.

---

## Confidence

**Read from source, 2026-08-27 / 28:** `SupabaseRealtimeAdapter.ts` in full,
`RealtimeContext.tsx`, `useSession.ts`, `app/layout.tsx`, `BootFallback.tsx`,
`app/api/sessions/gate/route.ts`, `getStoreGateState` and `transferSession` in
`packages/services/sessions.ts`, `createOrder` in `packages/services/orders.ts`,
`createPayrollCommissions` in `packages/services/payroll.ts`, `proxy.ts:315`.
In `node_modules`: `swr@2.4.1` `dist/index/index.mjs` lines 341, 383-412,
594-625; `@supabase/realtime-js@2.99.2` `RealtimeClient.js` lines 277-288, 517,
838-841 and `RealtimeChannel.js` lines 122-150, 196, 292-320.

**Not measured, weakest first:**

- **"~190 of the 209 are app opens."** Inferred from two counts in the same
  window plus the usage answers, not instrumented. The ~19 remainder is a
  ceiling on what this task removes, not a measurement of it.
- **The payroll gap has not been reproduced.** The attribution query is read
  correctly and the conclusion follows from it, but no order has been taken
  against a stale gate to confirm the cups actually vanish. Verification step 5
  is that test.
- **Nothing here has been run.** Every claim is static reading. The
  `setTimeout(…, Infinity) === setTimeout(…, 0)` conversion is the WebIDL rule
  for a non-finite `long`, not an experiment in this browser.

---

## Verification

1. **Bugs (a)/(b).** Log the subscribe status callback and confirm `SUBSCRIBED`
   arrives on a normal boot. Kill the network: `CHANNEL_ERROR` / `CLOSED` must
   flip `isConnected` false. Restore it: back to true, **via realtime-js's own
   reconnect, with no adapter timer involved.**
2. **Bug (c).** With realtime connected, watch the network panel for 60s on the
   POS screen. **Zero** `/api/sessions/gate` requests. If they stream, the
   `Infinity` path is still live and the fix is wrong.
3. **Bug (d).** Switch stores three times, then inspect
   `supabase.realtime.getChannels()`. One channel, not three.
4. **The handover path, on two devices.** A holds the session; B claims it. A's
   screen must flip to closed without a manual refresh — that is the broadcast.
   Then repeat with A's network dropped across the handover and restored after:
   A must correct itself, and the route it takes (reconnect or focus) should be
   identified rather than assumed.
5. **The payroll gap, deliberately.** Force a stale gate on A — drop the network,
   have B claim, keep A offline — then have A take an order and close the day.
   Confirm whether those cups land in anyone's `payroll_commissions` row. If they
   vanish, that is the bug this task is really about, and it deserves its own
   task on the server side; if they do not, correct *Why this matters* above.
6. **Scoreboard.** Re-read after a full window and **record the window length**.
   Expect `/api/sessions/gate` to move slightly and nothing else to. A move of
   more than ~20% on any other row means the dashboard is noisier than 044 or
   060 assumed.

---

## What would make me stop and re-plan

- **Gate calls not dropping at all after the fix.** Then the ~19 is entirely
  focus, the poll was never firing, and this task's CPU claim is zero. The bug
  fixes still stand on their own.
- **`SUBSCRIBED` never arriving.** Then realtime is not actually delivering
  either, the broadcast path has been dead as well, and the handover flow has
  been relying on focus revalidation alone — a much bigger finding than this
  task.
- **Verification step 5 showing the cups vanish.** Server-side session
  enforcement in `createOrder` becomes the priority, and it outranks everything
  in this file.

---

## Not doing

- **`revalidateOnFocus`, on any of the three hooks that set it** — `useSession`,
  `useWeather`, `useCustomerFeedbacks`. It is the bigger lever on the gate's
  count, and on this task's own evidence it is also the safety net covering the
  stale-gate failure. **Removing it without a replacement would trade a payroll
  bug for a CPU saving.** Its own task, and that task has to start from *Why this
  matters*, not from the dashboard.
- **`revalidateIfStale: false`.** See *Considered and dropped*.
- **Server-side session enforcement in `createOrder`.** Real, and probably the
  right long-term fix for the whole class — but it is a behaviour change on the
  money path and needs its own task. Gate it on verification step 5.
- **Auth on `gate/route.ts`.** It never calls `getRequestUser()`, and
  `proxy.ts:315` matches only `/:tenantSlug/mobile/:path*`, `/:tenantSlug/mobile`
  and `/login`, so `/api/*` gets no proxy check either — 20 of 47 seller API
  routes are in the same position. Being accurate about what that is worth:
  `getRequestUser()` parses the `x-user-info` cookie, so adding it closes the gap
  against CLAUDE.md's canonical route shape, not a trust gap. Worth a task,
  unrelated to CPU, not this one.
- **Collapsing the three `useSession` mounts into a provider.** They dedupe to
  one request already. Readability, not cost.
- **A new backoff, anywhere.** See step 1.
- **Chat.** This task exists partly because chat would inherit the adapter — a
  chat feature puts a subscription on every user for a whole shift, with unread
  state riding on it, and an adapter that cannot report its own connection state
  and never releases a channel is survivable for one hook but not for that. No
  chat design is decided here.
