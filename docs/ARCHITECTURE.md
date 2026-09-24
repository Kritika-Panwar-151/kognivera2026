# TripWallet — Technical Stack & Architecture Blueprint
**Problem Statement: PS-08 · Kognivera Hackathon 2026**
*Document Version: 2.0.0 · Target Stack: React 19 + TypeScript + Firebase Backend + Google Gemini AI*

---

## 1. System Architecture Overview

TripWallet is engineered with a modern decoupled cloud architecture combining a high-performance **Mobile-First React 19 Single Page Application (SPA)** with a serverless **Firebase Cloud Backend** and a multimodal **AI Cognitive Tier (Google Gemini)**.

The system is designed for zero-latency mobile usability, supporting both an **offline demo mode** (backed by SQLite/IndexedDB seed data) and a **cloud production mode** (backed by Firebase Firestore, Cloud Storage, and Cloud Functions) without altering application business logic.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT APPLICATION LAYER                                │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Top App Bar: Trip Brand · Active Trip Badge · Global FX · Persona Switcher     │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                        React 19 Presentation Components                        │   │
│   │   • TripDashboard (Party Breakdown Bar, Donut Gauge, Expandable Category Caps) │   │
│   │   • ExpenseHistory (Card 1: Personal Hub | Card 2+: Per-Trip Group Ledgers)    │   │
│   │   • AIGuardian (Conversational Chatbot: Itinerary Schedules & Monthly Spending)│   │
│   │   • WhatIf (Mobile-First Decision Simulator with Daily Runway Recalculation)   │   │
│   │   • GroupSettlement (Inline Settle Buttons, "You Are Owed" & "You Owe" Matrix) │   │
│   │   • ReceiptScanner & OCRConfirm (Side-by-Side Visual Verification)             │   │
│   │   • LoginScreen (Persona Switcher supporting PS-08 Synthetic Identities)       │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│   ┌───────────────────────────────────────▼────────────────────────────────────────┐   │
│   │                         Client State & Utility Layer                           │   │
│   │   • Largest Remainder Allocation Engine (Zero Cent Drift Splitting)            │   │
│   │   • Multi-Currency Dated Engine (912 Exchange Rates from `fx_rates`)           │   │
│   │   • Local IndexedDB Cache & Offline Fallback Controller                        │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│   ┌───────────────────────────────────────▼────────────────────────────────────────┐   │
│   │ Fixed Bottom Navigation Bar: Dashboard · Trips · Expenses · Guardian · Settle  │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │
                    HTTPS REST / gRPC WebSockets / Cloud SDK
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                        SERVERLESS BACKEND TIER (Firebase)                              │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Firebase Authentication                                                        │   │
│   │ • User Identity management (`usr_` prefixed IDs)                               │   │
│   │ • JWT claims carrying Trip Roles (`owner`, `editor`, `viewer`)                 │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Cloud Firestore (NoSQL Document Store mirroring PS-08 Schema)                 │   │
│   │ • Collections: /trips, /budgets, /expenses, /expense_splits, /fx_rates         │   │
│   │ • Reference Collections: /users, /cities, /countries, /currencies, /receipts   │   │
│   │ • Atomic transactions for split allocations and budget spend aggregations      │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Firebase Cloud Storage                                                         │   │
│   │ • Bucket: /receipts/{trip_id}/{receipt_id}.jpg                                 │   │
│   │ • Bucket: /memories/{trip_id}/{photo_id}.jpg                                   │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Firebase Cloud Functions (Node.js 20 / TypeScript)                             │   │
│   │ • `onReceiptUploaded`: Storage trigger firing Gemini Vision OCR pipeline        │   │
│   │ • `calculateSettlement`: Pairwise graph minimization algorithm                  │   │
│   │ • `convertCurrency`: Historical rate lookup against `fx_rates` collection      │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │
                               REST API / gRPC Calls
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                              AI & COGNITIVE SERVICES                                   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Google Gemini Flash (Multimodal Vision API)                                    │   │
│   │ • Extracts merchant, date, total, currency, line items from receipt photos     │   │
│   │ • Benchmarked against 200 ground-truth records in `receipts` table             │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Google Gemini (Conversational Financial & Itinerary Copilot)                   │   │
│   │ • Grounded Q&A on Day-by-Day Itineraries, Activity Timings & Bookings          │   │
│   │ • Monthly cross-trip spending aggregation (Europe + Goa + Personal = ₹37,792)  │   │
│   │ • Multilingual NLP support (English `en-IN`, Hindi `hi`, Hinglish)             │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Technology Stack

