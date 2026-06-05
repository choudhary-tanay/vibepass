import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function AdminProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("name, email, phone, role").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-black text-slate-950">Admin Profile</h1>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase text-slate-400">Account</h2>
        <div className="mt-4 grid gap-3 text-sm">
          <div>
            <p className="font-semibold text-slate-400">Name</p>
            <p className="mt-1 font-bold text-slate-900">{profile?.name ?? user?.email ?? "Admin"}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-400">Email</p>
            <p className="mt-1 font-bold text-slate-900">{profile?.email ?? user?.email ?? "Not available"}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-400">Role</p>
            <p className="mt-1 font-bold capitalize text-slate-900">{profile?.role ?? "admin"}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-black uppercase text-slate-400">Change Password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
