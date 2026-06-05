"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";
import DataTable, { Td, Th, type ColDef } from "@/components/DataTable";
import { OwnerActionMenu, OwnerPageHeader, OwnerStatusChip, ownerMenuItemClass } from "@/components/OwnerUI";

interface VenueRow {
  id: string;
  venue_name: string;
  address?: string | null;
  location_type: string;
  capacity?: number | null;
  default_cost: number;
  currency: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  facilities?: string[] | null;
  notes?: string | null;
  visibility: string;
  status: string;
  finance?: {
    usageCount: number;
    revenue: number;
    profit: number;
    venueCost: number;
    roiPercent: number;
  };
}

const emptyForm = {
  venueName: "",
  address: "",
  locationType: "in_person",
  capacity: "",
  defaultCost: "0",
  currency: "INR",
  contactPerson: "",
  phone: "",
  email: "",
  facilities: "",
  notes: "",
};

const VENUE_COLUMNS: ColDef[] = [
  { key: "venue", label: "Venue name", fixed: true },
  { key: "location", label: "Location" },
  { key: "type", label: "Type" },
  { key: "capacity", label: "Capacity" },
  { key: "cost", label: "Default cost" },
  { key: "classes", label: "Classes" },
  { key: "revenue", label: "Revenue" },
  { key: "profit", label: "Profit" },
  { key: "roi", label: "ROI" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", fixed: true },
];

export default function OwnerVenuesPage() {
  const { currentBusiness, loading } = useAppStore();
  const bizCurrency = getOperatingCurrency(currentBusiness);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<VenueRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadVenues() {
    if (!currentBusiness) return;
    const response = await fetch(`/api/owner/venues?businessId=${currentBusiness.id}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not load venues.");
      return;
    }
    setVenues((data.venues ?? []) as VenueRow[]);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (active) await loadVenues();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id]);

  async function submitVenue(event: React.FormEvent) {
    event.preventDefault();
    if (!currentBusiness) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/owner/venues", {
      method: editingVenueId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        businessId: currentBusiness.id,
        venueId: editingVenueId || undefined,
        capacity: form.capacity ? Number(form.capacity) : null,
        defaultCost: Number(form.defaultCost || 0),
        currency: bizCurrency,
        facilities: form.facilities.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save venue.");
      return;
    }
    setForm(emptyForm);
    setEditingVenueId("");
    setShowCreateVenue(false);
    await loadVenues();
  }

  function editVenue(venue: VenueRow) {
    setEditingVenueId(venue.id);
    setForm({
      venueName: venue.venue_name,
      address: venue.address ?? "",
      locationType: venue.location_type,
      capacity: venue.capacity ? String(venue.capacity) : "",
      defaultCost: String(venue.default_cost ?? 0),
      currency: venue.currency ?? bizCurrency,
      contactPerson: venue.contact_person ?? "",
      phone: venue.phone ?? "",
      email: venue.email ?? "",
      facilities: Array.isArray(venue.facilities) ? venue.facilities.join(", ") : "",
      notes: venue.notes ?? "",
    });
    setShowCreateVenue(true);
  }

  function resetVenueForm() {
    setEditingVenueId("");
    setForm(emptyForm);
    setShowCreateVenue((value) => !value);
  }

  async function setVenueStatus(venue: VenueRow, status: "active" | "inactive") {
    if (!currentBusiness) return;
    await fetch("/api/owner/venues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: currentBusiness.id, venueId: venue.id, status }),
    });
    await loadVenues();
  }

  if (loading) {
    return <main className="min-h-screen px-6 py-10 text-sm text-slate-400">Loading...</main>;
  }

  if (!currentBusiness) {
    return <main className="min-h-screen px-6 py-10 text-sm text-slate-500">No business found.</main>;
  }

  const filteredVenues = venues.filter((venue) => {
    const needle = search.trim().toLowerCase();
    if (statusFilter !== "all" && venue.status !== statusFilter) return false;
    if (!needle) return true;
    return [
      venue.venue_name,
      venue.address ?? "",
      venue.location_type,
      venue.contact_person ?? "",
      venue.email ?? "",
      venue.phone ?? "",
    ].some((value) => value.toLowerCase().includes(needle));
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <OwnerPageHeader
          eyebrow="Venues"
          title="Venue Management"
          description="Manage reusable spaces, default costs, utilization, and venue ROI."
          primaryAction={
            <button
              type="button"
              onClick={resetVenueForm}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
            >
              + Create Venue
            </button>
          }
        />

        {selectedVenue && (
          <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-indigo-600">Venue detail</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{selectedVenue.venue_name}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{selectedVenue.address || "No address saved"}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVenue(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Type</p><p className="font-black capitalize text-slate-900">{selectedVenue.location_type.replace("_", " ")}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Capacity</p><p className="font-black text-slate-900">{selectedVenue.capacity ?? "Not set"}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Classes</p><p className="font-black text-slate-900">{selectedVenue.finance?.usageCount ?? 0}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">ROI</p><p className="font-black text-slate-900">{selectedVenue.finance?.roiPercent ?? 0}%</p></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {showCreateVenue && (
          <form onSubmit={submitVenue} className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">{editingVenueId ? "Edit venue" : "Add venue"}</h2>
              {editingVenueId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVenueId("");
                    setForm(emptyForm);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  New venue
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <input required value={form.venueName} onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))} placeholder="Venue name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={form.locationType} onChange={(e) => setForm((p) => ({ ...p, locationType: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400">
                  <option value="in_person">In person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <input type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="Capacity" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="number" min="0" step="0.01" value={form.defaultCost} onChange={(e) => setForm((p) => ({ ...p, defaultCost: e.target.value }))} placeholder="Default cost" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  {bizCurrency}
                </div>
              </div>
              <input value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              </div>
              <input value={form.facilities} onChange={(e) => setForm((p) => ({ ...p, facilities: e.target.value }))} placeholder="Facilities, comma-separated" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notes" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 lg:col-span-3" />
              <button disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
                {saving ? "Saving..." : editingVenueId ? "Update venue" : "Save venue"}
              </button>
            </div>
          </form>
        )}

        <DataTable
          tableId="owner-venues"
          columns={VENUE_COLUMNS}
          searchQuery={search}
          onSearchQuery={setSearch}
          searchPlaceholder="Search venues..."
          summary={`${filteredVenues.length} venue${filteredVenues.length !== 1 ? "s" : ""}`}
          toolbar={
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          }
          emptyState={
            filteredVenues.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {venues.length === 0 ? "No venues yet." : "No venues match these filters."}
              </div>
            ) : undefined
          }
        >
          {(vis) => (
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr>
                  {vis.has("venue") && <Th>Venue name</Th>}
                  {vis.has("location") && <Th>Location</Th>}
                  {vis.has("type") && <Th>Type</Th>}
                  {vis.has("capacity") && <Th>Capacity</Th>}
                  {vis.has("cost") && <Th>Default cost</Th>}
                  {vis.has("classes") && <Th>Classes</Th>}
                  {vis.has("revenue") && <Th>Revenue</Th>}
                  {vis.has("profit") && <Th>Profit</Th>}
                  {vis.has("roi") && <Th>ROI</Th>}
                  {vis.has("status") && <Th>Status</Th>}
                  {vis.has("actions") && <Th align="right">Actions</Th>}
                </tr>
              </thead>
              <tbody>
                {filteredVenues.map((venue) => (
                  <tr key={venue.id} className="hover:bg-slate-50">
                    {vis.has("venue") && (
                      <Td>
                        <p className="font-black text-slate-900">{venue.venue_name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{venue.contact_person || venue.email || venue.phone || "No contact"}</p>
                      </Td>
                    )}
                    {vis.has("location") && <Td className="max-w-[14rem] truncate text-slate-600">{venue.address || "—"}</Td>}
                    {vis.has("type") && <Td className="capitalize text-slate-600">{venue.location_type.replace("_", " ")}</Td>}
                    {vis.has("capacity") && <Td>{venue.capacity ?? "—"}</Td>}
                    {vis.has("cost") && <Td>{formatCurrency(Number(venue.default_cost ?? 0), bizCurrency)}</Td>}
                    {vis.has("classes") && <Td>{venue.finance?.usageCount ?? 0}</Td>}
                    {vis.has("revenue") && <Td>{formatCurrency(venue.finance?.revenue ?? 0, bizCurrency)}</Td>}
                    {vis.has("profit") && (
                      <Td className={(venue.finance?.profit ?? 0) < 0 ? "font-bold text-red-600" : "font-bold text-emerald-700"}>
                        {formatCurrency(venue.finance?.profit ?? 0, bizCurrency)}
                      </Td>
                    )}
                    {vis.has("roi") && <Td>{venue.finance?.roiPercent ?? 0}%</Td>}
                    {vis.has("status") && (
                      <Td>
                        <OwnerStatusChip status={venue.status} />
                      </Td>
                    )}
                    {vis.has("actions") && (
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedVenue(venue)}
                            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                          >
                            View
                          </button>
                          <OwnerActionMenu>
                            <button type="button" onClick={() => editVenue(venue)} className={ownerMenuItemClass}>
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void setVenueStatus(venue, venue.status === "active" ? "inactive" : "active")}
                              className={`${ownerMenuItemClass} ${venue.status === "active" ? "text-rose-600 hover:text-rose-700" : ""}`}
                            >
                              {venue.status === "active" ? "Archive" : "Activate"}
                            </button>
                          </OwnerActionMenu>
                        </div>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTable>
      </div>
    </main>
  );
}
