Design a polished, modern, high-fidelity web application prototype called **TripWallet — Smart Budget & Expense Companion**.

TripWallet is an AI-powered travel finance app that helps travelers create trip budgets, track expenses in multiple currencies, scan receipts using OCR, split group expenses, monitor budget health, predict final spending, and use an AI Budget Guardian to decide what they can afford next.

Create a **desktop-first responsive web app** with a premium travel-fintech aesthetic. Make it look like a real startup product that could be presented at a hackathon.

### DESIGN STYLE

* Clean, modern, premium and trustworthy
* Travel + fintech visual language
* Spacious layouts with rounded cards
* White/light neutral background
* Use deep navy/indigo as the main brand color with subtle green for healthy budget states and orange/red only for warnings
* Large readable typography
* Soft shadows and subtle borders
* Rounded corners around 12–16px
* Use clean icons such as wallet, plane, receipt, hotel, food, transport, activities, users and AI/spark icons
* Avoid excessive gradients, excessive illustrations, or clutter
* Make the interface visually impressive but realistic and easy to implement using React + Tailwind CSS

### BRANDING

Logo: **TripWallet**
Tagline: **“Snap. Extract. Split. Track. Predict.”**

Use a simple wallet + travel/plane inspired logo mark.

### CREATE THESE 10 CONNECTED SCREENS

## 1. MY TRIPS / HOME

Header:

* TripWallet logo
* Dashboard
* My Trips
* Expenses
* AI Guardian
* Profile

Main heading:
**“Where are you going next?”**

Show existing trip cards:

* Europe Adventure

  * 12 Sep – 20 Sep
  * ₹60,000 budget
  * ₹26,172 spent
  * 56% used
  * View Trip

* Goa Getaway

  * 2 Oct – 6 Oct
  * ₹25,000 budget
  * ₹8,420 spent
  * 34% used

Large primary button:
**+ Create New Trip**

## 2. CREATE TRIP

Title:
**“Plan your trip”**

Form fields:

* Trip name
* Destination
* Start date
* End date
* Home currency
* Total budget

Example:
Trip name: Europe Adventure
Home currency: INR (₹)
Budget: ₹60,000

Primary button:
**Create Trip**

Secondary:
Cancel

## 3. TRIP DASHBOARD

This should be the most important and visually impressive screen.

Header:
**Europe Adventure**
12 Sep – 20 Sep 2026
INR ₹

Top summary cards:

* Total Budget: ₹60,000
* Spent: ₹26,172
* Remaining: ₹33,828
* Daily Average: ₹2,618

Large budget progress/ring visualization:
**44% Used**

Show:
**₹33,828 remaining**

AI Budget Guardian card:
Title:
**AI Budget Guardian**
Status badge:
**WATCH**

Message:
“You’re spending about ₹2,618/day, while your remaining budget supports roughly ₹1,780/day. At this rate, you may exceed your budget.”

Show:

* Projected final spend: ₹64,872
* Projected over budget: ₹4,872
* Safe daily spend: ₹1,780

Button:
**View AI Insights**

Second button:
**Try What-If**

Category spending section with horizontal progress bars:

* Food ₹7,200
* Transport ₹5,100
* Accommodation ₹8,500
* Activities ₹3,372
* Shopping ₹2,000

Recent expenses section:

* Restaurant Milano — €42 — Food
* Hotel Roma — €180 — Accommodation
* Metro Pass — €18 — Transport

Floating or prominent:
**+ Add Expense**

## 4. ADD EXPENSE

Title:
**“Add an expense”**

Large amount input:
₹ 1,200

Fields:

* Currency: INR
* Category: Food
* Merchant
* Date
* Paid by
* Notes

Buttons:
**Save Expense**
**Scan Receipt**

Also include a small currency conversion preview when foreign currency is selected:
€80 → ₹7,520
“Converted using current exchange rate”

## 5. RECEIPT SCANNER

Title:
**“Scan your receipt”**

Large receipt upload/camera area.

Text:
**Upload a receipt or take a photo**

Buttons:

* Upload Receipt
* Use Camera

After upload, show processing state:
**Analyzing receipt...**
OCR progress indicator
“Extracting merchant, amount, currency and date”

Then transition to extracted result.

