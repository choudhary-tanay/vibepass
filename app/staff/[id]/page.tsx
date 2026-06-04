"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, formatTime } from "@/lib/utils";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";
import { ReportButton } from "@/components/ReportButton";

interface StaffRow {
  id: string; business_id: string; name: string; role: string;
  image_url: string | null; bio: string | null; specialties: string[] | null;
  experience_years: number | null; instagram_url: string | null;
  website_url: string | null; public_profile_visible: boolean;
  businesses: { business_name: string } | null;
}

interface ClassRow {
  id: string; title: string; category: string; date: string;
  start_time: string; end_time: string; location: string; price: number;
  booked_count: number; capacity: number;
}

export default function PublicStaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<StaffRow | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("staff")
        .select("*, businesses(business_name)")
        .eq("id", id)
        .eq("public_profile_visible", true)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setMember(data as unknown as StaffRow);

      const today = new Date().toISOString().slice(0, 10);
      const { data: classStaffRows } = await supabase
        .from("class_staff")
        .select("class_id")
        .eq("staff_id", id);
      const classIds = (classStaffRows ?? []).map((row) => row.class_id as string);

      const { data: primaryClasses } = await supabase
        .from("classes")
        .select("id, title, category, date, start_time, end_time, location, price, booked_count, capacity")
        .eq("staff_id", id)
        .eq("status", "published")
        .eq("is_admin_hidden", false)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(6);

      const { data: sharedClasses } = classIds.length > 0
        ? await supabase
            .from("classes")
            .select("id, title, category, date, start_time, end_time, location, price, booked_count, capacity")
            .in("id", classIds)
            .eq("status", "published")
            .eq("is_admin_hidden", false)
            .gte("date", today)
            .order("date", { ascending: true })
            .limit(6)
        : { data: [] };

      const mergedClasses = [...(primaryClasses ?? []), ...(sharedClasses ?? [])]
        .filter((cls, index, arr) => arr.findIndex((item) => item.id === cls.id) === index)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);

      setUpcomingClasses(mergedClasses as ClassRow[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="h-64 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      </main>
    );
  }

  if (notFound || !member) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-xl font-semibold text-gray-800">Instructor not found</p>
          <p className="mt-2 text-gray-500">This profile is not available or has been set to private.</p>
          <Link href="/classes" className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            Browse Classes
          </Link>
        </div>
      </main>
    );
  }

  const businessName = (member.businesses as { business_name: string } | null)?.business_name;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/classes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          ← Back to Classes
        </Link>

        {/* Profile card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-5">
            {member.image_url ? (
              <img
                src={member.image_url}
                alt={member.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-black text-blue-700">
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-black text-gray-900">{member.name}</h1>
              <p className="mt-0.5 text-sm font-semibold capitalize text-blue-600">{member.role}</p>
              {businessName && (
                <p className="mt-0.5 text-sm text-gray-500">{businessName}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {member.experience_years != null && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {member.experience_years} year{member.experience_years !== 1 ? "s" : ""} experience
                  </span>
                )}
                {(member.specialties ?? []).map((s) => (
                  <span key={s} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {member.bio && (
            <p className="mt-5 leading-7 text-gray-700 whitespace-pre-line">{member.bio}</p>
          )}

          {(member.instagram_url || member.website_url) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {member.instagram_url && (
                <a
                  href={member.instagram_url.startsWith("http") ? member.instagram_url : `https://instagram.com/${member.instagram_url.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Instagram
                </a>
              )}
              {member.website_url && (
                <a
                  href={member.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Website
                </a>
              )}
            </div>
          )}

          <div className="mt-5">
            <ReportButton
              entityType="staff"
              entityId={member.id}
              entityName={member.name}
            />
          </div>
        </div>

        {/* Upcoming classes */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Upcoming Classes{upcomingClasses.length > 0 ? ` (${upcomingClasses.length})` : ""}
          </h2>
          {upcomingClasses.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">No upcoming classes scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map((cls) => {
                const isFull = cls.booked_count >= cls.capacity;
                const available = cls.capacity - cls.booked_count;
                return (
                  <Link key={cls.id} href={`/classes/${cls.id}`}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors">
                    <div className="w-20 flex-shrink-0 overflow-hidden rounded-xl">
                      <ClassImageTemplate title={cls.title} category={cls.category} className="h-16" compact />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{cls.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDate(cls.date)} · {formatTime(cls.start_time)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 truncate">{cls.location}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">
                        {cls.price === 0 ? "Free" : `₹${cls.price.toLocaleString("en-IN")}`}
                      </p>
                      <p className={`mt-0.5 text-xs font-semibold ${isFull ? "text-red-500" : "text-green-600"}`}>
                        {isFull ? "Full" : `${available} left`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
