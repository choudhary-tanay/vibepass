import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ClassCard } from "@/components/ClassCard";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";
import { HomeFeaturedCarousel } from "@/components/HomeFeaturedCarousel";
import { MetricRibbon, TrendLine } from "@/components/PortalCharts";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Class, Staff } from "@/types";

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
  const today = new Date().toISOString().split("T")[0];
  const classSelect =
    "id, business_id, title, description, category, instructor_name, staff_id, date, start_time, end_time, price, capacity, booked_count, location, status, tagline, image_url, featured, featured_position, featured_label, featured_until, browse_featured, browse_position, businesses!inner(business_name, status, is_marketplace_visible)";

  const [{ data: liveRows }, { data: featuredRows }, { data: bizRows }] = await Promise.all([
    supabase
      .from("classes")
      .select(classSelect)
      .eq("status", "published")
      .eq("is_admin_hidden", false)
      .eq("businesses.status", "active")
      .eq("businesses.is_marketplace_visible", true)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(9),
    supabase
      .from("classes")
      .select(classSelect)
      .eq("status", "published")
      .eq("is_admin_hidden", false)
      .eq("featured", true)
      .eq("businesses.status", "active")
      .eq("businesses.is_marketplace_visible", true)
      .gte("date", today)
      .or(`featured_until.is.null,featured_until.gte.${today}`)
      .order("featured_position", { ascending: true, nullsFirst: false })
      .order("date", { ascending: true })
      .limit(8),
    supabase
      .from("businesses")
      .select("id, business_name")
      .eq("status", "active")
      .eq("is_marketplace_visible", true),
  ]);

  const bizMap: Record<string, string> = {};
  for (const b of bizRows ?? []) bizMap[b.id] = b.business_name;

  const liveClassRows = (liveRows ?? []) as unknown as HomeClassRow[];
  const featuredClassRows = (featuredRows ?? []) as unknown as HomeClassRow[];
  const allRows = [...liveClassRows, ...featuredClassRows];
  const uniqueRows = Array.from(
    new Map(allRows.map((row) => [row.id, row])).values()
  );
  const classIds = uniqueRows.map((row) => row.id);
  let classStaffRows: HomeClassStaffRow[] = [];
  if (classIds.length > 0) {
    const { data } = await supabase
      .from("class_staff")
      .select("class_id, staff_id, is_primary")
      .in("class_id", classIds)
      .order("is_primary", { ascending: false });
    classStaffRows = (data as HomeClassStaffRow[] | null) ?? [];
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
  const liveClasses = liveClassRows.map((row) => toHomeClass(row, classStaffByClass));
  const homepageFeaturedClasses = featuredClassRows.map((row) =>
    toHomeClass(row, classStaffByClass)
  );
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
  const trendPoints = liveClasses.length > 0
    ? liveClasses.map((cls) => Math.max(1, cls.bookedCount))
    : [3, 7, 6, 12, 10, 16];

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-stretch">
          <div className="visual-panel motion-glow rounded-[2.25rem] p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">
                Live marketplace
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                🎟️ Book classes, not tabs
              </span>
            </div>

            <h1 className="gradient-headline mt-5 max-w-4xl text-4xl font-black leading-[1.04] sm:text-6xl lg:text-7xl">
              Pick a class that matches your vibe today.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              Browse live schedules from local studios, compare instructors,
              seats, price, and location, then book a spot before it fills.
            </p>

            <div className="mt-7 grid gap-3 rounded-[1.75rem] bg-white/68 p-3 shadow-sm dark:bg-slate-950/40 md:grid-cols-[1fr_12rem_auto]">
              <input
                readOnly
                value=""
                placeholder="Search yoga, dance, HIIT, pilates..."
                className="touch-pill rounded-[1.15rem] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none"
              />
              <select
                aria-label="Category"
                className="touch-pill rounded-[1.15rem] border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none"
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
                className="touch-pill inline-flex items-center justify-center rounded-[1.15rem] bg-blue-600 px-5 py-3 text-center text-sm font-black text-white hover:bg-blue-700"
              >
                Browse live
              </Link>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {visibleCategories.map((category, index) => (
                <Link
                  key={category}
                  href="/classes"
                  className="motion-float touch-pill shrink-0 rounded-full bg-white/74 px-4 py-2 text-sm font-black text-teal-700 shadow-sm hover:-translate-y-0.5 hover:bg-teal-50 dark:bg-slate-900/70 dark:text-teal-200"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {category}
                </Link>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <MetricRibbon label="Live classes" value={liveClasses.length} detail="ready to browse" tone="teal" />
              <MetricRibbon label="Seats open" value={seatsOpen} detail="across studios" tone="emerald" />
              <MetricRibbon label="Studios" value={bizRows?.length ?? 0} detail="marketplace visible" tone="indigo" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] xl:grid-cols-1">
            <HomeFeaturedCarousel
              classes={homepageFeaturedClasses}
              businessNames={bizMap}
              instructorsByClassId={instructorsByClassId}
            />
            <TrendLine points={trendPoints} label="Booking energy" />
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-blue-600">
                Upcoming live schedule
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950 sm:text-5xl">
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
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {liveClasses.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  businessName={bizMap[cls.businessId] ?? "Studio"}
                  instructors={instructorsByClassId[cls.id] ?? []}
                  ctaLabel="See vibe"
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

        <section className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
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
        </section>
      </section>
    </main>
  );
}
