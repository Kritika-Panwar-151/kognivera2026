-- KV Hackathon 2026 · travel data model v1.1.0-rc1
-- Only the 15 tables this problem statement needs.

-- SQLite has no DECIMAL type, and NUMERIC affinity would turn '8500.00' into the
-- float 8500.0. Money columns are therefore TEXT so the exact value survives.
PRAGMA foreign_keys = ON;

-- categories  (Reference & geography)
CREATE TABLE categories (
  category_id                  TEXT PRIMARY KEY,
  code                         TEXT NOT NULL UNIQUE,
  label                        TEXT NOT NULL,
  parent_category_id           TEXT,
  applies_to                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (parent_category_id) REFERENCES categories(category_id)
);

-- currencies  (Reference & geography)
CREATE TABLE currencies (
  currency_id                  TEXT PRIMARY KEY,
  iso4217                      TEXT NOT NULL UNIQUE,
  name                         TEXT NOT NULL,
  symbol                       TEXT NOT NULL,
  minor_unit_exponent          INTEGER NOT NULL,
  display_locale               TEXT NOT NULL,
  updated_at                   TEXT NOT NULL
);

-- fx_rates  (Reference & geography)
CREATE TABLE fx_rates (
  fx_rate_id                   TEXT PRIMARY KEY,
  base_currency                TEXT NOT NULL,
  quote_currency               TEXT NOT NULL,
  rate_date                    TEXT NOT NULL,
  rate                         NUMERIC(18,8) NOT NULL,
  source                       TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (base_currency) REFERENCES currencies(iso4217),
  FOREIGN KEY (quote_currency) REFERENCES currencies(iso4217),
  UNIQUE (base_currency, quote_currency, rate_date)
);

-- languages  (Reference & geography)
CREATE TABLE languages (
  language_id                  TEXT PRIMARY KEY,
  bcp47                        TEXT NOT NULL UNIQUE,
  english_name                 TEXT NOT NULL,
  native_name                  TEXT NOT NULL,
  script                       TEXT NOT NULL,
  rtl                          INTEGER NOT NULL,
  tts_supported                INTEGER NOT NULL,
  updated_at                   TEXT NOT NULL
);

-- receipts  (Booking & money)
CREATE TABLE receipts (
  receipt_id                   TEXT PRIMARY KEY,
  file_path                    TEXT NOT NULL,
  merchant_name_truth          TEXT NOT NULL,
  total_amount_truth           TEXT NOT NULL,
  currency_truth               TEXT NOT NULL,
  date_truth                   TEXT NOT NULL,
  category_truth               TEXT NOT NULL,
  line_items_truth             TEXT NOT NULL,
  language                     TEXT NOT NULL,
  image_quality                TEXT NOT NULL,
  dataset_split                TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (currency_truth) REFERENCES currencies(iso4217),
  FOREIGN KEY (language) REFERENCES languages(bcp47)
);

-- countries  (Reference & geography)
CREATE TABLE countries (
  country_id                   TEXT PRIMARY KEY,
  iso2                         TEXT NOT NULL UNIQUE,
  iso3                         TEXT NOT NULL UNIQUE,
  name                         TEXT NOT NULL,
  default_currency             TEXT NOT NULL,
  calling_code                 TEXT NOT NULL,
  region                       TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (default_currency) REFERENCES currencies(iso4217)
);

-- cities  (Reference & geography)
CREATE TABLE cities (
  city_id                      TEXT PRIMARY KEY,
  name                         TEXT NOT NULL,
  state                        TEXT,
  country_id                   TEXT NOT NULL,
  country_code                 TEXT NOT NULL,
  lat                          NUMERIC(9,6) NOT NULL,
  lng                          NUMERIC(9,6) NOT NULL,
  timezone                     TEXT NOT NULL,
  region                       TEXT NOT NULL,
  population                   INTEGER,
  season_profile               TEXT NOT NULL,
  peak_months                  TEXT NOT NULL,
  primary_language             TEXT NOT NULL,
  description                  TEXT,
  status                       TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (country_id) REFERENCES countries(country_id),
  FOREIGN KEY (primary_language) REFERENCES languages(bcp47)
);

-- users  (Identity & preference)
CREATE TABLE users (
  user_id                      TEXT PRIMARY KEY,
  display_name                 TEXT NOT NULL,
  email                        TEXT NOT NULL UNIQUE,
  home_city_id                 TEXT NOT NULL,
  home_currency                TEXT NOT NULL,
  locale                       TEXT NOT NULL,
  budget_band                  TEXT NOT NULL,
  travel_style                 TEXT NOT NULL,
  traveller_type               TEXT NOT NULL,
  segment                      TEXT NOT NULL,
  date_of_signup               TEXT NOT NULL,
  loyalty_tier                 TEXT,
  status                       TEXT NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (home_city_id) REFERENCES cities(city_id),
  FOREIGN KEY (home_currency) REFERENCES currencies(iso4217),
  FOREIGN KEY (locale) REFERENCES languages(bcp47)
);

