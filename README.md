# VibePass

VibePass is a Next.js class, event, wellness, and studio booking marketplace. Customers discover and book classes, owners manage businesses/classes/bookings/staff, staff use invite-based portal flows, and admins govern approvals, reports, users, featured placement, audit logs, and platform health.

Current state: private staging only.

- Staging URL: `https://vibepass-staging.vercel.app/`
- GitHub repo: `https://github.com/choudhary-tanay/vibepass`
- Payments in staging: dummy payment only
- Required staging payment env: `NEXT_PUBLIC_PAYMENTS_MODE=dummy`, `NEXT_PUBLIC_PAYMENTS_ENABLED=false`
- Razorpay: code exists but real payments are deferred
- Launch type: private staging only, not public launch
- Admin QA is still pending

## Read First

Before any future code, database, deployment, QA, launch, bug-fix, commit, or push work, read these first:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`
3. `VIBEPASS_FEATURE_INVENTORY.md`

Then read:
- `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md`
- `VIBEPASS_PROJECT_HANDBOOK.md`
- `VERCEL_STAGING_DEPLOYMENT.md`

The blueprint contains the current bug tracker, blocker list, file ownership map, data dependency map, and retest rules.

## Tech Stack

- Next.js `16.2.7`
- React `19.2.4`
- TypeScript
- Tailwind CSS v4
- Supabase Auth/Postgres/Storage/RLS
- Dummy payment mode for staging
- Razorpay integration deferred
- Resend optional for email
- Vercel staging deployment

## Revenue Split And Staff Payouts

NF-0B adds dynamic revenue split calculations for admin, owner, and staff portals:

- Gross revenue counts confirmed + paid bookings only.
- Platform earning uses the business platform margin.
- Staff commission supports percentage or fixed-per-paid-booking rules per instructor assignment.
- Owner net = gross revenue - platform earning - staff commission.
- `staff_payouts` records owner-to-staff payments and is separate from customer `payments`.

Run `supabase/nf0b-revenue-split-payouts.sql` in Supabase before testing commission rules or staff payout marking. Razorpay remains deferred; dummy paid bookings count only for staging analytics.

## Access And Operations Foundation

NF-1 adds database-backed roles and permissions:

- VibePass Interface platform presets: Super Admin, Support, Finance/Ops, Moderator.
- Owner Studio presets: Owner Studio Admin, Management, Instructor.
- Owner Studio custom roles with permission keys.
- Business users and invites linked to the existing staff invite flow.
- New pages: `/owner/users` and `/admin/access`.

Run `supabase/nf1-access-operations-foundation.sql` before testing Owner Studio user management, VibePass Interface role assignment, or permission-gated staff payout marking.

## Operations Modules

NF-1B adds venues, sponsors, branding, and in-app portal notifications:

- New pages: `/owner/venues`, `/admin/venues`, `/staff/venues`, `/owner/sponsors`, `/admin/sponsors`.
- Saved/global venues can be selected from owner class create/edit and feed venue cost/profitability fields.
- Owners can attach sponsors to classes; public class detail only shows sponsor display fields when public.
- Owner Settings can save public display name, tagline, brand colors, cover image URL, and logo.
- Owner, Staff, and Admin sidebars include the in-app notification bell.

Run `supabase/nf1b-operations-modules.sql` after `supabase/nf1-access-operations-foundation.sql` before testing these routes.

## Local Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Local app URL:

```text
http://localhost:3000
```

## Environment

Copy `.env.example` values into a local `.env.local` and replace placeholders with real local/staging values. Never commit real `.env` files.

Required staging variables:

```env
NEXT_PUBLIC_SUPABASE_URL=<staging-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>
NEXT_PUBLIC_APP_URL=https://vibepass-staging.vercel.app
NEXT_PUBLIC_PAYMENTS_MODE=dummy
NEXT_PUBLIC_PAYMENTS_ENABLED=false
```

Optional:

```env
RESEND_API_KEY=<optional>
RESEND_FROM_EMAIL=<optional>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<optional>
```

Razorpay keys are deferred for private staging and should not use live values.

## Known QA Bugs

- `BUG-001`: public report submission fails with a Phase 11 continuation SQL error.
- `BUG-002`: staff invite acceptance does not link staff to the owner studio.
- `BUG-003`: owner staff page still shows `0` staff after invite acceptance.
- `BUG-004`: staff profile edits do not visibly persist.

See `VIBEPASS_AUTOMATION_TEST_PLAN.md` for the full pass/fail/blocked QA matrix.

## Deployment

Use `VERCEL_STAGING_DEPLOYMENT.md` for staging setup. Do not deploy, push, commit, enable Razorpay, or start the next launch step unless explicitly approved.
