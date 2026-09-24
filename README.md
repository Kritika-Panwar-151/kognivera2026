# Ctrl+Shift+Win — TripWallet (PS-08)
> **KogniVera Hackathon 2026 · 24-Hour Sprint**  
> **Team:** Ctrl+Shift+Win · **Institution:** BMS College of Engineering  
> **Problem Statement:** PS-08: TripWallet — Smart Budget & Expense Companion

---

## 1. Team & Problem Statement
* **Team Name:** Ctrl+Shift+Win
* **Problem Statement:** `PS-08` — TripWallet — Smart Budget & Expense Companion
* **Target Track:** Travel & Tourism
* **Team Lead & Account:** `Kritika-Panwar-151` (`kritikapanwar.cs24@bmsce.ac.in`)

---

## 2. What We Built (MVP Checklist)
TripWallet transforms travel financial management from reactive bookkeeping into a proactive, intelligent travel companion:
1. **Mobile-First Responsive Experience:** Native phone layout with fixed 5-tab bottom navigation (`Dashboard`, `Trips`, `Expenses`, `Guardian`, `Settle`) and sticky mobile header.
2. **Trip Travellers & Party Telemetry:** Explicit breakdown of Adults vs. Children (`3 Adults · 0 Children`), enforcing that **group split calculations apply exclusively to adults** while children are info-only.
3. **Multi-Currency Logging & Dated FX:** Incurred currency/amount preserved alongside converted home currency via 912 dated conversion rates from the canonical `fx_rates` database.
4. **Two-Tier Expenses Architecture:**
   * **Card 1 (Personal Hub):** Universal across trips, scan & add actions, flexible multi-member split selection, excluded from group budget.
   * **Card 2+ (Trip Cards):** Card-wise group expenses split equally among group members via Largest Remainder.
5. **AI Receipt Scanner & OCR Verification:** Multimodal vision extraction benchmarking against 200 ground-truth receipts, displaying an authentic thermal paper receipt preview with line items and stacked editable fields.
6. **Zero-Drift Group Settlement:** Person-to-person debt resolution with inline 1-tap `[ Settle ]` buttons and Hamilton-Hare Largest Remainder integer math.
7. **Conversational AI Travel Guardian:** Factuality-grounded copilot answering questions on scheduled daily itineraries with activity cards, September 2026 monthly cross-trip spend (₹37,792 INR), category caps, and Hindi NLP.
8. **What-If Scenario Simulator:** Prospective outlay tester recalculating remaining safe daily runway before money is spent.

---

## 3. Architecture
Decoupled cloud architecture connecting mobile frontend, backend API, canonical data model, and multimodal AI services:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND TIER (React 19 + Vite 6)                   │
│                                                                          │
│   TopBar (Active Trip · Quick FX · Persona Switcher)                     │
│   ├── features/trip-travellers-and-party/ (Travellers & Party Bar)       │
│   ├── features/overall-budget/            (Donut Gauge & Daily Runway)   │
│   ├── features/category-spending/         (Expandable Category Caps)     │
│   ├── features/expenses-hub/              (Personal Hub + Trip Cards)    │
│   ├── features/receipt-ocr/               (Paper Preview + OCR Fields)   │
│   ├── features/group-settlement/          (Inline Settle & Split Math)   │
│   ├── features/ai-guardian/               (Chatbot & Itinerary Cards)    │
│   └── features/what-if-simulator/         (Prospective Runway Simulator) │
│   BottomNav (Dashboard · Trips · Expenses · Guardian · Settle)           │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ HTTPS REST / SDK
┌─────────────────────────────────▼────────────────────────────────────────┐
│                      BACKEND TIER (Node.js / Express)                    │
│                                                                          │
│   • /api/splits/largest-remainder (Hamilton-Hare zero-drift engine)     │
│   • /api/fx/convert               (Dated exchange rate conversion)       │
│   • /api/ocr                      (Receipt field extraction router)      │
└─────────────────┬──────────────────────────────────────┬─────────────────┘
                  │                                      │
┌─────────────────▼──────────────────┐ ┌─────────────────▼─────────────────┐
│        DATA MODEL TIER             │ │       AI & COGNITIVE TIER         │
│                                    │ │                                   │
│  • SQLite / Cloud Firestore        │ │  • Google Gemini Flash Vision API │
│  • 15 Canonical PS-08 Tables       │ │  • Grounded Conversational Copilot│
│  • Seed: PS-08.db (21,751 rows)    │ │  • Multi-Script Receipt OCR       │
└────────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 4. Data Model Usage (Canonical PS-08 Compliance)
TripWallet uses all 15 canonical tables from `data-model/schema.sql` (and `data-model/seed/PS-08.db`) without modifying or renaming any fields (**Rule R1: Additive Only**):

