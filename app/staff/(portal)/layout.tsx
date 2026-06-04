import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { StaffSidebar } from "@/components/StaffSidebar";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Admins can also view staff portal
  if (profile?.role !== "staff" && profile?.role !== "admin") {
    redirect("/classes");
  }

  return (
    <div className="owner-shell" data-portal="staff">
      <StaffSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
