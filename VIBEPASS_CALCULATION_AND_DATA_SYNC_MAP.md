# VibePass — Calculation and Data Sync Map

_Last reviewed: 2026-06-05 | Status: NF-0F Snapshot Architecture Implemented_

---

## Architecture Overview (NF-0F)

All financial calculations are centralized in `lib/finance/` (TypeScript engine).
Calculated results are persisted in three snapshot tables:

| Snapshot Table | Purpose |
|---|---|
| `booking_financial_snapshots` | Booking-time values (margin %, fee, commission, tax) — immutable history |
| `class_financial_snapshots` | Class-level aggregates (revenue, costs, profit, break-even) — recalculated on change |
| `staff_earning_snapshots` | Per-staff earning, paid, unpaid balance, payout status — recalculated on change |

Recalculation is triggered automatically by:
- Booking created / cancelled
- Staff payout recorded
- Class expense added / removed
- Sponsor added / removed / payment-status changed
- Manual via `POST /api/finance/recalculate/class/[id]` or `POST /api/finance/recalculate/business/[id]`

**SQL views (nf0b) are read-only mirrors retained for backward compatibility. Do not add new business logic to SQL views.**

---

## Executive Summary

| Area | Summary | Risk Level | Notes |
|---|---|---|---|
| Revenue Split | Calculated via `lib/finance/` engine, persisted in `class_financial_snapshots`. SQL views are read-only mirrors. | Low | Source of truth: `lib/finance/` + snapshot tables |
| Profitability Engine | Full cost/expense/tax/sponsor profitability in `lib/finance/profitability.ts`. Results in `class_financial_snapshots`. | Low | Break-even in `lib/finance/breakEven.ts` |
| Currency Conversion | INR-based intermediary via `lib/finance/money.ts:convertCurrencyAmount`. Rates from DB or `lib/exchangeRates.ts:DEFAULT_RATES_TO_INR`. | Low | Admin analytics now seeds from canonical defaults |
| Staff Commission | Formula centralized in `lib/finance/commission.ts`. Create form uses `calculatePlatformFeePerBooking()`. `lib/profitability.ts` uses `calculateStaffCommission()`. | Low | Single source of truth implemented |
| Break-Even | Centralized in `lib/finance/breakEven.ts`. Used by snapshot engine and form previews. | Low | `NULL` = not calculable (free class), `0` = no fixed costs, `N` = N bookings needed |
| Tax Calculation | Centralized in `lib/finance/tax.ts`. | Low | |
| Data Sync | Snapshot-based: changes trigger recalculation via API routes. Owner classes page has live-data fallback for immediate display. | Medium | No real-time push; manual Recalculate button available |
| Sponsorship | Counts as income, offsets break-even fixed costs. `sponsor_income` field in `class_financial_snapshots`. | Low | Requires `nf1b` migration + snapshot recalculation |
| Owner/Staff Currency | Single operating currency from `getOperatingCurrency(business)`. No dual-currency display in Owner Studio or Staff Portal. | Low | Admin keeps multi-currency display |

---

## Sheet 2: Calculation Inventory

### Revenue Split Formulas

| # | Calculation Name | Current Formula | Source Tables | Source Files | Displayed In | Portal | Layer | Duplicated? | Sync Risk |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Platform Earning | `totalClassRevenue * platformMarginPercent / 100` | `bookings`, `businesses` | `lib/revenueSplits.ts:255`, `nf0b SQL view:311` | Dashboard, Analytics | Owner, Admin | TypeScript + SQL | Yes (2 places) | Low |
| 2 | Owner Gross After Platform Fee | `totalClassRevenue - platformEarning` | `bookings`, `businesses` | `lib/revenueSplits.ts:256`, `nf0b SQL view:312` | Dashboard, Analytics | Owner, Admin | TypeScript + SQL | Yes (2) | Low |
| 3 | Staff Commission (percentage) | `totalClassRevenue * commissionValue / 100` | `bookings`, `class_staff` | `lib/revenueSplits.ts:269`, `nf0b SQL view:237`, `create page`, `edit page` | Staff payables | Owner, Staff | TypeScript + SQL + Form | Yes (4 places) | **High** |
| 4 | Staff Commission (fixed per booking) | `commissionValue * eligiblePaidBookingCount` | `bookings`, `class_staff` | `lib/revenueSplits.ts:267`, `nf0b SQL view:234`, `create page`, `edit page` | Staff payables | Owner, Staff | TypeScript + SQL + Form | Yes (4 places) | **High** |
| 5 | Owner Net Earning | `totalClassRevenue - platformEarning - totalStaffEarning` | `bookings`, `businesses`, `class_staff` | `lib/revenueSplits.ts:302`, `nf0b SQL view:314-319` | Dashboard, Analytics | Owner, Admin | TypeScript + SQL | Yes (2) | Low |
| 6 | Staff Paid Amount | `SUM(staff_payouts.amount) WHERE class_staff_id = X OR (class_id+staff_id match)` | `staff_payouts` | `lib/revenueSplits.ts:271-274`, `nf0b SQL view:213-220` | Staff page | Owner, Staff | TypeScript + SQL | Yes (2) | Low |
| 7 | Staff Unpaid Balance | `MAX(staffEarning - paidAmount, 0)` | `staff_payouts`, `class_staff`, `bookings` | `lib/revenueSplits.ts:276`, `nf0b SQL view:241-249` | Staff page | Owner, Staff | TypeScript + SQL | Yes (2) | Low |
| 8 | Staff Payout Status | `no_earning / unpaid / partially_paid / paid` | `staff_payouts`, `class_staff`, `bookings` | `lib/revenueSplits.ts:118-123`, `nf0b SQL view:250-269` | Staff page | Owner, Staff | TypeScript + SQL | Yes (2) | Low |
| 9 | Platform Margin Percent | `platform_margin_percent ?? platform_margin ?? 0` | `businesses` | `lib/revenueSplits.ts:125-129` | All financial calcs | Owner, Admin | TypeScript | Yes (fallback chain) | Medium |
| 10 | Eligible Bookings | `booking_status = confirmed AND payment_status = paid` | `bookings` | `lib/revenueSplits.ts:219-222`, `nf0b SQL view:204-210` | Revenue totals | All | TypeScript + SQL | Yes (2) | Low |

