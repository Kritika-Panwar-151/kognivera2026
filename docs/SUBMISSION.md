# PS-08 Design Submission
## TripWallet — Smart Budget & Expense Companion
**Kognivera Hackathon 2026 · Travel & Tourism Track**

---

## 1. Cover

* **Team Name:** Team TripWallet / Kognivora
* **Problem Statement ID & Title:** `PS-08` — TripWallet — Smart Budget & Expense Companion
* **Target Track:** Travel & Tourism (24-hour sprint)
* **Team Members & Roles:**
  * **Team Lead & Full-Stack Architect:** Primary mobile application architecture, state management, and Firebase cloud integrations.
  * **AI / ML Engineer:** Gemini Flash multimodal integration, OCR receipt pipeline, itinerary intelligence, prompt grounding, and evaluation harness.
  * **Frontend & UX Specialist:** Mobile-first React 19 UI, bottom navigation architecture, responsive design system, and multi-currency formatting.
  * **Data Engineer & QA:** SQLite/Firestore schema integrity, PS-08 Rules R1–R8 conformance, and Largest Remainder mathematical verification.

---

## 2. Problem Understanding

When travellers journey abroad or embark on group adventures, financial management quickly disintegrates into stressful administrative overhead. Travel finance suffers from four interrelated friction points:

1. **Multi-Currency Blindness:** Spending in foreign currencies (e.g. paying €42 for lunch in Rome or 1,200 THB in Bangkok) leads to psychological detachment from real costs. Travelers either overspend rapidly or face friction manually calculating exchange rates.
2. **The Receipt Black Hole:** In transit, physical paper receipts are crumpled, lost, or recorded days late. Manual transcription of foreign-language line items into spreadsheets is tedious and error-prone.
3. **Group Split Friction & Cent Drift:** Group travel splits frequently lead to interpersonal tension and confusion. Standard division algorithms introduce rounding errors and float discrepancies that erode trust.
4. **Reactive Instead of Predictive Budgeting:** Traditional expense trackers are post-mortem ledgers—they tell travelers where money was spent *yesterday*, not whether they can afford a ₹3,000 dinner *tonight* without blowing their overall trip fund.

**Our Mission:** TripWallet transforms travel finance from reactive post-trip bookkeeping into a proactive, intelligent travel companion. Built as a native mobile-first web app with a fixed bottom navigation bar, TripWallet pairs instant OCR receipt extraction with dated FX conversions, largest-remainder split allocations, and a continuous conversational AI Travel Guardian with complete itinerary and monthly spend awareness.

---

## 3. Scope: 24-Hour MVP vs. Deliberately Left Out

To ensure a working, polished build within 24 hours without over-promising, we have set a strict scope boundary.

| # | What We Build in 24 Hours (MVP Scope) | What We Deliberately Leave Out | Why It Was Cut (Judgement Rationale) |
|---|---|---|---|
| **1** | **Core Trip & Group Budget Creation:** Destination, dates, party breakdown (adults + children), overall fund, and category caps. | Automated multi-destination flight booking engines. | Booking integrations require external GDS credentials and do not serve the core financial companion goal. |
| **2** | **Multi-Currency Expense Logging:** Original currency/amount preserved alongside converted home currency. | Live bank account / credit card scraping (Plaid/Open Banking). | High authentication failure risk and international sandbox latency during a 24-hr sprint. |
| **3** | **Automated FX Conversion via Dated Rates:** Instant conversion through 912 dated FX rates from `fx_rates`. | High-frequency live forex trading speculation. | Travel budgets need historical accuracy and deterministic rates, not trading volatility. |
| **4** | **AI Receipt Scanner (OCR Verification):** Upload receipt image, extract merchant, date, amount, currency, category, and review before save. | Full manual receipt bounding-box polygon editor. | A simple verified form confirmation gives 95% of the value in 5% of the interaction time. |
| **5** | **Group Splits via Largest Remainder:** 4 split types (`equal`, `custom`, `percentage`, `shares`) with zero cent drift. | In-app fiat UPI/SWIFT settlement gateway execution. | Payment gateways require bank merchant KYC; visual settlement debt matrix + 1-click status tracking is sufficient. |
| **6** | **Person-Wise Settlement Matrix:** Simplified net debt graph ("Who Owes Whom") with inline 1-click settlement buttons for both "You Are Owed" and "You Owe". | Complex multi-currency international wire transfers. | Peer-to-peer settlement happens via local cash/UPI; tracking net debt is the real pain point. |
| **7** | **AI Travel Guardian Chatbot:** Conversational chatbot with full itinerary schedules, monthly cross-trip spend aggregation, and safe daily runway advice. | Unconstrained generic chatbot answering broad world trivia. | Guardrailing the LLM strictly to trip financial & itinerary parameters ensures 100% factual, grounded answers. |
| **8** | **What-If Scenario Simulator:** Test prospective expenses with live daily runway impact before incurring them. | Real-time dynamic hotel room re-pricing simulations. | Focuses strictly on traveler financial runway rather than inventory management. |
| **9** | **Multilingual AI Interface:** Support for Hindi (`hi`), Hinglish, and English (`en-IN`). | Full 26-language speech synthesis. | Text-based bilingual parity fulfills the hackathon requirement with zero latency bottlenecks. |

