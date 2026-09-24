# PS-08 — your data model

**TripWallet — Smart Budget & Expense Companion**  
Kognivera Hackathon 2026 · Travel & Tourism · data model v1.1.0-rc1

> **The problem statement itself, the 24-hour MVP scope and the XR device requirement live in the hackathon application**, on your statement's page. This document is the data you have been given to build it with: every table, every field, and what each one is for.

---

You have **21,751 rows across 15 tables**. 13 of them are the tables this statement is built on; the remaining 2 are reference tables the others point at, included so the database works on its own.

All of it is in the `data/` folder beside this document: as `PS-08.db` (SQLite, indexed, ready to query), as CSV, and as DDL for Postgres and SQLite.

## What the data gives you

600 trip budgets with per-category caps, 2,500 expenses in mixed currencies, 4,700 split lines that sum exactly, 912 dated FX rates, and 200 receipts with ground-truth fields so your OCR can be scored rather than admired.

## Watch out for this one

`amount`/`currency` is what was actually spent; `home_amount`/`home_currency` is the conversion. Never overwrite the original. Splits are allocated by largest remainder.

## The tables this statement is built on

| Table | Rows | What you use it for |
|---|---|---|
| `budgets` | 600 | Trip budget with per-category caps. PS-08's budget-vs-actual and APS-01's spend cap both read this. |
| `cities` | 60 | The geographic anchor of the whole model. 60 cities; every hotel, POI, package, advisory and weather row hangs off one. |
| `countries` | 30 | ISO country reference. Every city, currency default and calling code resolves here. |
| `currencies` | 25 | carries the true minor-unit exponent so JPY/KWD display correctly even though storage is always DECIMAL(12,2). |
| `expense_splits` | 4,735 | per-person share lines allocated by largest remainder, so the parts sum exactly to the whole. 1000 split three ways is 333.34 + 333.33 + 333.33. |
| `expenses` | 2,500 | Logged spend in whatever currency it was actually incurred in — the original is never overwritten by a conversion. |
| `itinerary_items` | 8,583 | The atom of the portal, and the single most-shared object across the thirteen builds. If a team implements one shared shape, this is it. |
| `trip_members` | 1,407 | Membership and role. PS-11's collaborative editing and PS-08's split lines both key off this. |
| `trips` | 600 | The container that gives dates, party, destination and budget to everything else. Seven statements produce or consume one. |
| `users` | 1,200 | The traveller identity every personalisation hangs off. Segmented heavy / light / cold_start so APS-04 can prove cold start. |
| `categories` | 70 | One two-level taxonomy shared by POI type, package theme and expense category — so the three never drift apart. |
| `fx_rates` | 912 | PS-08 cannot convert or settle without a dated rate table. Never overwrite the original amount; convert through here. |
| `receipts` | 200 | receipt images with ground-truth fields, so PS-08's OCR can be scored rather than admired. |

## Reference tables, included so the database is valid

You will mostly join through these rather than think about them.

| Table | Rows | What it is |
|---|---|---|
| `itineraries` | 803 | A versioned plan belonging to a trip. version is what makes PS-11's conflict handling tractable. |
| `languages` | 26 | Rule R6: BCP-47 is the only legal way to say 'language' anywhere in the model. |

## How they fit together

Open `02_DATA_MODEL_DIAGRAM.html` in a browser for the clickable version — it shows these tables and nothing else. Download it first; it will not render inside SharePoint.

Some tables point at "any bookable thing" using an `(entity_type, entity_id)` pair rather than a typed foreign key. That is deliberate: it is what lets one feature refer to a hotel, a flight, a point of interest or a package without a separate join table for each. The legal values of `entity_type` are in `data/enums.json`.

---

## Every field, table by table

Columns marked **PK** are the primary key. **FK** shows what a column points at. Enum columns list their legal values — anything else is rejected by the conformance check.

### `categories`

*Reference & geography · 70 rows · IDs start `cat_`*

