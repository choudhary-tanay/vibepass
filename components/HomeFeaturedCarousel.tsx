"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Class, Staff } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";

type FeaturedInstructor = Pick<Staff, "id" | "name"> &
  Partial<Pick<Staff, "role" | "imageUrl" | "publicProfileVisible">>;

interface HomeFeaturedCarouselProps {
  classes: Class[];
  businessNames: Record<string, string>;
  instructorsByClassId: Record<string, FeaturedInstructor[]>;
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "CV";
}

function InstructorStack({
  instructors,
  fallbackName,
}: {
  instructors: FeaturedInstructor[];
  fallbackName: string;
}) {
  const fallbackInstructors: FeaturedInstructor[] =
    instructors.length > 0
      ? instructors
      : fallbackName
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name, index) => ({ id: `fallback-${index}`, name }));
  const visible = fallbackInstructors.slice(0, 3);
  const extra = Math.max(0, fallbackInstructors.length - visible.length);

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {visible.map((instructor) => (
          <div
            key={instructor.id}
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-br from-teal-400 to-indigo-500 text-sm font-black text-white shadow-lg dark:border-slate-950"
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
        {extra > 0 && (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-slate-950 text-xs font-black text-white shadow-lg dark:border-slate-950">
            +{extra}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">
          {fallbackInstructors.map((instructor) => instructor.name).join(", ") ||
            "Class instructors"}
        </p>
        <p className="text-xs font-semibold text-white/70">
          {fallbackInstructors.length > 1 ? "Your instructors" : "Your instructor"}
        </p>
      </div>
    </div>
  );
}

export function HomeFeaturedCarousel({
  classes,
  businessNames,
  instructorsByClassId,
}: HomeFeaturedCarouselProps) {
  const slides = useMemo(
    () =>
      classes
        .filter((cls) => cls.featured)
        .sort((a, b) => (a.featuredPosition ?? 99) - (b.featuredPosition ?? 99)),
    [classes]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4300);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const safeActiveIndex = slides.length > 0 ? activeIndex % slides.length : 0;
  const activeClass = slides[safeActiveIndex];

  if (!activeClass) {
    return (
      <div className="visual-panel overflow-hidden rounded-[2.25rem] p-4">
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(15,23,42,.24), rgba(15,23,42,.05)), url(/art/vibepass-marketplace-hero.png)",
          }}
        >
          <div className="absolute bottom-5 left-5 right-5 rounded-[1.35rem] bg-white/78 p-4 backdrop-blur dark:bg-slate-950/72">
            <p className="text-xs font-black uppercase text-teal-700 dark:text-teal-200">
              Featured carousel
            </p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              Admin featured classes will rotate here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeInstructors = instructorsByClassId[activeClass.id] ?? [];
  const seatsLeft = Math.max(0, activeClass.capacity - activeClass.bookedCount);

  return (
    <div className="visual-panel overflow-hidden rounded-[2.25rem] p-4">
      <div className="relative min-h-[28rem] overflow-hidden rounded-[1.75rem] bg-slate-950">
        {activeClass.imageUrl ? (
          <div
            key={activeClass.id}
            className="animate-slide-in absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${activeClass.imageUrl})` }}
          />
        ) : (
          <ClassImageTemplate
            key={activeClass.id}
            title={activeClass.title}
            category={activeClass.category}
            instructorName={activeClass.instructorName}
            className="animate-slide-in absolute inset-0 h-full w-full rounded-none"
          />
        )}
        {/* Bottom gradient — keeps content text readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
        {/* Top gradient — keeps badges readable over any image content */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/70 to-transparent" />

        <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase text-slate-950 shadow-sm backdrop-blur">
            {activeClass.featuredLabel ?? "Featured"}
          </span>
          <span className="rounded-full bg-teal-400 px-3 py-1 text-xs font-black text-teal-950 shadow-sm">
            Slot {activeClass.featuredPosition ?? activeIndex + 1}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-wide text-teal-200">
            {businessNames[activeClass.businessId] ?? "Studio"} · {activeClass.category}
          </p>
          <h2 className="mt-2 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl">
            {activeClass.title}
          </h2>
          <div className="mt-4">
            <InstructorStack
              instructors={activeInstructors}
              fallbackName={activeClass.instructorName}
            />
          </div>

          <div className="mt-5 grid gap-2 text-sm font-bold text-white/82 sm:grid-cols-3">
            <span className="rounded-2xl bg-white/12 px-3 py-2 backdrop-blur">
              {formatDate(activeClass.date)}
            </span>
            <span className="rounded-2xl bg-white/12 px-3 py-2 backdrop-blur">
              {formatTime(activeClass.startTime)} - {formatTime(activeClass.endTime)}
            </span>
            <span className="rounded-2xl bg-white/12 px-3 py-2 backdrop-blur">
              {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} open
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show featured class ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === safeActiveIndex ? "w-8 bg-teal-300" : "w-2.5 bg-white/45"
                  }`}
                />
              ))}
            </div>
            <Link
              href={`/classes/${activeClass.id}`}
              className="touch-pill inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-teal-50"
            >
              View featured class
            </Link>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`min-w-44 rounded-2xl border px-3 py-2 text-left transition-all ${
                index === safeActiveIndex
                  ? "border-teal-300 bg-teal-50 text-teal-950 dark:border-teal-500 dark:bg-teal-950/50 dark:text-teal-50"
                  : "border-slate-200 bg-white/68 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"
              }`}
            >
              <p className="truncate text-xs font-black uppercase">
                Slot {slide.featuredPosition ?? index + 1}
              </p>
              <p className="mt-0.5 truncate text-sm font-black">{slide.title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
