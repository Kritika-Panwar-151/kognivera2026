-- KV Hackathon 2026 · travel data model v1.1.0-rc1
-- Only the 15 tables this problem statement needs.

CREATE EXTENSION IF NOT EXISTS vector;   -- optional, for embedding search

-- categories  (Reference & geography)
CREATE TABLE categories (
  category_id                  TEXT PRIMARY KEY,
  code                         TEXT NOT NULL UNIQUE,
  label                        TEXT NOT NULL,
  parent_category_id           TEXT,
  applies_to                   TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- currencies  (Reference & geography)
CREATE TABLE currencies (
  currency_id                  TEXT PRIMARY KEY,
  iso4217                      CHAR(3) NOT NULL UNIQUE,
  name                         TEXT NOT NULL,
  symbol                       TEXT NOT NULL,
  minor_unit_exponent          SMALLINT NOT NULL,
  display_locale               TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- fx_rates  (Reference & geography)
CREATE TABLE fx_rates (
  fx_rate_id                   TEXT PRIMARY KEY,
  base_currency                CHAR(3) NOT NULL,
  quote_currency               CHAR(3) NOT NULL,
  rate_date                    DATE NOT NULL,
  rate                         NUMERIC(18,8) NOT NULL,
  source                       TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL,
  UNIQUE (base_currency, quote_currency, rate_date)
);

-- languages  (Reference & geography)
CREATE TABLE languages (
  language_id                  TEXT PRIMARY KEY,
  bcp47                        TEXT NOT NULL UNIQUE,
  english_name                 TEXT NOT NULL,
  native_name                  TEXT NOT NULL,
  script                       TEXT NOT NULL,
  rtl                          BOOLEAN NOT NULL,
  tts_supported                BOOLEAN NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- receipts  (Booking & money)
CREATE TABLE receipts (
  receipt_id                   TEXT PRIMARY KEY,
  file_path                    TEXT NOT NULL,
  merchant_name_truth          TEXT NOT NULL,
  total_amount_truth           NUMERIC(12,2) NOT NULL,
  currency_truth               CHAR(3) NOT NULL,
  date_truth                   DATE NOT NULL,
  category_truth               TEXT NOT NULL CHECK (category_truth IN ('accommodation', 'transport', 'food', 'activities', 'shopping', 'fees', 'misc')),
  line_items_truth             TEXT NOT NULL,
  language                     TEXT NOT NULL,
  image_quality                TEXT NOT NULL,
  dataset_split                TEXT NOT NULL CHECK (dataset_split IN ('train', 'eval')),
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- countries  (Reference & geography)
CREATE TABLE countries (
  country_id                   TEXT PRIMARY KEY,
  iso2                         CHAR(2) NOT NULL UNIQUE,
  iso3                         CHAR(3) NOT NULL UNIQUE,
  name                         TEXT NOT NULL,
  default_currency             CHAR(3) NOT NULL,
  calling_code                 TEXT NOT NULL,
  region                       TEXT NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- cities  (Reference & geography)
CREATE TABLE cities (
  city_id                      TEXT PRIMARY KEY,
  name                         TEXT NOT NULL,
  state                        TEXT,
  country_id                   TEXT NOT NULL,
  country_code                 CHAR(2) NOT NULL,
  lat                          NUMERIC(9,6) NOT NULL,
  lng                          NUMERIC(9,6) NOT NULL,
  timezone                     TEXT NOT NULL,
  region                       TEXT NOT NULL,
  population                   INTEGER,
  season_profile               TEXT NOT NULL CHECK (season_profile IN ('winter', 'summer', 'monsoon', 'post_monsoon', 'spring', 'autumn')),
  peak_months                  TEXT NOT NULL,
  primary_language             TEXT NOT NULL,
  description                  TEXT,
  status                       TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived', 'draft')),
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- users  (Identity & preference)
CREATE TABLE users (
  user_id                      TEXT PRIMARY KEY,
  display_name                 TEXT NOT NULL,
  email                        TEXT NOT NULL UNIQUE,
  home_city_id                 TEXT NOT NULL,
  home_currency                CHAR(3) NOT NULL,
  locale                       TEXT NOT NULL,
  budget_band                  TEXT NOT NULL CHECK (budget_band IN ('shoestring', 'value', 'mid', 'premium', 'luxury')),
  travel_style                 TEXT NOT NULL CHECK (travel_style IN ('budget', 'comfort', 'luxury', 'adventure', 'slow', 'cultural', 'wellness')),
  traveller_type               TEXT NOT NULL CHECK (traveller_type IN ('solo', 'couple', 'family', 'business', 'friends', 'senior', 'backpacker')),
  segment                      TEXT NOT NULL CHECK (segment IN ('heavy', 'light', 'cold_start')),
  date_of_signup               DATE NOT NULL,
  loyalty_tier                 TEXT,
  status                       TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived', 'draft')),
  created_at                   TIMESTAMPTZ NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- trips  (Trip & itinerary)
CREATE TABLE trips (
  trip_id                      TEXT PRIMARY KEY,
  owner_user_id                TEXT NOT NULL,
  title                        TEXT NOT NULL,
  origin_city_id               TEXT,
  destination_city_id          TEXT NOT NULL,
  start_date                   DATE NOT NULL,
  end_date                     DATE NOT NULL,
  party_size                   SMALLINT NOT NULL,
  adults                       SMALLINT NOT NULL,
  children                     SMALLINT NOT NULL,
  trip_type                    TEXT NOT NULL CHECK (trip_type IN ('solo', 'couple', 'family', 'business', 'friends', 'senior', 'backpacker')),
  is_group_trip                BOOLEAN NOT NULL,
  status                       TEXT NOT NULL CHECK (status IN ('draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  home_currency                CHAR(3) NOT NULL,
  notes                        TEXT,
  created_at                   TIMESTAMPTZ NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- budgets  (Booking & money)
CREATE TABLE budgets (
  budget_id                    TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL UNIQUE,
  total_amount                 NUMERIC(12,2) NOT NULL,
  currency                     CHAR(3) NOT NULL,
  accommodation_cap            NUMERIC(12,2),
  transport_cap                NUMERIC(12,2),
  food_cap                     NUMERIC(12,2),
  activities_cap               NUMERIC(12,2),
  misc_cap                     NUMERIC(12,2),
  alert_threshold_pct          SMALLINT NOT NULL,
  created_at                   TIMESTAMPTZ NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- expenses  (Booking & money)
CREATE TABLE expenses (
  expense_id                   TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL,
  payer_user_id                TEXT NOT NULL,
  category                     TEXT NOT NULL CHECK (category IN ('accommodation', 'transport', 'food', 'activities', 'shopping', 'fees', 'misc')),
  description                  TEXT NOT NULL,
  amount                       NUMERIC(12,2) NOT NULL,
  currency                     CHAR(3) NOT NULL,
  home_amount                  NUMERIC(12,2) NOT NULL,
  home_currency                CHAR(3) NOT NULL,
  fx_rate_date                 DATE NOT NULL,
  incurred_at                  TIMESTAMPTZ NOT NULL,
  city_id                      TEXT,
  receipt_id                   TEXT,
  entry_method                 TEXT NOT NULL,
  is_settled                   BOOLEAN NOT NULL,
  status                       TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived', 'draft')),
  created_at                   TIMESTAMPTZ NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- itineraries  (Trip & itinerary)
CREATE TABLE itineraries (
  itinerary_id                 TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL,
  name                         TEXT NOT NULL,
  version                      INTEGER NOT NULL,
  is_active                    BOOLEAN NOT NULL,
  generated_by                 TEXT NOT NULL CHECK (generated_by IN ('user', 'ai_planner', 'optimizer', 'agent', 'vote', 'import')),
  total_cost                   NUMERIC(12,2) NOT NULL,
  currency                     CHAR(3) NOT NULL,
  total_duration_minutes       INTEGER NOT NULL,
  total_carbon_kg              NUMERIC(10,3) NOT NULL,
  optimizer_weights            TEXT,
  status                       TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived', 'draft')),
  created_at                   TIMESTAMPTZ NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- itinerary_items  (Trip & itinerary)
CREATE TABLE itinerary_items (
  item_id                      TEXT PRIMARY KEY,
  itinerary_id                 TEXT NOT NULL,
  day_index                    SMALLINT NOT NULL,
  sort_order                   SMALLINT NOT NULL,
  starts_at                    TIMESTAMPTZ,
  ends_at                      TIMESTAMPTZ,
  item_type                    TEXT NOT NULL CHECK (item_type IN ('hotel', 'flight', 'poi', 'package', 'guide', 'transfer', 'meal', 'free')),
  entity_type                  TEXT CHECK (entity_type IN ('hotel', 'room_type', 'rate_plan', 'flight', 'flight_fare', 'poi', 'package', 'package_component', 'guide', 'transfer', 'event', 'xr_scene')),
  entity_id                    TEXT,
  title                        TEXT NOT NULL,
  cost                         NUMERIC(12,2) NOT NULL,
  currency                     CHAR(3) NOT NULL,
  carbon_kg                    NUMERIC(8,3) NOT NULL,
  duration_minutes             INTEGER NOT NULL,
  source                       TEXT NOT NULL CHECK (source IN ('user', 'ai_planner', 'optimizer', 'agent', 'vote', 'import')),
  explanation                  TEXT,
  locked                       BOOLEAN NOT NULL,
  status                       TEXT NOT NULL CHECK (status IN ('proposed', 'confirmed', 'removed', 'replaced')),
  created_at                   TIMESTAMPTZ NOT NULL,
  updated_at                   TIMESTAMPTZ NOT NULL
);

-- trip_members  (Trip & itinerary)
CREATE TABLE trip_members (
  member_id                    TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL,
  user_id                      TEXT NOT NULL,
  role                         TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at                    TIMESTAMPTZ NOT NULL,
  share_weight                 NUMERIC(6,3) NOT NULL,
  invited_by_user_id           TEXT,
  status                       TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived', 'draft')),
  updated_at                   TIMESTAMPTZ NOT NULL,
  UNIQUE (trip_id, user_id)
);

-- expense_splits  (Booking & money)
CREATE TABLE expense_splits (
  split_id                     TEXT PRIMARY KEY,
  expense_id                   TEXT NOT NULL,
  user_id                      TEXT NOT NULL,
  split_type                   TEXT NOT NULL CHECK (split_type IN ('equal', 'custom', 'percentage', 'shares')),
  share_value                  NUMERIC(9,4) NOT NULL,
  amount                       NUMERIC(12,2) NOT NULL,
  currency                     CHAR(3) NOT NULL,
  settlement_status            TEXT NOT NULL CHECK (settlement_status IN ('outstanding', 'settled', 'written_off')),
  settled_at                   TIMESTAMPTZ,
  updated_at                   TIMESTAMPTZ NOT NULL,
  UNIQUE (expense_id, user_id)
);

-- foreign keys
ALTER TABLE categories ADD CONSTRAINT fk_categories_parent_category_id FOREIGN KEY (parent_category_id) REFERENCES categories(category_id);
ALTER TABLE fx_rates ADD CONSTRAINT fk_fx_rates_base_currency FOREIGN KEY (base_currency) REFERENCES currencies(iso4217);
ALTER TABLE fx_rates ADD CONSTRAINT fk_fx_rates_quote_currency FOREIGN KEY (quote_currency) REFERENCES currencies(iso4217);
ALTER TABLE receipts ADD CONSTRAINT fk_receipts_currency_truth FOREIGN KEY (currency_truth) REFERENCES currencies(iso4217);
ALTER TABLE receipts ADD CONSTRAINT fk_receipts_language FOREIGN KEY (language) REFERENCES languages(bcp47);
ALTER TABLE countries ADD CONSTRAINT fk_countries_default_currency FOREIGN KEY (default_currency) REFERENCES currencies(iso4217);
ALTER TABLE cities ADD CONSTRAINT fk_cities_country_id FOREIGN KEY (country_id) REFERENCES countries(country_id);
ALTER TABLE cities ADD CONSTRAINT fk_cities_primary_language FOREIGN KEY (primary_language) REFERENCES languages(bcp47);
ALTER TABLE users ADD CONSTRAINT fk_users_home_city_id FOREIGN KEY (home_city_id) REFERENCES cities(city_id);
ALTER TABLE users ADD CONSTRAINT fk_users_home_currency FOREIGN KEY (home_currency) REFERENCES currencies(iso4217);
ALTER TABLE users ADD CONSTRAINT fk_users_locale FOREIGN KEY (locale) REFERENCES languages(bcp47);
ALTER TABLE trips ADD CONSTRAINT fk_trips_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users(user_id);
ALTER TABLE trips ADD CONSTRAINT fk_trips_origin_city_id FOREIGN KEY (origin_city_id) REFERENCES cities(city_id);
ALTER TABLE trips ADD CONSTRAINT fk_trips_destination_city_id FOREIGN KEY (destination_city_id) REFERENCES cities(city_id);
ALTER TABLE trips ADD CONSTRAINT fk_trips_home_currency FOREIGN KEY (home_currency) REFERENCES currencies(iso4217);
ALTER TABLE budgets ADD CONSTRAINT fk_budgets_trip_id FOREIGN KEY (trip_id) REFERENCES trips(trip_id);
ALTER TABLE budgets ADD CONSTRAINT fk_budgets_currency FOREIGN KEY (currency) REFERENCES currencies(iso4217);
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_trip_id FOREIGN KEY (trip_id) REFERENCES trips(trip_id);
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_payer_user_id FOREIGN KEY (payer_user_id) REFERENCES users(user_id);
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_currency FOREIGN KEY (currency) REFERENCES currencies(iso4217);
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_home_currency FOREIGN KEY (home_currency) REFERENCES currencies(iso4217);
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_city_id FOREIGN KEY (city_id) REFERENCES cities(city_id);
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_receipt_id FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id);
ALTER TABLE itineraries ADD CONSTRAINT fk_itineraries_trip_id FOREIGN KEY (trip_id) REFERENCES trips(trip_id);
ALTER TABLE itineraries ADD CONSTRAINT fk_itineraries_currency FOREIGN KEY (currency) REFERENCES currencies(iso4217);
ALTER TABLE itinerary_items ADD CONSTRAINT fk_itinerary_items_itinerary_id FOREIGN KEY (itinerary_id) REFERENCES itineraries(itinerary_id);
ALTER TABLE itinerary_items ADD CONSTRAINT fk_itinerary_items_currency FOREIGN KEY (currency) REFERENCES currencies(iso4217);
ALTER TABLE trip_members ADD CONSTRAINT fk_trip_members_trip_id FOREIGN KEY (trip_id) REFERENCES trips(trip_id);
ALTER TABLE trip_members ADD CONSTRAINT fk_trip_members_user_id FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE trip_members ADD CONSTRAINT fk_trip_members_invited_by_user_id FOREIGN KEY (invited_by_user_id) REFERENCES users(user_id);
ALTER TABLE expense_splits ADD CONSTRAINT fk_expense_splits_expense_id FOREIGN KEY (expense_id) REFERENCES expenses(expense_id);
ALTER TABLE expense_splits ADD CONSTRAINT fk_expense_splits_user_id FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE expense_splits ADD CONSTRAINT fk_expense_splits_currency FOREIGN KEY (currency) REFERENCES currencies(iso4217);

-- indexes
CREATE INDEX idx_categories_parent_category_id ON categories(parent_category_id);
CREATE INDEX idx_fx_rates_base_currency ON fx_rates(base_currency);
CREATE INDEX idx_fx_rates_quote_currency ON fx_rates(quote_currency);
CREATE INDEX idx_receipts_currency_truth ON receipts(currency_truth);
CREATE INDEX idx_receipts_language ON receipts(language);
CREATE INDEX idx_countries_default_currency ON countries(default_currency);
CREATE INDEX idx_cities_country_id ON cities(country_id);
CREATE INDEX idx_cities_primary_language ON cities(primary_language);
CREATE INDEX idx_users_home_city_id ON users(home_city_id);
CREATE INDEX idx_users_home_currency ON users(home_currency);
CREATE INDEX idx_users_locale ON users(locale);
CREATE INDEX idx_trips_owner_user_id ON trips(owner_user_id);
CREATE INDEX idx_trips_origin_city_id ON trips(origin_city_id);
CREATE INDEX idx_trips_destination_city_id ON trips(destination_city_id);
CREATE INDEX idx_trips_home_currency ON trips(home_currency);
CREATE INDEX idx_budgets_currency ON budgets(currency);
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_payer_user_id ON expenses(payer_user_id);
CREATE INDEX idx_expenses_currency ON expenses(currency);
CREATE INDEX idx_expenses_home_currency ON expenses(home_currency);
CREATE INDEX idx_expenses_city_id ON expenses(city_id);
CREATE INDEX idx_expenses_receipt_id ON expenses(receipt_id);
CREATE INDEX idx_itineraries_trip_id ON itineraries(trip_id);
CREATE INDEX idx_itineraries_currency ON itineraries(currency);
CREATE INDEX idx_itinerary_items_itinerary_id ON itinerary_items(itinerary_id);
CREATE INDEX idx_itinerary_items_currency ON itinerary_items(currency);
CREATE INDEX idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX idx_trip_members_invited_by_user_id ON trip_members(invited_by_user_id);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX idx_expense_splits_currency ON expense_splits(currency);