| Layer | Tool / Library | Version | Technical Justification |
|---|---|---|---|
| **Core Framework** | **React** | `^19.2.4` | Modern component architecture, seamless concurrent rendering, instant UI responsiveness. |
| **Language** | **TypeScript** | `^5.9.3` | Strict compile-time type safety preventing runtime undefined errors in multi-currency arithmetic. |
| **Styling** | **Tailwind CSS v4** | `^4.2.2` | Zero-runtime CSS extraction with `@tailwindcss/vite`, modern utility classes, flexible responsive breakpoints. |
| **Bundler / Server** | **Vite** | `^6.2.0` | Ultra-fast HMR and optimized production asset minification with sub-3s build times. |
| **Navigation** | **Fixed Mobile Bar** | Custom | Touch-optimized 5-tab bottom navigation with active pill indicators and sticky top app bar. |
| **Icons & Visuals** | **SVG System** | Native | Ultra-lightweight scalable vectors with zero external bundle bloat and complete theme color inheritability. |
| **Hosting & Edge** | **Vercel** | Edge Network | Global CDN caching, automated Git deployments, preview branches, and rewrite rules for client-side routing. |

---

## 3. Detailed Component Architecture

### 3.1 Mobile Navigation Shell (`TopBar.tsx` & `BottomNav.tsx`)
* **TopBar:** Pinned to top with `backdrop-blur-md`, rendering the active destination badge (*Europe Adventure*), 1-tap quick currency calculator (`💱 FX`), and the active traveler persona switcher (*Aisha Rossi*).
* **BottomNav:** Fixed at bottom with `z-40`, providing 5 core touch targets:
  1. 📊 **Dashboard** (`trip-dashboard`)
  2. 🧳 **Trips** (`home`)
  3. 🧾 **Expenses** (`expense-history`)
  4. 🤖 **Guardian** (`ai-guardian`)
  5. 👥 **Settle** (`group-settlement`)

### 3.2 Trip Dashboard (`TripDashboard.tsx`)
* **Trip Travellers & Party Members Bar:** 
  * Displays avatar icons, names, and roles (`Host`, `Adult Member`).
  * Shows party breakdown: `3 Adults · 0 Children (Total 3 Travellers)`.
  * Enforces business rule: *"Group split calculations apply to adults only · Children are included as travel info"*.
* **Donut Budget Gauge & Expandable Category Caps:**
  * Animated SVG gauge displaying spend progress against budget.
  * Collapsible drawer revealing breakdown for Stay, Food, Transport, Activities, and Misc.
* **Upgraded AI Travel Guardian Section:**
  * Displays 3 live statistics cards: Current Spend, Safe Daily Limit (`₹6,765/day`), and Projected Total (`₹64,872`).
  * Two prominent action triggers:
    * **"Ask AI Guardian"** $\to$ directly navigates to the dedicated conversational chatbot page.
    * **"What-If Simulation & Statistics"** $\to$ directly navigates to the What-If decision simulator.

### 3.3 Two-Tier Expenses Hub (`ExpenseHistory.tsx` & `AddExpense.tsx`)
* **Card 1: 👤 Personal & Flexible Expenses Hub**
  * Universal across trips; not deducted from shared trip budget.
  * Embedded direct `📸 Scan Receipt` and `+ Add Expense` buttons.
  * Allows selective member splitting (e.g. 100% personal, or split with specific friends).