### Profitability Formulas

| # | Calculation Name | Current Formula | Source Tables | Source Files | Displayed In | Portal | Layer | Duplicated? | Sync Risk |
|---|---|---|---|---|---|---|---|---|---|
| 11 | Tax Amount (percentage) | `grossRevenue * taxValue / 100` | `classes` | `lib/profitability.ts:90-92` | Profitability view | Owner, Admin | TypeScript | Yes (form preview too) | Medium |
| 12 | Tax Amount (fixed) | `taxValue` | `classes` | `lib/profitability.ts:93` | Profitability view | Owner, Admin | TypeScript | Yes (form preview too) | Medium |
| 13 | Total Deductions | `platformShare + staffCommission + staffFixedCost + venueCost + additionalExpenses + taxAmount` | `bookings`, `class_staff`, `classes`, `class_expenses` | `lib/profitability.ts:331-333` | Profitability view | Owner, Admin | TypeScript | No | Low |
| 14 | Final Owner Earning | `grossRevenue + totalSponsorshipAmount - totalDeductions` | `bookings`, `class_staff`, `classes`, `class_expenses`, `class_sponsors` | `lib/profitability.ts:335` | Profitability, Net Profit column | Owner, Admin | TypeScript | No | Low |
| 15 | Profit/Loss Status | `profit / break_even / loss` threshold on finalOwnerEarning | N/A | `lib/profitability.ts:82-86` | Class list badge | Owner, Admin | TypeScript | No | Low |
| 16 | Estimated Gross Revenue | `price * (expectedBookings > 0 ? expectedBookings : capacity)` | `classes` | `lib/profitability.ts:353-354` | Form preview | Owner | TypeScript | Yes (form preview) | Medium |
| 17 | Estimated Final Earning | `estGross + estSponsorship - estPlatform - estStaffComm - estFixedCosts - estTax` | `classes`, `class_staff`, `class_sponsors` | `lib/profitability.ts:371-380` | Form preview | Owner | TypeScript | Yes (form preview) | Medium |
| 18 | Break-Even Booking Count | `CEIL(MAX(0, fixedCosts - sponsorship) / netPerBooking)` | `classes`, `class_staff`, `class_expenses`, `class_sponsors` | `lib/profitability.ts:98-124` | Form preview, analytics | Owner | TypeScript | Yes (form preview) | **High** |
| 19 | Customer Retention % | `100 * repeat_customers / unique_customers` | `bookings` | `nf0c SQL view:class_customer_retention` | Profitability analytics | Owner, Admin | SQL View | No | Low |
| 20 | Sponsorship as Cost Offset | Sponsorship reduces `rawFixedCosts` before break-even calc | `class_sponsors` | `lib/profitability.ts:342` | Form preview | Owner | TypeScript | No | Medium |

### Currency Formulas

| # | Calculation Name | Current Formula | Source Tables | Source Files | Displayed In | Portal | Layer | Duplicated? | Sync Risk |
|---|---|---|---|---|---|---|---|---|---|
| 21 | Currency Conversion | `amount * rates[from] / rates[to]` (INR as intermediate) | `exchange_rates` | `lib/exchangeRates.ts:19-30` | All financial displays | Owner, Admin, Staff | TypeScript | Yes (4 places) | **High** |
| 22 | Smart Decimal Format | Only show .XX when cents exist | N/A | `lib/currency.ts:13-23` | All currency displays | All | TypeScript | No | Low |
| 23 | Dual Currency Display | `{ primary: original, secondary: converted (if different) }` | `exchange_rates` | `lib/currency.ts:27-39` | Class list, analytics | Owner, Admin, Staff | TypeScript | No | Low |
| 24 | Owner Revenue Totals (Converted) | Loop: `SUM(conv(split.amount, split.currency))` for each metric | `exchange_rates`, `bookings`, `businesses` | `app/owner/dashboard/page.tsx:117-154` | Owner dashboard | Owner | Frontend only | No | Medium |

