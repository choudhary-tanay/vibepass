import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ClassCard } from "@/components/ClassCard";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";
import { HomeFeaturedCarousel } from "@/components/HomeFeaturedCarousel";
import { MetricRibbon } from "@/components/PortalCharts";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Class, ClassMarketplaceSponsor, Staff } from "@/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const fallbackCategories = ["Yoga", "Dance", "Fitness", "Pilates", "Meditation", "Wellness"];

interface HomeClassRow {
  id: string;
  business_id: string;
  title: string;
  description: string;
  category: string;
  instructor_name: string;
  staff_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  price: number;
  capacity: number;
  booked_count: number;
  location: string;
  status: string;
  tagline: string | null;
  image_url: string | null;
  artwork_variant?: string | null;
  artwork_text_color?: string | null;
  featured: boolean;
  featured_position: number | null;
  featured_label: string | null;
  featured_until: string | null;
  browse_featured: boolean | null;
  browse_position: number | null;
  businesses?: { business_name: string; status: string; is_marketplace_visible: boolean } | null;
}

interface HomeClassStaffRow {
  class_id: string;
  staff_id: string;
  is_primary: boolean | null;
}

interface HomeStaffRow {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  image_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  instagram_url: string | null;
  website_url: string | null;
  public_profile_visible: boolean;
}

interface HomePublicSponsorRow {
  id: string;
  class_id: string;
  sponsor_display_name?: string | null;
  sponsor_logo_url?: string | null;
  sponsor_cover_image_url?: string | null;
  sponsor_message?: string | null;
  sponsors?:
    | {
        sponsor_name?: string | null;
        logo_url?: string | null;
        cover_image_url?: string | null;
      }
    | Array<{
        sponsor_name?: string | null;
        logo_url?: string | null;
        cover_image_url?: string | null;
      }>
    | null;
}

function isSchemaColumnMissing(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("column")
  );
}

function sponsorsByClass(rows: HomePublicSponsorRow[]) {
  return rows.reduce<Record<string, ClassMarketplaceSponsor[]>>((acc, row) => {
    const joined = Array.isArray(row.sponsors) ? row.sponsors[0] : row.sponsors;
    acc[row.class_id] = acc[row.class_id] ?? [];
    acc[row.class_id].push({
      id: row.id,
      displayName: row.sponsor_display_name || joined?.sponsor_name || "Sponsor",
      logoUrl: row.sponsor_logo_url || joined?.logo_url || null,
      coverImageUrl: row.sponsor_cover_image_url || joined?.cover_image_url || null,
      message: row.sponsor_message || null,
    });
    return acc;
  }, {});
}

function toHomeClass(row: HomeClassRow, classStaffByClass: Record<string, string[]>): Class {
  const linkedStaffIds = classStaffByClass[row.id] ?? [];
  const staffIds = linkedStaffIds.length > 0 ? linkedStaffIds : row.staff_id ? [row.staff_id] : [];

  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    description: row.description,
    category: row.category,
    instructorName: row.instructor_name,
    staffId: row.staff_id,
    staffIds: staffIds.length > 0 ? staffIds : undefined,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    price: row.price,
    capacity: row.capacity,
    bookedCount: row.booked_count,
    location: row.location,
    status: row.status as Class["status"],
    tagline: row.tagline ?? undefined,
    imageUrl: row.image_url ?? undefined,
    artworkVariant: row.artwork_variant === "alternate" ? "alternate" : "primary",
    artworkTextColor: row.artwork_text_color ?? undefined,
    featured: row.featured,
    featuredPosition: row.featured_position ?? undefined,
    featuredLabel: row.featured_label ?? undefined,
    featuredUntil: row.featured_until ?? undefined,
    browseFeatured: row.browse_featured ?? false,
    browsePosition: row.browse_position ?? undefined,
  };
}