* **Card 2+: 🧳 Trip-Specific Group Expenses Cards**
  * Dedicated card for each active trip (*Europe Adventure*, *Goa Getaway*).
  * Shows trip budget progress bar, total spent, remaining fund, and group member count.
  * Renders each shared group expense card-wise with equal split allocations among all trip members.

### 3.4 Conversational AI Guardian (`AIGuardian.tsx`)
* Real-time conversational interface parsing markdown bolding cleanly without raw asterisks.
* Unified knowledge base answering questions across:
  * **Itinerary & Schedule:** Timings, activities, bookings, and interactive cards for Colosseum, Vatican, Louvre, and Airport departure.
  * **Monthly Cross-Trip Spend:** Consolidates spending across all trips in September 2026 (Europe: ₹26,172 + Goa: ₹8,420 + Personal: ₹3,200 = **₹37,792 INR**).
  * **Category Caps & Affordability:** Live math on whether a purchase fits within category limits.
  * **Bilingual Support:** Natural answers in English and Hindi/Hinglish (*"Mera total budget aur kharcha batao"*).
* Input box streamlined to `"Ask anything..."`.

### 3.5 Group Settlement Ledger (`GroupSettlement.tsx`)
* **Calculations Summary:** Top metrics showing Total You Are Owed, Total You Owe, and Net Position.
* **Inline Action Buttons:** Each debt item displays the person's avatar, name, amount, and an inline `[ Settle ]` / `[ ✓ Settled ]` toggle button directly next to the person.
* Explicitly divides debts into **"People Who Owe You"** and **"People You Owe"**.

---

## 4. Backend & Cloud Architecture (Firebase Specification)

### 4.1 Firebase Authentication
* Maps authentic PS-08 synthetic user identities (`aisha.rossi@example.invalid`, `ravi.sharma@example.invalid`) into Firebase UIDs.
* JWT custom claims define role-based access:
  * `owner`: Trip creation, budget cap configuration, member management.
  * `editor`: Expense entry, receipt upload, split execution.
  * `viewer`: Read-only access to dashboard and ledger.

### 4.2 Cloud Firestore Schema Design
15 structured collections mapped 1:1 to `PS-08.db` tables (Honoring Rule R1: Additive Only):

1. **/trips/{tripId}**:
   * `trip_id`: string (`trp_...`)
   * `title`: string
   * `destination_city_id`: string (`cty_...`)
   * `start_date`: string (`YYYY-MM-DD`)
   * `end_date`: string (`YYYY-MM-DD`)
   * `adults`: integer
   * `children`: integer
   * `party_size`: integer
   * `is_group_trip`: boolean
   * `home_currency`: string (`INR`)
   * `status`: string (`active`)

2. **/budgets/{budgetId}**:
   * `budget_id`: string (`bud_...`)
   * `trip_id`: string (reference to `/trips/{tripId}`)
   * `total_amount`: string (`"60000.00"`)
   * `currency`: string (`INR`)
   * `accommodation_cap`: string (`"21000.00"`)
   * `food_cap`: string (`"15000.00"`)
   * `transport_cap`: string (`"12000.00"`)
   * `activities_cap`: string (`"6000.00"`)
   * `misc_cap`: string (`"6000.00"`)
   * `alert_threshold_pct`: integer (`80`)

3. **/expenses/{expenseId}**:
   * `expense_id`: string (`exp_...`)
   * `trip_id`: string
   * `payer_user_id`: string (`usr_...`)
   * `amount`: string (`"42.00"`)
   * `currency`: string (`EUR`)
   * `home_amount`: string (`"3948.00"`)
   * `home_currency`: string (`INR`)
   * `fx_rate_date`: string (`2026-09-15`)
   * `category`: string (`food`)
   * `entry_method`: string (`ocr` | `manual`)
   * `is_shared`: boolean
   * `status`: string (`active`)

4. **/expense_splits/{splitId}**:
   * `split_id`: string (`spl_...`)
   * `expense_id`: string
   * `user_id`: string
   * `split_type`: string (`equal` | `custom` | `percentage` | `shares`)
   * `amount`: string (`"1316.00"`)
   * `currency`: string (`INR`)
   * `settlement_status`: string (`outstanding` | `settled`)