### Booking Calculations

| # | Calculation Name | Current Formula | Source Tables | Source Files | Displayed In | Portal | Layer | Duplicated? | Sync Risk |
|---|---|---|---|---|---|---|---|---|---|
| 25 | Multi-Seat Amount Distribution | `pricePerSeat = ROUND(total / seats); first = total - (seats-1)*perSeat` | N/A | `app/api/bookings/create/route.ts:86-102` | Booking record | Customer | API | No | Low |
| 26 | Average Occupancy | `ROUND(SUM((booked/capacity)*100) / publishedCount)` | `bookings`, `classes` | `app/owner/dashboard/page.tsx:78-84` | Dashboard gauge | Owner | Frontend | No | Low |
| 27 | Monthly Revenue Trend | `SUM(booking.amount) per YYYY-MM` for last 6 months | `bookings` | `app/owner/analytics/page.tsx:177-184` | Analytics chart | Owner | Frontend | No | Low |

---

## Sheet 3: Portal Calculation Map

### Customer Portal

| Page / Component | Value Shown | Formula / Logic | Source Table / API | Source File | Display Currency Logic |
|---|---|---|---|---|---|
| `/classes/[id]` | Class price | `cls.price` | `classes` | `app/classes/[id]/page.tsx` | Class currency (cls.currency) |
| `/classes/[id]` | "Book Now — ₹X" | `cls.price` (formatted) | `classes` | `app/classes/[id]/page.tsx` | Class currency |
| `/customer/bookings` | Amount paid | `booking.amount` | `bookings` | `app/customer/bookings/page.tsx` | Class currency (from class record) |
| `/classes/[id]` | Sponsor display | sponsor name, logo, message only | `class_sponsors` (public only) | `app/classes/[id]/page.tsx` | N/A (no money shown) |

**Customer must NOT see:** Platform fee, staff commission, venue cost, expenses, tax, owner earning, profit/loss, exchange rates

---

### Owner Studio Portal

| Page / Component | Value Shown | Formula / Logic | Source Table / API | Source File | Display Currency Logic |
|---|---|---|---|---|---|
| `/owner/dashboard` | Gross revenue, owner net, platform fees, sponsorship | Aggregated from `class_financial_snapshots` | `/api/finance/business/[id]/dashboard` | `app/owner/dashboard/page.tsx` | Business operating currency (`getOperatingCurrency`) |
| `/owner/analytics` | Full financial, class, customer insights | Aggregated from snapshots + live booking data | `/api/finance/business/[id]/insights` | `app/owner/analytics/page.tsx` | Business operating currency |
| `/owner/classes` | Revenue, platform fee, staff cost, venue, net profit, occupancy, break-even | Live store data (revenue/occupancy) + snapshot data (staff/sponsor/break-even). `bestNumber()` prefers snapshot when non-zero. | `/api/finance/classes` + store | `app/owner/classes/page.tsx` | Business operating currency |
| `/owner/staff` | Staff gross revenue, earned, paid, unpaid, payout status | From `staff_earning_snapshots` via `class_financial_snapshots` join | `/api/owner/revenue` (snapshot-backed) | `app/owner/staff/page.tsx` | Business operating currency |
| `/owner/classes/create` | Profitability preview | `calculateClassFinancialModel()` from `lib/finance` — all formulas centralized | Client-side via `lib/finance` | `app/owner/classes/create/page.tsx` | Form's `currency` field |
| `/owner/classes/[id]/edit` | Profitability preview | Same as create — `calculateClassFinancialModel()` | Client-side via `lib/finance` | `app/owner/classes/[id]/edit/page.tsx` | Form's `currency` field |

---

### Staff Portal

| Page / Component | Value Shown | Formula / Logic | Source Table / API | Source File | Display Currency Logic |
|---|---|---|---|---|---|
| `/staff/dashboard` | Total earned | `SUM(staffEarning)` | `/api/owner/revenue` (server-side) | `app/staff/(portal)/dashboard/page.tsx:112` | Staff `preferredCurrency` → converted from INR |
| `/staff/dashboard` | Total paid | `SUM(staffPaidAmount)` | `/api/owner/revenue` | `app/staff/(portal)/dashboard/page.tsx:113` | Staff `preferredCurrency` |
| `/staff/dashboard` | Unpaid balance | `SUM(staffUnpaidBalance)` | `/api/owner/revenue` | `app/staff/(portal)/dashboard/page.tsx:114` | Staff `preferredCurrency` |
| `/staff/classes` | Class details | Title, date, time, bookings, capacity, status | Store (client) | `components/StaffClassesTable.tsx` | Class currency for any price display |

**Staff must NOT see:** Owner profit/loss, venue cost, additional expenses, tax internals, other staff earnings, business-wide financials

---

### VibePass Interface (Admin Portal)

