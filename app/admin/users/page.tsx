"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";

interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

const roleStyles: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  owner: "bg-blue-100 text-blue-700",
  staff: "bg-teal-100 text-teal-700",
  customer: "bg-gray-100 text-gray-600",
};

const COLUMNS: ColDef[] = [
  { key: "user", label: "User", fixed: true },
  { key: "role", label: "Role" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "created", label: "Created", defaultHidden: true },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "owner" | "customer" | "admin">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, name, email, phone, role, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setUsers((data as AdminUser[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    if (!q) return true;
    const lower = q.toLowerCase();
    return (
      (u.name ?? "").toLowerCase().includes(lower) ||
      (u.email ?? "").toLowerCase().includes(lower)
    );
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading users…</p>
      </div>
    );
  }

  const roleFilterToolbar = (
    <div className="flex flex-wrap gap-2">
      {(["all", "owner", "customer", "admin"] as const).map((r) => (
        <button
          key={r}
          onClick={() => setFilter(r)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === r
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {r.charAt(0).toUpperCase() + r.slice(1)}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            {users.length} total · {users.filter((u) => u.role === "owner").length} owners ·{" "}
            {users.filter((u) => u.role === "customer").length} customers
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/access"
            className="rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-100"
          >
            Roles & Permissions
          </Link>
          <Link
            href="/admin/users/create"
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            Add user
          </Link>
        </div>
      </div>

      <DataTable
        tableId="admin-users"
        columns={COLUMNS}
        searchQuery={q}
        onSearchQuery={setQ}
        searchPlaceholder="Search by name or email…"
        toolbar={roleFilterToolbar}
        summary={`${filtered.length} of ${users.length}`}
        emptyState={
          filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No users found.
            </div>
          ) : undefined
        }
      >
        {(vis) => (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {vis.has("user") && <Th>Name</Th>}
                {vis.has("role") && <Th>Role</Th>}
                {vis.has("email") && <Th>Email / Phone</Th>}
                {vis.has("status") && <Th>Status</Th>}
                {vis.has("created") && <Th>Joined</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  {vis.has("user") && (
                    <Td>
                      <span className="font-medium text-gray-900">{u.name || "—"}</span>
                    </Td>
                  )}
                  {vis.has("role") && (
                    <Td>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          roleStyles[u.role] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {u.role}
                      </span>
                    </Td>
                  )}
                  {vis.has("email") && (
                    <Td>
                      <p className="text-gray-600">{u.email ?? "—"}</p>
                      <p className="text-xs text-gray-400">{u.phone || "—"}</p>
                    </Td>
                  )}
                  {vis.has("status") && (
                    <Td>
                      <span className="text-xs text-gray-400">—</span>
                    </Td>
                  )}
                  {vis.has("created") && (
                    <Td>
                      <span className="text-gray-600">
                        {new Date(u.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTable>
    </div>
  );
}
