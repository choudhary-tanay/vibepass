"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";
import DataTable, { Td, Th, type ColDef } from "@/components/DataTable";
import { OwnerActionMenu, OwnerPageHeader, OwnerStatusChip, ownerMenuItemClass } from "@/components/OwnerUI";

interface SponsorRow {
  id: string;
  sponsor_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  category?: string | null;
  notes?: string | null;
  status: string;
}

interface ClassSponsorRow {
  id: string;
  class_id: string;
  sponsor_id?: string | null;
  sponsor_amount: number;
  sponsor_currency: string;
  payment_status: string;
  show_sponsor_publicly: boolean;
  sponsor_display_name?: string | null;
  sponsor_logo_url?: string | null;
  sponsor_cover_image_url?: string | null;
  sponsor_message?: string | null;
  sponsor_status?: string | null;
  sponsor_refund_amount?: number | null;
  sponsor_retained_amount?: number | null;
  classes?: { title?: string | null; date?: string | null } | { title?: string | null; date?: string | null }[] | null;
  sponsors?: { sponsor_name?: string | null } | { sponsor_name?: string | null }[] | null;
}

const sponsorFormInitial = {
  sponsorName: "",
  contactPerson: "",
  email: "",
  phone: "",
  website: "",
  logoUrl: "",
  coverImageUrl: "",
  description: "",
  category: "",
  notes: "",
};

const attachFormInitial = {
  sponsorId: "",
  classId: "",
  sponsorAmount: "0",
  sponsorCurrency: "INR",
  paymentStatus: "expected",
  showSponsorPublicly: true,
  sponsorDisplayName: "",
  sponsorLogoUrl: "",
  sponsorCoverImageUrl: "",
  sponsorMessage: "",
  reference: "",
  note: "",
};

