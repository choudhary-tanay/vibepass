"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { StaffClassRowActions } from "@/components/StaffClassRowActions";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";
import type { StaffEarningSummary } from "@/types";
import { formatCurrency } from "@/lib/currency";

interface StaffClass {
  id: string;
  title: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  booked_count: number;
  capacity: number;
  snapshot_confirmed_bookings?: number;
  snapshot_capacity?: number;
  occupancy_percent?: number;
  status: string;
  price: number;
  staff_id: string | null;
}

interface Props {
  classes: StaffClass[];
  myClasses: StaffClass[];
  otherClasses: StaffClass[];
  isManagement: boolean;
  staffId: string | undefined;
  earningByClass: Map<string, StaffEarningSummary>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  published:              { label: "Live",              color: "bg-green-100 text-green-700" },
  pending_owner_approval: { label: "Awaiting Approval", color: "bg-amber-100 text-amber-700" },
  draft:                  { label: "Draft",             color: "bg-slate-100 text-slate-600" },
  cancelled:              { label: "Cancelled",         color: "bg-red-100 text-red-600" },
  completed:              { label: "Completed",         color: "bg-blue-100 text-blue-600" },
};

const MGMT_COLS: ColDef[] = [
  { key: "class", label: "Class", fixed: true },
  { key: "date", label: "Date & Time" },
  { key: "bookings", label: "Bookings" },
  { key: "capacity", label: "Capacity" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", fixed: true },
];

const INSTRUCTOR_COLS: ColDef[] = [
  { key: "class", label: "Class", fixed: true },
  { key: "date", label: "Date & Time" },
  { key: "bookings", label: "Bookings" },
  { key: "capacity", label: "Capacity" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", fixed: true },
];

function ClassTable({
  tableId,
  cols,
  rows,
  showActions,
  earningByClass,
}: {
  tableId: string;
  cols: ColDef[];
  rows: StaffClass[];
  showActions: boolean;
  earningByClass: Map<string, StaffEarningSummary>;
}) {
  const [search, setSearch] = useState("");

  const filtered = rows.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DataTable
      tableId={tableId}
      columns={cols}
      searchQuery={search}
      onSearchQuery={setSearch}
      searchPlaceholder="Search by class title..."
      summary={`${filtered.length} of ${rows.length}`}
      emptyState={
        filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No classes match this search.
          </div>
        ) : undefined
      }
    >
      {(vis) => (
        <table className="w-full text-sm">
          <thead>
            <tr>
              {vis.has("class") && <Th>Class</Th>}
              {vis.has("date") && <Th>Date & Time</Th>}
              {vis.has("bookings") && <Th>Bookings</Th>}
              {vis.has("capacity") && <Th>Capacity</Th>}
              {vis.has("status") && <Th>Status</Th>}
              {vis.has("actions") && showActions && <Th>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((cls) => {
              const cfg = STATUS_CONFIG[cls.status] ?? { label: cls.status, color: "bg-slate-100 text-slate-600" };
              const earning = earningByClass.get(cls.id);
              return (
                <tr key={cls.id} className="hover:bg-slate-50">
                  {vis.has("class") && (
                    <Td>
                      <p className="font-semibold text-slate-900">{cls.title}</p>
                      <p className="text-xs text-slate-400">{cls.category}</p>
                      {earning && (
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          Earned {formatCurrency(earning.staffEarning, earning.currency ?? "INR")} · Due {formatCurrency(earning.staffUnpaidBalance, earning.currency ?? "INR")}
                        </p>
                      )}
                    </Td>
                  )}
                  {vis.has("date") && (
                    <Td className="text-slate-600 whitespace-nowrap">
                      <p>{formatDate(cls.date)}</p>
                      <p className="text-xs text-slate-400">
                        {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                      </p>
                    </Td>
                  )}
                  {vis.has("bookings") && (
                    <Td className="text-slate-600">{cls.snapshot_confirmed_bookings ?? cls.booked_count}</Td>
                  )}
                  {vis.has("capacity") && (
                    <Td className="text-slate-600">
                      {cls.snapshot_capacity ?? cls.capacity}
                      {cls.occupancy_percent != null && (
                        <span className="ml-2 text-xs text-slate-400">{cls.occupancy_percent}%</span>
                      )}
                    </Td>
                  )}
                  {vis.has("status") && (
                    <Td>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </Td>
                  )}
                  {vis.has("actions") && showActions && (
                    <Td>
                      <StaffClassRowActions classId={cls.id} currentStatus={cls.status} />
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </DataTable>
  );
}

export function StaffClassesTable({
  classes,
  myClasses,
  otherClasses,
  isManagement,
  earningByClass,
}: Props) {
  if (isManagement) {
    return (
      <ClassTable
        tableId="staff-mgmt-classes"
        cols={MGMT_COLS}
        rows={classes}
        showActions={true}
        earningByClass={earningByClass}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
          My Proposals & Assignments ({myClasses.length})
        </h2>
        {myClasses.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">✦</div>
            <p className="font-bold text-slate-700">No proposals yet</p>
            <p className="mt-1 text-sm text-slate-500">Propose a class and it will be reviewed before going live.</p>
            <Link href="/staff/classes/create" className="mt-5 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700">
              Propose a Class
            </Link>
          </div>
        ) : (
          <ClassTable
            tableId="staff-my-classes"
            cols={INSTRUCTOR_COLS}
            rows={myClasses}
            showActions={false}
            earningByClass={earningByClass}
          />
        )}
      </section>

      {otherClasses.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
            All Studio Classes ({otherClasses.length})
          </h2>
          <ClassTable
            tableId="staff-other-classes"
            cols={INSTRUCTOR_COLS}
            rows={otherClasses}
            showActions={false}
            earningByClass={new Map()}
          />
        </section>
      )}
    </div>
  );
}