## 6. EXTRACTED EXPENSE / OCR CONFIRMATION

Title:
**“Review extracted expense”**

Left side:
Receipt image preview.

Right side:
AI/OCR extracted fields:

* Merchant: Restaurant Milano
* Amount: €42.00
* Currency: EUR
* Date: 15 Sep 2026
* Category: Food

Show confidence:
**OCR confidence: 96%**

Add a small AI badge:
**AI categorized as Food**

Important:
Every field should be editable.

Buttons:
**Confirm & Add Expense**
**Edit Details**

Below:
Conversion preview:
€42.00 → ₹3,948
Home currency: INR

## 7. EXPENSE HISTORY

Title:
**“Expenses”**

Top:
Total spent: ₹26,172

Search bar:
“Search expenses...”

Filters:
All | Food | Transport | Stay | Activities | Shopping

Expense list/table:
Date | Merchant | Category | Paid by | Original | Converted

Example:
15 Sep | Restaurant Milano | Food | You | €42 | ₹3,948
15 Sep | Metro | Transport | Asha | €18 | ₹1,692
14 Sep | Hotel Roma | Stay | Ravi | €180 | ₹16,920

Each expense has edit/delete actions.

## 8. AI BUDGET GUARDIAN

Create a dedicated AI dashboard.

Title:
**“Your Budget Guardian”**

Large status:
**You’re at risk of overspending**

Show:
Current spend: ₹26,172
Projected final spend: ₹64,872
Budget: ₹60,000
Projected overage: ₹4,872

Visual forecast chart:
X-axis = trip days
Y-axis = spending
Show current spending line, budget limit line, and projected spending line.

Insight cards:
**Safe daily spend**
₹1,780/day

**Current daily spend**
₹2,618/day

**Days remaining**
5 days

AI recommendation:
“Reduce daily food and shopping spending by approximately ₹840/day to stay within budget.”

Buttons:
**Try What-If**
**View Spending Breakdown**

## 9. WHAT-IF PLANNER

Title:
**“Can I afford this?”**

Subtitle:
“Test a future expense before you spend.”

Input:
Expense amount: €80
Category: Activities
Description: Sunset boat tour

Button:
**Simulate**

After simulation show:

€80 ≈ ₹7,520

Before:
Projected final spend: ₹64,872

After:
Projected final spend: ₹72,392

Result:
**Not recommended**

Warning:
“This activity increases your projected overspend by ₹7,520.”

AI recommendation:
“To afford this activity, keep your daily spending below ₹1,400 for the remaining trip.”

Show two clear buttons:
**Add Anyway**
**Go Back**

## 10. GROUP SETTLEMENT

Title:
**“Group expenses”**

Trip members:

* You
* Asha
* Ravi

Show total group spending and individual balances.

Example:
You are owed ₹2,000
Asha owes ₹1,000
Ravi owes ₹1,000

Section:
**Suggested settlement**

Asha → You ₹1,000
Ravi → You ₹1,000

Buttons:
**Mark as Settled**

### NAVIGATION

All screens must be connected as a clickable prototype.

Navigation:
Dashboard → Trip Dashboard
My Trips → Home
Add Expense → Add Expense
Scan Receipt → Receipt Scanner
Confirm Receipt → Dashboard
Expenses → Expense History
AI Guardian → AI Budget Guardian
What-If → What-If Planner
Group → Group Settlement

### COMPONENTS

Create reusable components for:

* Navigation sidebar/header
* Buttons
* Input fields
* Budget cards
* Expense cards
* Category chips
* Status badges
* Progress bars
* Charts
* AI insight cards
* Modal/dialog
* Receipt upload area
* Currency selector
* Expense table

### IMPORTANT UX

The main demo flow should be extremely clear:

Create Trip
→ Dashboard
→ Add Expense
→ Scan Receipt
→ OCR extracts information
→ Review & Confirm
→ Currency conversion
→ Dashboard updates
→ AI Budget Guardian recalculates forecast
→ What-If Planner tests a future expense

Make the **AI Budget Guardian and What-If Planner visually prominent**, because these are TripWallet's key differentiators from a normal expense tracker.

Use realistic sample data throughout the prototype and maintain consistent spacing, typography, icons, colors and component styles across all screens.
