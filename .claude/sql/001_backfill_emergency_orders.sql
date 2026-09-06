-- ============================================================================
-- 001 — Emergency backfill of one cash order into an already-closed day.
--
-- Context: the store closed early due to an emergency, so 18 cups sold that
-- day never made it into the POS. This adds them as a single cash order and
-- then recomputes every total the close path would otherwise have locked in.
--
-- Mirrors createOrder (packages/services/orders.ts) and the close branch of
-- updateSummary (packages/services/summaries.ts).
--
-- APPLIED to production on 2026-08-30. Summary f635b0a9 went from 46 orders /
-- 110 cups / 566,500 sales to 47 / 128 / 661,000; expected_cash and actual_cash
-- both moved to 966,000, leaving variance at 0. Commission 347bc437 went from
-- 109 cups / 65,400 to 127 cups / 76,200, and payout 698a717c to 513,000
-- commissions / 633,400 total_pay. Kept as a record; the last line is ROLLBACK
-- so a stray re-run changes nothing.
--
-- How to run: two selections, four passes. The banners below mark exactly
-- where each selection starts and ends.
--
--   Pass 1  PASS 1 block          read-only pre-flight
--   Pass 2  BEGIN .. end of file  dry run, ends in ROLLBACK, nothing kept
--   Pass 3  BEGIN .. end of file  again, with COMMIT instead of ROLLBACK
--   Pass 4  PASS 1 block          again, to read the committed numbers
--
-- Each pass is one shot — select the block, run it, done.
--
-- Note for the Supabase SQL editor: it shows only the last statement's result
-- and wraps the run in its own transaction, so the explicit BEGIN may log
-- "there is already a transaction in progress". That is harmless. The real
-- check is section 8, which aborts the whole run if any delta is wrong.
-- ============================================================================

-- ############################################################################
-- ##  PASS 1 STARTS HERE  —  select from this line down to "PASS 1 ENDS"    ##
-- ##  Read-only. Run it, read the answers, then stop.                       ##
-- ############################################################################

-- ── 0. Pre-flight, read-only. ───────────────────────────────────────────────
-- Confirms the summary is the right one, shows what the order timestamp lands
-- next to, and shows whether a commission row exists to update in section 5.
SELECT s.id, s.date, s.store_id, st.name AS store_name, s.closed_at,
       s.opened_by, s.closed_by,
       s.total_orders, s.total_cups, s.total_sales, s.total_expenses,
       s.opening_balance, s.expected_cash, s.actual_cash, s.variance
FROM store_daily_summaries s
JOIN stores st ON st.id = s.store_id
WHERE s.id = 'f635b0a9-c142-445b-906e-c6afdb98c400';

-- The order timestamp should sit among these, not before the first or after
-- the last by hours. If it does, the +00 / +07 call in section 1 is wrong.
SELECT id, user_id, payment_method, total_amount, created_at
FROM store_orders
WHERE daily_summary_id = 'f635b0a9-c142-445b-906e-c6afdb98c400'
ORDER BY created_at;

SELECT id, user_id, started_at, ended_at, status
FROM store_sessions
WHERE daily_summary_id = 'f635b0a9-c142-445b-906e-c6afdb98c400'
ORDER BY started_at;

SELECT id, user_id, total_cups, total_orders, rate_per_cup, total_commission, status, payout_id
FROM payroll_commissions
WHERE daily_summary_id = 'f635b0a9-c142-445b-906e-c6afdb98c400';

-- ############################################################################
-- ##  PASS 1 ENDS HERE                                                      ##
-- ############################################################################


-- ############################################################################
-- ##  PASS 2 AND PASS 3 START HERE  —  select from BEGIN to the last line   ##
-- ##  of the file and run it in one shot.                                   ##
-- ##                                                                        ##
-- ##  Pass 2: leave the file as is. It ends in ROLLBACK, so nothing sticks.  ##
-- ##  Pass 3: swap the last two lines (comment ROLLBACK, uncomment COMMIT),  ##
-- ##          run the same selection again. That one sticks.                ##
-- ##  Pass 4: run PASS 1 again to see the committed numbers.                 ##
-- ############################################################################

BEGIN;

-- ── 1. Inputs ───────────────────────────────────────────────────────────────
CREATE TEMP TABLE _cfg ON COMMIT DROP AS
SELECT
    'f635b0a9-c142-445b-906e-c6afdb98c400'::uuid  AS summary_id,
    'b560eeba-d37d-496f-9b1b-d064a47b65f7'::uuid  AS user_id,   -- seller credited
    -- UTC, copied from the last real order of that day and nudged 30s later so
    -- this backfill sorts after it instead of tying with it.
    '2026-08-27 08:02:30+00'::timestamptz         AS order_at,
    gen_random_uuid()                         AS order_id;

CREATE TEMP TABLE _summary ON COMMIT DROP AS
SELECT s.* FROM store_daily_summaries s, _cfg c WHERE s.id = c.summary_id;

