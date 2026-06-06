"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type AttendanceStatus = "present" | "late" | "no_show" | "pending";

type ApiAttendee = {
  id: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  attendee_phone?: string | null;
  attendee_type?: string | null;
  attendance_status?: AttendanceStatus | null;
  notes?: string | null;
  bookings?: {
    booking_reference?: string | null;
    payment_status?: string | null;
    amount?: number | null;
  } | Array<{
    booking_reference?: string | null;
    payment_status?: string | null;
    amount?: number | null;
  }> | null;
};

function bookingFor(attendee: ApiAttendee) {
  return Array.isArray(attendee.bookings) ? attendee.bookings[0] : attendee.bookings;
}

function statusClass(status: string | null | undefined) {
  const key = String(status ?? "pending");
  if (key === "present") return "bg-green-100 text-green-700";
  if (key === "late") return "bg-amber-100 text-amber-700";
  if (key === "no_show") return "bg-red-100 text-red-600";
  return "bg-slate-100 text-slate-600";
}

export default function StaffAttendancePage() {
  const params = useParams();
  const classId = params?.id as string;
  const [attendees, setAttendees] = useState<ApiAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);

  const loadAttendance = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/staff/classes/${classId}/attendance`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setAttendees(Array.isArray(body.attendees) ? body.attendees : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAttendance();
    });
  }, [loadAttendance]);

  async function markAttendance(attendeeId: string, status: AttendanceStatus) {
    setBusyId(attendeeId);
    try {
      const response = await fetch(`/api/staff/classes/${classId}/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeId, status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setAttendees((prev) =>
        prev.map((attendee) =>
          attendee.id === attendeeId ? { ...attendee, attendance_status: status } : attendee
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update attendance.");
    } finally {
      setBusyId(null);
    }
  }

  async function addWalkIn() {
    const name = walkInName.trim();
    if (!name) return;
    setWalkInSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/staff/classes/${classId}/walk-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: walkInEmail.trim() || undefined,
          paymentStatus: "free",
          amount: 0,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setWalkInName("");
      setWalkInEmail("");
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add walk-in.");
    } finally {
      setWalkInSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter((attendee) => {
      const booking = bookingFor(attendee);
      return [
        attendee.attendee_name,
        attendee.attendee_email,
        attendee.attendee_phone,
        booking?.booking_reference,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [attendees, search]);

  const counts = {
    total: attendees.length,
    present: attendees.filter((attendee) => attendee.attendance_status === "present").length,
    late: attendees.filter((attendee) => attendee.attendance_status === "late").length,
    noShow: attendees.filter((attendee) => attendee.attendance_status === "no_show").length,
    pending: attendees.filter((attendee) => !attendee.attendance_status || attendee.attendance_status === "pending").length,
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href={`/staff/classes/${classId}`} className="text-sm text-slate-500 hover:text-slate-700">
              Class Detail
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Attendance</h1>
          </div>
          <Link href="/staff/classes" className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            All Classes
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{counts.total}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Present</p>
            <p className="mt-1 text-2xl font-black text-green-700">{counts.present}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Late</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{counts.late}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">No-Show</p>
            <p className="mt-1 text-2xl font-black text-red-600">{counts.noShow}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Pending</p>
            <p className="mt-1 text-2xl font-black text-slate-700">{counts.pending}</p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase text-slate-400">Add Walk-in</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={walkInName}
              onChange={(event) => setWalkInName(event.target.value)}
              placeholder="Name"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <input
              value={walkInEmail}
              onChange={(event) => setWalkInEmail(event.target.value)}
              placeholder="Email optional"
              type="email"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              disabled={walkInSubmitting || !walkInName.trim()}
              onClick={() => void addWalkIn()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {walkInSubmitting ? "Adding..." : "Add"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search attendees"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {error && (
            <div className="m-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Loading attendance...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">No attendees found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-black uppercase text-slate-400">
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Attendee</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((attendee) => {
                    const booking = bookingFor(attendee);
                    const status = attendee.attendance_status ?? "pending";
                    const busy = busyId === attendee.id;
                    return (
                      <tr key={attendee.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600">
                          {booking?.booking_reference ?? "Walk-in"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{attendee.attendee_name ?? "Guest"}</p>
                          <p className="text-xs text-slate-400">{attendee.attendee_email ?? attendee.attendee_phone ?? ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${statusClass(status)}`}>
                            {status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {(["present", "late", "no_show", "pending"] as AttendanceStatus[]).map((next) => (
                              <button
                                key={next}
                                type="button"
                                disabled={busy || status === next}
                                onClick={() => void markAttendance(attendee.id, next)}
                                className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold capitalize text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                              >
                                {next.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
