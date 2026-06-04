"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  classId: string;
  currentStatus: string;
}

export function StaffClassRowActions({ classId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(status: string) {
    setLoading(true);
    await fetch(`/api/staff/management/classes/${classId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  if (currentStatus === "cancelled") {
    return <span className="text-xs text-slate-400">Cancelled</span>;
  }

  return (
    <div className="flex gap-1.5">
      {currentStatus === "draft" || currentStatus === "pending_owner_approval" ? (
        <button
          onClick={() => setStatus("published")}
          disabled={loading}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-black text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "…" : "Publish"}
        </button>
      ) : currentStatus === "published" ? (
        <button
          onClick={() => setStatus("draft")}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "…" : "Unpublish"}
        </button>
      ) : null}
      {currentStatus !== "cancelled" && (
        <button
          onClick={() => {
            if (confirm("Cancel this class? This cannot be undone.")) setStatus("cancelled");
          }}
          disabled={loading}
          className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
