"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";

interface SponsorRow {
  id: string;
  sponsor_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
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
  sponsor_message?: string | null;
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
  sponsorMessage: "",
  reference: "",
  note: "",
};

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
    }));
  }

  async function submitSponsor(event: React.FormEvent) {
    event.preventDefault();
    if (!currentBusiness) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const response = await fetch("/api/owner/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sponsorForm, businessId: currentBusiness.id }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save sponsor.");
      return;
    }
    setSponsorForm(sponsorFormInitial);
    setSuccess("Sponsor saved.");
    await loadSponsors();
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/owner/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Sponsors</h1>
            <p className="text-sm text-slate-500">Manage sponsor records and public class sponsor placement.</p>
          </div>
          <Link href="/owner/classes" className="rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
            Classes
          </Link>
        </div>

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

        <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="grid gap-6">
            <form onSubmit={submitSponsor} className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Add sponsor</h2>
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
                <input value={sponsorForm.logoUrl} onChange={(e) => setSponsorForm((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="Logo URL" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <textarea value={sponsorForm.description} onChange={(e) => setSponsorForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Description" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <textarea value={sponsorForm.notes} onChange={(e) => setSponsorForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Internal notes" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <button disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Saving..." : "Save sponsor"}
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
                <input value={attachForm.sponsorLogoUrl} onChange={(e) => setAttachForm((p) => ({ ...p, sponsorLogoUrl: e.target.value }))} placeholder="Public logo URL" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <textarea value={attachForm.sponsorMessage} onChange={(e) => setAttachForm((p) => ({ ...p, sponsorMessage: e.target.value }))} rows={2} placeholder="Public sponsor message" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <input value={attachForm.reference} onChange={(e) => setAttachForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Internal payment/reference" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <button disabled={saving || sponsors.length === 0 || businessClasses.length === 0} className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Attach sponsor"}
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Sponsor directory</h2>
              <div className="mt-4 grid gap-3">
                {sponsors.map((sponsor) => (
                  <div key={sponsor.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700">
                          {sponsor.logo_url ? <img src={sponsor.logo_url} alt="" className="h-full w-full object-cover" /> : sponsor.sponsor_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900">{sponsor.sponsor_name}</p>
                          <p className="truncate text-xs text-slate-400">{[sponsor.contact_person, sponsor.email, sponsor.phone].filter(Boolean).join(" / ") || "No contact details"}</p>
                          {sponsor.website && (
                            <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs font-bold text-indigo-600 hover:text-indigo-800">
                              {sponsor.website}
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void setSponsorStatus(sponsor, sponsor.status === "active" ? "inactive" : "active")}
                        className={`rounded-full px-3 py-1 text-xs font-black ${sponsor.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {sponsor.status}
                      </button>
                    </div>
                  </div>
                ))}
                {sponsors.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
                    No sponsors yet.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Class sponsorships</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[740px] text-sm">
                  <thead className="border-b border-slate-100 text-left text-xs font-black uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-3">Class</th>
                      <th className="px-3 py-3">Sponsor</th>
                      <th className="px-3 py-3">Amount</th>
                      <th className="px-3 py-3">Payment</th>
                      <th className="px-3 py-3">Public</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {classSponsors.map((item) => {
                      const snapshot = financeByClass[item.class_id];
                      const sponsorIncome = snapshot ? Number(snapshot.sponsor_income ?? 0) : 0;
                      const grossRevenue = Number(snapshot?.gross_revenue ?? 0);
                      const contribution = grossRevenue > 0 ? Math.round((sponsorIncome / grossRevenue) * 100) : 0;
                      return (
                      <tr key={item.id}>
                        <td className="px-3 py-4">
                          <p className="font-bold text-slate-900">{joinedClass(item)?.title ?? "Class"}</p>
                          <p className="text-xs text-slate-400">{joinedClass(item)?.date ?? ""}</p>
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-slate-600">
                          {item.sponsor_display_name || joinedSponsor(item)?.sponsor_name || "Sponsor"}
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-slate-600">
                          {formatCurrency(sponsorIncome, bizCurrency)}
                          <span className="mt-0.5 block text-xs font-medium text-slate-400">
                            {contribution}% of class revenue
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                            {item.payment_status}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${item.show_sponsor_publicly ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {item.show_sponsor_publicly ? "shown" : "hidden"}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                    {classSponsors.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400">
                          No class sponsorships yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
