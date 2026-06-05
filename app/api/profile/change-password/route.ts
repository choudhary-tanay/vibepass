import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { newPassword, confirmPassword } = body as {
    newPassword?: string;
    confirmPassword?: string;
  };

  // Validate inputs
  if (!newPassword) {
    return Response.json({ error: "New password is required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (newPassword !== confirmPassword) {
    return Response.json(
      { error: "Passwords do not match" },
      { status: 400 }
    );
  }

  const authClient = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: updateError } = await authClient.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 400 });
  }

  return Response.json({ ok: true, message: "Password updated successfully" });
}