DO $$
BEGIN
    IF (SELECT count(*) FROM _summary) <> 1 THEN
        RAISE EXCEPTION 'Daily summary not found';
    END IF;
    IF (SELECT tenant_id FROM _summary) <> '09d3d9b1-3f22-4ced-aef1-dd7a4ae0c209'::uuid THEN
        RAISE EXCEPTION 'Summary belongs to a different tenant than the products below';
    END IF;
END $$;

-- ── 2. The 18 cups ──────────────────────────────────────────────────────────
-- Unit price is read from tenant_products at run time, the same rule
-- createOrder enforces. The assertion below catches a price that has drifted
-- since the sale.
CREATE TEMP TABLE _items (product_id uuid PRIMARY KEY, quantity int NOT NULL) ON COMMIT DROP;

INSERT INTO _items (product_id, quantity) VALUES
    ('c387a529-19d1-4f8c-9ea5-ce798a7c977f', 14),  -- Original  5000
    ('488c2ba8-3d7f-449e-b2f6-2761db2a6bb8',  1),  -- Lemon     6500
    ('288cfb86-7d01-4ca4-9a65-4474a0657f67',  1),  -- Leci      6000
    ('88bba6c8-dfb3-460a-9db5-182cb3355f71',  1),  -- Stroberi  6000
    ('7a184fcc-aab0-4bcc-8fee-8d76bf9f5c7a',  1);  -- Mangga    6000

DO $$
DECLARE cups int; amount numeric;
BEGIN
    SELECT SUM(i.quantity), SUM(p.price * i.quantity) INTO cups, amount
    FROM _items i JOIN tenant_products p ON p.id = i.product_id;
    IF cups <> 18 THEN RAISE EXCEPTION 'Expected 18 cups, got %', cups; END IF;
    IF amount <> 94500 THEN RAISE EXCEPTION 'Expected 94500, got % — a product price changed', amount; END IF;
END $$;

-- ── 3. Insert the order and its items ───────────────────────────────────────
INSERT INTO store_orders (id, store_id, tenant_id, user_id, daily_summary_id, payment_method, total_amount, created_at)
SELECT c.order_id, s.store_id, s.tenant_id, c.user_id, s.id, 'cash',
       (SELECT SUM(p.price * i.quantity) FROM _items i JOIN tenant_products p ON p.id = i.product_id),
       c.order_at
FROM _cfg c CROSS JOIN _summary s;

INSERT INTO store_order_items (order_id, product_id, quantity, unit_price, total_price, tenant_id, created_at)
SELECT c.order_id, i.product_id, i.quantity, p.price, p.price * i.quantity, s.tenant_id, c.order_at
FROM _items i
JOIN tenant_products p ON p.id = i.product_id
CROSS JOIN _cfg c
CROSS JOIN _summary s;

-- ── 4. Recompute the summary ────────────────────────────────────────────────
-- Totals are recomputed from scratch, exactly as the close path does.
-- actual_cash is bumped by the order amount, since this cash was collected but
-- never rung up — so the variance that was recorded on close is preserved.
WITH agg AS (
    SELECT COALESCE(SUM(o.total_amount), 0) AS total_sales,
           COUNT(*)                         AS total_orders
    FROM store_orders o
    WHERE o.daily_summary_id = (SELECT summary_id FROM _cfg)
),
cups AS (
    SELECT COALESCE(SUM(oi.quantity), 0) AS total_cups
    FROM store_order_items oi
    JOIN store_orders o ON o.id = oi.order_id
    WHERE o.daily_summary_id = (SELECT summary_id FROM _cfg)
),
expenses_agg AS (
    SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
    FROM store_expenses e
    WHERE e.daily_summary_id = (SELECT summary_id FROM _cfg)
),
delta AS (
    SELECT total_amount FROM store_orders WHERE id = (SELECT order_id FROM _cfg)
)
UPDATE store_daily_summaries s
SET total_sales    = agg.total_sales,
    total_orders   = agg.total_orders,
    total_cups     = cups.total_cups,
    total_expenses = expenses_agg.total_expenses,
    expected_cash  = s.opening_balance + agg.total_sales - expenses_agg.total_expenses,
    actual_cash    = CASE WHEN s.actual_cash IS NULL THEN NULL
                          ELSE s.actual_cash + delta.total_amount END,
    variance       = CASE WHEN s.actual_cash IS NULL THEN s.variance
                          ELSE (s.actual_cash + delta.total_amount)
                               - (s.opening_balance + agg.total_sales - expenses_agg.total_expenses) END
FROM agg, cups, expenses_agg, delta
WHERE s.id = (SELECT summary_id FROM _cfg);

-- ── 5. Recompute the seller's commission for that day ───────────────────────
-- rate_per_cup is the snapshot already on the row; the config is not re-read.
UPDATE payroll_commissions pc
SET total_cups       = agg.cups,
    total_orders     = agg.orders,
    total_commission = agg.cups * pc.rate_per_cup