| Page / Component | Value Shown | Formula / Logic | Source Table / API | Source File | Display Currency Logic |
|---|---|---|---|---|---|
| `/admin/dashboard` | Gross GMV | `fmt(stats.totalGMV, "INR")` | `/api/admin/analytics` | `app/admin/dashboard/page.tsx:262` | Admin `preferredCurrency` via `useCurrencyDisplay` |
| `/admin/dashboard` | Platform revenue | `fmt(stats.platformRevenue, "INR")` | `/api/admin/analytics` | `app/admin/dashboard/page.tsx:250` | Admin `preferredCurrency` |
| `/admin/dashboard` | Staff commission | `fmt(stats.totalStaffCommissions, "INR")` | `/api/admin/analytics` | `app/admin/dashboard/page.tsx:263` | Admin `preferredCurrency` |
| `/admin/analytics` | Revenue by class | Class-level splits from `/api/admin/revenue` | `/api/admin/revenue` | `app/admin/analytics/page.tsx:336-360` | Admin `preferredCurrency` |
| `/admin/businesses/[id]` | Business profitability table | Per-class profit/loss, retention % | `/api/admin/profitability` | `app/admin/businesses/[id]/page.tsx` | Admin `preferredCurrency` |
| `/admin/analytics` | Exchange rates (edit) | Rate values, 4 currencies | `/api/admin/exchange-rates` | `app/admin/analytics/page.tsx:1100-1180` | INR base (always) |

---

## Sheet 4: Data Sync Map

| Sync Flow | Trigger | Source Table / Action | API / Route / Helper | Target Table / Page | Portals Affected | Sync Risk | Notes |
|---|---|---|---|---|---|---|---|
| Booking created | Customer submits booking form | `bookings` INSERT, `payments` INSERT (conditional), `classes.booked_count` +1 | `/api/bookings/create` → `book_if_capacity()` RPC | Dashboard counts, occupancy, analytics | Customer, Owner, Admin | Medium | AppStore refreshes on mount; no real-time push |
| Booking cancelled | Customer cancels or class cancelled | `bookings.booking_status = cancelled`, `classes.booked_count` -1 | `cancel_booking` RPC | Owner bookings, analytics, seat count | Customer, Owner, Admin | Medium | On-demand pull |
| Payment status changed | Dummy payment or Razorpay webhook | `payments.status`, `bookings.payment_status` | `/api/bookings/create`, `/api/payments/verify` | Revenue totals (only confirmed+paid count) | Owner, Admin | Low | Razorpay deferred |
| Class created / edited | Owner saves class form | `classes` INSERT/UPDATE, `class_staff` INSERT/UPDATE/DELETE | AppStore `addClass/updateClass`, owner class APIs | Owner class list, profitability, marketplace | Owner, Customer | Low | Client-side store updates immediately |
| Staff assigned to class | Owner assigns instructor | `class_staff` INSERT | AppStore `updateClass` with `staffIds` | Revenue splits (commission), owner staff page | Owner, Staff | Low | Recalculated on demand |
| Staff commission changed | Owner edits commission in class form | `class_staff.commission_type/value` | AppStore `updateClass` | Revenue split, staff earnings | Owner, Staff | **High** | Must refresh both TypeScript calc and SQL view |
| Staff payout recorded | Owner marks paid in staff page | `staff_payouts` INSERT | `/api/owner/staff-payouts` | Staff paid amount, unpaid balance, payout status | Owner, Staff | Low | Validates against live revenue calc |
| Sponsor added to class | Owner adds sponsor in class form | `class_sponsors` INSERT | `/api/owner/classes/[id]/sponsors` | Profitability (income, break-even), class detail page | Owner, Customer | Medium | Public sponsors shown to customer |
| Sponsor public toggle | Owner sets `showSponsorPublicly` | `class_sponsors.show_sponsor_publicly` | `/api/owner/classes/[id]/sponsors` | Public class detail `/classes/[id]` | Customer | Low | Shows/hides sponsor card on class page |
| Venue cost changed | Owner edits venue cost in class | `classes.venue_cost` | AppStore `updateClass` | Profitability (deductions, break-even) | Owner | Low | On-demand |
| Class expense added | Owner adds expense in edit form | `class_expenses` INSERT | `/api/owner/classes/[id]/expenses` | Profitability (total deductions, break-even) | Owner | Low | On-demand |
| Tax config changed | Owner sets tax type/value | `classes.tax_type`, `classes.tax_value` | AppStore `updateClass` | Profitability (tax amount, break-even) | Owner | Low | On-demand |
| Currency rate changed | Admin updates exchange rates | `exchange_rates` UPSERT | `/api/admin/exchange-rates` | All converted currency displays | Owner, Admin, Staff | **High** | 5-min client cache; all portals must re-fetch |
| Owner display currency changed | Owner saves settings | `businesses.reporting_currency` | `updateBusiness` (AppStore) | Owner dashboard, analytics, class list (all converted totals) | Owner | Medium | AppStore re-renders with new currency |
| Owner default class currency changed | Owner saves settings | `businesses.default_currency` | `updateBusiness` (AppStore) | New class creation defaults | Owner | Low | Doesn't affect existing classes |
| Admin display currency changed | Admin sets in analytics | `profiles.preferred_currency` | Direct Supabase update | Admin dashboard, analytics converted values | Admin | Medium | Hook re-fetches on next render |
| Staff display currency changed | Staff saves profile | `profiles.preferred_currency` | Direct Supabase update | Staff dashboard earnings display | Staff | Medium | Hook re-fetches on next render |
| Platform margin changed | Admin updates margin in business detail | `businesses.platform_margin_percent` | `/api/admin/businesses/[id]/update` | Revenue splits (platform earning, owner net) | Owner, Admin | **High** | All past calculations recalculate with new margin on next load |
| Business status changed | Admin approves/rejects/suspends | `businesses.status`, `businesses.is_marketplace_visible` | `/api/admin/businesses/[id]/status` | Marketplace visibility, owner dashboard banner | Owner, Customer, Admin | Low | Immediate |
| Class visibility changed | Admin hides/shows class | `classes.is_admin_hidden` | `/api/admin/classes/[id]/visibility` | Marketplace, class detail | Customer, Owner | Low | AppStore fetchAll filters hidden classes |

