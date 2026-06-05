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
  const [filterLocation, setFilterLocation] = useState("");

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
    if (filterLocation) {
      const locMatch = cls.location.toLowerCase().includes(filterLocation.toLowerCase());
      if (!locMatch) return false;
    }
    return true;
  });

  const hasFilters = Boolean(
    search || filterCategory || filterDate || filterPrice !== "all" || filterLocation
  );

  function clearFilters() {
    setSearch("");
    setFilterCategory("");
    setFilterDate("");
    setFilterPrice("all");
    setFilterLocation("");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700"
            >
              ← Home
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase text-teal-700">
                Customer Marketplace
              </p>
              <p className="text-sm font-bold text-slate-500">
                {filteredClasses.length} of {publishedClasses.length} live sessions
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              Classes
            </h1>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
            Class cards update as you filter
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-[1.75rem] bg-white/90 p-4 shadow-sm backdrop-blur-xl lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-teal-600">Filter</p>
                <h2 className="text-xl font-black text-slate-950">Find your session</h2>
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-black text-gray-500 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-400">
                  Search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Class, studio, instructor..."
                  className="w-full rounded-[1.15rem] border border-gray-200 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </label>

              {availableCategories.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-black uppercase text-slate-400">
                    Category
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    {availableCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() =>
                          setFilterCategory(filterCategory === category ? "" : category)
                        }
                        className={`touch-pill rounded-full px-4 text-left text-sm font-black ${
                          filterCategory === category
                            ? "bg-teal-600 text-white"
                            : "bg-slate-50 text-teal-700 hover:bg-teal-50"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-400">
                  Date
                </span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="touch-pill w-full rounded-[1.15rem] border border-gray-200 px-3 py-3 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-400">
                  Price
                </span>
                <select
                  value={filterPrice}
                  onChange={(e) =>
                    setFilterPrice(e.target.value as "all" | "free" | "paid")
                  }
                  className="touch-pill w-full rounded-[1.15rem] border border-gray-200 px-3 py-3 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All prices</option>
                  <option value="free">Free only</option>
                  <option value="paid">Paid only</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase text-slate-400">
                  Location
                </span>
                <input
                  type="text"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder="City, studio, online..."
                  className="touch-pill w-full rounded-[1.15rem] border border-gray-200 px-3 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>
          </aside>

          <section>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-teal-600">Live Sessions</p>
                <h2 className="text-2xl font-black text-slate-950">
                  {filteredClasses.length === 1
                    ? "1 session ready to book"
                    : `${filteredClasses.length} sessions ready to book`}
                </h2>
              </div>
              <p className="text-sm font-bold text-slate-500">
                {hasFilters ? "Filtered results" : "Showing all upcoming sessions"}
              </p>
            </div>

            {filteredClasses.length === 0 ? (
              <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
                <p className="text-lg font-medium text-gray-700">
                  {hasFilters ? "No sessions match your filters." : "Nothing here yet — check back soon!"}
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
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
