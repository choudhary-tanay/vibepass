import { isAccessSchemaMissing, requirePlatformPermission } from "@/lib/accessControl";
import { money, percent, recalculateClassFinancialSnapshot } from "@/lib/finance";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const access = await requirePlatformPermission("venues.global.manage");
  if ("response" in access) return access.response;

  const [{ data, error }, classesRes, snapshotsRes] = await Promise.all([
    access.supabase
    .from("venues")
    .select("*, businesses(business_name)")
      .order("created_at", { ascending: false }),
    access.supabase
      .from("classes")
      .select("id, venue_id, venue_name"),
    access.supabase
      .from("class_financial_snapshots")
      .select("class_id, gross_revenue, net_profit, venue_cost"),
  ]);

  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1b-operations-modules.sql before using venues." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const snapshotsByClass = new Map((snapshotsRes.data ?? []).map((snapshot) => [String(snapshot.class_id), snapshot]));
  const financeByVenue = new Map<string, { usageCount: number; revenue: number; profit: number; venueCost: number; roiPercent: number }>();
  for (const cls of classesRes.data ?? []) {
    const venueKey = String(cls.venue_id ?? cls.venue_name ?? "unassigned");
    const snapshot = snapshotsByClass.get(String(cls.id));
    const row = financeByVenue.get(venueKey) ?? { usageCount: 0, revenue: 0, profit: 0, venueCost: 0, roiPercent: 0 };
    row.usageCount += 1;
    row.revenue = money(row.revenue + Number(snapshot?.gross_revenue ?? 0));
    row.profit = money(row.profit + Number(snapshot?.net_profit ?? 0));
    row.venueCost = money(row.venueCost + Number(snapshot?.venue_cost ?? 0));
    row.roiPercent = row.venueCost > 0 ? percent(row.profit, row.venueCost) : 0;
    financeByVenue.set(venueKey, row);
  }

  return Response.json({
    venues: (data ?? []).map((venue) => ({
      ...venue,
      finance: financeByVenue.get(String(venue.id)) ?? financeByVenue.get(String(venue.venue_name)) ?? {
        usageCount: 0,
        revenue: 0,
        profit: 0,
        venueCost: 0,
        roiPercent: 0,
      },
    })),
  });
}

export async function POST(request: Request) {
  const access = await requirePlatformPermission("venues.global.manage");
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  const venueName = cleanString(body?.venueName);
  if (!venueName) return Response.json({ error: "Venue name is required." }, { status: 400 });

  const { data, error } = await access.supabase
    .from("venues")
    .insert({
      business_id: null,
      venue_name: venueName,
      address: cleanString(body?.address) || null,
      location_type: cleanString(body?.locationType) || "in_person",
      capacity: Number.isFinite(Number(body?.capacity)) ? Number(body.capacity) : null,
      default_cost: Number.isFinite(Number(body?.defaultCost)) ? Number(body.defaultCost) : 0,
      currency: cleanString(body?.currency) || "INR",
      contact_person: cleanString(body?.contactPerson) || null,
      phone: cleanString(body?.phone) || null,
      email: cleanString(body?.email) || null,
      facilities: Array.isArray(body?.facilities) ? body.facilities : null,
      notes: cleanString(body?.notes) || null,
      images: Array.isArray(body?.images) ? body.images : null,
      visibility: "global",
      status: cleanString(body?.status) || "active",
      created_by: access.authUserId,
    })
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, venue: data });
}

export async function PATCH(request: Request) {
  const access = await requirePlatformPermission("venues.global.manage");
  if ("response" in access) return access.response;
  const body = await request.json().catch(() => null);
  const venueId = cleanString(body?.venueId);
  if (!venueId) return Response.json({ error: "venueId is required." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body?.venueName !== undefined) patch.venue_name = cleanString(body.venueName);
  if (body?.address !== undefined) patch.address = cleanString(body.address) || null;
  if (body?.locationType !== undefined) patch.location_type = cleanString(body.locationType) || "in_person";
  if (body?.capacity !== undefined) patch.capacity = Number.isFinite(Number(body.capacity)) ? Number(body.capacity) : null;
  if (body?.defaultCost !== undefined) patch.default_cost = Number.isFinite(Number(body.defaultCost)) ? Number(body.defaultCost) : 0;
  if (body?.currency !== undefined) patch.currency = cleanString(body.currency) || "INR";
  if (body?.contactPerson !== undefined) patch.contact_person = cleanString(body.contactPerson) || null;
  if (body?.phone !== undefined) patch.phone = cleanString(body.phone) || null;
  if (body?.email !== undefined) patch.email = cleanString(body.email) || null;
  if (body?.facilities !== undefined) patch.facilities = Array.isArray(body.facilities) ? body.facilities : null;
  if (body?.notes !== undefined) patch.notes = cleanString(body.notes) || null;
  if (body?.images !== undefined) patch.images = Array.isArray(body.images) ? body.images : null;
  if (body?.status !== undefined) patch.status = cleanString(body.status) || "active";

  const { error } = await access.supabase.from("venues").update(patch).eq("id", venueId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const { data: affectedClasses } = await access.supabase
    .from("classes")
    .select("id")
    .eq("venue_id", venueId);
  await Promise.all(
    (affectedClasses ?? []).map((cls) =>
      recalculateClassFinancialSnapshot(access.supabase, cls.id)
        .catch((snapshotError) => console.error("Admin venue snapshot recalculation error:", snapshotError))
    )
  );
  return Response.json({ ok: true });
}
