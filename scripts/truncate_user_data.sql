-- ============================================================================
-- PS-08 TripWallet — Truncate All User Data (Preserving Reference Tables)
-- ============================================================================
-- PRESERVED: currencies, languages, categories, countries, cities, fx_rates
-- DELETED: audit_logs, itinerary_items, itineraries, expense_splits, expenses,
--          budgets, trip_members, trips, receipts, users
-- ============================================================================

TRUNCATE TABLE 
  audit_logs,
  itinerary_items,
  itineraries,
  expense_splits,
  expenses,
  budgets,
  trip_members,
  trips,
  receipts,
  users
RESTART IDENTITY CASCADE;
