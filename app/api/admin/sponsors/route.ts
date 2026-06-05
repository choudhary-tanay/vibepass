import { isAccessSchemaMissing, requirePlatformPermission } from "@/lib/accessControl";

export async function GET() {
  const access = await requirePlatformPermission("sponsors.manage");
  if ("response" in access) return access.response;

  const [sponsors, classSponsors, snapshots] = await Promise.all([
    access.supabase
      .from("sponsors")
      .select("*, businesses(business_name)")
      .order("created_at", { ascending: false }),
    access.supabase
      .from("class_sponsors")
      .select("*, businesses(business_name), classes(title, date), sponsors(sponsor_name)")
      .order("created_at", { ascending: false }),
    access.supabase
      .from("class_financial_snapshots")
      .select("class_id, gross_revenue, sponsor_income, net_profit"),
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
