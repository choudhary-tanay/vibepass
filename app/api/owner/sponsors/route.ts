import {
  isAccessSchemaMissing,
  requireBusinessPermission,
  requireAuthenticatedServiceClient,
  resolveOwnedBusinessId,
} from "@/lib/accessControl";
import { recalculateClassFinancialSnapshot } from "@/lib/finance";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveBusinessId(request: Request) {
  const base = await requireAuthenticatedServiceClient();
  if ("response" in base) return base;
  const url = new URL(request.url);
  const requested = url.searchParams.get("businessId");
  if (requested) return { ...base, businessId: requested };
  const businessId = await resolveOwnedBusinessId(base.supabase, base.authUserId);
  if (!businessId) {
    return { response: Response.json({ error: "Business not found." }, { status: 404 }) };
  }
  return { ...base, businessId };
}

export async function GET(request: Request) {
  const resolved = await resolveBusinessId(request);
  if ("response" in resolved) return resolved.response;

  const access = await requireBusinessPermission(resolved.businessId, "sponsors.manage");
  if ("response" in access) return access.response;

  const [sponsors, classSponsors, snapshots] = await Promise.all([
    access.supabase
      .from("sponsors")
      .select("*")
      .eq("business_id", resolved.businessId)
      .order("created_at", { ascending: false }),
    access.supabase
      .from("class_sponsors")
      .select("*, classes(title, date), sponsors(sponsor_name)")
      .eq("business_id", resolved.businessId)
      .order("created_at", { ascending: false }),
    access.supabase
      .from("class_financial_snapshots")
      .select("class_id, gross_revenue, sponsor_income, net_profit")
      .eq("business_id", resolved.businessId),
  ]);

  const error = sponsors.error ?? classSponsors.error;
  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1b-operations-modules.sql before using sponsors." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    sponsors: sponsors.data ?? [],
    classSponsors: classSponsors.data ?? [],
    financeByClass: (snapshots.data ?? []).reduce<Record<string, unknown>>((acc, snapshot) => {
      acc[String(snapshot.class_id)] = snapshot;
      return acc;
    }, {}),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const businessId = cleanString(body?.businessId);
  const access = await requireBusinessPermission(businessId, "sponsors.manage");
  if ("response" in access) return access.response;

  const sponsorName = cleanString(body?.sponsorName);
  if (!sponsorName) return Response.json({ error: "Sponsor name is required." }, { status: 400 });

  const { data, error } = await access.supabase
    .from("sponsors")
    .insert({
      business_id: businessId,
      sponsor_name: sponsorName,
      contact_person: cleanString(body?.contactPerson) || null,
      email: cleanString(body?.email) || null,
      phone: cleanString(body?.phone) || null,
      website: cleanString(body?.website) || null,
      logo_url: cleanString(body?.logoUrl) || null,
      description: cleanString(body?.description) || null,
      category: cleanString(body?.category) || null,
      notes: cleanString(body?.notes) || null,
      status: cleanString(body?.status) || "active",
      created_by: access.authUserId,
    })
    .select("*")
    .single();

  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1b-operations-modules.sql before using sponsors." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, sponsor: data });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const businessId = cleanString(body?.businessId);
  const access = await requireBusinessPermission(businessId, "sponsors.manage");
  if ("response" in access) return access.response;

  if (body?.attachClassId) {
    const classId = cleanString(body.attachClassId);
    const sponsorId = cleanString(body.sponsorId);
    const { data: cls } = await access.supabase
      .from("classes")
      .select("id, business_id")
      .eq("id", classId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!cls) return Response.json({ error: "Class not found for this business." }, { status: 404 });

    const { data, error } = await access.supabase
      .from("class_sponsors")
      .insert({
        business_id: businessId,
        class_id: classId,
        sponsor_id: sponsorId || null,
        sponsor_amount: Number.isFinite(Number(body?.sponsorAmount)) ? Number(body.sponsorAmount) : 0,
        sponsor_currency: cleanString(body?.sponsorCurrency) || "INR",
        payment_status: cleanString(body?.paymentStatus) || "expected",
        payment_date: cleanString(body?.paymentDate) || null,
        reference: cleanString(body?.reference) || null,
        note: cleanString(body?.note) || null,
        show_sponsor_publicly: Boolean(body?.showSponsorPublicly),
        sponsor_display_name: cleanString(body?.sponsorDisplayName) || null,
        sponsor_logo_url: cleanString(body?.sponsorLogoUrl) || null,
        sponsor_message: cleanString(body?.sponsorMessage) || null,
      })
      .select("*")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await recalculateClassFinancialSnapshot(access.supabase, classId)
      .catch((snapshotError) => console.error("Sponsor snapshot recalculation error:", snapshotError));
    return Response.json({ ok: true, classSponsor: data });
  }

  const sponsorId = cleanString(body?.sponsorId);
  if (!sponsorId) return Response.json({ error: "sponsorId is required." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body?.sponsorName !== undefined) patch.sponsor_name = cleanString(body.sponsorName);
  if (body?.contactPerson !== undefined) patch.contact_person = cleanString(body.contactPerson) || null;
  if (body?.email !== undefined) patch.email = cleanString(body.email) || null;
  if (body?.phone !== undefined) patch.phone = cleanString(body.phone) || null;
  if (body?.website !== undefined) patch.website = cleanString(body.website) || null;
  if (body?.logoUrl !== undefined) patch.logo_url = cleanString(body.logoUrl) || null;
  if (body?.description !== undefined) patch.description = cleanString(body.description) || null;
  if (body?.category !== undefined) patch.category = cleanString(body.category) || null;
  if (body?.notes !== undefined) patch.notes = cleanString(body.notes) || null;
  if (body?.status !== undefined) patch.status = cleanString(body.status) || "active";

  const { error } = await access.supabase
    .from("sponsors")
    .update(patch)
    .eq("id", sponsorId)
    .eq("business_id", businessId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