---

## 4. User Journey

```
[ 1. Top App Bar: Quick Persona Switcher & Global FX Converter ]
                            │
                            ▼
[ 2. Fixed Bottom Nav ] ──► [ Dashboard ] · [ Trips ] · [ Expenses ] · [ Guardian ] · [ Settle ]
                            │
       ┌────────────────────┼─────────────────────────┐
       ▼                    ▼                         ▼
[ Trip Dashboard ]    [ Expenses Hub ]       [ AI Travel Guardian ]
 • Party Breakdown:    • Card 1: Personal     • Conversational Chat
   3 Adults, 0 Child     & Flexible Hub        • Itinerary Schedule
   (Accounting among     (Scan & Add button,     & Activity Cards
    adults only)         custom splits)        • Month Total Spend
 • Donut Budget Gauge  • Card 2+: Trip Group     across all trips
 • Category Caps         Expenses (Card-wise   • Affordability math
 • AI Guardian Status    split among all         ("Can I afford ₹3k?")
 • What-If Trigger       trip members)         • Hindi / Hinglish NLP
       │                    │                         │
       └────────────────────┼─────────────────────────┘
                            ▼
               [ Group Settlement Ledger ]
                • Calculation Summary (Owed vs Owe vs Net)
                • "People Who Owe You" + inline [Settle] button
                • "People You Owe" + inline [Settle] button
                • Largest Remainder zero-drift guarantee
```

### Key Screen Descriptions

1. **Trip Dashboard:** Mobile hero banner with active destination, budget donut gauge, expandable category caps drawer (Stay, Food, Transport, Activities, Misc), **Trip Travellers & Party Members bar** (avatars, names, roles, adult vs. child breakdown), and upgraded AI Guardian status with 3 live statistics cards and direct triggers for **"Ask AI Guardian"** and **"What-If Simulation"**.
2. **Expenses Hub:** Two distinct architectural cards:
   * **Card 1: Personal & Flexible Expenses Hub** for individual spending across any trip with direct `📸 Scan Receipt` and `+ Add Expense` buttons and flexible member splitting.
   * **Card 2+: Trip-Specific Expenses Cards** displaying each shared expense card-wise with equal group split allocation among all trip members.
3. **AI Travel Guardian Chatbot:** Dedicated conversational interface answering natural language questions about daily itinerary schedules, bookings, tickets, total monthly spend across all trips (September 2026: ₹37,792 INR), category caps, and Hindi queries (*"Mera budget kitna bacha hai?"*).
4. **What-If Simulator:** Mobile-first calculator with responsive category chips, multi-currency support, and before/after daily runway variance.
5. **Group Settlement Ledger:** Calculates net positions and renders inline `[ Settle ]` / `[ ✓ Settled ]` toggle buttons right next to each person.

---