One two-level taxonomy shared by POI type, package theme and expense category — so the three never drift apart.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `category_id` | text | **PK** | cat_ prefixed. |
| `code` | text | UNIQUE · NOT NULL | snake_case. |
| `label` | text | NOT NULL |  |
| `parent_category_id` | text | FK → `categories.category_id` | Null for top-level; self-referencing. |
| `applies_to` | text | NOT NULL | poi | package | expense | mixed. |
| `updated_at` | timestamptz | NOT NULL |  |

### `currencies`

*Reference & geography · 25 rows · IDs start `cur_`*

carries the true minor-unit exponent so JPY/KWD display correctly even though storage is always DECIMAL(12,2).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `currency_id` | text | **PK** | cur_ prefixed. |
| `iso4217` | char(3) | UNIQUE · NOT NULL | e.g. INR. |
| `name` | text | NOT NULL |  |
| `symbol` | text | NOT NULL |  |
| `minor_unit_exponent` | smallint | NOT NULL | 0 for JPY/KRW, 2 default, 3 for KWD/BHD. |
| `display_locale` | text | NOT NULL | BCP-47 locale used for formatting. |
| `updated_at` | timestamptz | NOT NULL |  |

### `fx_rates`

*Reference & geography · 912 rows · IDs start `fxr_`*

PS-08 cannot convert or settle without a dated rate table. Never overwrite the original amount; convert through here.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `fx_rate_id` | text | **PK** | fxr_ prefixed. |
| `base_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `quote_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `rate_date` | date | NOT NULL | Rule R4: zoneless calendar date. |
| `rate` | decimal(18,8) | NOT NULL | Not money; a ratio, so higher precision is correct here. |
| `source` | text | NOT NULL | Synthetic feed identifier. |
| `updated_at` | timestamptz | NOT NULL |  |

*Unique together:* `(base_currency, quote_currency, rate_date)`

### `languages`

*Reference & geography · 26 rows · IDs start `lng_` · reference table*

Rule R6: BCP-47 is the only legal way to say 'language' anywhere in the model.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `language_id` | text | **PK** | lng_ prefixed. |
| `bcp47` | text | UNIQUE · NOT NULL | e.g. ta, hi, en-IN — never 'Tamil'. |
| `english_name` | text | NOT NULL |  |
| `native_name` | text | NOT NULL |  |
| `script` | text | NOT NULL | ISO-15924, e.g. Taml, Deva, Latn. |
| `rtl` | bool | NOT NULL | Right-to-left rendering flag. |
| `tts_supported` | bool | NOT NULL | Relevant to PS-13 voice output. |
| `updated_at` | timestamptz | NOT NULL |  |

### `receipts`

*Booking & money · 200 rows · IDs start `rcp_`*

receipt images with ground-truth fields, so PS-08's OCR can be scored rather than admired.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `receipt_id` | text | **PK** | rcp_ prefixed. |
| `file_path` | text | NOT NULL | Relative path inside the media pack. |
| `merchant_name_truth` | text | NOT NULL | Ground truth for OCR scoring. |
| `total_amount_truth` | decimal(12,2) | NOT NULL | D3. |
| `currency_truth` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `date_truth` | date | NOT NULL |  |
| `category_truth` | text | NOT NULL · one of `accommodation`, `transport`, `food`, `activities`, `shopping`, `fees`, `misc` |  |
| `line_items_truth` | text | NOT NULL | JSON string of {label, amount} pairs. |
| `language` | text | FK → `languages.bcp47` · NOT NULL | Mixed-script receipts included on purpose. |
| `image_quality` | text | NOT NULL | clean | skewed | low_light | crumpled. |
| `dataset_split` | text | NOT NULL · one of `train`, `eval` |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `countries`

*Reference & geography · 30 rows · IDs start `cnt_`*

