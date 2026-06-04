"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface BusinessOption {
  id: string;
  business_name: string;
  status: string;
}

const roles = [
  { value: "customer", label: "Customer" },
  { value: "owner", label: "Business / Owner" },
  { value: "staff", label: "Staff via invite" },
  { value: "admin", label: "Admin" },
];

export default function AdminCreateUserPage() {
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "customer",
    businessId: "",
    inviteNote: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("id, business_name, status")
      .order("business_name")
      .then(({ data }) => {
        setBusinesses((data as BusinessOption[]) ?? []);
      });
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setWarning(null);

    const res = await fetch("/api/admin/user-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Could not create this invite.");
      setLoading(false);
      return;
    }

    setMessage("Invite saved. If Supabase email invites are configured, the email was sent too.");
    setWarning(data.warning ?? null);
    setForm({
      fullName: "",
      email: "",
      phone: "",
      role: "customer",
      businessId: "",
      inviteNote: "",
    });
    setLoading(false);
  }

  const needsBusiness = form.role === "owner" || form.role === "staff";

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add User</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a safe invite record for customers, owners, staff, or admins.
          </p>
        </div>
        <Link
          href="/admin/users"
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Back to users
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name">
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Priya Sharma"
                className={inputClass}
              />
            </Field>

            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="person@example.com"
                className={inputClass}
              />
            </Field>

            <Field label="Phone">
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className={inputClass}
              />
            </Field>

            <Field label="Role">
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className={inputClass}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </Field>

            {needsBusiness && (
              <div className="sm:col-span-2">
                <Field label="Business assignment">
                  <select
                    name="businessId"
                    required
                    value={form.businessId}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Choose business</option>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.business_name} ({business.status})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            <div className="sm:col-span-2">
              <Field label="Internal note">
                <textarea
                  name="inviteNote"
                  value={form.inviteNote}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Why this user is being added, invite context, or next step."
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
          {warning && (
            <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              Invite saved, but Supabase email invite returned: {warning}
            </p>
          )}
          {message && (
            <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Creating invite..." : "Create invite"}
          </button>
        </form>

        <aside className="h-fit rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-teal-200">
            Safe user creation
          </p>
          <h2 className="mt-2 text-xl font-black">Invite flow first</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            This screen stores an admin invite and attempts Supabase Auth email
            invite for non-staff roles. Direct password creation should stay on
            the server only.
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Staff invites are documented here and connect to the Phase 12 staff
            portal invite flow later.
          </p>
        </aside>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