## 5. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MOBILE CLIENT TIER (React 19 + Vite 6 + Tailwind v4)         │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Top App Bar: Trip Brand · Active Trip Badge · Global FX · Persona Switch│   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   ┌───────────────┐   ┌─────────────────────────┐   ┌───────────────────────┐   │
│   │ Dashboard UI  │   │  Expenses Hub UI        │   │  Group Settlement UI  │   │
│   │ • Donut Gauge │   │  • Card 1: Personal Hub │   │  • Owed vs Owe        │   │
│   │ • Party Bar   │   │  • Card 2+: Trip Cards  │   │  • Inline Settle Btn  │   │
│   │ • AI Stats    │   │  • Member Split Filter  │   │  • Net Balance Matrix │   │
│   └───────┬───────┘   └───────────┬─────────────┘   └───────────┬───────────┘   │
│           │                       │                             │               │
│   ┌───────┴───────────────────────┴─────────────────────────────┴───────────┐   │
│   │                    Core Financial & Logic Services                      │   │
│   │      • Largest Remainder Split Engine • Multi-Currency FX Engine        │   │
│   │      • Itinerary & Monthly Spend Cache • IndexedDB Local Persistence    │   │
│   └───────────────────────────────────────┬─────────────────────────────────┘   │
│                                           │                                     │
│   ┌───────────────────────────────────────▼─────────────────────────────────┐   │
│   │ Fixed Bottom Navigation Bar: Dashboard · Trips · Expenses · Guardian · Settle│
│   └───────────────────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────────────────────┼─────────────────────────────────────┘
                                            │
                             HTTPS REST / Cloud SDK
                                            │
┌───────────────────────────────────────────▼─────────────────────────────────────┐
│                       SERVERLESS BACKEND TIER (Firebase)                        │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Firebase Authentication (User Personas: Aisha, Ravi, Pooja, David)      │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Cloud Firestore (15 PS-08 Collections):                                 │   │
│   │ • /trips, /budgets, /expenses, /expense_splits, /fx_rates               │   │
│   │ • /users, /itineraries, /itinerary_items, /receipts, /trip_members      │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Cloud Storage: /receipts/{trip_id}/{id}.jpg, /memories/{trip_id}/...    │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Cloud Functions: OCR Trigger, Debt Graph Minimizer, Rate Normalizer     │   │
│   └───────────────────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────────────────────┼─────────────────────────────────────┘
                                            │
                                  Direct AI Inference
                                            │
┌───────────────────────────────────────────▼─────────────────────────────────────┐
│                          AI & COGNITIVE SERVICES (Gemini)                       │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Gemini Flash Vision API: Receipt OCR Extraction against 200 ground-truth│   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Gemini Copilot: Grounded Q&A on Itinerary, Monthly Spend & Hindi NLP    │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Flow Diagram: End-to-End Receipt OCR & Split Allocation

```
[ Traveler captures/uploads receipt ]
                │
                ▼
[ Cloud Storage stores raw receipt image ]
                │
                ▼
[ Gemini Flash Vision extracts: Merchant, Total, Currency, Date, Category ]
                │
                ▼
[ Cross-reference fx_rates on fx_rate_date ]
  ↳ Compute home_amount = amount * fx_rate
                │
                ▼
[ User reviews & verifies extracted fields in UI confirmation modal ]
                │
                ▼
[ Check Classification: ]
  ├──► [ Personal Expense ] ──► Select specific members to split (or self only)
  │                              ↳ Excluded from shared group trip budget fund
  └──► [ Shared Trip Expense ] ──► Execute Largest Remainder Split:
                                 ↳ Base Share = floor(Total * 100 / N) / 100
                                 ↳ Remainder = Total - sum(Base Shares)
                                 ↳ Allocate +0.01 to first R adults
                                 ↳ Deduct from trip budget & update category cap
                │
                ▼
[ Commit to Firestore: expenses + expense_splits ]
  ↳ Update safe daily runway: safeDaily = remainingFund / daysLeft
```

---

## 7. Data Model Usage (PS-08 Adherence)

We use all 15 canonical tables without renaming or altering any existing fields (strictly honoring **Rule R1: Additive Only**):