ISO country reference. Every city, currency default and calling code resolves here.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `country_id` | text | **PK** | Canonical ID, cnt_ prefixed. |
| `iso2` | char(2) | UNIQUE · NOT NULL | ISO-3166-1 alpha-2, e.g. IN. |
| `iso3` | char(3) | UNIQUE · NOT NULL | ISO-3166-1 alpha-3, e.g. IND. |
| `name` | text | NOT NULL | English short name. |
| `default_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL | ISO-4217 code. |
| `calling_code` | text | NOT NULL | E.164 country calling code, e.g. +91. |
| `region` | text | NOT NULL | UN sub-region grouping. |
| `updated_at` | timestamptz | NOT NULL | Rule R4: UTC, ISO-8601 with offset. |

### `cities`

*Reference & geography · 60 rows · IDs start `cty_`*

The geographic anchor of the whole model. 60 cities; every hotel, POI, package, advisory and weather row hangs off one.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `city_id` | text | **PK** | cty_ prefixed. |
| `name` | text | NOT NULL | City name. |
| `state` | text |  | State / province, nullable for city-states. |
| `country_id` | text | FK → `countries.country_id` · NOT NULL |  |
| `country_code` | char(2) | NOT NULL | Denormalised ISO2 for convenient joins. |
| `lat` | decimal(9,6) | NOT NULL | Rule R7: WGS-84, 6dp. |
| `lng` | decimal(9,6) | NOT NULL | Rule R7: WGS-84, 6dp. |
| `timezone` | text | NOT NULL | IANA zone, e.g. Asia/Kolkata. |
| `region` | text | NOT NULL | Domestic region grouping, e.g. South India. |
| `population` | int |  | Approximate, for demand weighting. |
| `season_profile` | text | NOT NULL · one of `winter`, `summer`, `monsoon`, `post_monsoon`, `spring`, `autumn` | Dominant season at the peak travel window. |
| `peak_months` | text | NOT NULL | Comma-separated month numbers, e.g. 10,11,12. |
| `primary_language` | text | FK → `languages.bcp47` · NOT NULL | Rule R6: BCP-47 tag. |
| `description` | text |  | One-paragraph orientation blurb, used by PS-13. |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `users`

*Identity & preference · 1,200 rows · IDs start `usr_`*

The traveller identity every personalisation hangs off. Segmented heavy / light / cold_start so APS-04 can prove cold start.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | text | **PK** | usr_ prefixed. |
| `display_name` | text | NOT NULL | Synthetic — no real people (content policy). |
| `email` | text | UNIQUE · NOT NULL | Synthetic @example.invalid addresses only. |
| `home_city_id` | text | FK → `cities.city_id` · NOT NULL |  |
| `home_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `locale` | text | FK → `languages.bcp47` · NOT NULL | UI language, BCP-47. |
| `budget_band` | text | NOT NULL · one of `shoestring`, `value`, `mid`, `premium`, `luxury` |  |
| `travel_style` | text | NOT NULL · one of `budget`, `comfort`, `luxury`, `adventure`, `slow`, `cultural`, `wellness` |  |
| `traveller_type` | text | NOT NULL · one of `solo`, `couple`, `family`, `business`, `friends`, `senior`, `backpacker` |  |
| `segment` | text | NOT NULL · one of `heavy`, `light`, `cold_start` | heavy / light / cold_start cohorts. |
| `date_of_signup` | date | NOT NULL |  |
| `loyalty_tier` | text |  | none | silver | gold — nullable by design. |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` |  |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `trips`

*Trip & itinerary · 600 rows · IDs start `trp_`*

The container that gives dates, party, destination and budget to everything else. Seven statements produce or consume one.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `trip_id` | text | **PK** | trp_ prefixed. |
| `owner_user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `title` | text | NOT NULL |  |
| `origin_city_id` | text | FK → `cities.city_id` |  |
| `destination_city_id` | text | FK → `cities.city_id` · NOT NULL |  |
| `start_date` | date | NOT NULL | Rule R4: zoneless calendar date. |
| `end_date` | date | NOT NULL |  |
| `party_size` | smallint | NOT NULL |  |
| `adults` | smallint | NOT NULL |  |
| `children` | smallint | NOT NULL |  |
| `trip_type` | text | NOT NULL · one of `solo`, `couple`, `family`, `business`, `friends`, `senior`, `backpacker` |  |
| `is_group_trip` | bool | NOT NULL | PS-11 / PS-08 filter. |
| `status` | text | NOT NULL · one of `draft`, `planning`, `confirmed`, `in_progress`, `completed`, `cancelled` |  |
| `home_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `notes` | text |  |  |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `budgets`

*Booking & money · 600 rows · IDs start `bud_`*

Trip budget with per-category caps. PS-08's budget-vs-actual and APS-01's spend cap both read this.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `budget_id` | text | **PK** | bud_ prefixed. |
| `trip_id` | text | FK → `trips.trip_id` · UNIQUE · NOT NULL | One budget per trip. |
| `total_amount` | decimal(12,2) | NOT NULL | D3. |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL | The trip's home currency. |
| `accommodation_cap` | decimal(12,2) |  |  |
| `transport_cap` | decimal(12,2) |  |  |
| `food_cap` | decimal(12,2) |  |  |
| `activities_cap` | decimal(12,2) |  |  |
| `misc_cap` | decimal(12,2) |  |  |
| `alert_threshold_pct` | smallint | NOT NULL | Overspend alert fires above this % of total. |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `expenses`

*Booking & money · 2,500 rows · IDs start `exp_`*

Logged spend in whatever currency it was actually incurred in — the original is never overwritten by a conversion.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `expense_id` | text | **PK** | exp_ prefixed. |
| `trip_id` | text | FK → `trips.trip_id` · NOT NULL |  |
| `payer_user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `category` | text | NOT NULL · one of `accommodation`, `transport`, `food`, `activities`, `shopping`, `fees`, `misc` |  |
| `description` | text | NOT NULL |  |
| `amount` | decimal(12,2) | NOT NULL | as incurred. |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL | As incurred. |
| `home_amount` | decimal(12,2) | NOT NULL | Converted through fx_rates on fx_rate_date. |
| `home_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `fx_rate_date` | date | NOT NULL | Which fx_rates row was used. |
| `incurred_at` | timestamptz | NOT NULL |  |
| `city_id` | text | FK → `cities.city_id` |  |
| `receipt_id` | text | FK → `receipts.receipt_id` | Null where no receipt was captured. |
| `entry_method` | text | NOT NULL | manual | ocr | nl_text | import. |
| `is_settled` | bool | NOT NULL |  |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` |  |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `itineraries`

