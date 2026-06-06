import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { recalculateClassFinancialSnapshot } from "@/lib/finance";

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function isSchemaColumnMissing(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("column")
  );
}

function withoutKeys<T extends Record<string, unknown>>(payload: T, keys: string[]) {
  const next = { ...payload };
  for (const key of keys) delete next[key];
  return next;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown) {
  return cleanString(value).toLowerCase();
}

async function verifyOwnership(classId: string, userId: string) {
  const supabase = service();
  const { data } = await supabase
    .from("classes")
    .select("id, business_id, businesses!inner(owner_id)")
    .eq("id", classId)
    .maybeSingle();
  if (!data) return null;
  const biz = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
  if (biz?.owner_id !== userId) return null;
  return { classId: data.id, businessId: data.business_id as string };
}

/** GET /api/owner/classes/[id]/sponsors — list class_sponsors for this class */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const ownership = await verifyOwnership(id, user.id);
  if (!ownership) return Response.json({ error: "Class not found." }, { status: 404 });

  const supabase = service();
  let result: { data: any[] | null; error: any } = await supabase
    .from("class_sponsors")
    .select("id, sponsor_id, sponsor_amount, sponsor_currency, payment_status, show_sponsor_publicly, sponsor_display_name, sponsor_logo_url, sponsor_cover_image_url, sponsor_message, note, sponsors(id, sponsor_name, email, website, logo_url, cover_image_url)")
    .eq("class_id", id)
    .order("created_at", { ascending: true });
  if (result.error && isSchemaColumnMissing(result.error)) {
    result = await supabase
      .from("class_sponsors")
      .select("id, sponsor_id, sponsor_amount, sponsor_currency, payment_status, show_sponsor_publicly, sponsor_display_name, sponsor_logo_url, sponsor_message, note, sponsors(id, sponsor_name, email, website, logo_url)")
      .eq("class_id", id)
      .order("created_at", { ascending: true });
  }

  if (result.error) {
    const msg = result.error.message.toLowerCase();
    if (msg.includes("class_sponsors") || msg.includes("does not exist") || msg.includes("42p01")) {
      return Response.json({ sponsors: [] });
    }
    return Response.json({ error: result.error.message }, { status: 500 });
  }

  return Response.json({ sponsors: result.data ?? [] });
}

