-- PS-08 — TripWallet — Smart Budget & Expense Companion
-- Starter queries. Every one runs as-is against data/PS-08.db.
--
-- CAST(x AS REAL) appears below only for sorting and rough exploration.
-- Never use it for a value you will show someone or add to another value.

-- ==========================================================================
-- 1. Budget versus actual for one trip, in the home currency
-- home_amount is the converted figure; amount and currency keep the original. Never overwrite the original.
-- ==========================================================================
SELECT t.title, b.total_amount AS budget, b.currency,
          ROUND(SUM(CAST(e.home_amount AS REAL)),2) AS spent,
          ROUND(100.0*SUM(CAST(e.home_amount AS REAL))/CAST(b.total_amount AS REAL),1) AS pct_used,
          b.alert_threshold_pct
     FROM budgets b JOIN trips t ON t.trip_id = b.trip_id
     JOIN expenses e ON e.trip_id = b.trip_id
    GROUP BY b.budget_id ORDER BY pct_used DESC LIMIT 10;

-- ==========================================================================
-- 2. Spend by category against the per-category caps
-- The caps were allocated by largest remainder, so they sum exactly to 90% of the budget.
-- ==========================================================================
SELECT e.category, COUNT(*) AS entries,
          ROUND(SUM(CAST(e.home_amount AS REAL)),2) AS total, e.home_currency
     FROM expenses e GROUP BY e.category ORDER BY total DESC;

-- ==========================================================================
-- 3. Who owes whom — per-person balances on a group trip
-- Splits sum exactly to the expense. 1000 three ways is 333.34 + 333.33 + 333.33.
-- ==========================================================================
SELECT u.display_name, s.settlement_status,
          COUNT(*) AS lines, ROUND(SUM(CAST(s.amount AS REAL)),2) AS owed, s.currency
     FROM expense_splits s JOIN users u ON u.user_id = s.user_id
     JOIN expenses e ON e.expense_id = s.expense_id
    WHERE e.trip_id = (SELECT trip_id FROM trips WHERE is_group_trip=1 ORDER BY trip_id LIMIT 1)
    GROUP BY u.user_id, s.settlement_status ORDER BY owed DESC;

-- ==========================================================================
-- 4. Prove a split sums exactly to its expense
-- If this ever returns a row, your allocation is wrong.
-- ==========================================================================
SELECT e.expense_id, e.amount,
          ROUND(SUM(CAST(s.amount AS REAL)),2) AS split_total
     FROM expenses e JOIN expense_splits s ON s.expense_id = e.expense_id
    GROUP BY e.expense_id
   HAVING ABS(CAST(e.amount AS REAL) - SUM(CAST(s.amount AS REAL))) > 0.005 LIMIT 5;

-- ==========================================================================
-- 5. Multi-currency conversion through the rate table
-- Convert on a named date and store the date you used. fx_rate_date is on every expense.
-- ==========================================================================
SELECT e.amount, e.currency, e.home_amount, e.home_currency, e.fx_rate_date,
          f.rate
     FROM expenses e
     LEFT JOIN fx_rates f ON f.base_currency = e.currency
           AND f.quote_currency = e.home_currency AND f.rate_date = e.fx_rate_date
    WHERE e.currency <> e.home_currency LIMIT 12;

-- ==========================================================================
-- 6. Receipts with ground truth, for scoring your OCR
-- image_quality is a difficulty gradient. Score on the eval split only.
-- ==========================================================================
SELECT receipt_id, merchant_name_truth, total_amount_truth, currency_truth,
          date_truth, category_truth, language, image_quality
     FROM receipts WHERE dataset_split='eval' ORDER BY image_quality LIMIT 12;