const SPONSOR_COLUMNS: ColDef[] = [
  { key: "sponsor", label: "Sponsor name", fixed: true },
  { key: "contact", label: "Contact" },
  { key: "classes", label: "Classes sponsored" },
  { key: "total", label: "Total sponsored" },
  { key: "visibility", label: "Public/private" },
  { key: "refund", label: "Refund/cancel" },
  { key: "impact", label: "Revenue/profit impact" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", fixed: true },
];

const CLASS_SPONSOR_COLUMNS: ColDef[] = [
  { key: "class", label: "Class", fixed: true },
  { key: "sponsor", label: "Sponsor" },
  { key: "amount", label: "Amount" },
  { key: "payment", label: "Payment" },
  { key: "visibility", label: "Public" },
  { key: "cancellation", label: "Cancellation" },
];

function joinedClass(row: ClassSponsorRow) {
  return Array.isArray(row.classes) ? row.classes[0] : row.classes;
}

function joinedSponsor(row: ClassSponsorRow) {
  return Array.isArray(row.sponsors) ? row.sponsors[0] : row.sponsors;
}

export default function OwnerSponsorsPage() {
  const { currentBusiness, classes, loading } = useAppStore();
  const bizCurrency = getOperatingCurrency(currentBusiness);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [classSponsors, setClassSponsors] = useState<ClassSponsorRow[]>([]);
  const [financeByClass, setFinanceByClass] = useState<Record<string, { gross_revenue?: number; sponsor_income?: number; net_profit?: number }>>({});
  const [sponsorForm, setSponsorForm] = useState(sponsorFormInitial);
  const [attachForm, setAttachForm] = useState(attachFormInitial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSponsorTools, setShowSponsorTools] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState("");
  const [selectedSponsor, setSelectedSponsor] = useState<SponsorRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const businessClasses = currentBusiness
    ? classes.filter((cls) => cls.businessId === currentBusiness.id)
    : [];

  async function loadSponsors() {
    if (!currentBusiness) return;
    setError("");
    const response = await fetch(`/api/owner/sponsors?businessId=${currentBusiness.id}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not load sponsors.");
      setSponsors([]);
      setClassSponsors([]);
      return;
    }
    const loadedSponsors = (data.sponsors ?? []) as SponsorRow[];
    setSponsors(loadedSponsors);
    setClassSponsors((data.classSponsors ?? []) as ClassSponsorRow[]);
    setFinanceByClass(data.financeByClass ?? {});
    setAttachForm((prev) => ({
      ...prev,
      sponsorId: prev.sponsorId || loadedSponsors[0]?.id || "",
      classId: prev.classId || businessClasses[0]?.id || "",
      sponsorCurrency: bizCurrency,
    }));
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (active) await loadSponsors();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, businessClasses.length]);

  function applySponsorDefaults(sponsorId: string) {
    const sponsor = sponsors.find((item) => item.id === sponsorId);
    setAttachForm((prev) => ({
      ...prev,
      sponsorId,
      sponsorDisplayName: sponsor?.sponsor_name ?? prev.sponsorDisplayName,
      sponsorLogoUrl: sponsor?.logo_url ?? prev.sponsorLogoUrl,
      sponsorCoverImageUrl: sponsor?.cover_image_url ?? prev.sponsorCoverImageUrl,
    }));
  }

  async function submitSponsor(event: React.FormEvent) {
    event.preventDefault();
    if (!currentBusiness) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const response = await fetch("/api/owner/sponsors", {
      method: editingSponsorId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sponsorForm, sponsorId: editingSponsorId || undefined, businessId: currentBusiness.id }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save sponsor.");
      return;
    }
    setSponsorForm(sponsorFormInitial);
    setEditingSponsorId("");
    setSuccess(editingSponsorId ? "Sponsor updated." : "Sponsor saved.");
    await loadSponsors();
  }

  function editSponsor(sponsor: SponsorRow) {
    setEditingSponsorId(sponsor.id);
    setSponsorForm({
      sponsorName: sponsor.sponsor_name,
      contactPerson: sponsor.contact_person ?? "",
      email: sponsor.email ?? "",
      phone: sponsor.phone ?? "",
      website: sponsor.website ?? "",
      logoUrl: sponsor.logo_url ?? "",
      coverImageUrl: sponsor.cover_image_url ?? "",
      description: sponsor.description ?? "",
      category: sponsor.category ?? "",
      notes: sponsor.notes ?? "",
    });
    setShowSponsorTools(true);
  }

  function resetSponsorForm() {
    setEditingSponsorId("");
    setSponsorForm(sponsorFormInitial);
    setShowSponsorTools((value) => !value);
  }

  async function attachSponsor(event: React.FormEvent) {
    event.preventDefault();
    if (!currentBusiness) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const response = await fetch("/api/owner/sponsors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...attachForm,
        businessId: currentBusiness.id,
        attachClassId: attachForm.classId,
        sponsorAmount: Number(attachForm.sponsorAmount || 0),
        sponsorCurrency: bizCurrency,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not attach sponsor.");
      return;
    }
    setAttachForm((prev) => ({
      ...attachFormInitial,
      sponsorId: prev.sponsorId,
      classId: prev.classId,
      sponsorCurrency: prev.sponsorCurrency,
    }));
    setSuccess("Sponsor attached to class.");
    await loadSponsors();
  }

  async function setSponsorStatus(sponsor: SponsorRow, status: "active" | "inactive" | "completed") {
    if (!currentBusiness) return;
    await fetch("/api/owner/sponsors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: currentBusiness.id, sponsorId: sponsor.id, status }),
    });
    await loadSponsors();
  }

  if (loading) {
    return <main className="min-h-screen px-6 py-10 text-sm text-slate-400">Loading sponsors...</main>;
  }

  if (!currentBusiness) {
    return <main className="min-h-screen px-6 py-10 text-sm text-slate-500">No business found.</main>;
  }

  function statsForSponsor(sponsorId: string) {
    const rows = classSponsors.filter((item) => item.sponsor_id === sponsorId);
    const classIds = new Set(rows.map((item) => item.class_id));
    const totalSponsored = rows.reduce((sum, item) => sum + Number(item.sponsor_amount ?? 0), 0);
    const publicCount = rows.filter((item) => item.show_sponsor_publicly).length;
    const refundTotal = rows.reduce((sum, item) => sum + Number(item.sponsor_refund_amount ?? 0), 0);
    const retainedTotal = rows.reduce((sum, item) => sum + Number(item.sponsor_retained_amount ?? item.sponsor_amount ?? 0), 0);
    const revenue = rows.reduce((sum, item) => sum + Number(financeByClass[item.class_id]?.gross_revenue ?? 0), 0);
    const profit = rows.reduce((sum, item) => sum + Number(financeByClass[item.class_id]?.net_profit ?? 0), 0);
    const sponsorStatuses = [...new Set(rows.map((item) => item.sponsor_status ?? item.payment_status).filter(Boolean))];
    return {
      classCount: classIds.size,
      totalSponsored,
      publicCount,
      privateCount: Math.max(0, rows.length - publicCount),
      refundTotal,
      retainedTotal,
      revenue,
      profit,
      sponsorStatuses,
    };
  }

  const filteredSponsors = sponsors.filter((sponsor) => {
    const needle = search.trim().toLowerCase();
    if (statusFilter !== "all" && sponsor.status !== statusFilter) return false;
    if (!needle) return true;
    return [
      sponsor.sponsor_name,
      sponsor.contact_person ?? "",
      sponsor.email ?? "",
      sponsor.phone ?? "",
      sponsor.category ?? "",
    ].some((value) => value.toLowerCase().includes(needle));
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <OwnerPageHeader
          eyebrow="Sponsors"
          title="Sponsor Management"
          description="Track sponsor records, class placements, public visibility, and cancellation impact."
          primaryAction={
            <button
              type="button"
              onClick={resetSponsorForm}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
            >
              + Create Sponsor
            </button>
          }
        />

        {selectedSponsor && (
          <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
            {selectedSponsor.cover_image_url && (
              <div
                className="mb-4 h-36 overflow-hidden rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `url(${selectedSponsor.cover_image_url})` }}
              />
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-sm font-black text-indigo-700">
                  {selectedSponsor.logo_url ? <img src={selectedSponsor.logo_url} alt="" className="h-full w-full object-cover" /> : selectedSponsor.sponsor_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase text-indigo-600">Sponsor detail</p>
                  <h2 className="truncate text-xl font-black text-slate-950">{selectedSponsor.sponsor_name}</h2>
                  <p className="truncate text-sm font-semibold text-slate-500">{selectedSponsor.contact_person || selectedSponsor.email || selectedSponsor.phone || "No contact saved"}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedSponsor(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">
                Close
              </button>
            </div>
            {selectedSponsor.description && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">{selectedSponsor.description}</p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}

        {showSponsorTools && (
          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <form onSubmit={submitSponsor} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">{editingSponsorId ? "Edit sponsor" : "Add sponsor"}</h2>
                {editingSponsorId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSponsorId("");
                      setSponsorForm(sponsorFormInitial);
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50"
                  >
                    New sponsor
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-3">
                <input required value={sponsorForm.sponsorName} onChange={(e) => setSponsorForm((p) => ({ ...p, sponsorName: e.target.value }))} placeholder="Sponsor name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={sponsorForm.contactPerson} onChange={(e) => setSponsorForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                  <input value={sponsorForm.category} onChange={(e) => setSponsorForm((p) => ({ ...p, category: e.target.value }))} placeholder="Category" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={sponsorForm.email} onChange={(e) => setSponsorForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                  <input value={sponsorForm.phone} onChange={(e) => setSponsorForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                </div>
                <input value={sponsorForm.website} onChange={(e) => setSponsorForm((p) => ({ ...p, website: e.target.value }))} placeholder="Website" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={sponsorForm.logoUrl} onChange={(e) => setSponsorForm((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="Business logo URL" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                  <input value={sponsorForm.coverImageUrl} onChange={(e) => setSponsorForm((p) => ({ ...p, coverImageUrl: e.target.value }))} placeholder="Business cover image URL" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                </div>
                <textarea value={sponsorForm.description} onChange={(e) => setSponsorForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Description" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <textarea value={sponsorForm.notes} onChange={(e) => setSponsorForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Internal notes" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <button disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Saving..." : editingSponsorId ? "Update sponsor" : "Save sponsor"}
                </button>
              </div>
            </form>

            <form onSubmit={attachSponsor} className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Attach to class</h2>
              <div className="mt-4 grid gap-3">
                <select required value={attachForm.sponsorId} onChange={(e) => applySponsorDefaults(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400">
                  <option value="">Select sponsor</option>
                  {sponsors.map((sponsor) => (
                    <option key={sponsor.id} value={sponsor.id}>{sponsor.sponsor_name}</option>
                  ))}
                </select>
                <select required value={attachForm.classId} onChange={(e) => setAttachForm((p) => ({ ...p, classId: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400">
                  <option value="">Select class</option>
                  {businessClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.title}</option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="number" min="0" step="0.01" value={attachForm.sponsorAmount} onChange={(e) => setAttachForm((p) => ({ ...p, sponsorAmount: e.target.value }))} placeholder="Amount" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    {bizCurrency}
                  </div>
                </div>
                <select value={attachForm.paymentStatus} onChange={(e) => setAttachForm((p) => ({ ...p, paymentStatus: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400">
                  <option value="expected">Expected</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                  Show sponsor publicly
                  <input type="checkbox" checked={attachForm.showSponsorPublicly} onChange={(e) => setAttachForm((p) => ({ ...p, showSponsorPublicly: e.target.checked }))} />
                </label>
                <input value={attachForm.sponsorDisplayName} onChange={(e) => setAttachForm((p) => ({ ...p, sponsorDisplayName: e.target.value }))} placeholder="Public display name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={attachForm.sponsorLogoUrl} onChange={(e) => setAttachForm((p) => ({ ...p, sponsorLogoUrl: e.target.value }))} placeholder="Public logo URL" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                  <input value={attachForm.sponsorCoverImageUrl} onChange={(e) => setAttachForm((p) => ({ ...p, sponsorCoverImageUrl: e.target.value }))} placeholder="Public cover image URL" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                </div>
                <textarea value={attachForm.sponsorMessage} onChange={(e) => setAttachForm((p) => ({ ...p, sponsorMessage: e.target.value }))} rows={2} placeholder="Public sponsor message" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <input value={attachForm.reference} onChange={(e) => setAttachForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Internal payment/reference" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <button disabled={saving || sponsors.length === 0 || businessClasses.length === 0} className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Attach sponsor"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-6">
          <DataTable
            tableId="owner-sponsors"
            columns={SPONSOR_COLUMNS}
            searchQuery={search}
            onSearchQuery={setSearch}
            searchPlaceholder="Search sponsors..."
            summary={`${filteredSponsors.length} sponsor${filteredSponsors.length !== 1 ? "s" : ""}`}
            toolbar={
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            }
            emptyState={
              filteredSponsors.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  {sponsors.length === 0 ? "No sponsors yet." : "No sponsors match these filters."}
                </div>
              ) : undefined
            }
          >
            {(vis) => (
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr>
                    {vis.has("sponsor") && <Th>Sponsor name</Th>}
                    {vis.has("contact") && <Th>Contact</Th>}
                    {vis.has("classes") && <Th>Classes sponsored</Th>}
                    {vis.has("total") && <Th>Total sponsored</Th>}
                    {vis.has("visibility") && <Th>Public/private</Th>}
                    {vis.has("refund") && <Th>Refund/cancel</Th>}
                    {vis.has("impact") && <Th>Revenue/profit impact</Th>}
                    {vis.has("status") && <Th>Status</Th>}
                    {vis.has("actions") && <Th align="right">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSponsors.map((sponsor) => {
                    const stats = statsForSponsor(sponsor.id);
                    return (
                      <tr key={sponsor.id} className="hover:bg-slate-50">
                        {vis.has("sponsor") && (
                          <Td>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">
                                {sponsor.logo_url ? <img src={sponsor.logo_url} alt="" className="h-full w-full object-cover" /> : sponsor.sponsor_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-slate-900">{sponsor.sponsor_name}</p>
                                <p className="truncate text-xs text-slate-400">{sponsor.category || sponsor.website || "Sponsor"}</p>
                              </div>
                            </div>
                          </Td>
                        )}
                        {vis.has("contact") && <Td className="max-w-[14rem] truncate text-slate-600">{[sponsor.contact_person, sponsor.email, sponsor.phone].filter(Boolean).join(" / ") || "—"}</Td>}
                        {vis.has("classes") && <Td>{stats.classCount}</Td>}
                        {vis.has("total") && <Td>{formatCurrency(stats.totalSponsored, bizCurrency)}</Td>}
                        {vis.has("visibility") && <Td>{stats.publicCount} public / {stats.privateCount} private</Td>}
                        {vis.has("refund") && (
                          <Td>
                            <p className="text-xs font-bold text-slate-600">{stats.sponsorStatuses.join(", ") || "active"}</p>
                            {stats.refundTotal > 0 && (
                              <p className="text-xs text-rose-600">Refund {formatCurrency(stats.refundTotal, bizCurrency)}</p>
                            )}
                          </Td>
                        )}
                        {vis.has("impact") && (
                          <Td>
                            <p>{formatCurrency(stats.revenue, bizCurrency)} revenue</p>
                            <p className={stats.profit < 0 ? "text-xs font-bold text-rose-600" : "text-xs font-bold text-emerald-700"}>
                              {formatCurrency(stats.profit, bizCurrency)} profit
                            </p>
                          </Td>
                        )}
                        {vis.has("status") && (
                          <Td>
                            <OwnerStatusChip status={sponsor.status} />
                          </Td>
                        )}
                        {vis.has("actions") && (
                          <Td align="right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedSponsor(sponsor)}
                                className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                              >
                                View
                              </button>
                              <OwnerActionMenu>
                                <button type="button" onClick={() => editSponsor(sponsor)} className={ownerMenuItemClass}>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void setSponsorStatus(sponsor, sponsor.status === "active" ? "inactive" : "active")}
                                  className={`${ownerMenuItemClass} ${sponsor.status === "active" ? "text-rose-600 hover:text-rose-700" : ""}`}
                                >
                                  {sponsor.status === "active" ? "Archive" : "Activate"}
                                </button>
                              </OwnerActionMenu>
                            </div>
                          </Td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </DataTable>

          <DataTable
            tableId="owner-class-sponsorships"
            columns={CLASS_SPONSOR_COLUMNS}
            summary={`${classSponsors.length} class sponsorship${classSponsors.length !== 1 ? "s" : ""}`}
            emptyState={
              classSponsors.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  No class sponsorships yet.
                </div>
              ) : undefined
            }
          >
            {(vis) => (
              <table className="w-full min-w-[840px] text-sm">
                <thead>
                  <tr>
                    {vis.has("class") && <Th>Class</Th>}
                    {vis.has("sponsor") && <Th>Sponsor</Th>}
                    {vis.has("amount") && <Th>Amount</Th>}
                    {vis.has("payment") && <Th>Payment</Th>}
                    {vis.has("visibility") && <Th>Public</Th>}
                    {vis.has("cancellation") && <Th>Cancellation</Th>}
                  </tr>
                </thead>
                <tbody>
                  {classSponsors.map((item) => {
                    const snapshot = financeByClass[item.class_id];
                    const sponsorIncome = snapshot ? Number(snapshot.sponsor_income ?? item.sponsor_amount ?? 0) : Number(item.sponsor_amount ?? 0);
                    const grossRevenue = Number(snapshot?.gross_revenue ?? 0);
                    const contribution = grossRevenue > 0 ? Math.round((sponsorIncome / grossRevenue) * 100) : 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        {vis.has("class") && (
                          <Td>
                            <p className="font-bold text-slate-900">{joinedClass(item)?.title ?? "Class"}</p>
                            <p className="text-xs text-slate-400">{joinedClass(item)?.date ?? ""}</p>
                          </Td>
                        )}
                        {vis.has("sponsor") && <Td>{item.sponsor_display_name || joinedSponsor(item)?.sponsor_name || "Sponsor"}</Td>}
                        {vis.has("amount") && (
                          <Td>
                            {formatCurrency(sponsorIncome, bizCurrency)}
                            <span className="mt-0.5 block text-xs font-medium text-slate-400">
                              {contribution}% of class revenue
                            </span>
                          </Td>
                        )}
                        {vis.has("payment") && (
                          <Td>
                            <OwnerStatusChip status={item.payment_status} />
                          </Td>
                        )}
                        {vis.has("visibility") && (
                          <Td>
                            <OwnerStatusChip status={item.show_sponsor_publicly ? "active" : "inactive"} />
                          </Td>
                        )}
                        {vis.has("cancellation") && (
                          <Td>
                            <p className="text-xs font-bold text-slate-600">{item.sponsor_status ?? "active"}</p>
                            {(item.sponsor_refund_amount ?? 0) > 0 && (
                              <p className="text-xs text-rose-600">Refund {formatCurrency(item.sponsor_refund_amount ?? 0, bizCurrency)}</p>
                            )}
                          </Td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </DataTable>
        </div>
      </div>
    </main>
  );
}
