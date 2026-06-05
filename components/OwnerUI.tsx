"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export function OwnerPageHeader({
  eyebrow,
  title,
  description,
  backHref = "/owner/dashboard",
  backLabel = "Dashboard",
  primaryAction,
  secondaryAction,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Link href={backHref} className="text-sm font-semibold text-slate-500 hover:text-slate-700">
          {backLabel}
        </Link>
        {eyebrow && (
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-black leading-tight text-slate-950 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  invited: "bg-amber-100 text-amber-700",
  expected: "bg-amber-100 text-amber-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  completed: "bg-indigo-100 text-indigo-700",
  published: "bg-indigo-100 text-indigo-700",
  draft: "bg-slate-100 text-slate-600",
};

export function OwnerStatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black capitalize ${statusStyles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function OwnerActionMenu({
  label = "More actions",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label={label}
        onClick={(event) => {
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
          setOpen((value) => !value);
        }}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      >
        ⋮
      </button>
      {open && (
        <div
          className="fixed z-[9999] min-w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950"
          style={{ top: coords.top, right: coords.right }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export const ownerMenuItemClass =
  "block w-full px-4 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900";
