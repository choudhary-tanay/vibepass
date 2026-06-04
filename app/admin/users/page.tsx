"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "owner" | "customer" | "admin">("all");

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

  const filtered =
    filter === "all" ? users : users.filter((u) => u.role === filter);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading users…</p>
      </div>
    );
  }

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
        <Link
          href="/admin/users/create"
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
        >
          Add user
        </Link>
      </div>

      {/* Role filter */}
      <div className="mb-4 flex gap-2">
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-6 py-4 text-left">Name</th>
              <th className="px-6 py-4 text-left">Email</th>
              <th className="px-6 py-4 text-left">Phone</th>
              <th className="px-6 py-4 text-left">Role</th>
              <th className="px-6 py-4 text-left">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{u.name || "—"}</td>
                <td className="px-6 py-4 text-gray-600">{u.email ?? "—"}</td>
                <td className="px-6 py-4 text-gray-600">{u.phone || "—"}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      roleStyles[u.role] ?? "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(u.created_at).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
