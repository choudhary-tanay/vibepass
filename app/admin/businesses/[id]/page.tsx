"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Select, MultiSelect } from "@/components/CustomSelect";

const ALL_CATEGORIES = [
  "Yoga", "Pilates", "Fitness", "Dance", "Martial Arts",
  "Meditation", "Swimming", "Cycling", "Nutrition", "Wellness",
  "Beauty", "Therapy", "Sports", "Kids", "Seniors", "Other",
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "#16a34a" },
  { value: "pending_approval", label: "Pending Approval", color: "#d97706" },
  { value: "suspended", label: "Suspended", color: "#dc2626" },
  { value: "rejected", label: "Rejected", color: "#be123c" },
  { value: "hidden", label: "Hidden", color: "#64748b" },
  { value: "archived", label: "Archived", color: "#94a3b8" },
];

interface BusinessDetail {
  id: string;
  business_name: string;
  category: string;
  categories: string[] | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  description: string | null;
  status: string;
  is_marketplace_visible: boolean;
  platform_margin: number | null;
  margin_note: string | null;
  margin_set_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  suspension_reason: string | null;
  created_at: string;
  owner_id: string | null;
}

interface BizStats {
  classCount: number;
  publishedCount: number;
  bookingCount: number;
  revenue: number;
}

export default function AdminBusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [biz, setBiz] = useState<BusinessDetail | null>(null);
  const [stats, setStats] = useState<BizStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [status, setStatus] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [platformMargin, setPlatformMargin] = useState("0");
  const [marginNote, setMarginNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/businesses/${id}/data`);
    if (!res.ok) { setLoading(false); return; }

    const { biz: data, stats: s } = await res.json();

    if (data) {
      setBiz(data as BusinessDetail);
      setStatus(data.status);
      setCategories(data.categories ?? (data.category ? [data.category] : []));
      setIsVisible(data.is_marketplace_visible ?? true);
      setAdminNotes(data.admin_notes ?? "");
      setPlatformMargin(String(data.platform_margin ?? 0));
      setMarginNote(data.margin_note ?? "");
      setRejectionReason(data.rejection_reason ?? "");
      setSuspensionReason(data.suspension_reason ?? "");
    }
    setStats(s ?? null);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const res = await fetch(`/api/admin/businesses/${id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        isMarketplaceVisible: isVisible,
        categories,
        adminNotes,
        platformMargin,
        marginNote,
        rejectionReason: status === "rejected" ? rejectionReason : undefined,
        suspensionReason: status === "suspended" ? suspensionReason : undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save changes.");
    } else {
      setSaved(true);
      await load();
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Business not found.</p>
        <Link href="/admin/businesses" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">← Back to Businesses</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/businesses" className="text-sm text-slate-500 hover:text-slate-700">← All Businesses</Link>
          <h1 className="mt-1 text-2xl font-black text-slate-900">{biz.business_name}</h1>
          <p className="text-sm text-slate-500">{biz.email} · {biz.location}</p>
        </div>
        <a
          href={`/businesses/${biz.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          View public page ↗
        </a>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Classes", value: stats.classCount },
            { label: "Published", value: stats.publishedCount, color: "text-green-600" },
            { label: "Bookings", value: stats.bookingCount },
            { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, color: "text-indigo-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400">{label}</p>
              <p className={`mt-1 text-xl font-black ${color ?? "text-slate-900"}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Status + Visibility */}
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Status & Visibility</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
              <Select
                options={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Marketplace visibility</label>
              <Select
                options={[
                  { value: "true", label: "Visible on marketplace", color: "#16a34a" },
                  { value: "false", label: "Hidden from marketplace", color: "#64748b" },
                ]}
                value={String(isVisible)}
                onChange={(v) => setIsVisible(v === "true")}
              />
            </div>
          </div>

          {status === "rejected" && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Rejection reason (shown to owner)</label>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2}
                placeholder="Why is this business being rejected?"
                className="w-full rounded-xl border border-red-200 bg-red-50/30 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
            </div>
          )}
          {status === "suspended" && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Suspension reason (shown to owner)</label>
              <textarea value={suspensionReason} onChange={(e) => setSuspensionReason(e.target.value)} rows={2}
                placeholder="Why is this business being suspended?"
                className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
          )}
        </div>

        {/* Platform Margin */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 p-6 shadow-sm ring-1 ring-indigo-100 space-y-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-indigo-600">Platform Margin</h2>
            <p className="mt-0.5 text-xs text-indigo-500">
              The percentage VibePass takes from each paid class booking at this studio.
              {biz.margin_set_at && ` Last updated ${new Date(biz.margin_set_at).toLocaleDateString("en-IN")}.`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Margin %</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={platformMargin}
                  onChange={(e) => setPlatformMargin(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
              </div>
              {parseFloat(platformMargin) > 0 && (
                <p className="mt-1 text-xs text-indigo-600">
                  On a ₹1,000 class: VibePass earns ₹{(10 * parseFloat(platformMargin)).toFixed(0)}, studio gets ₹{(1000 - 10 * parseFloat(platformMargin)).toFixed(0)}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Margin note (internal)</label>
              <input type="text" value={marginNote} onChange={(e) => setMarginNote(e.target.value)}
                placeholder="e.g. Standard tier, negotiated rate"
                className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Business Categories</h2>
          <MultiSelect
            options={ALL_CATEGORIES.map((c) => ({ value: c, label: c }))}
            values={categories}
            onChange={setCategories}
            placeholder="Select categories offered…"
          />
          <p className="text-xs text-slate-400">Select all categories this business operates in. Used for marketplace filtering.</p>
        </div>

        {/* Admin notes */}
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Admin Notes (internal only)</h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
            placeholder="Internal notes about this business — not visible to the owner…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        {/* Business info (read-only) */}
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Business Info</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            {[
              { label: "Name", value: biz.business_name },
              { label: "Email", value: biz.email || "—" },
              { label: "Phone", value: biz.phone || "—" },
              { label: "Location", value: biz.location || "—" },
              { label: "Created", value: new Date(biz.created_at).toLocaleDateString("en-IN") },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-0.5 font-medium text-slate-800">{value}</p>
              </div>
            ))}
            {biz.description && (
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-slate-400">Description</p>
                <p className="mt-0.5 text-slate-700 leading-6">{biz.description}</p>
              </div>
            )}
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">✓ Changes saved successfully.</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.push("/admin/businesses")}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
