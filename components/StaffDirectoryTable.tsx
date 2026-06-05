"use client";

import { useMemo, useState } from "react";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  user_group: string | null;
  status: string;
}

interface Props {
  active: StaffMember[];
  inactive: StaffMember[];
}

const GROUP_LABELS: Record<string, string> = {
  management: "Management",
  instructor: "Instructor",
};

const COLUMNS: ColDef[] = [
  { key: "name", label: "Name", fixed: true },
  { key: "role", label: "Role" },
  { key: "group", label: "Group" },
  { key: "email", label: "Email", defaultHidden: true },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", fixed: true },
];

export function StaffDirectoryTable({ active, inactive }: Props) {
  const [search, setSearch] = useState("");

  const all = useMemo(() => [...active, ...inactive], [active, inactive]);

  const filtered = useMemo(() => {
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [all, search]);

  return (
    <DataTable
      tableId="staff-directory"
      columns={COLUMNS}
      searchQuery={search}
      onSearchQuery={setSearch}
      searchPlaceholder="Search by name or email..."
      summary={`${filtered.length} of ${all.length}`}
      emptyState={
        filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No staff members match this search.
          </div>
        ) : undefined
      }
    >
      {(vis) => (
        <table className="w-full text-sm">
          <thead>
            <tr>
              {vis.has("name") && <Th>Name</Th>}
              {vis.has("role") && <Th>Role</Th>}
              {vis.has("group") && <Th>Group</Th>}
              {vis.has("email") && <Th>Email</Th>}
              {vis.has("status") && <Th>Status</Th>}
              {vis.has("actions") && <Th>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr
                key={member.id}
                className={`hover:bg-slate-50 ${member.status !== "active" ? "opacity-60" : ""}`}
              >
                {vis.has("name") && (
                  <Td>
                    <span className="font-semibold text-slate-900">{member.name}</span>
                  </Td>
                )}
                {vis.has("role") && (
                  <Td className="capitalize text-slate-600">{member.role}</Td>
                )}
                {vis.has("group") && (
                  <Td>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                        member.user_group === "management"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {GROUP_LABELS[member.user_group as string] ?? member.user_group ?? "Instructor"}
                    </span>
                  </Td>
                )}
                {vis.has("email") && (
                  <Td className="text-slate-500">{member.email}</Td>
                )}
                {vis.has("status") && (
                  <Td>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        member.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {member.status}
                    </span>
                  </Td>
                )}
                {vis.has("actions") && (
                  <Td>
                    {/* placeholder for future per-row actions */}
                    <span className="text-xs text-slate-400">—</span>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DataTable>
  );
}
