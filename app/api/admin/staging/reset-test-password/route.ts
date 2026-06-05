import { requirePlatformPermission } from "@/lib/accessControl";

function isStagingToolEnabled() {
  return (
    process.env.NEXT_PUBLIC_PAYMENTS_MODE === "dummy" ||
    process.env.VIBEPASS_ENABLE_STAGING_ADMIN_TOOLS === "true"
  );
}

function isAllowedTestEmail(email: string) {
  const lower = email.toLowerCase();
  return (
    lower.endsWith("@example.com") &&
    (lower.startsWith("qa-") || lower.includes("test") || lower.includes("staging"))
  );
}

export async function POST(request: Request) {
  if (!isStagingToolEnabled()) {
    return Response.json({ error: "Staging admin tools are disabled." }, { status: 404 });
  }

  const access = await requirePlatformPermission("platform.users.manage");
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "admin123");

  if (!email || !isAllowedTestEmail(email)) {
    return Response.json(
      { error: "Only QA/test @example.com users can be reset by this endpoint." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  let targetUserId: string | null = null;
  for (let page = 1; page <= 20 && !targetUserId; page += 1) {
    const { data, error } = await access.supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) targetUserId = found.id;
    if (data.users.length < 1000) break;
  }

  if (!targetUserId) {
    return Response.json({ error: "Test user not found." }, { status: 404 });
  }

  const { error } = await access.supabase.auth.admin.updateUserById(targetUserId, { password });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