function toHomeStaff(row: HomeStaffRow): Staff {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    role: row.role,
    status: row.status as Staff["status"],
    imageUrl: row.image_url ?? undefined,
    bio: row.bio ?? undefined,
    specialties: row.specialties ?? undefined,
    experienceYears: row.experience_years ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    publicProfileVisible: row.public_profile_visible,
  };
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  let viewerRole: string | null = null;
  if (authData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    viewerRole = profile?.role ?? null;
  }
  const showStudioPromo = viewerRole !== "customer";
  const today = new Date().toISOString().split("T")[0];
  const classSelectWithArtwork =
    "id, business_id, title, description, category, instructor_name, staff_id, date, start_time, end_time, price, capacity, booked_count, location, status, tagline, image_url, artwork_variant, artwork_text_color, featured, featured_position, featured_label, featured_until, browse_featured, browse_position, businesses!inner(business_name, status, is_marketplace_visible)";
  const classSelectFallback =
    "id, business_id, title, description, category, instructor_name, staff_id, date, start_time, end_time, price, capacity, booked_count, location, status, tagline, image_url, featured, featured_position, featured_label, featured_until, browse_featured, browse_position, businesses!inner(business_name, status, is_marketplace_visible)";

  function liveClassesQuery(select: string) {
    return supabase
      .from("classes")
      .select(select)
      .eq("status", "published")
      .eq("is_admin_hidden", false)
      .eq("businesses.status", "active")
      .eq("businesses.is_marketplace_visible", true)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(9);
  }

  function featuredClassesQuery(select: string) {
    return supabase
      .from("classes")
      .select(select)
      .eq("status", "published")
      .eq("is_admin_hidden", false)
      .eq("featured", true)
      .eq("businesses.status", "active")
      .eq("businesses.is_marketplace_visible", true)
      .gte("date", today)
      .or(`featured_until.is.null,featured_until.gte.${today}`)
      .order("featured_position", { ascending: true, nullsFirst: false })
      .order("date", { ascending: true })
      .limit(8);
  }

  let [liveResult, featuredResult, { data: bizRows }] = await Promise.all([
    liveClassesQuery(classSelectWithArtwork),
    featuredClassesQuery(classSelectWithArtwork),
    supabase
      .from("businesses")
      .select("id, business_name")
      .eq("status", "active")
      .eq("is_marketplace_visible", true),
  ]);

  if (
    (liveResult.error && isSchemaColumnMissing(liveResult.error)) ||
    (featuredResult.error && isSchemaColumnMissing(featuredResult.error))
  ) {
    [liveResult, featuredResult] = await Promise.all([
      liveClassesQuery(classSelectFallback),
      featuredClassesQuery(classSelectFallback),
    ]);
  }

  const bizMap: Record<string, string> = {};
  for (const b of bizRows ?? []) bizMap[b.id] = b.business_name;

  const liveClassRows = (liveResult.data ?? []) as unknown as HomeClassRow[];
  const featuredClassRows = (featuredResult.data ?? []) as unknown as HomeClassRow[];
  const allRows = [...liveClassRows, ...featuredClassRows];
  const uniqueRows = Array.from(
    new Map(allRows.map((row) => [row.id, row])).values()
  );
  const classIds = uniqueRows.map((row) => row.id);
  let classStaffRows: HomeClassStaffRow[] = [];
  let publicSponsorRows: HomePublicSponsorRow[] = [];
  if (classIds.length > 0) {
    const { data } = await supabase
      .from("class_staff")
      .select("class_id, staff_id, is_primary")
      .in("class_id", classIds)
      .order("is_primary", { ascending: false });
    classStaffRows = (data as HomeClassStaffRow[] | null) ?? [];

    const sponsorSelectWithCover =
      "id, class_id, sponsor_display_name, sponsor_logo_url, sponsor_cover_image_url, sponsor_message, sponsors(sponsor_name, logo_url, cover_image_url)";
    const sponsorSelectFallback =
      "id, class_id, sponsor_display_name, sponsor_logo_url, sponsor_message, sponsors(sponsor_name, logo_url)";
    let sponsorResult: { data: HomePublicSponsorRow[] | null; error: any } = await supabase
      .from("class_sponsors")
      .select(sponsorSelectWithCover)
      .in("class_id", classIds)
      .eq("show_sponsor_publicly", true)
      .order("created_at", { ascending: true });
    if (sponsorResult.error && isSchemaColumnMissing(sponsorResult.error)) {
      sponsorResult = await supabase
        .from("class_sponsors")
        .select(sponsorSelectFallback)
        .in("class_id", classIds)
        .eq("show_sponsor_publicly", true)
        .order("created_at", { ascending: true });
    }
    if (!sponsorResult.error) {
      publicSponsorRows = (sponsorResult.data as HomePublicSponsorRow[] | null) ?? [];
    }
  }

  const classStaffByClass = classStaffRows.reduce<Record<string, string[]>>(
    (acc, row) => {
      acc[row.class_id] = acc[row.class_id] ?? [];
      if (!acc[row.class_id].includes(row.staff_id)) acc[row.class_id].push(row.staff_id);
      return acc;
    },
    {}
  );
  for (const row of uniqueRows) {
    if (row.staff_id) {
      classStaffByClass[row.id] = classStaffByClass[row.id] ?? [];
      if (!classStaffByClass[row.id].includes(row.staff_id)) {
        classStaffByClass[row.id].push(row.staff_id);
      }
    }
  }

  const staffIds = Array.from(
    new Set(Object.values(classStaffByClass).flat().filter(Boolean))
  );
  let staffRows: HomeStaffRow[] = [];
  if (staffIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("staff")
      .select(
        "id, business_id, name, email, phone, role, status, image_url, bio, specialties, experience_years, instagram_url, website_url, public_profile_visible"
      )
      .in("id", staffIds);
    staffRows = (data as HomeStaffRow[] | null) ?? [];
  }

  const staffById = new Map(staffRows.map((row) => [row.id, toHomeStaff(row)]));
  const sponsorMap = sponsorsByClass(publicSponsorRows);
  const liveClasses = liveClassRows.map((row) => ({
    ...toHomeClass(row, classStaffByClass),
    marketplaceSponsors: sponsorMap[row.id] ?? [],
  }));
  const homepageFeaturedClasses = featuredClassRows.map((row) => ({
    ...toHomeClass(row, classStaffByClass),
    marketplaceSponsors: sponsorMap[row.id] ?? [],
  }));
  const instructorsByClassId = uniqueRows.reduce<Record<string, Staff[]>>((acc, row) => {
    const ids = classStaffByClass[row.id] ?? [];
    acc[row.id] = ids
      .map((staffId) => staffById.get(staffId))
      .filter((member): member is Staff => Boolean(member));
    return acc;
  }, {});

  const categories = Array.from(new Set(liveClasses.map((cls) => cls.category).filter(Boolean)));
  const visibleCategories = categories.length > 0 ? categories.slice(0, 8) : fallbackCategories;
  const seatsOpen = liveClasses.reduce(
    (sum, cls) => sum + Math.max(0, cls.capacity - cls.bookedCount),
    0
  );
  return (
    <main className="min-h-screen bg-white px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-[96rem]">
        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-start">
          <div className="h-fit rounded-[1.75rem] bg-white/82 p-5 shadow-[0_18px_54px_rgba(15,23,42,0.05)] ring-1 ring-slate-100 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">
                Live happening now
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                Book classes, not vibes
              </span>
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
              Pick a class that matches your{" "}
              <span className="relative inline-block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                vibe today.
                <span className="absolute -bottom-1 left-0 h-1.5 w-28 rounded-full bg-amber-300" />
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 dark:text-slate-300">
              Browse live schedules from local studios, compare instructors,
              seats, price, and location, then book a spot before it fills.
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-[1fr_12rem_auto]">
              <input
                readOnly
                value=""
                placeholder="Search yoga, dance, HIIT, pilates..."
                className="touch-pill rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 shadow-sm outline-none"
              />
              <select
                aria-label="Category"
                className="touch-pill rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none"
                defaultValue=""
              >
                <option value="">Any category</option>
                {visibleCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Link
                href="/classes"
                className="touch-pill inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700"
              >
                Browse all
              </Link>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {visibleCategories.map((category, index) => (
                <Link
                  key={category}
                  href="/classes"
                  className="touch-pill shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-violet-50 hover:text-violet-700 dark:bg-slate-900/70 dark:text-teal-200"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {category}
                </Link>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <MetricRibbon label="Live classes" value={liveClasses.length} detail="ready to browse" tone="teal" />
              <MetricRibbon label="Seats open" value={seatsOpen} detail="across studios" tone="emerald" />
              <MetricRibbon label="Studios" value={bizRows?.length ?? 0} detail="marketplace visible" tone="indigo" />
            </div>
          </div>

          <div className="min-w-0">
            <HomeFeaturedCarousel
              classes={homepageFeaturedClasses}
              businessNames={bizMap}
              instructorsByClassId={instructorsByClassId}
            />
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-violet-600">
                Upcoming live schedule
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">
                Book what is happening next
              </h2>
            </div>
            <Link
              href="/classes"
              className="touch-pill inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900/80"
            >
              View all classes
            </Link>
          </div>

          {liveClasses.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {liveClasses.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  businessName={bizMap[cls.businessId] ?? "Studio"}
                  instructors={instructorsByClassId[cls.id] ?? []}
                  ctaLabel="View Details"
                />
              ))}
            </div>
          ) : (
            <div className="visual-panel rounded-[2rem] p-8 text-center sm:p-12">
              <div className="mx-auto max-w-md">
                <ClassImageTemplate title="Classes are warming up" category="Wellness" className="mx-auto mb-6 max-w-md" />
                <p className="text-xl font-black text-slate-950 dark:text-white">
                  No live classes yet.
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Studios will appear here as soon as they publish marketplace-visible classes.
                </p>
                <Link
                  href="/owner/auth/signup"
                  className="mt-6 inline-flex touch-pill items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700"
                >
                  List your studio
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className={`mt-10 grid gap-5 ${showStudioPromo ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}>
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl sm:p-8">
            <p className="text-sm font-black uppercase text-teal-200">Customer flow</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">A booking path that feels quick.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["🔎", "Discover", "Scan classes visually."],
                ["👤", "Check instructor", "Know who leads it."],
                ["🎟️", "Book seats", "Reserve one or more spots."],
              ].map(([icon, title, text]) => (
                <div key={title} className="rounded-[1.35rem] bg-white/10 p-4">
                  <p className="text-2xl">{icon}</p>
                  <p className="mt-3 font-black">{title}</p>
                  <p className="mt-1 text-sm text-slate-300">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {showStudioPromo && (
          <div className="visual-panel rounded-[2rem] p-6 sm:p-8">
            <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">
              For studios
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Create listings people want to tap.
            </h2>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
              Owner Studio now focuses on visual class cards, instructor identity,
              schedule clarity, and analytics you can switch by goal.
            </p>
            <Link
              href="/owner/auth/signup"
              className="mt-6 inline-flex touch-pill items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"
            >
              Open Owner Studio
            </Link>
          </div>
          )}
        </section>
      </section>
    </main>
  );
}
