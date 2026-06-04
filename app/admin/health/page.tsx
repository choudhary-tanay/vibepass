import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

interface Check {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

async function runHealthChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  // --- Environment variables ---
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missingEnv = requiredEnvVars.filter((v) => !process.env[v]);
  checks.push({
    name: "Required env vars",
    status: missingEnv.length === 0 ? "ok" : "fail",
    detail:
      missingEnv.length === 0
        ? "All required vars are set"
        : `Missing: ${missingEnv.join(", ")}`,
  });

  checks.push({
    name: "Razorpay keys",
    status:
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
        ? "ok"
        : "warn",
    detail:
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
        ? `Key ID present (${process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test") ? "TEST mode" : "LIVE mode"})`
        : "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set — payments disabled",
  });

  checks.push({
    name: "Payments enabled flag",
    status: process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true" ? "ok" : "warn",
    detail:
      process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true"
        ? "NEXT_PUBLIC_PAYMENTS_ENABLED=true"
        : "NEXT_PUBLIC_PAYMENTS_ENABLED is not 'true' — paid bookings hidden from UI",
  });

  checks.push({
    name: "Resend email",
    status: process.env.RESEND_API_KEY ? "ok" : "warn",
    detail: process.env.RESEND_API_KEY
      ? "RESEND_API_KEY is set"
      : "RESEND_API_KEY not set — booking confirmation emails will not send",
  });

  checks.push({
    name: "Google Maps",
    status: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "ok" : "warn",
    detail: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set"
      : "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set — map/autocomplete features unavailable",
  });

  // --- Supabase connectivity & RLS spot check ---
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbErr } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    checks.push({
      name: "Supabase connectivity",
      status: dbErr ? "fail" : "ok",
      detail: dbErr ? `Cannot read profiles table: ${dbErr.message}` : "profiles table readable",
    });

    // Storage buckets
    const buckets = ["class-images", "profile-images", "business-logos"];
    const { data: bucketList } = await supabase.storage.listBuckets();
    const existingBuckets = new Set((bucketList ?? []).map((b) => b.name));

    for (const bucket of buckets) {
      checks.push({
        name: `Storage: ${bucket}`,
        status: existingBuckets.has(bucket) ? "ok" : "fail",
        detail: existingBuckets.has(bucket)
          ? "Bucket exists"
          : `Bucket '${bucket}' not found — create it in Supabase Storage`,
      });
    }

    // RLS spot check: anon can read active businesses
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey
    );
    const { data: publicBiz, error: rlsErr } = await supabaseAnon
      .from("businesses")
      .select("id")
      .eq("status", "active")
      .eq("is_marketplace_visible", true)
      .limit(1);

    checks.push({
      name: "RLS: public business read",
      status: rlsErr ? "fail" : "ok",
      detail: rlsErr
        ? `Anon cannot read active businesses: ${rlsErr.message}`
        : `Anon read OK — ${publicBiz?.length ?? 0} active businesses visible`,
    });
  } catch (err) {
    checks.push({
      name: "Supabase connectivity",
      status: "fail",
      detail: `Unexpected error: ${String(err)}`,
    });
  }

  return checks;
}

export default async function AdminHealthPage() {
  // Auth guard: admin only
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const checks = await runHealthChecks();

  const statusIcon = { ok: "✓", warn: "⚠", fail: "✕" };
  const statusStyle = {
    ok: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    warn: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200",
    fail: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  };

  const counts = {
    ok: checks.filter((c) => c.status === "ok").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };

  const overallStatus: "ok" | "warn" | "fail" =
    counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "ok";

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
          <p className="mt-2 text-xs font-black uppercase tracking-widest text-sky-600">
            Admin Command
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              System Health
            </h1>
            <span className={`rounded-full px-3 py-1 text-sm font-black ${statusStyle[overallStatus]}`}>
              {statusIcon[overallStatus]}{" "}
              {overallStatus === "ok" ? "All systems go" : overallStatus === "warn" ? "Warnings" : "Issues found"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {counts.ok} passing · {counts.warn} warnings · {counts.fail} failures
          </p>
        </div>

        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.name}
              className="flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${statusStyle[check.status]}`}
              >
                {statusIcon[check.status]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-900 dark:text-white">{check.name}</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Checks run on each page load — no caching. Results reflect current live state.
        </p>
      </div>
    </main>
  );
}