-- trips  (Trip & itinerary)
CREATE TABLE trips (
  trip_id                      TEXT PRIMARY KEY,
  owner_user_id                TEXT NOT NULL,
  title                        TEXT NOT NULL,
  origin_city_id               TEXT,
  destination_city_id          TEXT NOT NULL,
  start_date                   TEXT NOT NULL,
  end_date                     TEXT NOT NULL,
  party_size                   INTEGER NOT NULL,
  adults                       INTEGER NOT NULL,
  children                     INTEGER NOT NULL,
  trip_type                    TEXT NOT NULL,
  is_group_trip                INTEGER NOT NULL,
  status                       TEXT NOT NULL,
  home_currency                TEXT NOT NULL,
  notes                        TEXT,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(user_id),
  FOREIGN KEY (origin_city_id) REFERENCES cities(city_id),
  FOREIGN KEY (destination_city_id) REFERENCES cities(city_id),
  FOREIGN KEY (home_currency) REFERENCES currencies(iso4217)
);

-- budgets  (Booking & money)
CREATE TABLE budgets (
  budget_id                    TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL UNIQUE,
  total_amount                 TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  accommodation_cap            TEXT,
  transport_cap                TEXT,
  food_cap                     TEXT,
  activities_cap               TEXT,
  misc_cap                     TEXT,
  alert_threshold_pct          INTEGER NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217)
);

-- expenses  (Booking & money)
CREATE TABLE expenses (
  expense_id                   TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL,
  payer_user_id                TEXT NOT NULL,
  category                     TEXT NOT NULL,
  description                  TEXT NOT NULL,
  amount                       TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  home_amount                  TEXT NOT NULL,
  home_currency                TEXT NOT NULL,
  fx_rate_date                 TEXT NOT NULL,
  incurred_at                  TEXT NOT NULL,
  city_id                      TEXT,
  receipt_id                   TEXT,
  entry_method                 TEXT NOT NULL,
  is_settled                   INTEGER NOT NULL,
  status                       TEXT NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
  FOREIGN KEY (payer_user_id) REFERENCES users(user_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217),
  FOREIGN KEY (home_currency) REFERENCES currencies(iso4217),
  FOREIGN KEY (city_id) REFERENCES cities(city_id),
  FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id)
);

-- itineraries  (Trip & itinerary)
CREATE TABLE itineraries (
  itinerary_id                 TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL,
  name                         TEXT NOT NULL,
  version                      INTEGER NOT NULL,
  is_active                    INTEGER NOT NULL,
  generated_by                 TEXT NOT NULL,
  total_cost                   TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  total_duration_minutes       INTEGER NOT NULL,
  total_carbon_kg              NUMERIC(10,3) NOT NULL,
  optimizer_weights            TEXT,
  status                       TEXT NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217)
);

-- itinerary_items  (Trip & itinerary)
CREATE TABLE itinerary_items (
  item_id                      TEXT PRIMARY KEY,
  itinerary_id                 TEXT NOT NULL,
  day_index                    INTEGER NOT NULL,
  sort_order                   INTEGER NOT NULL,
  starts_at                    TEXT,
  ends_at                      TEXT,
  item_type                    TEXT NOT NULL,
  entity_type                  TEXT,
  entity_id                    TEXT,
  title                        TEXT NOT NULL,
  cost                         TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  carbon_kg                    NUMERIC(8,3) NOT NULL,
  duration_minutes             INTEGER NOT NULL,
  source                       TEXT NOT NULL,
  explanation                  TEXT,
  locked                       INTEGER NOT NULL,
  status                       TEXT NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(itinerary_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217)
);

-- trip_members  (Trip & itinerary)
CREATE TABLE trip_members (
  member_id                    TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL,
  user_id                      TEXT NOT NULL,
  role                         TEXT NOT NULL,
  joined_at                    TEXT NOT NULL,
  share_weight                 NUMERIC(6,3) NOT NULL,
  invited_by_user_id           TEXT,
  status                       TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (invited_by_user_id) REFERENCES users(user_id),
  UNIQUE (trip_id, user_id)
);

-- expense_splits  (Booking & money)
CREATE TABLE expense_splits (
  split_id                     TEXT PRIMARY KEY,
  expense_id                   TEXT NOT NULL,
  user_id                      TEXT NOT NULL,
  split_type                   TEXT NOT NULL,
  share_value                  NUMERIC(9,4) NOT NULL,
  amount                       TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  settlement_status            TEXT NOT NULL,
  settled_at                   TEXT,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(expense_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217),
  UNIQUE (expense_id, user_id)
);