/** POST /api/owner/classes/[id]/sponsors — attach a sponsor to this class */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const ownership = await verifyOwnership(id, user.id);
  if (!ownership) return Response.json({ error: "Class not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  const supabase = service();

  // If sponsorId is missing but sponsorName is provided, create the sponsor first
  let sponsorId: string | null = cleanString(body.sponsorId) || null;
  const sponsorName = cleanString(body.sponsorName);
  const sponsorEmail = normalize(body.email);
  if (!sponsorId && sponsorName) {
    const { data: existingSponsorRows, error: existingSponsorError } = await supabase
      .from("sponsors")
      .select("id, sponsor_name, email")
      .eq("business_id", ownership.businessId);
    if (existingSponsorError && !isSchemaColumnMissing(existingSponsorError)) {
      return Response.json({ error: existingSponsorError.message }, { status: 500 });
    }
    const existingSponsor = (existingSponsorRows ?? []).find((sponsor) => {
      const existingEmail = normalize(sponsor.email);
      const existingName = normalize(sponsor.sponsor_name);
      return (sponsorEmail && existingEmail === sponsorEmail) || existingName === normalize(sponsorName);
    });

    if (existingSponsor?.id) {
      sponsorId = String(existingSponsor.id);
    } else {
    const sponsorPayload = {
      business_id: ownership.businessId,
      sponsor_name: sponsorName,
      email: sponsorEmail || null,
      phone: cleanString(body.phone) || null,
      website: cleanString(body.website) || null,
      logo_url: cleanString(body.sponsorLogoUrl) || null,
      cover_image_url: cleanString(body.sponsorCoverImageUrl) || null,
      description: cleanString(body.description) || null,
      status: "active",
      created_by: user.id,
    };
    let sponsorResult: { data: any; error: any } = await supabase
      .from("sponsors")
      .insert(sponsorPayload)
      .select("id")
      .single();
    if (sponsorResult.error && isSchemaColumnMissing(sponsorResult.error)) {
      sponsorResult = await supabase
        .from("sponsors")
        .insert(withoutKeys(sponsorPayload, ["cover_image_url"]))
        .select("id")
        .single();
    }
    if (sponsorResult.error) return Response.json({ error: sponsorResult.error.message }, { status: 500 });
    sponsorId = sponsorResult.data.id as string;
    }
  }

  const classSponsorPayload = {
    class_id: id,
    business_id: ownership.businessId,
    sponsor_id: sponsorId,
    sponsor_amount: Number(body.sponsorAmount) || 0,
    sponsor_currency: cleanString(body.sponsorCurrency) || "INR",
    payment_status: cleanString(body.paymentStatus) || "expected",
    show_sponsor_publicly: Boolean(body.showSponsorPublicly),
    sponsor_display_name: cleanString(body.sponsorDisplayName) || sponsorName || null,
    sponsor_logo_url: cleanString(body.sponsorLogoUrl) || null,
    sponsor_cover_image_url: cleanString(body.sponsorCoverImageUrl) || null,
    sponsor_message: cleanString(body.sponsorMessage) || null,
    note: cleanString(body.note) || null,
  };

  const { data: existingAssignment } = sponsorId
    ? await supabase
        .from("class_sponsors")
        .select("id")
        .eq("class_id", id)
        .eq("sponsor_id", sponsorId)
        .maybeSingle()
    : { data: null };

  let result: { data: any; error: any };
  if (existingAssignment?.id) {
    result = await supabase
      .from("class_sponsors")
      .update(classSponsorPayload)
      .eq("id", existingAssignment.id)
      .select("*, sponsors(id, sponsor_name, email, website, logo_url, cover_image_url)")
      .single();
    if (result.error && isSchemaColumnMissing(result.error)) {
      result = await supabase
        .from("class_sponsors")
        .update(withoutKeys(classSponsorPayload, ["sponsor_cover_image_url"]))
        .eq("id", existingAssignment.id)
        .select("*, sponsors(id, sponsor_name, email, website, logo_url)")
        .single();
    }
  } else {
    result = await supabase
      .from("class_sponsors")
      .insert(classSponsorPayload)
      .select("*, sponsors(id, sponsor_name, email, website, logo_url, cover_image_url)")
      .single();
    if (result.error && isSchemaColumnMissing(result.error)) {
      result = await supabase
        .from("class_sponsors")
        .insert(withoutKeys(classSponsorPayload, ["sponsor_cover_image_url"]))
        .select("*, sponsors(id, sponsor_name, email, website, logo_url)")
        .single();
    }
  }

  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await recalculateClassFinancialSnapshot(supabase, id)
    .catch((snapshotError) => console.error("Sponsor snapshot recalculation error:", snapshotError));
  return Response.json({ ok: true, classSponsor: result.data }, { status: existingAssignment?.id ? 200 : 201 });
}

/** DELETE /api/owner/classes/[id]/sponsors?csId=... — remove a class_sponsor record */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const ownership = await verifyOwnership(id, user.id);
  if (!ownership) return Response.json({ error: "Class not found." }, { status: 404 });

  const csId = new URL(req.url).searchParams.get("csId");
  if (!csId) return Response.json({ error: "csId required." }, { status: 400 });

  const supabase = service();
  const { error } = await supabase
    .from("class_sponsors")
    .delete()
    .eq("id", csId)
    .eq("class_id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recalculateClassFinancialSnapshot(supabase, id)
    .catch((snapshotError) => console.error("Sponsor snapshot recalculation error:", snapshotError));
  return Response.json({ ok: true });
}
