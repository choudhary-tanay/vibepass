"use client";

import { useEffect, useMemo, useState } from "react";
import type { PermissionDefinition, PlatformRole } from "@/types";

interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileRole: string;
  platformUserId: string | null;
  platformRoleId: string | null;
  platformRoleName: string;
  platformRoleKey: string;
  status: string;
  createdAt: string;
}

interface AccessPayload {
  permissions: PermissionDefinition[];
  roles: PlatformRole[];
  users: PlatformUserRow[];
}

export default function AdminAccessPage() {
  const [payload, setPayload] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { roleId: string; status: "active" | "inactive" }>>({});

  async function loadAccess() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/access");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not load access controls.");
      setPayload(null);
      setLoading(false);
      return;
    }
    const loaded = data as AccessPayload;
    setPayload(loaded);
    const fallbackRole = loaded.roles.find((role) => role.roleKey === "vibepass_super_admin") ?? loaded.roles[0];
    setEdits(
      Object.fromEntries(
        loaded.users.map((user) => [
          user.id,
          {
            roleId: user.platformRoleId ?? fallbackRole?.id ?? "",
            status: user.status === "inactive" ? "inactive" : "active",
          },
        ])
      )
    );
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadAccess();
    });
    return () => {
      active = false;
    };
  }, []);

  const permissionsByGroup = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>();
    (payload?.permissions ?? []).forEach((permission) => {
      const group = groups.get(permission.groupName) ?? [];
      group.push(permission);
      groups.set(permission.groupName, group);
    });
    return [...groups.entries()];
  }, [payload?.permissions]);

  async function saveUser(user: PlatformUserRow) {
    const edit = edits[user.id];
    if (!edit?.roleId) return;
    setSavingUserId(user.id);
    setError("");
    const response = await fetch("/api/admin/access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        roleId: edit.roleId,
        status: edit.status,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSavingUserId(null);
    if (!response.ok) {
      setError(data.error ?? "Could not update platform user.");
      return;
    }
    await loadAccess();
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading VibePass Interface access...</p>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-sky-500">VibePass Interface</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {(payload?.users ?? []).length} platform users / {(payload?.roles ?? []).length} preset roles
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Platform users</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-100 text-left text-xs font-black uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(payload?.users ?? []).map((user) => {
                  const edit = edits[user.id];
                  return (
                    <tr key={user.id}>
                      <td className="px-3 py-4">
                        <p className="font-black text-slate-900">{user.name || user.email}</p>
                        <p className="text-xs text-slate-400">{user.email || "No email"}</p>
                      </td>
                      <td className="px-3 py-4">
                        <select
                          value={edit?.roleId ?? ""}
                          onChange={(event) =>
                            setEdits((prev) => ({
                              ...prev,
                              [user.id]: { ...prev[user.id], roleId: event.target.value },
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-sky-400"
                        >
                          {(payload?.roles ?? [])
                            .filter((role) => role.status === "active")
                            .map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.roleName}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-3 py-4">
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-sky-400"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          disabled={savingUserId === user.id}
                          onClick={() => saveUser(user)}
                          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {savingUserId === user.id ? "Saving" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Permission catalog</h2>
          <div className="mt-4 max-h-[540px] overflow-y-auto rounded-2xl border border-slate-100 p-3">
            {permissionsByGroup.map(([group, permissions]) => (
              <div key={group} className="mb-5 last:mb-0">
                <p className="mb-2 text-[11px] font-black uppercase text-slate-400">{group}</p>
                <div className="grid gap-2">
                  {permissions.map((permission) => (
                    <div key={permission.key} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-sm font-bold text-slate-800">{permission.label}</p>
                      <p className="text-xs text-slate-400">{permission.key}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Platform role presets</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(payload?.roles ?? []).map((role) => (
            <div key={role.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900">{role.roleName}</p>
                  <p className="text-xs text-slate-400">{role.roleKey}</p>
                </div>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase text-sky-700">
                  {role.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.slice(0, 16).map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600"
                  >
                    {permission}
                  </span>
                ))}
                {role.permissions.length > 16 && (
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white">
                    +{role.permissions.length - 16}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
