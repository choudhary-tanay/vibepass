import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function StaffProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Admin client bypasses RLS for cross-table joins
  const [{ data: profile }, { data: staffRow }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("name, email, phone, role, image_url")
      .eq("id", user.id)
      .single(),
    supabaseAdmin
      .from("staff")
      .select("role, image_url, bio, specialties, experience_years, instagram_url, website_url, businesses(business_name)")
      .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const businessName =
    (staffRow?.businesses as { business_name?: string } | null)?.business_name ?? "Not linked yet";

  const displayName = profile?.name ?? user.email ?? "Staff Member";
  const initials = displayName.slice(0, 2).toUpperCase();
  const profileImageUrl =
    (staffRow?.image_url as string | null | undefined) ??
    (profile?.image_url as string | null | undefined) ??
    null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/staff/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-900">My Profile</h1>
          </div>
          <Link
            href="/staff/profile/edit"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
          >
            Edit Profile
          </Link>
        </div>

        <div className="space-y-5">
          {/* Profile header card */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-5">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/20 bg-cover bg-center text-2xl font-black text-white ring-2 ring-white/40"
                style={profileImageUrl ? { backgroundImage: `url(${profileImageUrl})` } : undefined}
                aria-label="Profile photo"
              >
                {!profileImageUrl && initials}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-black">{displayName}</p>
                <p className="text-sm text-indigo-200 capitalize">{staffRow?.role ?? "Staff"}</p>
                <p className="text-sm text-indigo-200">{businessName}</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-400">Contact</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-slate-400">Email</span>
                <span className="font-medium text-slate-700">{profile?.email ?? user.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0 text-slate-400">Phone</span>
                  <span className="font-medium text-slate-700">{profile.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Staff details */}
          {staffRow ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-400">Instructor Details</h2>
              <div className="space-y-4">
                {staffRow.bio ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bio</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{staffRow.bio}</p>
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">No bio yet. <Link href="/staff/profile/edit" className="text-indigo-600 hover:underline">Add one →</Link></p>
                )}

                {staffRow.specialties && (staffRow.specialties as string[]).length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Specialties</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(staffRow.specialties as string[]).map((s) => (
                        <span key={s} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {staffRow.experience_years && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-28 text-slate-400">Experience</span>
                    <span className="font-medium text-slate-700">
                      {staffRow.experience_years} year{staffRow.experience_years !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {staffRow.instagram_url && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-28 text-slate-400">Instagram</span>
                    <a href={staffRow.instagram_url as string} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-indigo-600 hover:underline truncate">
                      {(staffRow.instagram_url as string).replace("https://instagram.com/", "@").replace("https://www.instagram.com/", "@")}
                    </a>
                  </div>
                )}

                {staffRow.website_url && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-28 text-slate-400">Website</span>
                    <a href={staffRow.website_url as string} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-indigo-600 hover:underline truncate">
                      {staffRow.website_url as string}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-indigo-50 p-6 text-center">
              <p className="text-sm text-indigo-700">
                Your staff profile isn&apos;t linked yet. Ask your owner to invite you via the Staff section.
              </p>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/staff/profile/edit"
              className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-black text-white hover:bg-indigo-700"
            >
              Edit My Profile
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
