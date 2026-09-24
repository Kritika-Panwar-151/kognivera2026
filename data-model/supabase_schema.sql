-- Supabase PostgreSQL Schema for PS-08 TripWallet
-- 15 Canonical Tables with RLS Policies & Indexes

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
  category_id                  TEXT PRIMARY KEY,
  code                         TEXT NOT NULL UNIQUE,
  label                        TEXT NOT NULL,
  parent_category_id           TEXT REFERENCES categories(category_id),
  applies_to                   TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Currencies
CREATE TABLE IF NOT EXISTS currencies (
  currency_id                  TEXT PRIMARY KEY,
  iso4217                      TEXT NOT NULL UNIQUE,
  name                         TEXT NOT NULL,
  symbol                       TEXT NOT NULL,
  minor_unit_exponent          INTEGER NOT NULL,
  display_locale               TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. FX Rates
CREATE TABLE IF NOT EXISTS fx_rates (
  fx_rate_id                   TEXT PRIMARY KEY,
  base_currency                TEXT NOT NULL REFERENCES currencies(iso4217),
  quote_currency               TEXT NOT NULL REFERENCES currencies(iso4217),
  rate_date                    DATE NOT NULL,
  rate                         NUMERIC(18,8) NOT NULL,
  source                       TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (base_currency, quote_currency, rate_date)
);

-- 4. Languages
CREATE TABLE IF NOT EXISTS languages (
  language_id                  TEXT PRIMARY KEY,
  bcp47                        TEXT NOT NULL UNIQUE,
  english_name                 TEXT NOT NULL,
  native_name                  TEXT NOT NULL,
  script                       TEXT NOT NULL,
  rtl                          BOOLEAN NOT NULL,
  tts_supported                BOOLEAN NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Receipts
CREATE TABLE IF NOT EXISTS receipts (
  receipt_id                   TEXT PRIMARY KEY,
  file_path                    TEXT NOT NULL,
  merchant_name_truth          TEXT NOT NULL,
  total_amount_truth           NUMERIC(12,2) NOT NULL,
  currency_truth               TEXT NOT NULL REFERENCES currencies(iso4217),
  date_truth                   DATE NOT NULL,
  category_truth               TEXT NOT NULL,
  line_items_truth             JSONB NOT NULL DEFAULT '[]'::jsonb,
  language                     TEXT NOT NULL REFERENCES languages(bcp47),
  image_quality                TEXT NOT NULL,
  dataset_split                TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Countries
CREATE TABLE IF NOT EXISTS countries (
  country_id                   TEXT PRIMARY KEY,
  iso2                         TEXT NOT NULL UNIQUE,
  iso3                         TEXT NOT NULL UNIQUE,
  name                         TEXT NOT NULL,
  default_currency             TEXT NOT NULL REFERENCES currencies(iso4217),
  calling_code                 TEXT NOT NULL,
  region                       TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Cities
CREATE TABLE IF NOT EXISTS cities (
  city_id                      TEXT PRIMARY KEY,
  name                         TEXT NOT NULL,
  state                        TEXT,
  country_id                   TEXT NOT NULL REFERENCES countries(country_id),
  country_code                 TEXT NOT NULL,
  lat                          NUMERIC(9,6) NOT NULL,
  lng                          NUMERIC(9,6) NOT NULL,
  timezone                     TEXT NOT NULL,
  region                       TEXT NOT NULL,
  population                   INTEGER,
  season_profile               TEXT NOT NULL,
  peak_months                  TEXT NOT NULL,
  primary_language             TEXT NOT NULL REFERENCES languages(bcp47),
  description                  TEXT,
  status                       TEXT NOT NULL DEFAULT 'active',
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Users
CREATE TABLE IF NOT EXISTS users (
  user_id                      TEXT PRIMARY KEY,
  display_name                 TEXT NOT NULL,
  email                        TEXT NOT NULL UNIQUE,
  home_city_id                 TEXT NOT NULL REFERENCES cities(city_id),
  home_currency                TEXT NOT NULL REFERENCES currencies(iso4217),
  locale                       TEXT NOT NULL REFERENCES languages(bcp47),
  budget_band                  TEXT NOT NULL,
  travel_style                 TEXT NOT NULL,
  traveller_type               TEXT NOT NULL,
  segment                      TEXT NOT NULL,
  date_of_signup               DATE NOT NULL,
  loyalty_tier                 TEXT,
  status                       TEXT NOT NULL DEFAULT 'active',
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Trips
CREATE TABLE IF NOT EXISTS trips (
  trip_id                      TEXT PRIMARY KEY,
  owner_user_id                TEXT NOT NULL REFERENCES users(user_id),
  title                        TEXT NOT NULL,
  origin_city_id               TEXT REFERENCES cities(city_id),
  destination_city_id          TEXT NOT NULL REFERENCES cities(city_id),
  start_date                   DATE NOT NULL,
  end_date                     DATE NOT NULL,
  party_size                   INTEGER NOT NULL DEFAULT 1,
  adults                       INTEGER NOT NULL DEFAULT 1,
  children                     INTEGER NOT NULL DEFAULT 0,
  trip_type                    TEXT NOT NULL,
  is_group_trip                BOOLEAN NOT NULL DEFAULT FALSE,
  status                       TEXT NOT NULL DEFAULT 'planning',
  home_currency                TEXT NOT NULL REFERENCES currencies(iso4217),
  notes                        TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Budgets
CREATE TABLE IF NOT EXISTS budgets (
  budget_id                    TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL UNIQUE REFERENCES trips(trip_id) ON DELETE CASCADE,
  total_amount                 NUMERIC(12,2) NOT NULL,
  currency                     TEXT NOT NULL REFERENCES currencies(iso4217),
  accommodation_cap            NUMERIC(12,2),
  transport_cap                NUMERIC(12,2),
  food_cap                     NUMERIC(12,2),
  activities_cap               NUMERIC(12,2),
  misc_cap                     NUMERIC(12,2),
  alert_threshold_pct          INTEGER NOT NULL DEFAULT 80,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  expense_id                   TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  payer_user_id                TEXT NOT NULL REFERENCES users(user_id),
  category                     TEXT NOT NULL,
  description                  TEXT NOT NULL,
  amount                       NUMERIC(12,2) NOT NULL,
  currency                     TEXT NOT NULL REFERENCES currencies(iso4217),
  home_amount                  NUMERIC(12,2) NOT NULL,
  home_currency                TEXT NOT NULL REFERENCES currencies(iso4217),
  fx_rate_date                 DATE NOT NULL,
  incurred_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  city_id                      TEXT REFERENCES cities(city_id),
  receipt_id                   TEXT REFERENCES receipts(receipt_id),
  entry_method                 TEXT NOT NULL DEFAULT 'manual',
  is_settled                   BOOLEAN NOT NULL DEFAULT FALSE,
  status                       TEXT NOT NULL DEFAULT 'active',
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Itineraries
CREATE TABLE IF NOT EXISTS itineraries (
  itinerary_id                 TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  name                         TEXT NOT NULL,
  version                      INTEGER NOT NULL DEFAULT 1,
  is_active                    BOOLEAN NOT NULL DEFAULT TRUE,
  generated_by                 TEXT NOT NULL,
  total_cost                   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency                     TEXT NOT NULL REFERENCES currencies(iso4217),
  total_duration_minutes       INTEGER NOT NULL DEFAULT 0,
  total_carbon_kg              NUMERIC(10,3) NOT NULL DEFAULT 0.000,
  optimizer_weights            JSONB,
  status                       TEXT NOT NULL DEFAULT 'active',
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Itinerary Items
CREATE TABLE IF NOT EXISTS itinerary_items (
  item_id                      TEXT PRIMARY KEY,
  itinerary_id                 TEXT NOT NULL REFERENCES itineraries(itinerary_id) ON DELETE CASCADE,
  day_index                    INTEGER NOT NULL,
  sort_order                   INTEGER NOT NULL,
  starts_at                    TIMESTAMPTZ,
  ends_at                      TIMESTAMPTZ,
  item_type                    TEXT NOT NULL,
  entity_type                  TEXT,
  entity_id                    TEXT,
  title                        TEXT NOT NULL,
  cost                         NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency                     TEXT NOT NULL REFERENCES currencies(iso4217),
  carbon_kg                    NUMERIC(8,3) NOT NULL DEFAULT 0.000,
  duration_minutes             INTEGER NOT NULL DEFAULT 0,
  source                       TEXT NOT NULL DEFAULT 'user',
  explanation                  TEXT,
  locked                       BOOLEAN NOT NULL DEFAULT FALSE,
  status                       TEXT NOT NULL DEFAULT 'proposed',
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Trip Members
CREATE TABLE IF NOT EXISTS trip_members (
  member_id                    TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  user_id                      TEXT NOT NULL REFERENCES users(user_id),
  role                         TEXT NOT NULL DEFAULT 'editor',
  joined_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_weight                 NUMERIC(6,3) NOT NULL DEFAULT 1.000,
  invited_by_user_id           TEXT REFERENCES users(user_id),
  status                       TEXT NOT NULL DEFAULT 'active',
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, user_id)
);

-- 15. Expense Splits
CREATE TABLE IF NOT EXISTS expense_splits (
  split_id                     TEXT PRIMARY KEY,
  expense_id                   TEXT NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
  user_id                      TEXT NOT NULL REFERENCES users(user_id),
  split_type                   TEXT NOT NULL DEFAULT 'equal',
  share_value                  NUMERIC(9,4) NOT NULL DEFAULT 1.0000,
  amount                       NUMERIC(12,2) NOT NULL,
  currency                     TEXT NOT NULL REFERENCES currencies(iso4217),
  settlement_status            TEXT NOT NULL DEFAULT 'outstanding',
  settled_at                   TIMESTAMPTZ,
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, user_id)
);

-- Enable Row Level Security (RLS) on all 15 tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Public READ RLS Policies for Reference Tables
CREATE POLICY "Public read access for categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read access for currencies" ON currencies FOR SELECT USING (true);
CREATE POLICY "Public read access for fx_rates" ON fx_rates FOR SELECT USING (true);
CREATE POLICY "Public read access for languages" ON languages FOR SELECT USING (true);
CREATE POLICY "Public read access for receipts" ON receipts FOR SELECT USING (true);
CREATE POLICY "Public read access for countries" ON countries FOR SELECT USING (true);
CREATE POLICY "Public read access for cities" ON cities FOR SELECT USING (true);

-- Authenticated / Permissive RLS Policies for User & Trip Data
CREATE POLICY "Allow select on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow insert/update on users" ON users FOR ALL USING (true);

CREATE POLICY "Allow select on trips" ON trips FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete on trips" ON trips FOR ALL USING (true);

CREATE POLICY "Allow select on budgets" ON budgets FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete on budgets" ON budgets FOR ALL USING (true);

CREATE POLICY "Allow select on expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete on expenses" ON expenses FOR ALL USING (true);

CREATE POLICY "Allow select on itineraries" ON itineraries FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete on itineraries" ON itineraries FOR ALL USING (true);

CREATE POLICY "Allow select on itinerary_items" ON itinerary_items FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete on itinerary_items" ON itinerary_items FOR ALL USING (true);

CREATE POLICY "Allow select on trip_members" ON trip_members FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete on trip_members" ON trip_members FOR ALL USING (true);

CREATE POLICY "Allow select on expense_splits" ON expense_splits FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete on expense_splits" ON expense_splits FOR ALL USING (true);