FROM (
    SELECT o.user_id,
           COUNT(DISTINCT o.id)          AS orders,
           COALESCE(SUM(oi.quantity), 0) AS cups
    FROM store_orders o
    LEFT JOIN store_order_items oi ON oi.order_id = o.id
    WHERE o.daily_summary_id = (SELECT summary_id FROM _cfg)
    GROUP BY o.user_id
) agg
WHERE pc.daily_summary_id = (SELECT summary_id FROM _cfg)
  AND pc.user_id = agg.user_id;

-- ── 6. Recompute the payout those commissions roll into ─────────────────────
-- Refuses to touch a payout that is already paid; that case needs a decision,
-- not a script.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM payroll_payouts p
        WHERE p.status = 'paid'
          AND p.id IN (SELECT payout_id FROM payroll_commissions
                       WHERE daily_summary_id = (SELECT summary_id FROM _cfg)
                         AND payout_id IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Payout already marked paid — settle this by hand';
    END IF;
END $$;

UPDATE payroll_payouts p
SET commissions_total = agg.commissions_total,
    total_cups        = agg.total_cups,
    total_orders      = agg.total_orders,
    total_pay         = agg.commissions_total + p.claims_total
FROM (
    SELECT payout_id,
           SUM(total_commission) AS commissions_total,
           SUM(total_cups)       AS total_cups,
           SUM(total_orders)     AS total_orders
    FROM payroll_commissions
    WHERE payout_id IN (SELECT payout_id FROM payroll_commissions
                        WHERE daily_summary_id = (SELECT summary_id FROM _cfg)
                          AND payout_id IS NOT NULL)
    GROUP BY payout_id
) agg
WHERE p.id = agg.payout_id;

-- ── 7. Audit trail ──────────────────────────────────────────────────────────
INSERT INTO tenant_activity_logs (tenant_id, user_id, store_id, daily_summary_id, type, ref_id, ref_table, metadata, created_at)
SELECT s.tenant_id, c.user_id, s.store_id, s.id, 'order_created', c.order_id, 'store_orders',
       jsonb_build_object(
           'total_amount', 94500,
           'total_cups', 18,
           'payment_method', 'cash',
           'backfill', true,
           'reason', 'emergency early close; sales entered manually'
       ),
       c.order_at
FROM _cfg c CROSS JOIN _summary s;

-- ── 8. Assert the deltas ────────────────────────────────────────────────────
-- The Supabase SQL editor only shows the result of the last statement, so the
-- check that matters is written as an assertion: if any delta is wrong the
-- whole transaction aborts with a message instead of quietly committing.
DO $$
DECLARE b record; a record;
BEGIN
    SELECT * INTO b FROM _summary;
    SELECT * INTO a FROM store_daily_summaries WHERE id = (SELECT summary_id FROM _cfg);

    IF a.total_cups - b.total_cups <> 18 THEN
        RAISE EXCEPTION 'total_cups moved by %, expected 18', a.total_cups - b.total_cups;
    END IF;
    IF a.total_orders - b.total_orders <> 1 THEN
        RAISE EXCEPTION 'total_orders moved by %, expected 1', a.total_orders - b.total_orders;
    END IF;
    IF a.total_sales - b.total_sales <> 94500 THEN
        RAISE EXCEPTION 'total_sales moved by %, expected 94500', a.total_sales - b.total_sales;
    END IF;
    IF a.expected_cash - b.expected_cash <> 94500 THEN
        RAISE EXCEPTION 'expected_cash moved by %, expected 94500', a.expected_cash - b.expected_cash;
    END IF;
    IF b.actual_cash IS NOT NULL AND a.actual_cash - b.actual_cash <> 94500 THEN
        RAISE EXCEPTION 'actual_cash moved by %, expected 94500', a.actual_cash - b.actual_cash;
    END IF;
    IF b.actual_cash IS NOT NULL AND COALESCE(a.variance, 0) <> COALESCE(b.variance, 0) THEN
        RAISE EXCEPTION 'variance changed from % to %', b.variance, a.variance;
    END IF;
END $$;

-- ── 9. Read the numbers, then COMMIT or ROLLBACK ────────────────────────────
-- total_cups +18, total_orders +1, total_sales and actual_cash +94500,
-- variance unchanged.
SELECT 'before' AS state, date, total_orders, total_cups, total_sales, total_expenses,
       opening_balance, expected_cash, actual_cash, variance FROM _summary
UNION ALL
SELECT 'after', date, total_orders, total_cups, total_sales, total_expenses,
       opening_balance, expected_cash, actual_cash, variance
FROM store_daily_summaries WHERE id = (SELECT summary_id FROM _cfg);

SELECT user_id, total_cups, total_orders, rate_per_cup, total_commission, status, payout_id
FROM payroll_commissions WHERE daily_summary_id = (SELECT summary_id FROM _cfg);

-- ── Pass 2 keeps ROLLBACK. Pass 3 swaps these two lines. ────────────────────
ROLLBACK;
-- COMMIT;

-- ############################################################################
-- ##  PASS 2 / PASS 3 END HERE (end of file)                                ##
-- ############################################################################
