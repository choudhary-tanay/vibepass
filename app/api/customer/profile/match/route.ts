import { createClient } from "@supabase/supabase-js";
import { isAccessSchemaMissing } from "@/lib/accessControl";

function normalizeEmail(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  return text || null;
}

function normalizePhone(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const businessId = String(body.businessId ?? "");
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);

  if (!businessId || (!email && !phone)) {
    return Response.json({ error: "businessId and email or phone are required." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let query = supabase
    .from("customer_profiles")
    .select("id, primary_name, primary_email, primary_phone, experience_level, goals, marketing_consent")
    .eq("business_id", businessId)
    .limit(3);

  if (email && phone) query = query.or(`primary_email.eq.${email},primary_phone.eq.${phone}`);
  else if (email) query = query.eq("primary_email", email);
  else if (phone) query = query.eq("primary_phone", phone);

  const { data, error } = await query;
  if (error) {
    if (isAccessSchemaMissing(error)) return Response.json({ match: null, warning: "Customer profile tables are not available." });
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) return Response.json({ match: null });
  if (data.length > 1) {
    return Response.json({
      match: null,
      duplicate: true,
      candidates: data.map((row) => ({
        id: row.id,
        primaryName: row.primary_name,
        primaryEmail: row.primary_email,
        primaryPhone: row.primary_phone,
      })),
    });
  }

  const row = data[0];
  return Response.json({
    match: {
      id: row.id,
      name: row.primary_name,
      email: row.primary_email,
      phone: row.primary_phone,
      experienceLevel: row.experience_level,
      goals: row.goals ?? [],
      marketingConsent: row.marketing_consent ?? false,
    },
  });
}
