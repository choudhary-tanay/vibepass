# Project Structure Guide

Generated: 2026-06-06

## Routes

Use Next.js App Router conventions:

- Page routes go in `app/**/page.tsx`.
- Shared route UI goes in `app/**/layout.tsx`.
- Loading and error UI should use `loading.tsx` and `error.tsx` when added.
- Dynamic route folders use `[id]`, `[token]`, or another parameter name.
- Route groups like `app/staff/(portal)` do not affect the URL.

Do not move page files unless the URL change is intentional and tested.

## API Routes

API route handlers go in `app/api/**/route.ts`.

Recommended grouping:

- `app/api/admin/*` for platform/admin actions.
- `app/api/owner/*` for Owner Studio actions.
- `app/api/staff/*` for staff actions.
- `app/api/customer/*` for customer actions.
- `app/api/classes/*` for public class reads.
- `app/api/finance/*` for finance reads/recalculations.

Server-only Supabase service-role use must stay inside API routes or server helpers.

## Shared UI

Shared UI components live in `components/`.

Use shared components for:

- Buttons/cards/tables used by multiple portals.
- Class cards and artwork rendering.
- Reusable inputs/selects/location fields.
- Notification and report widgets.

Portal-only shell components can remain in `components/` for now, but future cleanup may move them to `components/owner`, `components/staff`, and `components/admin`.

## Portal-Specific UI

Keep portal-specific pages under their route folders:

- Owner UI in `app/owner/**`.
- Staff portal UI in `app/staff/(portal)/**`.
- Admin UI in `app/admin/**`.
- Customer UI in `app/customer/**` and public class routes.

Avoid putting large portal-only page sections into global components unless they are reused.

## Domain Logic

Domain logic belongs in `lib/` and should be split by responsibility:

- Access/permissions: `lib/accessControl.ts`.
- Supabase server clients: `lib/supabaseServer.ts`.
- Supabase browser client: `lib/supabaseClient.ts`.
- Notifications: `lib/notifications.ts`.
- Emails: `lib/emailService.ts`.
- Admin audit logging: `lib/adminAuditLog.ts`.
- Finance: `lib/finance/*`.

Avoid adding new domain logic to UI files when it can live in a helper.

## Supabase Query Helpers

Current query logic is split between API routes and `lib/appStore.tsx`. Future cleanup should introduce domain-specific helpers before moving large chunks:

- `lib/data/classes.ts`
- `lib/data/bookings.ts`
- `lib/data/staff.ts`
- `lib/data/sponsors.ts`
- `lib/data/venues.ts`
- `lib/data/forms.ts`

Do not create these helpers until there is a focused refactor with tests.

## Finance Logic

Finance calculations belong in `lib/finance/`. UI pages should read snapshots or APIs rather than recomputing final financial values.

Snapshot-affecting actions must call the appropriate recalc helper/API.

## Constants And Types

- Shared app types live in `types/index.ts` for now.
- Constants live in `lib/constants.ts`.
- When types grow further, split by domain only after source-of-truth tables are stable.

## SQL

- SQL migrations live in `supabase/`.
- The run order is `supabase/MIGRATIONS.md`.
- Destructive SQL must be clearly marked and excluded from normal run order.
- Every new migration must be idempotent where possible.
- Do not delete SQL migrations that may have been run in Supabase.

## What Not To Do

- Do not add finance formulas directly into UI components.
- Do not add more sponsor/venue/staff assignment data directly to `classes`.
- Do not duplicate create/edit/propose class UIs.
- Do not move App Router route files casually.
- Do not expose service-role keys to client components.
- Do not enable Razorpay during staging cleanup.
