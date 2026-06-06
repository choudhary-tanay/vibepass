"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/appStore";
import { isFutureDate } from "@/lib/utils";
import { ClassCard } from "@/components/ClassCard";

const ALL_CATEGORIES = [
  "Yoga",
  "Pilates",
  "Fitness",
  "Dance",
  "Martial Arts",
  "Meditation",
  "Swimming",
  "Cycling",
  "Nutrition",
  "Wellness",
  "Other",
];

export default function ClassesPage() {
  const { classes, businesses, staff, loading } = useAppStore();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterPrice, setFilterPrice] = useState<"all" | "free" | "paid">("all");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterInstructor, setFilterInstructor] = useState("");

  const visibleBusinessIds = useMemo(
    () =>
      new Set(
        businesses
          .filter((b) => b.status === "active" && b.isMarketplaceVisible)
          .map((b) => b.id)
      ),
    [businesses]
  );

  function getBusinessName(businessId: string): string {
    const business = businesses.find((b) => b.id === businessId);
    return business?.publicDisplayName ?? business?.businessName ?? "Unknown Business";
  }

  function getBusiness(businessId: string) {
    return businesses.find((b) => b.id === businessId) ?? null;
  }

  function getClassInstructors(cls: (typeof classes)[number]) {
    const staffIds =
      cls.staffIds && cls.staffIds.length > 0
        ? cls.staffIds
        : cls.staffId
          ? [cls.staffId]
          : [];
    return staffIds
      .map((staffId) => staff.find((member) => member.id === staffId))
      .filter((member): member is (typeof staff)[number] => Boolean(member));
  }

  // If businesses failed to load (empty), skip business filter so classes still show
  const publishedClasses = useMemo(
    () =>
      classes.filter(
        (c) =>
          c.status === "published" &&
          isFutureDate(c.date) &&
          (visibleBusinessIds.size === 0 || visibleBusinessIds.has(c.businessId))
      ),
    [classes, visibleBusinessIds]
  );

  // Derive unique categories from visible classes
  const availableCategories = useMemo(() => {
    const cats = new Set(publishedClasses.map((c) => c.category).filter(Boolean));
    return ALL_CATEGORIES.filter((c) => cats.has(c));
  }, [publishedClasses]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-gray-500">Loading classes...</p>
        </div>
      </main>
    );
  }

  const searchLower = search.toLowerCase();

  const filteredClasses = publishedClasses.filter((cls) => {
    if (search) {
      const titleMatch = cls.title.toLowerCase().includes(searchLower);
      const bizName = getBusinessName(cls.businessId).toLowerCase();
      const bizMatch = bizName.includes(searchLower);
      if (!titleMatch && !bizMatch) return false;
    }
    if (filterCategory && cls.category !== filterCategory) return false;
    if (filterDate && cls.date !== filterDate) return false;
    if (filterPrice === "free" && cls.price !== 0) return false;
    if (filterPrice === "paid" && cls.price === 0) return false;
    const minPrice = Number(filterMinPrice);
    const maxPrice = Number(filterMaxPrice);
    if (filterMinPrice && Number.isFinite(minPrice) && cls.price < minPrice) return false;
    if (filterMaxPrice && Number.isFinite(maxPrice) && cls.price > maxPrice) return false;
    if (filterLocation) {
      const locMatch = cls.location.toLowerCase().includes(filterLocation.toLowerCase());
      if (!locMatch) return false;
    }
    if (filterInstructor) {
      const instructorLower = filterInstructor.toLowerCase();
      const instructorMatch =
        cls.instructorName.toLowerCase().includes(instructorLower) ||
        getClassInstructors(cls).some((member) => member.name.toLowerCase().includes(instructorLower));
      if (!instructorMatch) return false;
    }
    return true;
  }).sort((a, b) => {
    const aPinned = a.browseFeatured ? 0 : 1;
    const bPinned = b.browseFeatured ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;

    if (aPinned === 0 && bPinned === 0) {
      const positionDiff = (a.browsePosition ?? 999) - (b.browsePosition ?? 999);
      if (positionDiff !== 0) return positionDiff;
    }

    const aSchedule = `${a.date ?? ""} ${a.startTime ?? ""}`;
    const bSchedule = `${b.date ?? ""} ${b.startTime ?? ""}`;
    return aSchedule.localeCompare(bSchedule);
  });

  const hasFilters = Boolean(
    search ||
      filterCategory ||
      filterDate ||
      filterPrice !== "all" ||
      filterMinPrice ||
      filterMaxPrice ||
      filterLocation ||
      filterInstructor
  );

  function clearFilters() {
    setSearch("");
    setFilterCategory("");
    setFilterDate("");
    setFilterPrice("all");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterLocation("");
    setFilterInstructor("");
  }

  const categoryCounts = ALL_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
    acc[category] = publishedClasses.filter((cls) => cls.category === category).length;
    return acc;
  }, {});

  const activeChips = [
    search ? `Search: ${search}` : "",
    filterCategory || "",
    filterDate ? `Date: ${filterDate}` : "Date: Anytime",
    filterPrice !== "all" ? `Price: ${filterPrice}` : "",
    filterLocation ? `Location: ${filterLocation}` : "",
    filterInstructor ? `Instructor: ${filterInstructor}` : "",
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-white px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-[112rem]">
        <div className="grid gap-7 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-2xl bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/75 lg:sticky lg:top-24">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
                Filters
              </h2>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-black text-violet-600 hover:text-violet-700"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-7">
              <label className="block">
                <span className="mb-3 block text-base font-black text-slate-950">
                  Date
                </span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="touch-pill w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700"
                />
              </label>

              <div className="border-t border-slate-100 pt-6">
                <p className="mb-4 text-base font-black text-slate-950">Categories</p>
                <div className="space-y-3">
                  {(availableCategories.length > 0 ? availableCategories : ALL_CATEGORIES.slice(0, 7)).map((category) => (
                    <label key={category} className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={filterCategory === category}
                          onChange={() => setFilterCategory(filterCategory === category ? "" : category)}
                          className="h-4 w-4 rounded border-slate-300 text-violet-600"
                        />
                        {category}
                      </span>
                      <span className="text-slate-400">
                        {(categoryCounts[category] ?? 0).toLocaleString("en-IN")}
                      </span>
                    </label>
                  ))}
                </div>
                <button type="button" className="mt-4 text-sm font-black text-violet-600">
                  + View more
                </button>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <p className="mb-3 text-base font-black text-slate-950">Price</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={filterMinPrice}
                    onChange={(e) => setFilterMinPrice(e.target.value)}
                    placeholder="Min"
                    className="touch-pill min-w-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                  />
                  <span className="text-sm font-bold text-slate-500">to</span>
                  <input
                    type="number"
                    min="0"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="touch-pill min-w-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                  />
                </div>
                <select
                  value={filterPrice}
                  onChange={(e) => setFilterPrice(e.target.value as "all" | "free" | "paid")}
                  className="touch-pill mt-3 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700"
                >
                  <option value="all">Any price type</option>
                  <option value="free">Free only</option>
                  <option value="paid">Paid only</option>
                </select>
              </div>

              <label className="block border-t border-slate-100 pt-6">
                <span className="mb-3 block text-base font-black text-slate-950">
                  Location
                </span>
                <input
                  type="text"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder="City, studio, online..."
                  className="touch-pill w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold placeholder-slate-400"
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-base font-black text-slate-950">
                  Instructor
                </span>
                <input
                  type="text"
                  value={filterInstructor}
                  onChange={(e) => setFilterInstructor(e.target.value)}
                  placeholder="Search instructor"
                  className="touch-pill w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold placeholder-slate-400"
                />
              </label>

              <button
                type="button"
                className="touch-pill w-full rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700"
              >
                Apply Filters
              </button>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                  <Link href="/" className="hover:text-violet-600">Home</Link>
                  <span>›</span>
                  <span className="text-slate-950">Classes</span>
                </div>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                  Classes
                </h1>
                <p className="mt-1 text-base font-medium text-slate-600">
                  Discover and book amazing live sessions near you.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={chip === "Date: Anytime" ? undefined : clearFilters}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
                    >
                      {chip} <span className="text-slate-400">×</span>
                    </button>
                  ))}
                  {hasFilters && (
                    <button type="button" onClick={clearFilters} className="px-2 py-2 text-sm font-black text-violet-600">
                      Clear all
                    </button>
                  )}
                </div>
                <p className="mt-4 text-sm font-black text-slate-700">
                  {filteredClasses.length} session{filteredClasses.length !== 1 ? "s" : ""} available
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search classes, studios..."
                  className="touch-pill w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold placeholder-slate-400 shadow-sm sm:w-72"
                />
                <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  <button type="button" className="rounded-lg px-3 py-2 text-slate-500">☷</button>
                  <button type="button" className="rounded-lg bg-violet-50 px-3 py-2 text-violet-700">▦</button>
                </div>
                <select className="touch-pill rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 shadow-sm" defaultValue="upcoming">
                  <option value="upcoming">Sort by: Upcoming</option>
                  <option value="price">Sort by: Price</option>
                </select>
              </div>
            </div>

            {filteredClasses.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
                <p className="text-lg font-medium text-gray-700">
                  {hasFilters ? "No sessions match your filters." : "Nothing here yet - check back soon!"}
                </p>
                {hasFilters ? (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    Clear filters
                  </button>
                ) : (
                  <p className="mt-1 text-gray-500">Check back soon!</p>
                )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredClasses.map((cls) => {
                  const business = getBusiness(cls.businessId);
                  return (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      businessName={getBusinessName(cls.businessId)}
                      businessLogoUrl={business?.logoUrl}
                      businessBrandColor={business?.brandColor}
                      instructors={getClassInstructors(cls)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
