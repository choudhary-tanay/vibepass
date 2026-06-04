"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { supabase } from "@/lib/supabaseClient";

const ROLE_LABELS: Record<string, string> = {
  instructor: "Instructor",
  trainer: "Trainer",
  assistant: "Assistant",
  manager: "Manager",
};

type Tab = "active" | "inactive" | "pending";

export default function StaffListPage() {
  const { staff, classes, currentBusiness, loading } = useAppStore();
  const [tab, setTab] = useState<Tab>("active");

  // Pending invites: email → invite URL
  const [pendingInvites, setPendingInvites] = useState<Record<string, string>>({});
  const [pendingEmails, setPendingEmails] = useState<Set<string>>(new Set());
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusiness) return;
    supabase
      .from("staff_invites")
      .select("email, token, accepted_at, expires_at")
      .eq("business_id", currentBusiness.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .then(({ data }) => {
        if (!data) return;
        const appUrl = window.location.origin;
        const urlMap: Record<string, string> = {};
        const emailSet = new Set<string>();
        data.forEach((inv) => {
          urlMap[inv.email.toLowerCase()] = `${appUrl}/staff/invite/${inv.token}`;
          emailSet.add(inv.email.toLowerCase());
        });
        setPendingInvites(urlMap);
        setPendingEmails(emailSet);
      });
  }, [currentBusiness]);

  async function generateInvite(email: string, role: string) {
    if (!currentBusiness) return;
    setGeneratingFor(email);
    const res = await fetch("/api/owner/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, businessId: currentBusiness.id }),
    });
    if (res.ok) {
      const d = await res.json();
      const appUrl = window.location.origin;
      setPendingInvites((prev) => ({ ...prev, [email.toLowerCase()]: d.inviteUrl || `${appUrl}/staff/invite/${d.token}` }));
      setPendingEmails((prev) => new Set([...prev, email.toLowerCase()]));
    }
    setGeneratingFor(null);
  }

  async function copyInvite(email: string) {
    const url = pendingInvites[email.toLowerCase()];
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl"><p className="text-slate-400">Loading…</p></div>
      </main>
    );
  }

  if (!currentBusiness) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-slate-600">No business found. Please log in as an owner.</p>
          </div>
        </div>
      </main>
    );
  }

  const businessStaff = staff.filter((s) => s.businessId === currentBusiness.id);
  const activeStaff = businessStaff.filter((s) => s.status === "active");
  const inactiveStaff = businessStaff.filter((s) => s.status === "inactive");
  // "Link Shared" = active staff who have a pending (unaccepted) invite
  const pendingStaff = activeStaff.filter(
    (s) => s.email && pendingEmails.has(s.email.toLowerCase())
  );

  const tabCounts: Record<Tab, number> = {
    active: activeStaff.length,
    inactive: inactiveStaff.length,
    pending: pendingStaff.length,
  };

  function futureClassCount(staffId: string): number {
    const today = new Date().toISOString().slice(0, 10);
    return classes.filter(
      (c) =>
        (c.staffId === staffId || c.staffIds?.includes(staffId)) &&
        c.date >= today &&
        c.status === "published"
    ).length;
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "inactive", label: "Not Active" },
    { key: "pending", label: "Link Shared" },
  ];

  const displayStaff =
    tab === "active" ? activeStaff :
    tab === "inactive" ? inactiveStaff :
    pendingStaff;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link href="/owner/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-black text-slate-900">Staff</h1>
            <p className="text-sm text-slate-500">{activeStaff.length} active staff member{activeStaff.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/owner/staff/invite" className="rounded-full border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100">
              Invite via Link
            </Link>
            <Link href="/owner/staff/create" className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700">
              + Add Staff
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-2xl bg-slate-100 p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                tab === key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                tab === key
                  ? key === "pending" ? "bg-amber-100 text-amber-700"
                    : key === "inactive" ? "bg-slate-100 text-slate-500"
                    : "bg-indigo-100 text-indigo-700"
                  : "bg-slate-200 text-slate-500"
              }`}>
                {tabCounts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Tab: Link Shared — banner */}
        {tab === "pending" && pendingStaff.length > 0 && (
          <div className="mb-4 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
            <p className="text-sm font-bold text-amber-900">These staff members have received an invite link but haven&apos;t set up their account yet.</p>
            <p className="mt-0.5 text-xs text-amber-700">Click &quot;Copy link&quot; to re-share. The link expires 7 days after it was generated.</p>
          </div>
        )}

        {/* Empty state */}
        {displayStaff.length === 0 && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            {tab === "active" && (
              <>
                <p className="text-lg font-black text-slate-700">No active staff yet</p>
                <p className="mt-1 text-sm text-slate-500">Add your first staff member to get started.</p>
                <Link href="/owner/staff/create" className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white hover:bg-indigo-700">
                  Add Staff
                </Link>
              </>
            )}
            {tab === "inactive" && (
              <p className="text-sm text-slate-500">No inactive staff members.</p>
            )}
            {tab === "pending" && (
              <>
                <p className="text-lg font-black text-slate-700">No pending invites</p>
                <p className="mt-1 text-sm text-slate-500">All staff have set up their portal access, or no invites have been sent yet.</p>
              </>
            )}
          </div>
        )}

        {/* Staff table */}
        {displayStaff.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3.5 font-semibold text-slate-500">Name</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-500">Group</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-500">Role</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-500">Contact</th>
                  {tab === "active" && (
                    <th className="px-5 py-3.5 font-semibold text-slate-500">Classes</th>
                  )}
                  {tab === "pending" && (
                    <th className="px-5 py-3.5 font-semibold text-slate-500">Invite Link</th>
                  )}
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayStaff.map((member) => (
                  <tr key={member.id} className={`hover:bg-slate-50 ${tab === "inactive" ? "opacity-60" : ""}`}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{member.name}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
                        member.userGroup === "management"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-teal-100 text-teal-700"
                      }`}>
                        {member.userGroup ?? "instructor"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{ROLE_LABELS[member.role] ?? member.role}</td>
                    <td className="px-5 py-4 text-slate-500">{member.email || member.phone || "—"}</td>

                    {tab === "active" && (
                      <td className="px-5 py-4 text-slate-600">{futureClassCount(member.id)}</td>
                    )}

                    {tab === "pending" && member.email && (
                      <td className="px-5 py-4">
                        {pendingInvites[member.email.toLowerCase()] ? (
                          <button
                            onClick={() => copyInvite(member.email)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                              copiedEmail === member.email
                                ? "bg-green-500 text-white"
                                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            }`}
                          >
                            {copiedEmail === member.email ? "Copied!" : "Copy link"}
                          </button>
                        ) : (
                          <button
                            onClick={() => generateInvite(member.email, member.role)}
                            disabled={generatingFor === member.email}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                          >
                            {generatingFor === member.email ? "Generating…" : "Get new link"}
                          </button>
                        )}
                      </td>
                    )}

                    <td className="px-5 py-4 text-right">
                      <Link href={`/owner/staff/${member.id}`} className="text-indigo-600 hover:underline text-xs font-semibold">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