---

## Sheet 5: Shared Helpers / SQL / API Map

### Finance Engine — Canonical Source of Truth (`lib/finance/`)

| Module | File | Exports | Used By |
|---|---|---|---|
| Money utils | `lib/finance/money.ts` | `money()`, `percent()`, `divideMoney()`, `numberValue()`, `convertCurrencyAmount()` | All financial calculations |
| Revenue | `lib/finance/revenue.ts` | `getPlatformMarginPercent()`, `calculateGrossRevenue()`, `calculatePlatformFee()`, `calculatePlatformFeePerBooking()` | Snapshot engine, form previews |
| Commission | `lib/finance/commission.ts` | `calculateStaffCommission()`, `calculateStaffCommissionPerBooking()`, `calculateTotalStaffCommission()`, `calculateTotalStaffFixedCost()`, `normalizeCommissionType()` | Snapshot engine, form previews, profitability.ts |
| Profitability | `lib/finance/profitability.ts` | `calculateClassFinancialModel()`, `calculateBookingSnapshotFinancials()`, `resolveEstimatedBookings()` | Snapshot engine, form previews |
| Tax | `lib/finance/tax.ts` | `calculateTaxAmount()`, `calculateFixedTax()`, `calculatePercentageTaxPerBooking()` | Snapshot engine, form previews |
| Occupancy | `lib/finance/occupancy.ts` | `calculateOccupancyPercent()`, `calculateAvailableSeats()` | Snapshot engine |
| Break-even | `lib/finance/breakEven.ts` | `calculateBreakEven()` | Snapshot engine, form previews |
| Payouts | `lib/finance/payouts.ts` | `calculatePayoutStatus()`, `calculateUnpaidAmount()` | Snapshot engine, staff page |
| Snapshots | `lib/finance/snapshots.ts` | `recalculateClassFinancialSnapshot()`, `recalculateBusinessFinancialSnapshots()`, `ensureBookingFinancialSnapshot()` | All recalculation triggers |
| Types | `lib/finance/types.ts` | All finance interfaces and constants | Entire engine |

### Shared Helpers (Support Layer)

| Type | Name | File Path | Used By | Role |
|---|---|---|---|---|
| Shared helper | `calculateRevenueSplits()` | `lib/revenueSplits.ts` | `/api/owner/revenue` (snapshot-backed), admin revenue API | Revenue aggregation from snapshots |
| Shared helper | `loadProfitabilityResult()` | `lib/profitability.ts` | `/api/owner/profitability`, `/api/admin/profitability` | Legacy profitability (delegates formulas to `lib/finance`) |
| Shared helper | `loadClassExpenses()` | `lib/profitability.ts` | `/api/owner/classes/[id]/expenses` GET | Loads expense rows for single class |
| Shared helper | `convertCurrency()` | `lib/exchangeRates.ts` | `useCurrencyDisplay`, `formatConverted` | Delegates to `lib/finance/money.ts:convertCurrencyAmount` |
| Shared helper | `DEFAULT_RATES_TO_INR` | `lib/exchangeRates.ts` | Admin analytics exchange rate seeding | Canonical default exchange rates |
| Shared helper | `formatCurrency()` | `lib/currency.ts` | All financial displays | Format number with symbol, smart decimals |
| Shared helper | `getOperatingCurrency()` | `lib/currency.ts` | All Owner/Staff displays | Single operating currency from business record |
| Shared helper | `useCurrencyDisplay()` | `lib/hooks/useCurrencyDisplay.ts` | Admin dashboard/analytics | Load rates, provide multi-currency display |

### API Routes

