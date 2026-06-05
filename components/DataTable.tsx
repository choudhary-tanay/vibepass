"use client";

import { useState, useEffect, useRef } from "react";

export interface ColDef {
  key: string;
  label: string;
  defaultHidden?: boolean; // excluded by default but selectable
  fixed?: boolean;         // always visible, not toggleable
  align?: "left" | "right" | "center";
  width?: string;
}

interface DataTableProps {
  /** Unique ID used as localStorage key for column preferences */
  tableId: string;
  columns: ColDef[];
  /** Controlled search string */
  searchQuery?: string;
  onSearchQuery?: (q: string) => void;
  searchPlaceholder?: string;
  /** Slot for extra filter controls rendered beside search */
  toolbar?: React.ReactNode;
  /** e.g. "24 classes · 12 shown" */
  summary?: string;
  emptyState?: React.ReactNode;
  loading?: boolean;
  /**
   * Render prop — receives a Set of currently-visible column keys.
   * Render <table>, <thead>, <tbody> here.
   */
  children: (visibleKeys: Set<string>) => React.ReactNode;
}

export default function DataTable({
  tableId,
  columns,
  searchQuery,
  onSearchQuery,
  searchPlaceholder = "Search…",
  toolbar,
  summary,
  emptyState,
  loading,
  children,
}: DataTableProps) {
  const storageKey = `vibepass_cols_${tableId}`;

  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    const defaults = new Set(
      columns.filter((c) => c.defaultHidden && !c.fixed).map((c) => c.key)
    );
    if (typeof window === "undefined") return defaults;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        return new Set(parsed.filter((k) => columns.some((c) => c.key === k && !c.fixed)));
      }
    } catch {}
    return defaults;
  });

  const [customizerOpen, setCustomizerOpen] = useState(false);
  const customizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (customizerRef.current && !customizerRef.current.contains(e.target as Node)) {
        setCustomizerOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const toggleCol = (key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const resetCols = () => {
    try { localStorage.removeItem(storageKey); } catch {}
    setHiddenCols(new Set(columns.filter((c) => c.defaultHidden && !c.fixed).map((c) => c.key)));
  };

  const visibleKeys = new Set(
    columns.filter((c) => !hiddenCols.has(c.key)).map((c) => c.key)
  );

  const toggleableColumns = columns.filter((c) => !c.fixed);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        {/* Search */}
        {onSearchQuery && (
          <div className="relative min-w-[160px] flex-1 max-w-xs">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-1 focus:ring-indigo-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Extra toolbar slot */}
        {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}

        {/* Right side: summary + column customizer */}
        <div className="ml-auto flex items-center gap-2">
          {summary && (
            <span className="text-xs text-gray-400">{summary}</span>
          )}

          {/* Column customizer */}
          {toggleableColumns.length > 0 && (
            <div className="relative" ref={customizerRef}>
              <button
                type="button"
                onClick={() => setCustomizerOpen((p) => !p)}
                title="Customize columns"
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  customizerOpen
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Columns
              </button>

              {customizerOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                      Visible columns
                    </p>
                    <button
                      type="button"
                      onClick={resetCols}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {toggleableColumns.map((col) => (
                      <label
                        key={col.key}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={!hiddenCols.has(col.key)}
                          onChange={() => toggleCol(col.key)}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-indigo-600"
                        />
                        <span className="text-sm text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading…
        </div>
      ) : (
        <div className="overflow-x-auto">{children(visibleKeys)}</div>
      )}

      {/* ── Empty state ── */}
      {!loading && emptyState}
    </div>
  );
}

// ── Shared compact th / td helpers ────────────────────────────────────────────
export function Th({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 ${textAlign} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td className={`border-b border-gray-50 px-4 py-2.5 text-sm ${textAlign} ${className}`}>
      {children}
    </td>
  );
}
