import Link from "next/link";
import type { Class, Staff } from "@/types";
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

  return (
    <article className="group visual-panel flex min-h-full flex-col overflow-hidden rounded-[2rem] transition-transform hover:-translate-y-1">
      <div className="relative p-3 pb-0">
        {cls.imageUrl ? (
          <div
            className="min-h-48 rounded-[1.5rem] bg-cover bg-center shadow-inner"
            style={{ backgroundImage: `url(${cls.imageUrl})` }}
          />
        ) : (
          <ClassImageTemplate
            title={cls.title}
            category={cls.category}
            instructorName={cls.instructorName}
            className="min-h-48"
          />
        )}
        <div className="absolute left-6 top-6 flex flex-wrap gap-2">
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
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-600">
            {cls.category}
          </span>
          <span className="text-xs font-black text-slate-400">
            {occupancy}% filled
          </span>
        </div>

        <h2 className="text-xl font-black leading-tight text-slate-950">
          {cls.title}
        </h2>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50 text-[10px] font-black text-blue-700"
            style={businessBrandColor ? { backgroundColor: `${businessBrandColor}18`, color: businessBrandColor } : undefined}
          >
            {businessLogoUrl ? (
              <img src={businessLogoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initialsFor(businessName)
            )}
          </div>
          <p className="truncate text-sm font-bold text-blue-600">{businessName}</p>
        </div>

        <div className="mt-4 rounded-[1.25rem] bg-white/72 p-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-950/50 dark:ring-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 -space-x-3">
              {visibleInstructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-br from-teal-400 to-indigo-500 text-sm font-black text-white shadow-lg dark:border-slate-950"
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white bg-slate-950 text-xs font-black text-white shadow-lg dark:border-slate-950">
                  +{extraInstructors}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                {instructorNames}
              </p>
              <p className="truncate text-xs font-semibold capitalize text-slate-500 dark:text-slate-400">
                {instructorLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 rounded-[1.25rem] bg-slate-50/90 p-4 text-sm text-slate-600 dark:bg-slate-900/80">
          <div className="flex items-center justify-between gap-3">
            <span className="font-black text-slate-400">When</span>
            <span className="text-right font-bold">{formatDate(cls.date)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-black text-slate-400">Time</span>
            <span className="text-right font-bold">
              {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-black text-slate-400">Place</span>
            <span className="line-clamp-1 text-right font-bold">{cls.location}</span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <div>
            <p className="text-xl font-black text-slate-950">
              {cls.price === 0 ? "Free" : `₹${cls.price.toLocaleString("en-IN")}`}
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
              className="touch-pill inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
