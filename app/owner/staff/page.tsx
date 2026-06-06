"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";
import type { StaffEarningSummary } from "@/types";
import { OwnerPageHeader } from "@/components/OwnerUI";

const ROLE_LABELS: Record<string, string> = {
  instructor: "Instructor",
  trainer: "Trainer",
  assistant: "Assistant",
  manager: "Manager",
};

type Tab = "active" | "inactive" | "pending";

interface PayoutModalState {
  earning: StaffEarningSummary;
  amount: string;
  paymentDate: string;
  note: string;
  reference: string;
}


export default function StaffListPage() {
  const { staff, classes, currentBusiness, loading } = useAppStore();
  const bizCurrency = getOperatingCurrency(currentBusiness);
  const [tab, setTab] = useState<Tab>("active");

  // Pending invites: email → invite URL
  const [pendingInvites, setPendingInvites] = useState<Record<string, string>>({});
  const [pendingEmails, setPendingEmails] = useState<Set<string>>(new Set());
  const [expiredInviteEmails, setExpiredInviteEmails] = useState<Set<string>>(new Set());
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [staffEarnings, setStaffEarnings] = useState<StaffEarningSummary[]>([]);
  const [payoutModal, setPayoutModal] = useState<PayoutModalState | null>(null);
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadRevenue() {
    const response = await fetch("/api/owner/revenue").catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    setStaffEarnings((data.staffEarnings ?? []) as StaffEarningSummary[]);
  }

  useEffect(() => {
    if (!currentBusiness) return;
    supabase
      .from("staff_invites")
      .select("email, token, accepted_at, expires_at")
      .eq("business_id", currentBusiness.id)
      .is("accepted_at", null)
      .then(({ data }) => {
        if (!data) return;
        const appUrl = window.location.origin;
        const urlMap: Record<string, string> = {};
        const emailSet = new Set<string>();
        const expiredSet = new Set<string>();
        const now = Date.now();
        data.forEach((inv) => {
          const email = inv.email.toLowerCase();
          urlMap[email] = `${appUrl}/staff/invite/${inv.token}`;
          emailSet.add(email);
          if (inv.expires_at && new Date(inv.expires_at).getTime() <= now) {
            expiredSet.add(email);
          }
        });
        setPendingInvites(urlMap);
        setPendingEmails(emailSet);
        setExpiredInviteEmails(expiredSet);
      });
    queueMicrotask(() => {
      void loadRevenue();
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
      const key = email.toLowerCase();
      setPendingInvites((prev) => ({ ...prev, [key]: d.inviteUrl || `${appUrl}/staff/invite/${d.token}` }));
      setPendingEmails((prev) => new Set([...prev, key]));
      setExpiredInviteEmails((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
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

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!payoutModal) return;
    const amount = Number(payoutModal.amount);
    setPayoutError(null);
    setPayoutSuccess(null);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayoutError("Amount must be greater than 0.");
      return;
    }
    if (amount > payoutModal.earning.staffUnpaidBalance) {
      setPayoutError(`Amount exceeds remaining balance of ${formatCurrency(payoutModal.earning.staffUnpaidBalance, bizCurrency)}.`);
      return;
    }
    setPayoutSaving(true);
    const response = await fetch("/api/owner/staff-payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classStaffId: payoutModal.earning.classStaffId,
        amount,
        paymentDate: payoutModal.paymentDate,
        note: payoutModal.note,
        reference: payoutModal.reference,
      }),
    });
    setPayoutSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setPayoutError(data.error ?? "Failed to record staff payout.");
      return;
    }
    setPayoutSuccess("Staff payout recorded.");
    setPayoutModal(null);
    await loadRevenue();
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

  const businessStaff = Array.from(
    staff
      .filter((s) => s.businessId === currentBusiness.id)
      .reduce<Map<string, (typeof staff)[number]>>((map, member) => {
        const key = member.email?.trim().toLowerCase() || `id:${member.id}`;
        const existing = map.get(key);
        if (!existing || (existing.status !== "active" && member.status === "active")) {
          map.set(key, member);
        }
        return map;
      }, new Map())
      .values()
  );
  const activeStaff = businessStaff.filter((s) => s.status === "active");
  const inactiveStaff = businessStaff.filter((s) => s.status === "inactive");
  // Portal Access = active staff who have not accepted portal access yet.
  const pendingStaff = activeStaff.filter(
    (s) => s.email && (!s.userId || pendingEmails.has(s.email.toLowerCase()))
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

  function earningsFor(staffId: string) {
    return staffEarnings
      .filter((earning) => earning.staffId === staffId)
      .reduce(
        (totals, earning) => ({
          earned: totals.earned + Number(earning.staffEarning ?? 0),
          paid: totals.paid + Number(earning.staffPaidAmount ?? 0),
          unpaid: totals.unpaid + Number(earning.staffUnpaidBalance ?? 0),
        }),
        { earned: 0, paid: 0, unpaid: 0 }
      );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "inactive", label: "Not Active" },
    { key: "pending", label: "Portal Access" },
  ];

  const tabStaff =
    tab === "active" ? activeStaff :
    tab === "inactive" ? inactiveStaff :
    pendingStaff;
  const displayStaff = tabStaff.filter((member) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [member.name, member.email, member.phone, member.role, member.userGroup ?? ""].some((value) =>
      value.toLowerCase().includes(needle)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {payoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <form onSubmit={submitPayout} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-black text-slate-950">Mark staff payout as paid</h2>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-black text-slate-900">{payoutModal.earning.staffName}</p>
                <p className="mt-1 text-slate-500">{payoutModal.earning.classTitle}</p>
                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
                  <span>Earned {formatCurrency(payoutModal.earning.staffEarning, bizCurrency)}</span>
                  <span>Paid {formatCurrency(payoutModal.earning.staffPaidAmount, bizCurrency)}</span>
                  <span>Balance {formatCurrency(payoutModal.earning.staffUnpaidBalance, bizCurrency)}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-slate-700">
                  Amount paid
                  <input
                    type="number"
                    min="0.01"
                    max={payoutModal.earning.staffUnpaidBalance}
                    step="0.01"
                    value={payoutModal.amount}
                    onChange={(event) => setPayoutModal((prev) => prev ? { ...prev, amount: event.target.value } : prev)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Payment date
                  <input
                    type="date"
                    value={payoutModal.paymentDate}
                    onChange={(event) => setPayoutModal((prev) => prev ? { ...prev, paymentDate: event.target.value } : prev)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                  Reference
                  <input
                    type="text"
                    value={payoutModal.reference}
                    onChange={(event) => setPayoutModal((prev) => prev ? { ...prev, reference: event.target.value } : prev)}
                    placeholder="Bank reference, UPI ID, cash note"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                  Note
                  <textarea
                    value={payoutModal.note}
                    onChange={(event) => setPayoutModal((prev) => prev ? { ...prev, note: event.target.value } : prev)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>
              {payoutError && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{payoutError}</p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setPayoutModal(null); setPayoutError(null); }}
                  disabled={payoutSaving}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payoutSaving}
                  className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {payoutSaving ? "Saving..." : "Confirm payment"}
                </button>
              </div>
            </form>
          </div>
        )}
        <OwnerPageHeader
          eyebrow="Staff"
          title="Staff"
          description={`${activeStaff.length} active staff member${activeStaff.length !== 1 ? "s" : ""}`}
          primaryAction={
            <Link href="/owner/staff/create" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700">
              + Add Staff
            </Link>
          }
          secondaryAction={
            <>
              <Link href="/owner/user-management" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                User Management
              </Link>
              <Link href="/owner/staff/invite" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100">
                Invite via Link
              </Link>
            </>
          }
        />

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

        <div className="mb-4 rounded-2xl bg-white p-3 shadow-sm">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff by name, email, phone, or role..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
          />
        </div>

        {/* Tab: Portal Access — banner */}
        {tab === "pending" && pendingStaff.length > 0 && (
          <div className="mb-4 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
            <p className="text-sm font-bold text-amber-900">These staff members have not set up portal access yet.</p>
            <p className="mt-0.5 text-xs text-amber-700">Generate, copy, or renew their invite link. Staff disappear from this tab only after they accept the invite and set a password.</p>
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
                <p className="mt-1 text-sm text-slate-500">All staff with emails have set up their portal access.</p>
              </>
            )}
          </div>
        )}

        {/* Staff table */}
        {displayStaff.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Name</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Email</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Role/group</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Assigned classes</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Earnings</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Paid</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Unpaid</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayStaff.map((member) => {
                  const totals = earningsFor(member.id);
                  const isPending = Boolean(member.email && pendingEmails.has(member.email.toLowerCase()));
                  const inviteExpired = member.email ? expiredInviteEmails.has(member.email.toLowerCase()) : false;
                  const needsPortalInvite = Boolean(member.email && !member.userId);
                  const canShareInvite = Boolean(member.email && (needsPortalInvite || isPending));
                  return (
                    <tr key={member.id} className={`hover:bg-slate-50 ${tab === "inactive" ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-900">{member.name || "Unknown staff"}</p>
                        <p className="text-xs text-slate-400">{member.phone || "No phone"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{member.email || "No email"}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-700">{ROLE_LABELS[member.role] ?? member.role}</p>
                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black capitalize ${
                          member.userGroup === "management"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-teal-100 text-teal-700"
                        }`}>
                          {member.userGroup ?? "instructor"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{futureClassCount(member.id)}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(totals.earned, bizCurrency)}</td>
                      <td className="px-4 py-3 text-slate-600">{totals.paid ? formatCurrency(totals.paid, bizCurrency) : "—"}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{totals.unpaid ? formatCurrency(totals.unpaid, bizCurrency) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${
                          tab === "pending" || isPending
                            ? "bg-amber-100 text-amber-700"
                            : needsPortalInvite
                              ? "bg-indigo-100 text-indigo-700"
                            : member.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                        }`}>
                          {inviteExpired
                            ? "invite expired"
                            : isPending
                              ? "invited"
                              : needsPortalInvite
                                ? "needs invite"
                                : member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/owner/staff/${member.id}`} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100">
                            View
                          </Link>
                          {member.email && canShareInvite && (
                            inviteExpired ? (
                              <button
                                onClick={() => generateInvite(member.email, member.role)}
                                disabled={generatingFor === member.email}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              >
                                {generatingFor === member.email ? "Renewing..." : "Renew link"}
                              </button>
                            ) : pendingInvites[member.email.toLowerCase()] ? (
                              <button
                                onClick={() => copyInvite(member.email)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                                  copiedEmail === member.email
                                    ? "bg-green-500 text-white"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {copiedEmail === member.email ? "Copied" : "Copy link"}
                              </button>
                            ) : (
                              <button
                                onClick={() => generateInvite(member.email, member.role)}
                                disabled={generatingFor === member.email}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {generatingFor === member.email ? "Generating..." : "Get link"}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Staff earnings and payables</h2>
              <p className="mt-1 text-sm text-slate-500">
                Commission is calculated from eligible paid bookings. Payouts are owner-to-staff records.
              </p>
            </div>
            {payoutSuccess && (
              <p className="rounded-full bg-green-50 px-4 py-2 text-xs font-black text-green-700">
                {payoutSuccess}
              </p>
            )}
          </div>

          {staffEarnings.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm font-semibold text-slate-400">
                Staff payable rows appear after instructors are assigned to classes.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Staff</th>
                    <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Class</th>
                    <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Gross</th>
                    <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Rule</th>
                    <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Earned</th>
                    <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Paid</th>
                    <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Balance</th>
                    <th className="px-4 py-3 text-xs font-black uppercase text-slate-400">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staffEarnings.map((earning) => (
                    <tr key={earning.classStaffId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{earning.staffName}</td>
                      <td className="px-4 py-3 text-slate-600">{earning.classTitle}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {earning.grossClassRevenue ? <span>{formatCurrency(earning.grossClassRevenue, bizCurrency)}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {earning.commissionType === "percentage"
                          ? `${earning.commissionValue}%`
                          : <><span>{earning.commissionValue ? formatCurrency(earning.commissionValue, bizCurrency) : "—"}</span><span className="text-xs text-slate-400"> fixed</span></>}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {earning.staffEarning ? <span>{formatCurrency(earning.staffEarning, bizCurrency)}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {earning.staffPaidAmount ? <span>{formatCurrency(earning.staffPaidAmount, bizCurrency)}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {earning.staffUnpaidBalance ? <span>{formatCurrency(earning.staffUnpaidBalance, bizCurrency)}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${
                          earning.staffPayoutStatus === "paid" ? "bg-green-100 text-green-700"
                            : earning.staffPayoutStatus === "partially_paid" ? "bg-amber-100 text-amber-700"
                            : earning.staffPayoutStatus === "unpaid" ? "bg-red-100 text-red-600"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {earning.staffPayoutStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={earning.staffUnpaidBalance <= 0}
                          onClick={() => {
                            setPayoutError(null);
                            setPayoutSuccess(null);
                            setPayoutModal({
                              earning,
                              amount: String(earning.staffUnpaidBalance),
                              paymentDate: new Date().toISOString().slice(0, 10),
                              note: "",
                              reference: "",
                            });
                          }}
                          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark as Paid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