1. `trips`: Stores trip container, destination city ID, start/end dates, `adults`, `children`, `party_size`, and `home_currency`.
2. `budgets`: Holds `total_amount`, currency, category caps (`accommodation_cap`, `transport_cap`, `food_cap`, `activities_cap`, `misc_cap`), and `alert_threshold_pct`.
3. `expenses`: Records as-incurred spend with original `amount`/`currency` alongside converted `home_amount`/`home_currency`, `fx_rate_date`, `payer_user_id`, and `receipt_id`.
4. `expense_splits`: Stores per-person split records allocated via the Largest Remainder method across `equal`, `custom`, `percentage`, and `shares` modes.
5. `fx_rates`: Provides 912 dated conversion ratios (`decimal(18,8)`) for deterministic multi-currency normalization.
6. `receipts`: Contains 200 ground-truth receipt records across difficulty gradients (`clean`, `skewed`, `low_light`, `crumpled`) used to benchmark OCR accuracy.
7. `users`: Synthetic user profiles (`usr_` prefix) defining travel style, home city, locale, and default currency.
8. `trip_members`: Membership associations with roles (`owner`, `editor`, `viewer`) and `share_weight`.
9. `cities`: Geographic anchor containing coordinates, timezone, region, and primary language.
10. `countries`: ISO-3166-1 country lookup resolving calling codes, ISO2/3, and default currencies.
11. `currencies`: ISO-4217 currency metadata with `minor_unit_exponent` (0 for JPY, 2 for INR/EUR/USD, 3 for KWD).
12. `languages`: BCP-47 language reference ensuring valid locale handling (`hi`, `ta`, `en-IN`).
13. `categories`: Two-level taxonomy matching expense categories to activities and POIs.
14. `itineraries`: Versioned plans tracking planned cost and carbon footprint (`total_carbon_kg`).
15. `itinerary_items`: Atomic scheduled activities linking planned cost against actual expense line items.

### Strict Rules Compliance:
* **R1:** Additive only — no canonical fields dropped or repurposed.
* **R2:** All IDs are opaque string prefixed (`trp_`, `exp_`, `bud_`, `spl_`, `rcp_`, `usr_`).
* **R3:** Money is stored as 2-place decimal strings; splits use largest remainder. No float drift.
* **R4:** Dates are zoneless ISO-8601 (`_date`), instants carry UTC offsets (`_at`).
* **R5:** All enums are lowercase `snake_case`.
* **R6:** Language tags use strict BCP-47 (`hi`, `en-IN`).
* **R7:** WGS-84 coordinate precision to 6 decimal places.
* **R8:** Soft deletion via `status` field.

---

## 8. AI Features & Grounding

### Feature A: AI Receipt Extraction & Ground-Truth Scoring
* **What it does:** Extracts merchant name, total amount, currency, transaction date, and expense category from uploaded receipt photos.
* **Grounding:** The prompt instructs the model to extract values strictly present in the image and cross-reference extracted currency and category against `data/enums.json`.
* **Measurement & Target:** Benchmarked against the 200 supplied ground-truth receipts in `receipts`. Target: **$\ge 92\%$ field accuracy** on `eval` split clean images and $\ge 80\%$ on skewed/low-light images.

### Feature B: Conversational AI Travel Guardian & Itinerary Copilot
* **What it does:** Real-time conversational chatbot answering questions about daily itinerary schedules, booking timings, total monthly spend across all trips (September 2026: ₹37,792 INR), category caps, and affordability (*"Can I afford a ₹3,000 dinner tonight?"*).
* **Grounding:** Prompt is bound to exact database computations: `trip.budget`, `trip.spent`, `remaining`, `days_left`, `daily_avg`, `safe_daily_limit`, and `itinerary_items`.
* **Bilingual Support:** Understands queries in English and colloquial Hindi / Hinglish (*"Mera total budget aur kharcha batao"*).

### Feature C: What-If Scenario Simulator
* **What it does:** Simulates prospective purchases and calculates their impact on the trip's safe daily allowance and final projected outcome before any money is spent.
* **Grounding:** Takes live `budgets` and `expenses`, applies the hypothetical amount converted via `fx_rates`, and returns deterministic variance calculations.

---

## 9. Business Benefits

1. **Elimination of Financial Travel Anxiety:** Travelers know their exact safe daily runway in real time, preventing sudden post-trip credit card shock.
2. **Zero Dispute Group Settlements:** By enforcing the Largest Remainder algorithm, group balances sum exactly to the penny, eliminating interpersonal friction over unrounded cents.
3. **Automated Expense Accounting:** Instant OCR receipt processing reduces expense logging time from 4 minutes per receipt to under 10 seconds.
4. **Partner & Travel Agency Value:** Travel providers and booking engines can leverage TripWallet's budget telemetry to recommend affordable personalized excursions and dining options when a traveler is pacing under budget.

---

## 10. Tech Stack