5. **/fx_rates/{fxRateId}**:
   * `fx_rate_id`: string (`fxr_...`)
   * `base_currency`: string (`EUR`)
   * `quote_currency`: string (`INR`)
   * `rate_date`: string (`2026-09-15`)
   * `rate`: string (`"94.00000000"`)

6. **/itineraries/{itineraryId}** & **/itinerary_items/{itemId}**:
   * Stores planned activities, scheduled slots, POI coordinates, ticket costs, and carbon estimates.

---

## 5. Core Mathematical Algorithms

### 5.1 The Largest Remainder Method (Hamilton-Hare Algorithm)
To guarantee cent-exact splits without float drift:
1. Integer conversion: $A_{\text{cents}} = \text{round}(A \times 100)$.
2. Base share: $S_{\text{base}} = \lfloor A_{\text{cents}} / N \rfloor$.
3. Remainder cents: $R = A_{\text{cents}} - (S_{\text{base}} \times N)$.
4. Allocate $S_{\text{base}} + 1$ cent to the first $R$ adult members; allocate $S_{\text{base}}$ to the rest.
5. Proof:
   $$\sum_{i=1}^{N} \text{Share}_i \equiv A \quad (\text{Exact down to } 0.00 \text{ tolerance})$$

### 5.2 Pairwise Debt Minimization
Transforms group expense records into minimal person-to-person payments:
1. Compute net balance: $\text{Net}_i = \text{TotalPaid}_i - \text{TotalShare}_i$.
2. Separate into Creditors ($\text{Net} > 0$) and Debtors ($\text{Net} < 0$).
3. Greedily match the largest debtor with the largest creditor until all balances clear to 0.

---

## 6. Strict Data Rules Conformance (R1 to R8)

| Rule | Definition | Implementation in TripWallet |
|---|---|---|
| **R1: Additive Only** | Never drop or rename canonical fields. | All 15 canonical tables from `PS-08.db` are retained with identical column names; UI extensions are added as supplementary non-destructive properties. |
| **R2: Prefixed IDs** | Opaque prefixed strings (`trp_`, `exp_`, `usr_`). | The ID generator enforces regex prefixes: `trp_[a-z0-9]+`, `exp_[a-z0-9]+`, `spl_[a-z0-9]+`. |
| **R3: Money Convention** | Fixed-point 2-place decimal string + ISO-4217 code. | Money is never cast to a floating-point IEEE-754 number in state or wire payloads; serialized strictly as `"42.00"` strings. |
| **R4: Timestamps** | Instants end `_at` with offset; dates end `_date` zoneless. | All date pickers output `YYYY-MM-DD` zoneless strings; event logs carry ISO-8601 UTC offsets (`2026-09-15T19:43:00+02:00`). |
| **R5: Snake Case Enums** | Legal values match `data/enums.json`. | Enums validated strictly against `expense_category`, `split_type`, and `record_status`. |
| **R6: Language BCP-47** | Strict BCP-47 tags (`en-IN`, `hi`, `ta`). | Locales stored as BCP-47 codes, enabling exact browser `Intl` number and date formatting. |
| **R7: WGS-84 Geography** | 6 decimal places (`lat` and `lng`). | City coordinates stored to 6 decimal precision. |
| **R8: Soft Deletions** | No hard deletes; state stored in `status`. | Deleted trips or expenses set `status = 'archived'` with updated timestamp. |

---

## 7. Deployment & CI/CD Pipeline

* **Repository:** Hosted on GitHub at `https://github.com/Kritika-Panwar-151/tripwallet`.
* **Vercel Edge Deployment:**
  * Build Command: `npm run build`
  * Output Directory: `dist`
  * SPA Fallback Routing: Handled via `vercel.json` rewrite (`/(.*) -> /index.html`).
* **Offline Resilience:** All static assets, fonts, and seed databases are pre-cached, enabling complete functionality even under intermittent venue Wi-Fi conditions.