| Type | Name | File Path | Used By | Calculation / Sync Responsibility |
|---|---|---|---|---|
| API route | `GET /api/owner/revenue` | `app/api/owner/revenue/route.ts` | Owner dashboard, analytics, staff page | Returns ClassRevenueSplits, BusinessSummary, StaffEarnings |
| API route | `GET /api/owner/profitability` | `app/api/owner/profitability/route.ts` | Owner dashboard, analytics, class list | Returns ClassProfitability[] |
| API route | `POST /api/owner/staff-payouts` | `app/api/owner/staff-payouts/route.ts` | Owner staff page "Mark Paid" | Validates + inserts staff_payouts record |
| API route | `GET /api/admin/revenue` | `app/api/admin/revenue/route.ts` | Admin dashboard, analytics | Same as owner revenue but all businesses |
| API route | `GET /api/admin/profitability` | `app/api/admin/profitability/route.ts` | Admin business detail | Returns profitability for one business |
| API route | `GET /api/currency/rates` | `app/api/currency/rates/route.ts` | `useCurrencyDisplay` hook | Returns current exchange rates from DB or defaults |
| API route | `GET\|POST /api/admin/exchange-rates` | `app/api/admin/exchange-rates/route.ts` | Admin analytics exchange rate editor | Read/write exchange_rates table |
| API route | `POST /api/bookings/create` | `app/api/bookings/create/route.ts` | Customer booking form | Multi-seat amount distribution, capacity check |
| API route | `GET\|POST /api/owner/classes/[id]/expenses` | `app/api/owner/classes/[id]/expenses/route.ts` | Class edit form | CRUD for class_expenses |
| API route | `GET\|POST\|DELETE /api/owner/classes/[id]/sponsors` | `app/api/owner/classes/[id]/sponsors/route.ts` | Class create/edit form | CRUD for class_sponsors + auto-create new sponsors |
| API route | `GET /api/owner/sponsor-list` | `app/api/owner/sponsor-list/route.ts` | Class create/edit form dropdown | List active sponsors for business |

### SQL Views

| Type | Name | File Path | Used By | Calculation / Sync Responsibility |
|---|---|---|---|---|
| SQL view | `staff_earnings_summary` | `supabase/nf0b-revenue-split-payouts.sql` | `loadRevenueDataSet()` (fallback) | Per-instructor earnings per class |
| SQL view | `class_revenue_splits` | `supabase/nf0b-revenue-split-payouts.sql` | `loadRevenueDataSet()` (fallback) | Per-class revenue split |
| SQL view | `business_revenue_summary` | `supabase/nf0b-revenue-split-payouts.sql` | Admin analytics (fallback) | Per-business revenue totals |
| SQL view | `platform_revenue_summary` | `supabase/nf0b-revenue-split-payouts.sql` | Admin dashboard (fallback) | Platform-wide totals |
| SQL view | `class_customer_retention` | `supabase/nf0c-profitability.sql` | `loadProfitabilityResult()` | Customer retention % per class |
| SQL RPC | `book_if_capacity(classId, slots)` | `supabase/book-if-capacity.sql` | `/api/bookings/create` | Atomic capacity check + booked_count increment |
| SQL RPC | `cancel_booking(bookingId)` | `supabase/phase5-cancel.sql` | Customer cancellation | Validates + cancels booking, decrements booked_count |
| SQL RPC | `is_current_user_admin()` | Various migrations | RLS policies | Admin role check |

---

## Sheet 6: Duplicate Calculation Locations

| Calculation | Location 1 | Location 2 | Location 3 | Location 4 | Risk | Recommended Source of Truth |
|---|---|---|---|---|---|---|
| Staff commission (% type) | `lib/revenueSplits.ts:269` | `nf0b SQL view:237` | `create page preview` | `edit page preview` | **High** | `lib/revenueSplits.ts` (API layer) |
| Staff commission (fixed type) | `lib/revenueSplits.ts:267` | `nf0b SQL view:234` | `create page preview` | `edit page preview` | **High** | `lib/revenueSplits.ts` (API layer) |
| Platform fee calc | `lib/revenueSplits.ts:255` | `nf0b SQL view:311` | `create page preview` | `owner/dashboard convertedTotals` | **High** | `lib/revenueSplits.ts` (API layer) |
| Break-even count | `lib/profitability.ts:98-124` | `create page preview` | `edit page preview` | — | Medium | `lib/profitability.ts` |
| Currency conversion formula | `lib/exchangeRates.ts:19-30` | `lib/currency.ts:27-39` | `lib/hooks/useCurrencyDisplay.ts:84-90` | `owner/dashboard:120-124` | Medium | `lib/exchangeRates.ts:convertCurrency()` |
| Tax calculation | `lib/profitability.ts:90-94` | `create page preview` | `edit page preview` | — | Medium | `lib/profitability.ts:calcTax()` |
| Estimated gross revenue | `lib/profitability.ts:353-354` | `create page preview` | `edit page preview` | — | Medium | `lib/profitability.ts` |
| Eligible bookings filter | `lib/revenueSplits.ts:219-222` | `nf0b SQL view:204-210` | `/api/admin/analytics (inline)` | — | Low | `lib/revenueSplits.ts` |
| Platform margin fallback | `lib/revenueSplits.ts:125-129` | `nf0b SQL view:310` | — | — | Medium | `lib/revenueSplits.ts` |

---

## Sheet 7: Possible Risk Areas