* **D1 — `trips`:** Trip metadata, destination city, dates, `adults`, `children`, `party_size`, `home_currency`.
* **D2 — `budgets`:** Total budget fund, `accommodation_cap`, `food_cap`, `transport_cap`, `activities_cap`, `misc_cap`.
* **D3 — `expenses`:** Original `amount`/`currency` + converted `home_amount`/`home_currency`, `fx_rate_date`, `payer_user_id`.
* **D4 — `expense_splits`:** Per-person splits allocated via Largest Remainder across `equal`, `custom`, `percentage`, `shares`.
* **D5 — `fx_rates`:** 912 dated conversion rates (`decimal(18,8)`).
* **D6 — `receipts`:** 200 ground-truth receipt records across `clean`, `skewed`, `low_light`, `crumpled`.
* **D7 — `users`:** Synthetic traveler profiles (`usr_` prefix) defining travel style, home city, default currency.
* **D8 — `trip_members`:** Membership roles (`owner`, `editor`, `viewer`) and shares.
* **D9 — `cities` / `countries` / `currencies` / `languages`:** Global reference anchors with BCP-47 locale tags and WGS-84 coordinates.
* **D10 — `itineraries` & `itinerary_items`:** Versioned day-by-day scheduled plans, POI coordinates, ticket costs, and carbon estimates.

---

## 5. AI Features & Grounding
* **Multimodal Vision OCR (`ai/pipeline.ts`):** Extracts merchant name, total, currency, date, and line items from receipt photos. Grounded strictly in visual tokens and validated against canonical enums.
* **Conversational AI Guardian (`features/ai-guardian/`):** Answers queries regarding today's scheduled itinerary (Colosseum, Roman Forum, Vatican), cross-trip monthly spend aggregation (₹37,792 INR in September 2026), and safe daily limits. Factually grounded in database computations.
* **Multilingual Capability:** Understands natural English as well as Hindi/Hinglish (*"Mera total budget aur kharcha batao"*).

---

## 6. Run It Locally

### Prerequisites
* Node.js $\ge 20.0.0$
* npm or pnpm

### Step-by-Step Instructions

```bash
# 1. Clone the repository
git clone https://github.com/kognivera-org/kv-hack2026-ctrl-shift-win.git
cd kv-hack2026-ctrl-shift-win

# 2. Configure Environment Variables
cp .env.example .env

# 3. Install & Start Frontend
cd frontend
npm install
npm run dev
# -> Open http://localhost:8443 (or displayed port) in your browser

# 4. (Optional) Run Backend API
cd ../backend
npm install
npm run dev
# -> Backend runs on http://localhost:5000
```

---

## 7. Demo Path (Terminal Outcome in 4 Steps)
1. **Explore Dashboard & Party:** View active *Europe Adventure* trip, notice the **Trip Travellers & Party Members bar** displaying 3 Adults, 0 Children with the rule *"Accounts: Adults Only"*, and check the Budget Donut Gauge.
2. **Scan Receipt / Log Expense:** 
   * Navigate to **Expenses** $\to$ Click **`📸 Scan Receipt`** $\to$ Click **`✨ Try Sample Milan Restaurant Receipt (€42.00)`**.
   * Watch the animated scanning bar, review the **realistic paper receipt preview**, verify the extracted fields stacked below, and click **`Confirm & Save to Ledger`**.
3. **Resolve Group Settlement:** 
   * Tap **Settle** on the bottom navigation bar.
   * View the calculation summary (**You Are Owed: +₹2,000**, **You Owe: -₹500**, **Net: +₹1,500**).
   * Click the inline **`[ Settle ]`** button directly next to Asha Patel or Ravi Sharma to toggle settled status.
4. **Consult AI Travel Guardian:**
   * Tap **Guardian** on the bottom navigation bar.
   * Ask: *"Show today's itinerary & bookings"* to view scheduled activity cards.
   * Ask: *"What is my total month spend for September?"* to see consolidated ₹37,792 INR spend across all trips.

---

## 8. Tests & Proof

### 1. Hard Proof Test — PS-08 Data Conformance
Validates all 15 tables and 8 rules against `data-model/seed/PS-08.db`:
```bash
python tests/validate_conformance.py data-model/seed/PS-08.db
# Output: PASS: All tables, rules R1-R8 and data constraints conform to PS-08.
```

### 2. Mathematical Split Proof — Largest Remainder Allocation
Proves zero float drift ($\sum \text{splits} \equiv \text{total}$) across odd decimal divisions:
```bash
npx tsx tests/largest_remainder.test.ts
# Output: ✓ Result: 35/35 tests passed with 0.00 float drift.
# PROOF CONFIRMED: Sum of shares strictly equals total amount in all cases.
```
