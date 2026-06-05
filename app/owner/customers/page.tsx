"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { OwnerPageHeader } from "@/components/OwnerUI";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RetentionStatus = "new" | "repeat" | "at_risk" | "churned";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  lastBookingDate: string | null;
  retentionStatus: RetentionStatus;
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  warning?: string;
}

interface CustomerDetail {
  bookings?: Array<{ id: string; classTitle?: string; bookingStatus?: string; paymentStatus?: string; amount?: number }>;
  attendees?: Array<{ id: string; attendee_name?: string; attendee_email?: string | null; attendee_type?: string; attendance_status?: string | null }>;
  linkedIdentities?: Array<{ id: string; identity_type?: string; identity_value?: string; normalized_value?: string }>;
  formResponses?: Array<{ id: string; booking_id?: string; field_label?: string; response_value?: string | number | boolean | null }>;
  refundHistory?: Array<{ id: string; refund_status?: string; refund_amount?: number; retained_amount?: number }>;
}

// ---------------------------------------------------------------------------
// Retention badge
// ---------------------------------------------------------------------------

const RETENTION_STYLES: Record<RetentionStatus, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-blue-100", text: "text-blue-700", label: "New" },
  repeat: { bg: "bg-green-100", text: "text-green-700", label: "Repeat" },
  at_risk: { bg: "bg-amber-100", text: "text-amber-700", label: "At Risk" },
  churned: { bg: "bg-red-100", text: "text-red-600", label: "Churned" },
};