| Risk ID | Area | Why It May Be Risky | Files Involved | Portal Impact | Needs Fix? | Severity |
|---|---|---|---|---|---|---|
| RISK-001 | Staff commission duplicated in 4 places | Commission logic exists in TypeScript, SQL view, and 2 form previews. A rule change requires 4 updates. If SQL view drifts, staff earnings in DB queries differ from API. | `lib/revenueSplits.ts`, `nf0b SQL`, `create/page.tsx`, `edit/page.tsx` | Owner, Staff | Yes — eventually | **High** |
| RISK-002 | Platform margin fallback chain silently zeroes | If `platform_margin_percent = 0` (intentional zero-fee), code falls back to `platform_margin`. Cannot set 0% if legacy column has value. | `lib/revenueSplits.ts:125-129`, `nf0b SQL:310` | Owner, Admin | Yes — document + fix | **High** |
| RISK-003 | No real-time sync — stale dashboards | All calculations are on-demand pull. Long-lived sessions may show outdated revenue/bookings. No WebSocket or polling. | All API routes, AppStore | All portals | Decide on polling strategy | Medium |
| RISK-004 | Break-even only in TypeScript | `calcBreakEven()` lives only in app code. SQL cannot query break-even. Form preview and API both compute independently. | `lib/profitability.ts`, form previews | Owner | Low risk now; document | Medium |
| RISK-005 | Currency conversion inconsistency | 4 separate places implement `amount * fromRate / toRate`. If one uses wrong order or different default, values diverge. | `lib/exchangeRates.ts`, `lib/currency.ts`, `useCurrencyDisplay`, dashboard | Owner, Admin, Staff | Centralize callers | Medium |
| RISK-006 | Sponsorship dual-role may confuse | Sponsorship is both income AND reduces break-even fixed costs. Owner might think it's double-counted. | `lib/profitability.ts:335,342` | Owner | Needs UI explanation | Medium |
| RISK-007 | Cancelled classes count in revenue totals | Revenue engine only filters by `booking_status + payment_status`, not by class status. Cancelled classes still show in totals. | `lib/revenueSplits.ts:219-222` | Owner, Admin | Decide: filter or not | Medium |
| RISK-008 | Staff payout lookup has fragile fallback | If `class_staff.id` is null, falls back to `staff_id + class_id` composite. Double payout possible if both lookup paths exist. | `lib/revenueSplits.ts:271-274` | Owner, Staff | Audit existing data | Medium |
| RISK-009 | 5-min rate cache — stale currency conversion | `useCurrencyDisplay` caches rates for 5 minutes in module scope. Admin rate change not reflected immediately. | `lib/hooks/useCurrencyDisplay.ts:48-56` | Owner, Admin, Staff | Acceptable for MVP | Low |
| RISK-010 | Form preview uses raw arithmetic (no money rounding) | Create/edit form preview doesn't use `money()` helper. May show fractional cents. Backend uses `money()`. Preview could differ from saved value. | `app/owner/classes/create/page.tsx`, `edit/page.tsx` | Owner | Apply `money()` in previews | Low |
| RISK-011 | Expected bookings = 0 falls back to capacity | If owner sets `expected_bookings = 0` (to model worst case), code uses capacity instead. Cannot project zero-booking scenario. | `lib/profitability.ts:353` | Owner | Document / form note | Low |
| RISK-012 | Multi-currency revenue sum is O(n) per dashboard load | Dashboard loops over all class splits to convert + sum. At scale (1000 classes), this is expensive. | `app/owner/dashboard/page.tsx:115-154` | Owner | Not urgent for MVP | Low |

---

## Sheet 8: Questions Before Fixing

| Q ID | Question | Area | Why It Matters | Suggested Decision | Impact |
|---|---|---|---|---|---|
| Q1 | Should commission logic be centralized to one place? | Staff commission | 4 locations = 4 maintenance points. SQL view might drift. | Move to shared `lib/commission.ts`, import everywhere | Owner earnings, Staff earnings accuracy |
| Q2 | Should break-even be in a SQL view? | Profitability | Cannot query break-even from DB. Only app-layer. | Keep in app layer for MVP; create SQL view if admin needs SQL reporting | Owner, Admin |
| Q3 | Should sponsorship reduction in break-even be explicitly shown to owner? | Sponsorship | Dual-role (income + cost offset) is correct but not obvious. | Add UI tooltip: "Sponsorship covers ₹X of fixed costs, reducing break-even" | Owner |
| Q4 | Should form preview use the API for calculations (server-computed)? | Form Preview | Drift between client preview and server values. | Keep client-side (cheaper); unit test against backend; add note "estimates may vary" | Owner |
| Q5 | Should admin be able to set a global default platform margin? | Platform Margin | Currently per-business only. No platform-wide default. | Add `platform_config` table or admin-managed default | Admin, Owner |
| Q6 | Should cancelled/draft classes be filtered from analytics? | Analytics | Cancelled classes currently contribute to revenue totals (via their bookings). | Add toggle in analytics: "Include cancelled classes" | Owner, Admin |
| Q7 | Should there be real-time revenue sync (polling or WebSocket)? | Data Sync | Stale data on long sessions. Booking changes not reflected until refresh. | Polling every 30s for analytics page; on-demand elsewhere | Owner, Admin |
| Q8 | Should multi-currency revenue be pre-aggregated in SQL? | Currency Performance | Dashboard conversion loop is O(n classes) per load. | Add SQL view `business_revenue_by_currency` when >100 classes | Owner |
| Q9 | Should staff payouts track payout currency explicitly? | Staff Payouts | `staff_payouts.currency` column exists but unused. | Document that payout inherits class currency; populate on insert | Owner, Staff |
| Q10 | Should expense categories be flexible (not hardcoded)? | Expenses | Currently 9 fixed categories in SQL check constraint. | Keep fixed for MVP; add custom category support in Phase 5 | Owner |
| Q11 | Should platform margin = 0 be explicitly supported? | Platform Margin | Fallback chain makes 0% impossible if old column has value. | Change fallback: prefer `platform_margin_percent` over `platform_margin` always (even if 0) | Admin, Owner |
| Q12 | Should the form preview apply `money()` rounding? | Form Preview | Preview may show ₹X.9999 vs backend's ₹Y.00. Confusing. | Apply `Math.round(x*100)/100` in form preview calcs | Owner |

