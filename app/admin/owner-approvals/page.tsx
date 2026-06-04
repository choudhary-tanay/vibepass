"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface BusinessRow {
  id: string;
  business_name: string;
  category: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  description: string | null;
  status: string;
  created_at: string;
  rejection_reason: string | null;
  suspension_reason: string | null;
  review_requested: boolean;
  review_request_note: string | null;
  review_requested_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  suspended: "bg-orange-100 text-orange-700",
  archived: "bg-gray-100 text-gray-500",
};

type Tab = "pending" | "review_requests" | "all";

function ReasonModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: "reject" | "suspend";
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-black text-slate-950">
          {action === "reject" ? "Reject Business" : "Suspend Business"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This reason will be shown to the business owner.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            action === "reject"
              ? "Why is this business being rejected?"
              : "Why is this business being suspended?"
          }
          rows={4}
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400"
        />
        <p className="mt-2 text-xs text-slate-400">A reason is required — it will be shown to the owner.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className={`rounded-full px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 ${
              action === "reject"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {action === "reject" ? "Reject" : "Suspend"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerApprovalsPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; action: "reject" | "suspend" } | null>(null);

  async function load() {
    const { data } = await supabase
      .from("businesses")
      .select(
        "id, business_name, category, email, phone, location, description, status, created_at, rejection_reason, suspension_reason, review_requested, review_request_note, review_requested_at"
      )
      .order("created_at", { ascending: false });

    setBusinesses((data as BusinessRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    if (tab === "pending") return businesses.filter((b) => b.status === "pending_approval");
    if (tab === "review_requests")
      return businesses.filter(
        (b) => b.review_requested && (b.status === "suspended" || b.status === "rejected")
      );
    return businesses;
  }, [businesses, tab]);

  const reviewRequestCount = useMemo(
    () =>
      businesses.filter(
        (b) => b.review_requested && (b.status === "suspended" || b.status === "rejected")
      ).length,
    [businesses]
  );

  const pendingCount = useMemo(
    () => businesses.filter((b) => b.status === "pending_approval").length,
    [businesses]
  );

  async function updateStatus(
    id: string,
    status: string,
    options?: { rejectionReason?: string; suspensionReason?: string }
  ) {
    setActionLoading(id);
    setError(null);
    const res = await fetch(`/api/admin/businesses/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...options }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update owner approval.");
    } else {
      await load();
    }
    setActionLoading(null);
    setModal(null);
  }

  function openModal(id: string, action: "reject" | "suspend") {
    setModal({ id, action });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading owner approvals...</p>
      </div>
    );
  }

  return (
    <div>
      {modal && (
        <ReasonModal
          action={modal.action}
          onCancel={() => setModal(null)}
          onConfirm={(reason) => {
            if (modal.action === "reject") {
              void updateStatus(modal.id, "rejected", { rejectionReason: reason });
            } else {
              void updateStatus(modal.id, "suspended", { suspensionReason: reason });
            }
          }}
        />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Owner Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review new businesses and handle re-review requests from suspended/rejected owners.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["pending", `Pending (${pendingCount})`],
            ["review_requests", `Re-Review Requests (${reviewRequestCount})`],
            ["all", "All businesses"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              tab === value
                ? "bg-slate-950 text-white"
                : value === "review_requests" && reviewRequestCount > 0
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filtered.map((business) => (
          <article key={business.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      STATUS_STYLES[business.status] ?? "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {business.status.replace(/_/g, " ")}
                  </span>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-700">
                    {business.category}
                  </span>
                  {business.review_requested && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                      Re-review requested
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-lg font-black text-slate-950">
                  {business.business_name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {business.location || "No location"} &middot;{" "}
                  {business.email || "No email"}
                  {business.phone ? ` · ${business.phone}` : ""}
                </p>
                {business.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {business.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  Submitted {new Date(business.created_at).toLocaleDateString("en-IN")}
                </p>

                {/* Owner's re-review note */}
                {business.review_request_note && (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase text-amber-600">
                      Owner note
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      {business.review_request_note}
                    </p>
                    {business.review_requested_at && (
                      <p className="mt-1 text-xs text-amber-600">
                        Requested{" "}
                        {new Date(business.review_requested_at).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                )}

                {/* Admin rejection/suspension reason */}
                {business.rejection_reason && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase text-red-600">
                      Rejection reason (visible to owner)
                    </p>
                    <p className="mt-1 text-sm text-red-800">{business.rejection_reason}</p>
                  </div>
                )}
                {business.suspension_reason && (
                  <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase text-orange-600">
                      Suspension reason (visible to owner)
                    </p>
                    <p className="mt-1 text-sm text-orange-800">{business.suspension_reason}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                {business.status !== "active" && (
                  <button
                    onClick={() => void updateStatus(business.id, "active")}
                    disabled={actionLoading === business.id}
                    className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {business.review_requested ? "Approve & Restore" : "Approve"}
                  </button>
                )}
                {business.status !== "rejected" && (
                  <button
                    onClick={() => openModal(business.id, "reject")}
                    disabled={actionLoading === business.id}
                    className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
                {business.status !== "suspended" && business.status !== "archived" && (
                  <button
                    onClick={() => openModal(business.id, "suspend")}
                    disabled={actionLoading === business.id}
                    className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
                {business.status !== "archived" && (
                  <button
                    onClick={() => void updateStatus(business.id, "archived")}
                    disabled={actionLoading === business.id}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              {tab === "pending"
                ? "No pending approvals."
                : tab === "review_requests"
                ? "No re-review requests."
                : "No businesses found."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
