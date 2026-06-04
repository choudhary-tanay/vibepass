# VibePass Vercel Staging Deployment Guide

This guide prepares VibePass for a private staging deployment on Vercel. Do not use this as a public launch checklist.

Current staging status as of 4 June 2026:

- Staging URL: `https://vibepass-staging.vercel.app/`
- GitHub repo: `https://github.com/choudhary-tanay/vibepass`
- Launch type: private staging only, not public launch
- Payment mode: dummy payment only with `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`
- Real Razorpay payments: deferred
- Step 9 QA found report and staff-linkage bugs; see `VIBEPASS_PROJECT_BLUEPRINT.md` and `VIBEPASS_AUTOMATION_TEST_PLAN.md`
- Admin QA is still pending
- Do not expose real Supabase service-role keys, Razorpay secrets, Resend keys, or private SSH keys in docs, commits, screenshots, or chat summaries

Required read order before any future code, database, deployment, QA, launch, bug-fix, commit, or push work:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`

Sources checked:

- Vercel Next.js deployment docs: https://vercel.com/docs/concepts/next.js/overview
- Vercel Git deployments docs: https://vercel.com/docs/deployments/git
- Vercel environment variables docs: https://vercel.com/docs/environment-variables
- Vercel rollback docs: https://vercel.com/docs/deployments/rollback-production-deployment
- Supabase redirect URL docs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase storage bucket docs: https://supabase.com/docs/guides/storage/buckets/fundamentals

## Staging Defaults

- GitHub repository: `https://github.com/choudhary-tanay/vibepass`
- Recommended Vercel project name: `vibepass-staging`
- Framework preset: `Next.js`
- Install command: Vercel default, or `npm install`
- Build command: `npm run build`
- Output directory: leave blank/default for Next.js
- Root directory: repository root
- Node version: use Vercel default unless a build error requires matching local Node
- Staging payment mode: dummy payment only

## Connect GitHub To Vercel

1. Open Vercel Dashboard.
2. Choose Add New -> Project.
3. Import the GitHub repository `choudhary-tanay/vibepass`.
4. Set project name to `vibepass-staging`.
5. Confirm Framework Preset is `Next.js`.
6. Confirm Build Command is `npm run build`.
7. Leave Output Directory empty/default.
8. Add the environment variables below before deploying.
9. Do not deploy until the staging Supabase values are ready.

Vercel may automatically trigger deployments after the repo is connected. For private staging, check the environment variables before allowing a useful staging build.

## Vercel Environment Variables

Add these in Vercel Project Settings -> Environment Variables.

Use these exact staging payment values:

```env
NEXT_PUBLIC_PAYMENTS_MODE=dummy
NEXT_PUBLIC_PAYMENTS_ENABLED=false
```

Required real values from Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-staging-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-staging-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-staging-supabase-service-role-key>
```

Required app URL value after Vercel assigns the staging domain:

```env
NEXT_PUBLIC_APP_URL=https://<your-vercel-staging-domain>
```

Optional values for staging feature checks:

```env
RESEND_API_KEY=<your-resend-api-key-if-testing-email>
RESEND_FROM_EMAIL=<verified-or-test-sender-email>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key-if-testing-location-autocomplete>
```

Deferred Razorpay values. Do not add live Razorpay keys for dummy staging:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

If Vercel requires a value instead of blank, leave these unset for dummy staging unless a future Razorpay test explicitly needs test-mode keys.

## Values Needed From Tanay

Collect these before deployment:

- Staging Supabase project URL.
- Staging Supabase anon key.
- Staging Supabase service role key.
- Final Vercel staging URL after project creation, for `NEXT_PUBLIC_APP_URL`.
- Resend API key and sender email only if email notifications should be tested.
- Google Maps API key only if location autocomplete should be tested.

Do not share or commit real values. Enter them directly in Vercel and Supabase dashboards.

## Supabase Auth Setup

In Supabase Dashboard -> Authentication -> URL Configuration:

1. Set Site URL to the final staging URL:

```text
https://<your-vercel-staging-domain>
```

2. Add Redirect URLs for local and staging:

```text
http://localhost:3000/**
https://<your-vercel-staging-domain>/**
```

3. If using Vercel preview URLs, add the preview pattern only for staging/testing, not broad public production access:

```text
https://*-<team-or-account-slug>.vercel.app/**
```

Supabase recommends exact redirect URLs for production-like environments. Use wildcard preview URLs only where they are needed for Vercel preview deployments.

## Supabase Storage Reminder

Confirm these buckets exist before QA:

```text
class-images
profile-images
business-logos
```

Bucket access must match the app's storage policies. Public media buckets can serve public images, while private buckets require RLS policies or signed URLs.

## Dummy Payment Warning

Staging must stay in dummy payment mode:

```env
NEXT_PUBLIC_PAYMENTS_MODE=dummy
NEXT_PUBLIC_PAYMENTS_ENABLED=false
```

No real money should be collected in staging. Do not add live Razorpay keys. Do not switch `NEXT_PUBLIC_PAYMENTS_ENABLED` to `true` for this private staging launch.

## Verify Deployment

After deployment is approved and completed:

1. Open the Vercel staging URL.
2. Confirm homepage loads.
3. Confirm `/classes` loads.
4. Confirm auth pages load.
5. Confirm Supabase auth redirects return to the staging URL.
6. Confirm admin health page loads for an admin user.
7. Confirm free booking works.
8. Confirm dummy paid booking shows the demo payment UI and does not collect real money.
9. Confirm class images/profile images/business logos load from Supabase storage.
10. Confirm Vercel build logs show no missing required environment variables.

Step 9 manual QA should own the full pass/fail checklist.

## Do Not Expose Publicly

Never expose or commit:

- `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.test`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_SECRET`
- `RESEND_API_KEY`
- Private SSH keys
- `.pem` files
- Any dashboard screenshots containing secrets

Public `NEXT_PUBLIC_*` variables are visible to browser code by design. Only put values there that are safe to expose publicly.

## Rollback Basics

For a staging issue:

1. In Vercel Dashboard -> Project -> Deployments, find the last known good deployment.
2. Use Vercel rollback/redeploy controls to restore the last known good build.
3. If using Git-triggered deployments, revert or fix the bad commit and push again.
4. Recheck environment variables after rollback; environment changes in Vercel project settings may not be changed by rolling back code.
5. Document the issue in the staging checklist before continuing QA.

For production later, use Vercel's official rollback flow and verify logs before and after rollback.
