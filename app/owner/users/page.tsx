"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { OwnerPageHeader, OwnerStatusChip } from "@/components/OwnerUI";
import type {
  BusinessAccessLevel,
  BusinessRole,
  BusinessUser,
  BusinessUserInvite,
  PermissionDefinition,
} from "@/types";

interface AccessPayload {
  businessId: string;
  permissions: PermissionDefinition[];
  roles: BusinessRole[];
  users: BusinessUser[];
  invites: BusinessUserInvite[];
}

interface InviteForm {
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  accessLevel: BusinessAccessLevel;
  inviteNote: string;
}

interface RoleForm {
  roleName: string;
  description: string;
  permissions: string[];
}

const ACCESS_LEVELS: { value: BusinessAccessLevel; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "limited", label: "Limited" },
];

export default function OwnerUsersPage() {
  const { currentBusiness, loading, classes } = useAppStore();
  const [payload, setPayload] = useState<AccessPayload | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [latestInviteUrl, setLatestInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    fullName: "",
    email: "",
    phone: "",
    roleId: "",
    accessLevel: "member",
    inviteNote: "",
  });
  const [roleForm, setRoleForm] = useState<RoleForm>({
    roleName: "",
    description: "",
    permissions: [],
  });
  const [edits, setEdits] = useState<Record<string, { roleId: string; accessLevel: BusinessAccessLevel; status: "active" | "inactive" }>>({});
  const [userSearch, setUserSearch] = useState("");

  async function loadAccess() {
    if (!currentBusiness) return;
    setLoadingAccess(true);
    setError("");
    const response = await fetch(`/api/owner/users?businessId=${currentBusiness.id}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not load user management.");
      setPayload(null);
      setLoadingAccess(false);
      return;
    }
    const loaded = data as AccessPayload;
    setPayload(loaded);
    const defaultRole = loaded.roles.find((role) => role.roleKey === "instructor") ?? loaded.roles[0];
    setInviteForm((prev) => ({ ...prev, roleId: prev.roleId || defaultRole?.id || "" }));
    setEdits(
      Object.fromEntries(
        loaded.users.map((user) => [
          user.id,
          {
            roleId: user.businessRoleId ?? defaultRole?.id ?? "",
            accessLevel: user.accessLevel,
            status: user.status === "inactive" ? "inactive" : "active",
          },
        ])
      )
    );
    setLoadingAccess(false);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (active) await loadAccess();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id]);

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>();
    (payload?.permissions ?? []).forEach((permission) => {
      const group = groups.get(permission.groupName) ?? [];
      group.push(permission);
      groups.set(permission.groupName, group);
    });
    return [...groups.entries()];
  }, [payload?.permissions]);

  const activeRoles = (payload?.roles ?? []).filter((role) => role.status === "active");
  const filteredUsers = (payload?.users ?? []).filter((user) => {
    const needle = userSearch.trim().toLowerCase();
    if (!needle) return true;
    return [
      user.fullName ?? "",
      user.email,
      user.phone ?? "",
      user.businessRoleName ?? "",
      user.accessLevel,
      user.status,
    ].some((value) => value.toLowerCase().includes(needle));
  });

  function assignedClassCount(user: BusinessUser) {
    if (!user.staffId) return 0;
    return classes.filter(
      (cls) =>
        cls.businessId === currentBusiness?.id &&
        (cls.staffId === user.staffId || cls.staffIds?.includes(user.staffId ?? ""))
    ).length;
  }

  function formatLastActive(user: BusinessUser) {
    const value = user.acceptedAt ?? user.invitedAt ?? user.createdAt;
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function toggleRolePermission(key: string) {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((item) => item !== key)
        : [...prev.permissions, key],
    }));
  }

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!currentBusiness) return;
    setSaving(true);
    setError("");
    setLatestInviteUrl("");
    const response = await fetch("/api/owner/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...inviteForm, businessId: currentBusiness.id }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not send invite.");
      return;
    }
    setLatestInviteUrl(data.inviteUrl ?? "");
    setInviteForm((prev) => ({
      fullName: "",
      email: "",
      phone: "",
      roleId: prev.roleId,
      accessLevel: "member",
      inviteNote: "",
    }));
    await loadAccess();
  }

  async function createRole(event: React.FormEvent) {
    event.preventDefault();
    if (!currentBusiness || !roleForm.roleName.trim()) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/owner/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...roleForm, businessId: currentBusiness.id }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not create role.");
      return;
    }
    setRoleForm({ roleName: "", description: "", permissions: [] });
    await loadAccess();
  }

  async function saveUser(user: BusinessUser) {
    if (!currentBusiness) return;
    const edit = edits[user.id];
    if (!edit) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/owner/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: currentBusiness.id,
        businessUserId: user.id,
        roleId: edit.roleId,
        accessLevel: edit.accessLevel,
        status: edit.status,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not update user.");
      return;
    }
    await loadAccess();
  }

  async function copyLatestInvite() {
    if (!latestInviteUrl) return;
    await navigator.clipboard.writeText(latestInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (loading || loadingAccess) {
    return (
      <main className="min-h-screen px-6 py-10">
        <p className="text-sm text-slate-400">Loading access controls...</p>
      </main>
    );
  }

  if (!currentBusiness) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="rounded-2xl bg-white p-8 text-sm text-slate-500 shadow-sm">
          No business found.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <OwnerPageHeader
          backHref="/owner/staff"
          backLabel="Staff"
          eyebrow="Access"
          title="User Management"
          description={`${currentBusiness.businessName} business users, roles, and access levels.`}
          primaryAction={
            <a href="#invite-user" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700">
              + Invite User
            </a>
          }
          secondaryAction={
            <Link href="/owner/staff/create" className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
              + Add Staff
            </Link>
          }
        />

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {latestInviteUrl && (
          <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 px-5 py-4">
            <p className="text-sm font-black text-green-900">Invite link ready</p>
            <div className="mt-2 flex flex-col gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center">
              <code className="flex-1 overflow-auto text-xs text-slate-600">{latestInviteUrl}</code>
              <button
                type="button"
                onClick={copyLatestInvite}
                className="rounded-full bg-green-600 px-4 py-2 text-xs font-black text-white hover:bg-green-700"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Business users</h2>
                <p className="text-xs font-semibold text-slate-400">
                  {filteredUsers.length} of {(payload?.users ?? []).length} active or invited records
                </p>
              </div>
            </div>
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name, email, phone, role, or status..."
              className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead className="border-b border-slate-100 text-left text-xs font-black uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Level</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Classes assigned</th>
                    <th className="px-3 py-3">Last active</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => {
                    const edit = edits[user.id];
                    const isOwner = user.accessLevel === "owner";
                    return (
                      <tr key={user.id} className="align-top">
                        <td className="px-3 py-4">
                          <p className="font-black text-slate-900">{user.fullName || user.email}</p>
                        </td>
                        <td className="px-3 py-4 text-xs font-semibold text-slate-500">
                          {user.email}
                        </td>
                        <td className="px-3 py-4 text-slate-600">
                          {user.phone || "—"}
                        </td>
                        <td className="px-3 py-4">
                          <select
                            value={edit?.roleId ?? ""}
                            disabled={isOwner}
                            onChange={(event) =>
                              setEdits((prev) => ({
                                ...prev,
                                [user.id]: {
                                  ...prev[user.id],
                                  roleId: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            {activeRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.roleName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-4">
                          <select
                            value={edit?.accessLevel ?? "member"}
                            disabled={isOwner}
                            onChange={(event) =>
                              setEdits((prev) => ({
                                ...prev,
                                [user.id]: {
                                  ...prev[user.id],
                                  accessLevel: event.target.value as BusinessAccessLevel,
                                },
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            {[{ value: "owner", label: "Owner" }, ...ACCESS_LEVELS].map((level) => (
                              <option key={level.value} value={level.value}>
                                {level.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-4">
                          <div className="grid gap-2">
                            <OwnerStatusChip status={user.status} />
                            {!isOwner && (
                              <select
                                value={edit?.status ?? "active"}
                                onChange={(event) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [user.id]: {
                                      ...prev[user.id],
                                      status: event.target.value as "active" | "inactive",
                                    },
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-slate-600">{assignedClassCount(user)}</td>
                        <td className="px-3 py-4 text-slate-600">{formatLastActive(user)}</td>
                        <td className="px-3 py-4 text-right">
                          <button
                            type="button"
                            disabled={saving || isOwner}
                            onClick={() => saveUser(user)}
                            className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-40"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(payload?.users ?? []).length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">No users yet.</div>
            )}
          </section>

          <div className="grid gap-6">
            <section id="invite-user" className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Invite user</h2>
              <form onSubmit={submitInvite} className="mt-4 grid gap-4">
                <input
                  value={inviteForm.fullName}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Full name"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={inviteForm.phone}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={inviteForm.roleId}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, roleId: event.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                  >
                    {activeRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.roleName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={inviteForm.accessLevel}
                    onChange={(event) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        accessLevel: event.target.value as BusinessAccessLevel,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                  >
                    {ACCESS_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={inviteForm.inviteNote}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, inviteNote: event.target.value }))}
                  placeholder="Invite note"
                  rows={3}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  disabled={saving || !inviteForm.email || !inviteForm.roleId}
                  className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Send invite
                </button>
              </form>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Custom role</h2>
              <form onSubmit={createRole} className="mt-4 grid gap-4">
                <input
                  value={roleForm.roleName}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, roleName: event.target.value }))}
                  placeholder="Role name"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={roleForm.description}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Description"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 p-3">
                  {permissionGroups.map(([group, permissions]) => (
                    <div key={group} className="mb-4 last:mb-0">
                      <p className="mb-2 text-[11px] font-black uppercase text-slate-400">{group}</p>
                      <div className="grid gap-2">
                        {permissions.map((permission) => (
                          <label
                            key={permission.key}
                            className="flex items-start gap-3 rounded-xl px-2 py-2 text-sm hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(permission.key)}
                              onChange={() => toggleRolePermission(permission.key)}
                              className="mt-1"
                            />
                            <span>
                              <span className="block font-bold text-slate-700">{permission.label}</span>
                              <span className="block text-xs text-slate-400">{permission.key}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={saving || !roleForm.roleName.trim()}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Create role
                </button>
              </form>
            </section>
          </div>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Role permissions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(payload?.roles ?? []).map((role) => (
              <div key={role.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{role.roleName}</p>
                    <p className="text-xs text-slate-400">{role.isSystem ? "Preset" : "Custom"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                    {role.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {role.permissions.length > 0 ? (
                    role.permissions.slice(0, 12).map((permission) => (
                      <span
                        key={permission}
                        className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700"
                      >
                        {permission}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No permissions assigned.</span>
                  )}
                  {role.permissions.length > 12 && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      +{role.permissions.length - 12}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {(payload?.invites ?? []).length > 0 && (
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Pending invites</h2>
            <div className="mt-4 grid gap-2">
              {(payload?.invites ?? []).map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-1 rounded-xl border border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-800">{invite.fullName || invite.email}</p>
                    <p className="text-xs text-slate-400">
                      {invite.email} / {invite.businessRoleName ?? "Role"} / expires{" "}
                      {new Date(invite.expiresAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                    Invited
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