function RetentionBadge({ status }: { status: RetentionStatus }) {
  const s = RETENTION_STYLES[status] ?? RETENTION_STYLES.new;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Slide-over panel
// ---------------------------------------------------------------------------

function CustomerSlideOver({
  customer,
  businessId,
  onClose,
}: {
  customer: Customer;
  businessId: string;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDetail(null);
      setDetailError(null);
      fetch(`/api/owner/customers/${customer.id}?businessId=${businessId}`)
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!active) return;
          if (!response.ok) {
            setDetailError(data.error ?? "Customer detail could not be loaded.");
            return;
          }
          setDetail(data);
        })
        .catch(() => {
          if (active) setDetailError("Customer detail could not be loaded.");
        });
    });
    return () => {
      active = false;
    };
  }, [businessId, customer.id]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
              Customer Detail
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{customer.name || "Unknown customer"}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-0.5 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Retention badge */}
          <div className="mb-6">
            <RetentionBadge status={customer.retentionStatus} />
          </div>

          {/* Details grid */}
          <dl className="space-y-4">
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Email
              </dt>
              <dd className="mt-0.5 break-all text-sm font-medium text-gray-900">
                {customer.email || "Unknown email"}
              </dd>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Phone
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {customer.phone || "Unknown phone"}
              </dd>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Total Bookings
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {customer.totalBookings}
              </dd>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Last Booking
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {formatDate(customer.lastBookingDate)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-5">
            {detailError && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                {detailError}
              </p>
            )}
            {!detail && !detailError && (
              <p className="text-sm text-gray-400">Loading customer history...</p>
            )}
            {detail && (
              <>
                <section>
                  <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">
                    Linked identities
                  </h3>
                  <div className="mt-2 space-y-2">
                    {(detail.linkedIdentities ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400">No linked identities yet.</p>
                    ) : (
                      (detail.linkedIdentities ?? []).map((identity) => (
                        <div key={identity.id} className="rounded-xl bg-gray-50 px-3 py-2 text-sm">
                          <span className="font-bold capitalize text-gray-700">{identity.identity_type}</span>
                          <span className="ml-2 break-all text-gray-500">
                            {identity.identity_value ?? identity.normalized_value}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">
                    Bookings
                  </h3>
                  <div className="mt-2 space-y-2">
                    {(detail.bookings ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400">No bookings found.</p>
                    ) : (
                      (detail.bookings ?? []).slice(0, 6).map((booking) => (
                        <div key={booking.id} className="rounded-xl bg-gray-50 px-3 py-2 text-sm">
                          <p className="font-bold text-gray-800">{booking.classTitle ?? "Class"}</p>
                          <p className="text-xs text-gray-500">
                            {booking.bookingStatus} · {booking.paymentStatus} · ₹{Number(booking.amount ?? 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">
                    Attendance and guests
                  </h3>
                  <div className="mt-2 space-y-2">
                    {(detail.attendees ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400">No attendance records yet.</p>
                    ) : (
                      (detail.attendees ?? []).slice(0, 8).map((attendee) => (
                        <div key={attendee.id} className="rounded-xl bg-gray-50 px-3 py-2 text-sm">
                          <p className="font-bold text-gray-800">{attendee.attendee_name}</p>
                          <p className="text-xs text-gray-500">
                            {attendee.attendee_type} · {attendee.attendance_status ?? "pending"}
                            {attendee.attendee_email ? ` · ${attendee.attendee_email}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">
                    Form responses
                  </h3>
                  <div className="mt-2 space-y-2">
                    {(detail.formResponses ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400">No form responses yet.</p>
                    ) : (
                      (detail.formResponses ?? []).slice(0, 10).map((response) => (
                        <div key={response.id} className="rounded-xl bg-gray-50 px-3 py-2 text-sm">
                          <p className="font-bold text-gray-800">{response.field_label ?? "Question"}</p>
                          <p className="text-xs text-gray-500">
                            {String(response.response_value ?? "No response")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {(detail.refundHistory ?? []).length > 0 && (
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-wide text-gray-400">
                      Refunds
                    </h3>
                    <div className="mt-2 space-y-2">
                      {(detail.refundHistory ?? []).map((refund) => (
                        <div key={refund.id} className="rounded-xl bg-gray-50 px-3 py-2 text-sm">
                          <p className="font-bold text-gray-800">{refund.refund_status}</p>
                          <p className="text-xs text-gray-500">
                            Refund ₹{Number(refund.refund_amount ?? 0).toLocaleString("en-IN")} · Retained ₹{Number(refund.retained_amount ?? 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export default function OwnerCustomersPage() {
  const { currentBusiness, loading: storeLoading } = useAppStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [retentionFilter, setRetentionFilter] = useState<"all" | RetentionStatus>("all");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch customers whenever businessId, page, or search changes
  useEffect(() => {
    if (!currentBusiness) return;
    let active = true;

    const params = new URLSearchParams({
      businessId: currentBusiness.id,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    }

    queueMicrotask(() => {
      if (!active) return;
      setFetchLoading(true);
      setError(null);
      setWarning(null);

      fetch(`/api/owner/customers?${params.toString()}`)
        .then(async (res) => {
          const data: CustomersResponse = await res.json();
          if (!active) return;
          if (!res.ok) {
            setError((data as { error?: string }).error ?? "Failed to load customers.");
            return;
          }
          setCustomers(data.customers ?? []);
          setTotal(data.total ?? 0);
          if (data.warning) setWarning(data.warning);
        })
        .catch(() => {
          if (active) setError("Network error — could not load customers.");
        })
        .finally(() => {
          if (active) setFetchLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [currentBusiness?.id, page, debouncedSearch]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visibleCustomers = customers.filter((customer) =>
    retentionFilter === "all" ? true : customer.retentionStatus === retentionFilter
  );

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ---------------------------------------------------------------------------
  // Loading state (store still hydrating)
  // ---------------------------------------------------------------------------

  if (storeLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <OwnerPageHeader
            eyebrow="Customers"
            title="Customer Management"
            description={
              total > 0
                ? `${total} customer${total !== 1 ? "s" : ""} across all bookings`
                : "Manage and review your customer base."
            }
            primaryAction={
              <Link
                href="/owner/bookings"
                className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
              >
                View bookings
              </Link>
            }
          />

          {/* Missing-table info banner */}
          {warning && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
                />
              </svg>
              <span>Customer profiles will populate as bookings are made.</span>
            </div>
          )}

          {/* Main content panel */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
              <div className="relative flex-1 max-w-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
                  />
                </svg>
                <input
                  type="search"
                  placeholder="Search by name, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-9 pr-4 text-sm text-gray-900 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
                />
              </div>
              {fetchLoading && (
                <span className="text-xs text-gray-400">Loading...</span>
              )}
              <select
                value={retentionFilter}
                onChange={(event) => setRetentionFilter(event.target.value as "all" | RetentionStatus)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
              >
                <option value="all">All retention</option>
                <option value="new">New</option>
                <option value="repeat">Repeat</option>
                <option value="at_risk">At risk</option>
                <option value="churned">Churned</option>
              </select>
              <span className="ml-auto text-xs text-gray-400">
                {visibleCustomers.length} shown
              </span>
            </div>

            {/* Error state */}
            {error && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm font-medium text-red-600">{error}</p>
                <button
                  onClick={() => setPage((p) => p)}
                  className="mt-3 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!error && !fetchLoading && visibleCustomers.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-medium text-gray-700">
                  {debouncedSearch ? "No customers match your search." : "No customers yet."}
                </p>
                {!debouncedSearch && (
                  <p className="mt-1 text-sm text-gray-500">
                    Customer profiles will appear here once bookings are made.
                  </p>
                )}
                {debouncedSearch && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-3 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* Table — desktop */}
            {!error && visibleCustomers.length > 0 && (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Bookings
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Last Booking
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {visibleCustomers.map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{c.name || "Unknown customer"}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{c.email || "Unknown email"}</td>
                          <td className="px-4 py-4 text-gray-600">{c.phone || "Unknown phone"}</td>
                          <td className="px-4 py-4 text-right font-semibold text-gray-900">
                            {c.totalBookings}
                          </td>
                          <td className="px-4 py-4 text-gray-500">
                            {formatDate(c.lastBookingDate)}
                          </td>
                          <td className="px-4 py-4">
                            <RetentionBadge status={c.retentionStatus} />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => setSelected(c)}
                              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Card list — mobile */}
                <div className="divide-y divide-gray-100 sm:hidden">
                  {visibleCustomers.map((c) => (
                    <div key={c.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">{c.name || "Unknown customer"}</p>
                          <p className="truncate text-xs text-gray-500">{c.email || "Unknown email"}</p>
                          <p className="text-xs text-gray-400">{c.phone || "Unknown phone"}</p>
                        </div>
                        <RetentionBadge status={c.retentionStatus} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {c.totalBookings} booking{c.totalBookings !== 1 ? "s" : ""} &middot; Last:{" "}
                          {formatDate(c.lastBookingDate)}
                        </span>
                        <button
                          onClick={() => setSelected(c)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                    <p className="text-xs text-gray-500">
                      Page {page} of {totalPages} &middot; {total} total
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Slide-over */}
      {selected && currentBusiness && (
        <CustomerSlideOver
          customer={selected}
          businessId={currentBusiness.id}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
