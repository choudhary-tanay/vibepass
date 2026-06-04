import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import StaffInviteForm from "./StaffInviteForm";

// Use admin client — this page is visited before the user is authenticated.
// RLS would block the business name join for unauthenticated visitors.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function StaffInviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: invite } = await supabaseAdmin
    .from("staff_invites")
    .select("id, email, role, expires_at, accepted_at, businesses(business_name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) notFound();

  if (invite.accepted_at) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">✅</div>
          <h1 className="mt-4 text-2xl font-black text-slate-900">Already Accepted</h1>
          <p className="mt-3 text-sm text-slate-600">
            This invite has already been used. Log in to access your staff portal.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Log In
          </Link>
        </div>
      </main>
    );
  }

  const isExpired = new Date(invite.expires_at) < new Date();
  if (isExpired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">⏰</div>
          <h1 className="mt-4 text-2xl font-black text-slate-900">Link Expired</h1>
          <p className="mt-3 text-sm text-slate-600">
            This invite link has expired (7-day limit). Ask your studio owner to generate a new one.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const businessName =
    (invite.businesses as { business_name?: string } | null)?.business_name ?? "the studio";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <StaffInviteForm
        token={token}
        inviteEmail={invite.email}
        role={invite.role}
        businessName={businessName}
      />
    </main>
  );
}
