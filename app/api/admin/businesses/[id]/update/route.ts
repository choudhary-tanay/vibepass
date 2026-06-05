import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isSchemaColumnMissing(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check — admin only
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const {
    status,
    isMarketplaceVisible,
    categories,
    platformMargin,
    marginNote,
    adminNotes,
    rejectionReason,
    suspensionReason,
  } = body;

  const ALLOWED_STATUSES = new Set([
    "pending_approval", "active", "rejected", "suspended", "hidden", "archived",
  ]);

  const patch: Record<string, unknown> = {};

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.has(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = status;
    if (status === "active") {
      patch.approved_at = new Date().toISOString();
      patch.rejection_reason = null;
      patch.suspension_reason = null;
      patch.review_requested = false;
      patch.review_request_note = null;
      patch.review_requested_at = null;
    }
    if (status === "rejected" && rejectionReason !== undefined) {
      patch.rejection_reason = rejectionReason || null;
      patch.suspension_reason = null;
    }
    if (status === "suspended" && suspensionReason !== undefined) {
      patch.suspension_reason = suspensionReason || null;
      patch.rejection_reason = null;
    }
    if (status === "archived") {
      patch.archived_at = new Date().toISOString();
    }
  }

  if (isMarketplaceVisible !== undefined) patch.is_marketplace_visible = isMarketplaceVisible;
  if (categories !== undefined) patch.categories = categories;
  if (adminNotes !== undefined) patch.admin_notes = adminNotes || null;

  if (platformMargin !== undefined) {
    const margin = parseFloat(platformMargin);
    if (isNaN(margin) || margin < 0 || margin > 100) {
      return Response.json({ error: "Platform margin must be between 0 and 100" }, { status: 400 });
    }
    patch.platform_margin = margin;
    patch.platform_margin_percent = margin;
    patch.margin_note = marginNote || null;
    if (margin > 0) patch.margin_set_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update(patch)
    .eq("id", id);

  if (error) {
    if ("platform_margin_percent" in patch && isSchemaColumnMissing(error)) {
      const fallbackPatch = { ...patch };
      delete fallbackPatch.platform_margin_percent;
      const { error: fallbackError } = await supabaseAdmin
        .from("businesses")
        .update(fallbackPatch)
        .eq("id", id);
      if (!fallbackError) return Response.json({ ok: true });
    }
    console.error("Admin business update error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