* **React 19:** State-of-the-art frontend library for concurrent rendering and instant state updates.
* **TypeScript 5.7:** Strict end-to-end type safety preventing runtime null/undefined bugs.
* **Tailwind CSS v4:** High-performance utility styling with zero config overhead.
* **Vite 6:** Ultra-fast bundling, hot module replacement, and instant production builds.
* **Firebase Cloud Firestore:** Scalable real-time document database mirroring the 15 relational tables.
* **Firebase Authentication:** Multi-user persona management and role-based trip access.
* **Google Gemini API:** Fast, cost-effective multimodal LLM for receipt OCR and grounded conversational budgeting.
* **Vercel:** Global edge deployment with automatic preview builds and sub-second asset caching.

---

## 11. 24-Hour Sprint Plan

| Time Block | Milestone & Tasks | Team Ownership |
|---|---|---|
| **Hours 00:00 – 04:00** | **Environment & Scaffold Lock:** Verify clean build, initialize Firestore collections, seed canonical SQLite data, configure Vercel CI/CD pipeline. | Full Team |
| **Hours 04:00 – 08:00** | **Core Financial Flow:** Implement multi-currency expense ledger, dated FX conversions, and Largest Remainder split logic. | Full-Stack & Data Lead |
| **Hours 08:00 – 12:00** | **Receipt OCR Pipeline:** Wire up camera/file upload, connect Gemini Vision API, and test extraction against ground truth receipts. | AI & Frontend Lead |
| **Hours 12:00 – 16:00** | **Dashboard & AI Guardian:** Build expandable category caps drawer, person-wise settlement screen, and grounded Q&A modal. | Frontend & AI Lead |
| **Hours 16:00 – 20:00** | **Multilingual & Edge Polish:** Add Hindi/English language toggle, currency formatting (JPY/INR/EUR), and complete error boundaries. | Full Team |
| **Hours 20:00 – 21:00** | **Feature Freeze (09:00 Rule):** Stop all feature development. No new code. | Strict Stop |
| **Hours 21:00 – 23:00** | **Demo Stabilization & Offline Fallback:** Record backup demo video, verify offline state, test on display adapter. | Full Team |
| **Hours 23:00 – 24:00** | **Presentation Rehearsal:** Run through live demo twice on presentation laptop. Final submission verification. | Full Team |

---

## 12. Risks and Fallbacks

1. **Risk 1: Venue Wi-Fi Failure or High Latency During Live Demo**
   * *Fallback:* TripWallet operates with local IndexedDB caching and embedded synthetic seed data. If connectivity drops, all dashboard metrics, split calculations, and What-If simulations run entirely client-side. A pre-recorded high-definition video of the live OCR flow is cached on the presenter's laptop.
2. **Risk 2: AI Vision API Rate Limits or Timeout on Complex Receipt**
   * *Fallback:* The application incorporates a deterministic regex/heuristic fallback parser combined with cached ground-truth extractions from `receipts` table. If the API latency exceeds 4 seconds, the UI gracefully falls back to pre-parsed sample receipt data.
3. **Risk 3: Multi-Currency Rounding Discrepancies in Group Splits**
   * *Fallback:* All split operations are gated through our verified Largest Remainder allocation function, covered by unit tests that assert $\sum \text{splits} \equiv \text{expense}$ to zero tolerance before any transaction can be committed.

---

## 13. Multilingual Approach

* **Supported Languages:** English (`en-IN`), Hindi (`hi`), and Hinglish.
* **Where They Appear:**
  1. **User Interface:** UI headers, status badges, and financial guidance available in localized terminology (e.g. *"Trip Budget"* / *"कुल बजट"*, *"Remaining"* / *"शेष राशि"*).
  2. **AI Copilot Responses:** The AI Guardian detects queries posed in Hindi (e.g., *"Mera total budget aur kharcha batao"*) and responds fluently in colloquial Hindi/Hinglish with accurate figures.
  3. **Receipt Parsing:** Multi-script receipt detection supporting Hindi (Devanagari), Tamil, and Latin merchant names as provided in the `receipts` dataset.

---

## 14. XR Device Declaration

* **Statement Requirement:** TripWallet includes an **"Explore Destination in XR"** portal leveraging `itinerary_items.entity_type = 'xr_scene'`.
* **Demo Device:** Standard Android / iOS Smartphone supporting WebXR and Google Chrome mobile AR viewer, with desktop WebGL 360° fallback.
* **Ownership & Status:** Tested and pre-loaded on team demo hardware with zero external headset dependencies required.
