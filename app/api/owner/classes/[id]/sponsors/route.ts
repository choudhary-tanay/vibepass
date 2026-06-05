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
  const { data, error } = await supabase
    .from("class_sponsors")
    .select("id, sponsor_id, sponsor_amount, sponsor_currency, payment_status, show_sponsor_publicly, sponsor_display_name, sponsor_logo_url, sponsor_message, note, sponsors(id, sponsor_name, email, website, logo_url)")
    .eq("class_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("class_sponsors") || msg.includes("does not exist") || msg.includes("42p01")) {
      return Response.json({ sponsors: [] });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ sponsors: data ?? [] });
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
  let sponsorId: string | null = (body.sponsorId as string) || null;
  if (!sponsorId && body.sponsorName) {
    const { data: newSponsor, error: sponsorErr } = await supabase
      .from("sponsors")
      .insert({
        business_id: ownership.businessId,
        sponsor_name: String(body.sponsorName).trim(),
        email: body.email ? String(body.email).trim() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        website: body.website ? String(body.website).trim() : null,
        description: body.description ? String(body.description).trim() : null,
        status: "active",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (sponsorErr) return Response.json({ error: sponsorErr.message }, { status: 500 });
    sponsorId = newSponsor.id as string;
  }

  const { data, error } = await supabase
    .from("class_sponsors")
    .insert({
      class_id: id,
      business_id: ownership.businessId,
      sponsor_id: sponsorId,
      sponsor_amount: Number(body.sponsorAmount) || 0,
      sponsor_currency: (body.sponsorCurrency as string) || "INR",
      payment_status: (body.paymentStatus as string) || "expected",
      show_sponsor_publicly: Boolean(body.showSponsorPublicly),
      sponsor_display_name: body.sponsorDisplayName ? String(body.sponsorDisplayName).trim() : null,
      sponsor_logo_url: body.sponsorLogoUrl ? String(body.sponsorLogoUrl).trim() : null,
      sponsor_message: body.sponsorMessage ? String(body.sponsorMessage).trim() : null,
      note: body.note ? String(body.note).trim() : null,
    })
    .select("*, sponsors(id, sponsor_name, email, website, logo_url)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recalculateClassFinancialSnapshot(supabase, id)
    .catch((snapshotError) => console.error("Sponsor snapshot recalculation error:", snapshotError));
  return Response.json({ ok: true, classSponsor: data }, { status: 201 });
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
