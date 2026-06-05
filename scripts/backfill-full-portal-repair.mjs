import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const raw of fs.readFileSync(path, "utf8").split(/\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

loadEnv(".env.local");

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.BACKFILL_ADMIN_EMAIL;
const adminPassword = process.env.BACKFILL_ADMIN_PASSWORD;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}
if (!adminEmail || !adminPassword) {
  throw new Error("Set BACKFILL_ADMIN_EMAIL and BACKFILL_ADMIN_PASSWORD before running.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function sessionJar() {
  const cookies = new Map();
  const client = createBrowserClient(supabaseUrl, anonKey, {
    isSingleton: false,
    cookies: {
      getAll() {
        return [...cookies.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(items) {
        for (const item of items) {
          if (item.options?.maxAge === 0 || item.value === "") cookies.delete(item.name);
          else cookies.set(item.name, item.value);
        }
      },
    },
  });
  return {
    client,
    header() {
      return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
  };
}

const jar = sessionJar();
const { error: signInError } = await jar.client.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});
if (signInError) throw new Error(`Admin sign-in failed: ${signInError.message}`);

const { data: businesses, error: businessError } = await admin
  .from("businesses")
  .select("id, business_name, status")
  .order("created_at", { ascending: false });
if (businessError) throw new Error(`Could not load businesses: ${businessError.message}`);

const results = [];
for (const business of businesses ?? []) {
  const response = await fetch(`${appUrl}/api/finance/recalculate/business/${business.id}`, {
    method: "POST",
    headers: { Cookie: jar.header() },
  });
  const body = await response.json().catch(() => ({}));
  results.push({
    businessId: business.id,
    businessName: business.business_name,
    status: business.status,
    ok: response.ok && body.ok !== false,
    httpStatus: response.status,
    snapshotsWritten: body.snapshotsWritten ?? 0,
    failedCount: body.failedCount ?? 0,
    failures: body.failures ?? [],
  });
}

console.log(JSON.stringify({ ok: results.every((item) => item.ok), results }, null, 2));
