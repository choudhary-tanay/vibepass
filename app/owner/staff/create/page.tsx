"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { StaffRole } from "@/types";
import { useAppStore } from "@/lib/appStore";
import { supabase } from "@/lib/supabaseClient";
import { Select } from "@/components/CustomSelect";

const DEFAULT_ROLES: { value: string; label: string }[] = [
  { value: "instructor", label: "Instructor" },
  { value: "trainer", label: "Trainer" },
  { value: "assistant", label: "Assistant" },
  { value: "manager", label: "Manager" },
];

const ROLE_COLOR = "#6366f1";

function roleOption(roleName: string, color?: string) {
  return { value: roleName, label: roleName, color };
}

export default function CreateStaffPage() {
  const { addStaff, currentBusiness, loading } = useAppStore();
  const [customRoles, setCustomRoles] = useState(DEFAULT_ROLES);

  useEffect(() => {
    if (!currentBusiness) return;
    supabase
      .from("business_staff_roles")
      .select("role_name, color")
      .eq("business_id", currentBusiness.id)
      .order("role_name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const loaded = data.map((r) => roleOption(r.role_name, r.color ?? undefined));
          const merged = [...DEFAULT_ROLES];
          for (const role of loaded) {
            if (!merged.some((item) => item.value.toLowerCase() === role.value.toLowerCase())) {
              merged.push(role);
            }
          }
          setCustomRoles(merged);
        }
      });
  }, [currentBusiness?.id]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "instructor" as StaffRole,
    userGroup: "instructor" as "instructor" | "management",
  });
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // After staff is added
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [addedName, setAddedName] = useState("");
  const [copied, setCopied] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "name") setNameError("");
  }

  async function createCustomRole(label: string) {
    const roleName = label.trim();
    if (!roleName || !currentBusiness) return roleName;

    const { error } = await supabase.from("business_staff_roles").insert({
      business_id: currentBusiness.id,
      role_name: roleName,
      color: ROLE_COLOR,
    });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      console.error("Failed to save custom role:", error);
    }

    setCustomRoles((prev) => {
      if (prev.some((item) => item.value.toLowerCase() === roleName.toLowerCase())) return prev;
      return [...prev, roleOption(roleName, ROLE_COLOR)];
    });

    return roleName;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) { setSaveError("No business found."); return; }
    if (!form.name.trim()) { setNameError("Name is required."); return; }

    setSaving(true);
    setSaveError("");

    const ok = await addStaff({
      businessId: currentBusiness.id,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      userGroup: form.userGroup,
      status: "active",
    });

    if (!ok) {
      setSaveError("Failed to add staff member. Please try again.");
      setSaving(false);
      return;
    }

    // If email provided, auto-generate invite link
    if (form.email.trim()) {
      const res = await fetch("/api/owner/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
                  email: form.email.trim(),
                  role: form.role,
          businessId: currentBusiness.id,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setInviteUrl(d.inviteUrl);
      }
    }

    setAddedName(form.name.trim());
    setSaving(false);
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-lg"><p className="text-slate-400">Loading…</p></div>
      </main>
    );
  }

  // Success state — staff added
  if (addedName) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl">
              ✓
            </div>
            <h2 className="text-2xl font-black text-slate-900">{addedName} added!</h2>

            {inviteUrl ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  Share this invite link with them so they can set up their password and access the staff portal.
                </p>
                <div className="mt-4 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-indigo-600">
                    Invite Link (expires in 7 days)
                  </p>
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-indigo-100">
                    <code className="flex-1 overflow-auto break-all text-xs text-slate-700">
                      {inviteUrl}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                        copied ? "bg-green-500 text-white" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      }`}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-indigo-600">
                    Send via WhatsApp, email, or any messaging app. They&apos;ll create their password there.
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Staff member added. No email provided — use{" "}
                <Link href="/owner/staff/invite" className="text-indigo-600 hover:underline font-semibold">
                  Invite via Link
                </Link>{" "}
                if you want to send them a portal invite later.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Link
                href="/owner/staff"
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-center text-sm font-black text-white hover:bg-indigo-700"
              >
                View All Staff
              </Link>
              <button
                onClick={() => {
                  setForm({ name: "", email: "", phone: "", role: "instructor", userGroup: "instructor" });
                  setInviteUrl(null);
                  setAddedName("");
                  setCopied(false);
                  setSaveError("");
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Add Another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-8">
          <Link href="/owner/staff" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            ← Back to Staff
          </Link>
          <h1 className="text-2xl font-black text-slate-900">Add Staff Member</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add an instructor or staff member. If you enter their email, an invite link is generated automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Priya Sharma"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${nameError ? "border-red-400" : "border-slate-200"}`}
              />
              {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">User group</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "instructor",
                    label: "Instructor",
                    description: "Teaches assigned classes and manages their own profile.",
                  },
                  {
                    value: "management",
                    label: "Management",
                    description: "Can create classes and assign instructors.",
                  },
                ].map((group) => (
                  <button
                    key={group.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, userGroup: group.value as "instructor" | "management" }))
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      form.userGroup === group.value
                        ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-black">{group.label}</span>
                    <span className="mt-1 block text-xs leading-5">{group.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role</label>
              <Select
                options={customRoles}
                value={form.role}
                onChange={(v) => setForm((prev) => ({ ...prev, role: v as StaffRole }))}
                allowCreate
                createLabel="+ Add new role"
                onCreate={createCustomRole}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email <span className="text-slate-400 font-normal">(required for portal access)</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. priya@yourstudio.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                An invite link will be generated so they can set their password and log in.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {saveError && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Adding…" : "Add Staff Member"}
            </button>
            <Link href="/owner/staff" className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