*Trip & itinerary · 803 rows · IDs start `itn_` · reference table*

A versioned plan belonging to a trip. version is what makes PS-11's conflict handling tractable.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `itinerary_id` | text | **PK** | itn_ prefixed. |
| `trip_id` | text | FK → `trips.trip_id` · NOT NULL |  |
| `name` | text | NOT NULL |  |
| `version` | int | NOT NULL | Monotonic per itinerary. |
| `is_active` | bool | NOT NULL | Exactly one active version per trip. |
| `generated_by` | text | NOT NULL · one of `user`, `ai_planner`, `optimizer`, `agent`, `vote`, `import` | Which subsystem produced this version. |
| `total_cost` | decimal(12,2) | NOT NULL | sum of item costs, half-up at the end. |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `total_duration_minutes` | int | NOT NULL |  |
| `total_carbon_kg` | decimal(10,3) | NOT NULL | APS-09 objective. |
| `optimizer_weights` | text |  | JSON string: {cost, time, carbon} weights that produced it. |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` |  |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `itinerary_items`

*Trip & itinerary · 8,583 rows · IDs start `itm_`*

The atom of the portal, and the single most-shared object across the thirteen builds. If a team implements one shared shape, this is it.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `item_id` | text | **PK** | itm_ prefixed. |
| `itinerary_id` | text | FK → `itineraries.itinerary_id` · NOT NULL |  |
| `day_index` | smallint | NOT NULL | 1-based. |
| `sort_order` | smallint | NOT NULL | Order within the day. |
| `starts_at` | timestamptz |  | Rule R4: offset-carrying; null for unscheduled items. |
| `ends_at` | timestamptz |  |  |
| `item_type` | text | NOT NULL · one of `hotel`, `flight`, `poi`, `package`, `guide`, `transfer`, `meal`, `free` |  |
| `entity_type` | text | one of `hotel`, `room_type`, `rate_plan`, `flight`, `flight_fare`, `poi`, `package`, `package_component`, `guide`, `transfer`, `event`, `xr_scene` | Polymorphic supply reference. |
| `entity_id` | text |  | Canonical ID of the referenced supply row. |
| `title` | text | NOT NULL |  |
| `cost` | decimal(12,2) | NOT NULL | D3. |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `carbon_kg` | decimal(8,3) | NOT NULL |  |
| `duration_minutes` | int | NOT NULL |  |
| `source` | text | NOT NULL · one of `user`, `ai_planner`, `optimizer`, `agent`, `vote`, `import` | user | ai_planner | optimizer | agent | vote — makes a mixed plan auditable. |
| `explanation` | text |  | Where APS-04 and PS-01 surface reasoning without a parallel structure. |
| `locked` | bool | NOT NULL | APS-09 hard constraint: must-see items cannot be dropped. |
| `status` | text | NOT NULL · one of `proposed`, `confirmed`, `removed`, `replaced` | Rule R8: removed items stay visible. |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `trip_members`

*Trip & itinerary · 1,407 rows · IDs start `tmb_`*

Membership and role. PS-11's collaborative editing and PS-08's split lines both key off this.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `member_id` | text | **PK** | tmb_ prefixed. |
| `trip_id` | text | FK → `trips.trip_id` · NOT NULL |  |
| `user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `role` | text | NOT NULL · one of `owner`, `editor`, `viewer` |  |
| `joined_at` | timestamptz | NOT NULL |  |
| `share_weight` | decimal(6,3) | NOT NULL | Default 1.000; custom splits use this. |
| `invited_by_user_id` | text | FK → `users.user_id` |  |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` | Rule R8: departed members stay visible. |
| `updated_at` | timestamptz | NOT NULL |  |

*Unique together:* `(trip_id, user_id)`

### `expense_splits`

*Booking & money · 4,735 rows · IDs start `spl_`*

per-person share lines allocated by largest remainder, so the parts sum exactly to the whole. 1000 split three ways is 333.34 + 333.33 + 333.33.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `split_id` | text | **PK** | spl_ prefixed. |
| `expense_id` | text | FK → `expenses.expense_id` · NOT NULL |  |
| `user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `split_type` | text | NOT NULL · one of `equal`, `custom`, `percentage`, `shares` |  |
| `share_value` | decimal(9,4) | NOT NULL | Weight, percentage or share count depending on split_type. |
| `amount` | decimal(12,2) | NOT NULL | largest-remainder allocated. |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `settlement_status` | text | NOT NULL · one of `outstanding`, `settled`, `written_off` |  |
| `settled_at` | timestamptz |  |  |
| `updated_at` | timestamptz | NOT NULL |  |

