"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime, isFutureDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";
import { ReportButton } from "@/components/ReportButton";
import type { Staff } from "@/types";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-600",
  all_levels: "bg-blue-100 text-blue-700",
};

interface PublicSponsor {
  id: string;
  displayName: string;
  logoUrl?: string | null;
  message?: string | null;
}

function InstructorCard({ instructor, instructorName }: {
  instructor?: Staff | null;
  instructorName?: string;
}) {
  const name = instructor?.name ?? instructorName ?? "Instructor";
  const initials = name.slice(0, 2).toUpperCase();
  const hasImage = !!instructor?.imageUrl;
  const hasProfile = instructor?.publicProfileVisible && instructor?.id;

  const avatar = (
    <div className="relative flex-shrink-0">
      {hasImage ? (
        <div
          aria-label={name}
          className="h-20 w-20 rounded-2xl bg-cover bg-center ring-4 ring-white shadow-md sm:h-24 sm:w-24"
          style={{ backgroundImage: `url(${instructor!.imageUrl!})` }}
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 text-2xl font-black text-white ring-4 ring-white shadow-md sm:h-24 sm:w-24">
          {initials}
        </div>
      )}
      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-[10px] font-black text-white shadow">
        ✓
      </div>
    </div>
  );

  return (
    <div className="rounded-[1.35rem] bg-gradient-to-br from-violet-800 via-indigo-800 to-teal-700 p-4 text-white shadow-[0_18px_50px_rgba(79,70,229,0.25)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {hasProfile ? (
          <Link href={`/staff/${instructor!.id}`}>{avatar}</Link>
        ) : avatar}

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
            Your instructor
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <div>
              {hasProfile ? (
                <Link href={`/staff/${instructor!.id}`} className="text-xl font-black text-white hover:text-teal-300">
                  {name}
                </Link>
              ) : (
                <p className="text-xl font-black text-white">{name}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-black">
                <span className="rounded-full bg-white/18 px-3 py-1 text-white">{instructor?.role ?? "Dance"}</span>
                {instructor?.experienceYears && (
                  <span className="rounded-full bg-white/12 px-3 py-1 text-teal-100">
                    {instructor.experienceYears}+ Years Experience
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Specialties */}
          {instructor?.specialties && instructor.specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {instructor.specialties.slice(0, 4).map((s) => (
                <span key={s} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-200">
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {instructor?.bio && (
            <p className="mt-3 text-sm font-semibold leading-6 text-white/85 line-clamp-2">
              {instructor.bio}
            </p>
          )}

          {/* Instagram */}
          {instructor?.instagramUrl && (
            <a
              href={instructor.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-200 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              Instagram
            </a>
          )}

          {hasProfile && (
            <Link href={`/staff/${instructor!.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-200 hover:text-white">
              View full profile →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const { classes, businesses, staff: staffList, loading, user } = useAppStore();
  const [publicSponsors, setPublicSponsors] = useState<PublicSponsor[]>([]);
  const [favoriteSaved, setFavoriteSaved] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      const response = await fetch(`/api/classes/${params.id}/sponsors`).catch(() => null);
      if (!response?.ok) {
        if (active) setPublicSponsors([]);
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (active) setPublicSponsors((data.sponsors ?? []) as PublicSponsor[]);
    });
    return () => {
      active = false;
    };
  }, [params.id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (!user) {
        if (active) setFavoriteSaved(false);
        return;
      }
      const response = await fetch("/api/customer/favorites").catch(() => null);
      if (!response?.ok) return;
      const data = await response.json().catch(() => ({}));
      if (!active) return;
      setFavoriteSaved(
        (data.favorites ?? []).some(
          (favorite: { favorite_type?: string; entity_id?: string }) =>
            favorite.favorite_type === "class" && favorite.entity_id === params.id
        )
      );
    });
    return () => {
      active = false;
    };
  }, [params.id, user]);

  async function toggleFavorite() {
    if (!user) {
      setFavoriteStatus("Log in to save this class.");
      return;
    }
    setFavoriteStatus(null);
    const response = await fetch(`/api/customer/favorites/${params.id}`, {
      method: favoriteSaved ? "DELETE" : "POST",
    }).catch(() => null);
    if (!response?.ok) {
      setFavoriteStatus("Could not update favorites.");
      return;
    }
    setFavoriteSaved((value) => !value);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="h-96 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      </main>
    );
  }

  const cls = classes.find((c) => c.id === params.id);

  if (!cls) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Link href="/classes" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            ← Back to Classes
          </Link>
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-xl font-semibold text-gray-800">Class not found</p>
            <p className="mt-2 text-gray-500">This class does not exist or may have been removed.</p>
            <Link href="/classes" className="mt-6 inline-block rounded-full bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Browse Classes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const business = businesses.find((b) => b.id === cls.businessId);
  const businessDisplayName = business?.publicDisplayName ?? business?.businessName ?? "Unknown Business";
  const instructors =
    cls.staffIds && cls.staffIds.length > 0
      ? cls.staffIds
          .map((staffId) => staffList.find((s) => s.id === staffId))
          .filter((member): member is Staff => Boolean(member))
      : [];
  const instructor = instructors[0] ?? staffList.find((s) => s.id === cls.staffId) ?? null;
  const isFull = cls.bookedCount >= cls.capacity;
  const availableSeats = Math.max(0, cls.capacity - cls.bookedCount);
  const bookedPct = cls.capacity > 0 ? Math.min(100, Math.round((cls.bookedCount / cls.capacity) * 100)) : 0;
  const isUnavailable = cls.status !== "published" || !isFutureDate(cls.date) || isFull;

  let unavailableReason = "";
  if (cls.status === "cancelled") unavailableReason = "This class has been cancelled.";
  else if (cls.status === "draft") unavailableReason = "This class is not yet published.";
  else if (!isFutureDate(cls.date)) unavailableReason = "This class has already passed.";
  else if (isFull) unavailableReason = "This class is fully booked.";

  // Don't show staff-note taglines publicly
  const displayTagline = cls.tagline?.startsWith("[Staff note:") ? "" : cls.tagline;

  const showInstructor = instructors.length > 0 || !!instructor || !!cls.instructorName;
  const priceLabel = cls.price === 0 ? "Free" : formatCurrency(cls.price, cls.currency ?? "INR");

  return (
    <main className="min-h-screen bg-white px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-[94rem]">
        <Link href="/classes" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-violet-700">
          ← Back to Classes
        </Link>
        <section>
          <div className="grid gap-5 lg:grid-cols-[1.16fr_0.84fr] lg:items-stretch">
            <div className="relative min-h-80 overflow-hidden rounded-2xl bg-slate-950 shadow-[0_18px_54px_rgba(15,23,42,0.12)] lg:min-h-[27.5rem]">
              <ClassImageTemplate
                title={cls.title}
                category={cls.category}
                instructorName={cls.instructorName}
                className="absolute inset-0 h-full w-full rounded-none"
                backgroundOnly
              />
              {cls.imageUrl && (
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cls.imageUrl})` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/74 via-black/22 to-black/5" />
              <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-600 px-4 py-2 text-xs font-black uppercase text-white shadow-sm">
                  {cls.category}
                </span>
                {cls.featured && (
                  <span className="rounded-full bg-amber-300 px-4 py-2 text-xs font-black text-amber-950 shadow-sm">
                    Featured
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  {cls.difficultyLevel && (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${DIFFICULTY_COLORS[cls.difficultyLevel] ?? "bg-gray-100 text-gray-600"}`}>
                      {cls.difficultyLevel.replace("_", " ")}
                    </span>
                  )}
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                    Live Class
                  </span>
                </div>
                <h1 className="mt-3 line-clamp-2 text-3xl font-black leading-tight text-white sm:text-5xl">
                  {cls.title}
                </h1>
                {displayTagline && (
                  <p className="mt-2 line-clamp-2 max-w-2xl text-base font-semibold leading-7 text-white/85">
                    {displayTagline}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-white p-7 shadow-[0_18px_54px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/75 dark:bg-slate-950 dark:ring-slate-800">
              <div>
                <p className="text-xs font-black uppercase text-violet-600">
                  Class details
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                  Ready to book?
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Check instructor, schedule, location, and seat availability before confirming your spot.
                </p>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-xl bg-white p-1">
                  <div className="flex items-center justify-between text-sm font-black text-slate-700">
                    <span>Seats filled</span>
                    <span>{bookedPct}%</span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-indigo-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500" style={{ width: `${bookedPct}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-black text-emerald-600">
                    {availableSeats} of {cls.capacity} seats open
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase text-blue-600">Price</p>
                    <p className="mt-2 text-3xl font-black text-emerald-700">
                      {priceLabel}
                    </p>
                  </div>
                  <div className="rounded-xl bg-violet-50 p-5">
                    <p className="text-xs font-black uppercase text-violet-600">
                      {instructors.length > 1 ? "Instructors" : "Instructor"}
                    </p>
                    <p className="mt-1 truncate text-lg font-black text-indigo-950">
                      {instructors.length > 0
                        ? instructors.map((member) => member.name).join(", ")
                        : instructor?.name ?? cls.instructorName ?? "Instructor"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_26rem]">
          {/* Left: detail content */}
          <div className="space-y-6">
            {/* Instructor — most important, show first and prominent */}
            {showInstructor && (
              <div className="space-y-4">
                {instructors.length > 0 ? (
                  instructors.map((member) => (
                    <InstructorCard key={member.id} instructor={member} instructorName={member.name} />
                  ))
                ) : (
                  <InstructorCard instructor={instructor} instructorName={cls.instructorName} />
                )}
              </div>
            )}

            {/* Hosted by */}
            <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-teal-50 text-sm font-black text-teal-700"
                  style={business?.brandColor ? { backgroundColor: `${business.brandColor}18`, color: business.brandColor } : undefined}
                >
                  {business?.logoUrl ? (
                    <img src={business.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    businessDisplayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Hosted by</p>
                  <Link href={`/businesses/${cls.businessId}`} className="mt-0.5 block truncate text-base font-bold text-teal-600 hover:underline">
                    {businessDisplayName}
                  </Link>
                  {business?.brandTagline && (
                    <p className="truncate text-xs font-semibold text-slate-400">{business.brandTagline}</p>
                  )}
                </div>
              </div>
              {business && (
                <Link href={`/businesses/${cls.businessId}`} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  View Studio →
                </Link>
              )}
            </div>

            {publicSponsors.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-amber-600">Sponsored by</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {publicSponsors.map((sponsor) => (
                    <div key={sponsor.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xs font-black text-amber-700">
                          {sponsor.logoUrl ? (
                            <img src={sponsor.logoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            sponsor.displayName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <p className="min-w-0 truncate font-black text-slate-900">{sponsor.displayName}</p>
                      </div>
                      {sponsor.message && (
                        <p className="mt-3 text-sm leading-6 text-slate-600">{sponsor.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date, time, location */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Date", value: formatDate(cls.date), icon: "□", tone: "bg-violet-50 text-violet-600" },
                { label: "Time", value: `${formatTime(cls.startTime)} - ${formatTime(cls.endTime)}`, icon: "○", tone: "bg-indigo-50 text-indigo-600" },
                {
                  label: cls.locationType === "online" ? "Format" : "Location",
                  value: cls.locationType === "online" ? "Online" : cls.locationType === "hybrid" ? "In-person + Online" : cls.venueDetails ?? cls.location,
                  icon: "⌖",
                  tone: "bg-rose-50 text-rose-600",
                },
              ].map(({ label, value, icon, tone }) => (
                <div key={label} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${tone}`}>{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-gray-400">{label}</p>
                    <p className="mt-1 truncate font-black text-gray-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tags */}
            {cls.tags && cls.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cls.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {cls.description && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-3 text-base font-black text-gray-900">About this class</h2>
                <p className="leading-7 text-gray-700 whitespace-pre-line">{cls.description}</p>
              </div>
            )}

            {/* Rich sections */}
            {(cls.whatToExpect || cls.whoThisIsFor || cls.whatToBring) && (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="mb-4 text-xs font-black uppercase text-violet-600">What to expect</p>
                <div className="grid gap-4 sm:grid-cols-3">
                {cls.whatToExpect && (
                  <div className="rounded-xl bg-violet-50 p-4">
                    <p className="mb-2 text-sm font-black text-slate-950">All levels welcome</p>
                    <p className="text-sm leading-6 text-gray-700">{cls.whatToExpect}</p>
                  </div>
                )}
                {cls.whoThisIsFor && (
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="mb-2 text-sm font-black text-slate-950">Grace and expression</p>
                    <p className="text-sm leading-6 text-gray-700">{cls.whoThisIsFor}</p>
                  </div>
                )}
                {cls.whatToBring && (
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="mb-2 text-sm font-black text-slate-950">Expert guidance</p>
                    <p className="text-sm leading-6 text-gray-700">{cls.whatToBring}</p>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Age suitability */}
            {cls.ageSuitability && (
              <div className="rounded-2xl bg-teal-50 px-5 py-4">
                <p className="text-xs font-bold uppercase text-teal-600">Age suitability</p>
                <p className="mt-1 text-sm font-semibold text-teal-900">{cls.ageSuitability}</p>
              </div>
            )}

            {/* Cancellation + refund */}
            {(cls.cancellationPolicy || cls.refundPolicySummary) && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-base font-bold text-gray-900">Policies</h2>
                {cls.cancellationPolicy && (
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase text-gray-400">Cancellation</p>
                    <p className="mt-1 text-sm text-gray-700">{cls.cancellationPolicy}</p>
                  </div>
                )}
                {cls.refundPolicySummary && (
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-400">Refund</p>
                    <p className="mt-1 text-sm text-gray-700">{cls.refundPolicySummary}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: sticky booking card */}
          <aside className="h-fit space-y-4">
              <div className="rounded-2xl bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/75 lg:sticky lg:top-6">
              <p className="text-xs font-black uppercase text-violet-600">Book this class</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="break-words text-4xl font-black text-slate-950">
                  {priceLabel}
                </p>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${
                  isFull ? "bg-red-100 text-red-700" : availableSeats <= 3 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {isFull ? "Full" : availableSeats <= 3 ? "Few seats" : "Available"}
                </span>
              </div>

              <div className="mt-5 space-y-2 rounded-xl bg-white text-sm">
                <p className="font-semibold text-slate-700">{formatDate(cls.date)}</p>
                <p className="text-slate-600">{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</p>
                <p className="text-slate-600">{cls.location}</p>
              </div>

              <div className="mt-4">
                {isFull ? (
                  <p className="text-sm font-bold text-red-600">Fully booked</p>
                ) : (
                  <p className="text-sm font-semibold text-green-700">
                    {availableSeats} / {cls.capacity} seats available
                  </p>
                )}
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-indigo-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${bookedPct}%` }} />
                </div>
              </div>

              {isUnavailable ? (
                <div className="mt-4 rounded-[1.25rem] bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-800">Booking unavailable</p>
                  <p className="mt-1 text-xs text-amber-700">{unavailableReason}</p>
                </div>
              ) : (
                <Link
                  href={`/classes/${cls.id}/book`}
                  className="mt-5 block w-full rounded-xl bg-violet-600 py-4 text-center text-base font-black text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700"
                >
                  Book Now
                </Link>
              )}

              <button
                type="button"
                onClick={() => void toggleFavorite()}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                {favoriteSaved ? "Saved to Favorites" : "Save to Favorites"}
              </button>
              {favoriteStatus && (
                <p className="mt-2 text-center text-xs font-semibold text-amber-600">
                  {favoriteStatus}
                </p>
              )}

              <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-500">
                <p className="text-emerald-600">✓ Secure your spot in seconds</p>
                <p>✓ Instructor and studio details unlocked</p>
                <p>✓ Confirmation sent to bookings</p>
              </div>

              {business && (
                <Link href={`/businesses/${business.id}`} className="mt-4 block text-center text-sm text-teal-600 hover:underline">
                  View {businessDisplayName} →
                </Link>
              )}

              <div className="mt-4 flex justify-center">
                <ReportButton entityType="class" entityId={cls.id} entityName={cls.title} />
              </div>
            </div>

            {/* Instructor mini-card on desktop sidebar if already shown above on mobile */}
            {showInstructor && instructor?.bio && (
              <div className="hidden rounded-2xl bg-indigo-50 p-4 lg:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Quick bio</p>
                <p className="mt-2 text-xs leading-5 text-indigo-800 line-clamp-4">{instructor.bio}</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {!isUnavailable && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-3 lg:hidden">
          <Link
            href={`/classes/${cls.id}/book`}
            className="block w-full rounded-xl bg-teal-600 py-3.5 text-center text-base font-black text-white hover:bg-teal-700"
          >
            Book Now - {priceLabel}
          </Link>
        </div>
      )}
    </main>
  );
}
