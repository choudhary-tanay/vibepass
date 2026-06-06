import Link from "next/link";
import type { Class, Staff } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatTime } from "@/lib/utils";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";

type CardInstructor = Pick<
  Staff,
  "id" | "name" | "role" | "imageUrl" | "publicProfileVisible"
>;

interface ClassCardProps {
  cls: Class;
  businessName: string;
  businessLogoUrl?: string;
  businessBrandColor?: string;
  instructors?: CardInstructor[];
  href?: string;
  ctaLabel?: string;
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "CV";
}

function fallbackInstructorsFromName(name: string): CardInstructor[] {
  const names = name
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return (names.length > 0 ? names : ["Instructor"]).map((instructorName, index) => ({
    id: `fallback-${index}-${instructorName}`,
    name: instructorName,
    role: "instructor",
  }));
}

const categoryTone: Record<string, { label: string; button: string; badge: string }> = {
  dance: {
    label: "text-rose-500",
    button: "border-rose-300 text-rose-600 hover:bg-rose-50",
    badge: "bg-rose-50 text-rose-600",
  },
  yoga: {
    label: "text-teal-600",
    button: "border-teal-400 text-teal-700 hover:bg-teal-50",
    badge: "bg-teal-50 text-teal-700",
  },
  meditation: {
    label: "text-violet-600",
    button: "border-violet-300 text-violet-700 hover:bg-violet-50",
    badge: "bg-violet-50 text-violet-700",
  },
  fitness: {
    label: "text-orange-500",
    button: "border-orange-300 text-orange-600 hover:bg-orange-50",
    badge: "bg-orange-50 text-orange-600",
  },
  other: {
    label: "text-orange-500",
    button: "border-orange-300 text-orange-600 hover:bg-orange-50",
    badge: "bg-orange-50 text-orange-600",
  },
};

export function ClassCard({
  cls,
  businessName,
  businessLogoUrl,
  businessBrandColor,
  instructors = [],
  href = `/classes/${cls.id}`,
  ctaLabel = "View Details",
}: ClassCardProps) {
  const isFull = cls.bookedCount >= cls.capacity;
  const seatsLeft = Math.max(0, cls.capacity - cls.bookedCount);
  const statusLabel = isFull
    ? "Full"
    : seatsLeft <= 3
      ? "Few seats left"
      : "Available";
  const occupancy = cls.capacity > 0 ? Math.round((cls.bookedCount / cls.capacity) * 100) : 0;
  const displayInstructors =
    instructors.length > 0 ? instructors : fallbackInstructorsFromName(cls.instructorName);
  const visibleInstructors = displayInstructors.slice(0, 3);
  const extraInstructors = Math.max(0, displayInstructors.length - visibleInstructors.length);
  const instructorLabel =
    displayInstructors.length > 1
      ? `${displayInstructors.length} class instructors`
      : "class instructor";
  const instructorNames = displayInstructors.map((instructor) => instructor.name).join(", ");
  const tone = categoryTone[cls.category.toLowerCase()] ?? categoryTone.yoga;
  const priceLabel = cls.price === 0 ? "Free" : formatCurrency(cls.price, cls.currency ?? "INR");
  const publicSponsors = (cls.marketplaceSponsors ?? []).filter((sponsor) => sponsor.displayName);
  const leadSponsor = publicSponsors.find((sponsor) => sponsor.coverImageUrl) ?? publicSponsors[0];

  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-950">
      <div className="relative">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          <ClassImageTemplate
            title={cls.title}
            category={cls.category}
            instructorName={cls.instructorName}
            className="absolute inset-0 h-full w-full rounded-none"
            compact
            backgroundOnly
            imageUrl={cls.imageUrl}
            artworkVariant={cls.artworkVariant}
            textColor={cls.artworkTextColor}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/5 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black shadow-sm backdrop-blur ${
              isFull
                ? "bg-red-100/90 text-red-700"
                : seatsLeft <= 3
                  ? "bg-amber-100/90 text-amber-800"
                  : "bg-emerald-100/90 text-emerald-800"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950 shadow-md">
          {initialsFor(cls.title)}
        </div>
        {leadSponsor && (
          <div
            className="absolute bottom-3 left-3 max-w-[62%] overflow-hidden rounded-xl bg-white/92 px-2.5 py-2 shadow-md backdrop-blur"
            style={
              leadSponsor.coverImageUrl
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.94), rgba(255,255,255,.78)), url(${leadSponsor.coverImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-[9px] font-black text-slate-700">
                {leadSponsor.logoUrl ? (
                  <img src={leadSponsor.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initialsFor(leadSponsor.displayName)
                )}
              </span>
              <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-wide text-slate-700">
                Sponsored by {leadSponsor.displayName}
              </span>
            </div>
          </div>
        )}
        <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-xs font-black text-rose-500 shadow-md">
          {occupancy}% filled
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={`text-xs font-black uppercase ${tone.label}`}>
            {cls.category}
          </span>
        </div>

        <h2 className="line-clamp-2 min-h-[3.15rem] text-lg font-black leading-tight text-slate-950 dark:text-white">
          {cls.title}
        </h2>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[10px] font-black text-slate-700"
            style={businessBrandColor ? { backgroundColor: `${businessBrandColor}18`, color: businessBrandColor } : undefined}
          >
            {businessLogoUrl ? (
              <span
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${businessLogoUrl})` }}
              />
            ) : (
              initialsFor(businessName)
            )}
          </div>
          <p className="truncate text-xs font-bold text-slate-500">{businessName}</p>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 -space-x-2">
              {visibleInstructors.map((instructor, index) => (
                <div
                  key={`${instructor.id}-${index}`}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-teal-500 text-[10px] font-black text-white shadow dark:border-slate-950"
                  title={instructor.name}
                >
                  {instructor.imageUrl ? (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${instructor.imageUrl})` }}
                    />
                  ) : (
                    initialsFor(instructor.name)
                  )}
                </div>
              ))}
              {extraInstructors > 0 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-950 text-[10px] font-black text-white shadow dark:border-slate-950">
                  +{extraInstructors}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-950 dark:text-white">
                {instructorNames}
              </p>
              <p className="truncate text-[11px] font-semibold capitalize text-slate-500 dark:text-slate-400">
                {instructorLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <p className="flex items-center gap-2">
            <span className="text-slate-400">□</span>
            {formatDate(cls.date)} <span className="text-slate-300">•</span> {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-slate-400">⌖</span>
            <span className="line-clamp-1">{cls.location}</span>
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <div>
            <p className="text-xl font-black text-slate-950">
              {priceLabel}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {isFull ? "No seats open" : `${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} left`}
            </p>
          </div>
          {isFull ? (
            <button
              disabled
              className="touch-pill rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-400"
            >
              Full
            </button>
          ) : (
            <Link
              href={href}
              className={`touch-pill inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm font-black ${tone.button}`}
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
