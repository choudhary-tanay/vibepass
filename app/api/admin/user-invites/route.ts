import { requireAdminServiceClient } from "@/lib/adminServer";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { logAdminAction } from "@/lib/adminAuditLog";

const allowedRoles = new Set(["customer", "owner", "staff", "admin"]);

export async function POST(request: Request) {
  const admin = await requireAdminServiceClient();
  if ("response" in admin) return admin.response;
  const { userId } = admin;

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const body = await request.json().catch(() => null);
  const { fullName, email, phone, role, businessId, inviteNote } = body ?? {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!allowedRoles.has(role)) {
    return Response.json({ error: "Invalid role." }, { status: 400 });
  }

  if ((role === "owner" || role === "staff") && !businessId) {
    return Response.json(
      { error: "Choose a business for owner or staff invites." },
      { status: 400 }
    );
  }

  let inviteWarning: string | null = null;

  if (role !== "staff") {
    const { error: inviteError } = await admin.supabase.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: {
          name: typeof fullName === "string" ? fullName.trim() : "",
          role,
          phone: typeof phone === "string" ? phone.trim() : "",
          business_id: businessId || null,
        },
      }
    );

    if (inviteError) {
      inviteWarning = inviteError.message;
    }
  } else {
    inviteWarning = "Staff auth invite will connect in Phase 12 staff invite flow.";
  }

  const { error } = await admin.supabase.from("admin_user_invites").insert({
    email: email.trim().toLowerCase(),
    full_name: typeof fullName === "string" ? fullName.trim() || null : null,
    phone: typeof phone === "string" ? phone.trim() || null : null,
    role,
    business_id: businessId || null,
    status: inviteWarning ? "pending" : "sent",
    invite_note:
      typeof inviteNote === "string" ? inviteNote.trim() || inviteWarning : inviteWarning,
    created_by: user?.id ?? null,
  });

  if (error) {
    return Response.json(
      { error: "Invite could not be saved. Run the Phase 11 continuation SQL first." },
      { status: 500 }
    );
  }

  await logAdminAction({
    adminId: userId,
    actionType: "user_invited",
    entityType: "user",
    newValue: `${email} (${role})`,
    reason: typeof inviteNote === "string" ? inviteNote.trim() || undefined : undefined,
  });

  return Response.json({
    success: true,
    warning: inviteWarning,
  });
}
