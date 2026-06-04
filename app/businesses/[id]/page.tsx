"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { isFutureDate } from "@/lib/utils";
import { ClassCard } from "@/components/ClassCard";
import { ReportButton } from "@/components/ReportButton";

export default function BusinessPage() {
  const { id } = useParams<{ id: string }>();
  const { businesses, classes, staff, loading } = useAppStore();

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  const business = businesses.find((b) => b.id === id);

  if (!business) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">Business not found.</p>
            <Link
              href="/classes"
              className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
            >
              ← Browse Classes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const businessClasses = classes.filter(
    (c) =>
      c.businessId === business.id &&
      c.status === "published" &&
      isFutureDate(c.date)
  );

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

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Back link */}
        <Link
          href="/classes"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Browse Classes
        </Link>

        {/* Business header card */}
        <div className="mb-8 rounded-2xl bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={`${business.businessName} logo`}
                className="h-16 w-16 rounded-2xl object-cover shadow-sm"
              />
            )}
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {business.category}
                </span>
                {business.isMarketplaceVisible && (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    ✓ Verified Studio
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {business.businessName}
              </h1>
              {business.description && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {business.description}
                </p>
              )}
            </div>
            <ReportButton
              entityType="business"
              entityId={business.id}
              entityName={business.businessName}
            />
          </div>

          {/* Contact details */}
          <div className="mt-5 flex flex-wrap gap-5 border-t border-gray-100 pt-5 text-sm text-gray-600">
            {business.location && (
              <div className="flex items-center gap-1.5">
                <span>📍</span>
                <span>{business.location}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-1.5">
                <span>📞</span>
                <span>{business.phone}</span>
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-1.5">
                <span>✉️</span>
                <a
                  href={`mailto:${business.email}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {business.email}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Classes section */}
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Upcoming Sessions ({businessClasses.length})
        </h2>

        {businessClasses.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">Nothing scheduled right now.</p>
            <p className="mt-1 text-sm text-gray-400">Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {businessClasses.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                businessName={business.businessName}
                instructors={getClassInstructors(cls)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