*Unique together:* `(expense_id, user_id)`

---

## The rules that apply to these fields

| # | Rule |
|---|---|
| R1 | **Additive only.** Add columns, tables and stores freely. Never rename, drop or repurpose a field that came with the data. |
| R2 | **IDs are opaque prefixed strings** — `htl_a91f3c`. Never integers, never parsed for meaning. |
| R3 | **Money is a pair**: a 2-place decimal plus an ISO-4217 currency code. Never a float. |
| R4 | **Time is ISO-8601 with an offset.** `_at` fields carry an offset; `_date` fields have no zone. |
| R5 | **Enums are lowercase snake_case** and the legal values are in `data/enums.json`. |
| R6 | **Language is a BCP-47 tag** — `ta`, not "Tamil". |
| R7 | **Geography is WGS-84** to 6 decimal places, `lat` and `lng` together or not at all. |
| R8 | **Nothing is hard-deleted.** Rows carry `status` and `updated_at`. |

Add whatever you like beside these fields — new columns, new tables, your own vector store, your own services. That is the point of R1. What you must not do is rename or re-key the fields that came with the data, because that is what would stop sixteen independent builds being put together afterwards.

`data/WORKING_WITH_THE_DATA.md` has the loading instructions, including how to read money without corrupting it. `tools/validate_conformance.py` tells you in thirty seconds whether you are still conformant.