---

## Sheet 9: Recommended Next Steps

### NF-0F Implementation Update — 2026-06-05

NF-0F adds a dedicated finance source of truth under `lib/finance/` and makes the older SQL revenue views read-only mirrors/fallbacks rather than independent business logic.

New source-of-truth files:

- `lib/finance/money.ts`
- `lib/finance/revenue.ts`
- `lib/finance/commission.ts`
- `lib/finance/profitability.ts`
- `lib/finance/tax.ts`
- `lib/finance/occupancy.ts`
- `lib/finance/breakEven.ts`
- `lib/finance/payouts.ts`
- `lib/finance/snapshots.ts`
- `lib/finance/types.ts`
- `lib/finance/index.ts`

Snapshot tables added by `supabase/nf0f-finance-snapshots.sql`:

- `booking_financial_snapshots`: preserves booking/payment-time class price, paid amount, platform margin, platform fee, staff commission, tax, and owner net.
- `class_financial_snapshots`: current class dashboard/reporting result, including sponsor income, break-even bookings, net profit, and total costs.
- `staff_earning_snapshots`: current class/staff earning, paid, unpaid, and payout status.

Fixed audit items:

- Explicit `platform_margin_percent = 0` is respected in TypeScript and the SQL mirror view.
- Money rounding uses the shared `money()` helper.
- Staff commission uses the shared finance commission functions in revenue/profitability/form preview paths.
- Owner/Staff portals prefer business operating currency only.
- Sponsor UI explains that sponsor income increases profit and reduces break-even requirements.
- `staff_payouts.currency` is populated on payout insert and backfilled by SQL.
- `expectedBookings = 0` is treated as a valid zero-booking estimate.

Current source-of-truth rule:

- APIs and portal pages should prefer `lib/finance` and snapshot/API values.
- SQL views from `nf0b` remain service-role reporting mirrors/fallbacks only.
- Historical booking snapshots must not be overwritten when platform margin changes; current class snapshots aggregate booking snapshots where available and backfill old bookings once.

| Step | Priority | Task | Reason | Files Likely Affected | Requires SQL? |
|---|---|---|---|---|---|
| 1 | **P0** | Fix platform margin fallback chain — support explicit 0% | Prevents silent data bugs if admin sets 0% platform fee | `lib/revenueSplits.ts:125-129`, `nf0b SQL view:310` | No |
| 2 | **P0** | Add `money()` rounding to all form preview calculations | Prevents preview/saved value drift | `app/owner/classes/create/page.tsx`, `edit/page.tsx` | No |
| 3 | **P1** | Centralize commission calculation to one shared function | Removes 4-location duplication risk | `lib/revenueSplits.ts`, `nf0b SQL`, `create page`, `edit page` | Yes (update SQL view) |
| 4 | **P1** | Add UI explanation for sponsorship dual-role | Prevents owner confusion about break-even impact | `app/owner/classes/create/page.tsx`, `edit/page.tsx` | No |
| 5 | **P1** | Centralize all currency conversion to `convertCurrency()` | Remove 4 separate implementations | `lib/currency.ts`, `useCurrencyDisplay.ts`, `owner/dashboard` | No |
| 6 | **P1** | Document that payouts inherit class currency; populate `staff_payouts.currency` | Close unused column; prevent future confusion | `app/api/owner/staff-payouts/route.ts` | No |
| 7 | **P2** | Add "include cancelled classes" toggle in analytics | Let owner choose if historical bookings count | `app/owner/analytics/page.tsx` | No |
| 8 | **P2** | Add 30s polling to owner analytics page | Prevent stale metrics during active class days | `app/owner/analytics/page.tsx`, `app/owner/dashboard/page.tsx` | No |
| 9 | **P2** | Fix expected_bookings = 0 edge case | Let owner model zero-booking worst case | `lib/profitability.ts:353` | No |
| 10 | **P3** | Create SQL view for break-even if admin SQL reporting needed | Enable raw SQL queries on break-even data | New SQL migration | Yes |
| 11 | **P3** | Pre-aggregate multi-currency revenue in SQL | Performance improvement for owners with many classes | New SQL migration | Yes |
| 12 | **P3** | Add `platform_config` admin global margin default | Simplify onboarding new businesses | New SQL migration | Yes |
