"use client";

import { useState, useRef, useEffect, useId, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

// ─── Single Select ────────────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  allowCreate?: boolean;
  createLabel?: string;
  onCreate?: (label: string) => Promise<string | void> | string | void;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

function useDropdownPosition(
  anchorRef: RefObject<HTMLDivElement | null>,
  open: boolean
) {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setPosition(null));
      return undefined;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const gap = 8;
      const viewportPadding = 12;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const opensBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(
        180,
        Math.min(320, opensBelow ? spaceBelow : spaceAbove)
      );

      setPosition({
        top: opensBelow
          ? rect.bottom + gap
          : Math.max(viewportPadding, rect.top - maxHeight - gap),
        left: Math.min(
          Math.max(viewportPadding, rect.left),
          window.innerWidth - rect.width - viewportPadding
        ),
        width: rect.width,
        maxHeight,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open]);

  return position;
}

function PortalMenu({
  anchorRef,
  menuRef,
  open,
  children,
}: {
  anchorRef: RefObject<HTMLDivElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  children: ReactNode;
}) {
  const position = useDropdownPosition(anchorRef, open);
  if (!open || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[95] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        overflowY: "auto",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  error = false,
  allowCreate = false,
  createLabel = "+ Add new",
  onCreate,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [createError, setCreateError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label) {
      setCreateError("Enter a role name.");
      return;
    }
    setCreateError("");
    const createdValue = await onCreate?.(label);
    onChange(typeof createdValue === "string" ? createdValue : label);
    setNewLabel("");
    setCreating(false);
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className}`} id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
          disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : error
            ? "border-red-400 bg-white text-slate-900 focus:ring-2 focus:ring-red-200"
            : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        }`}
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.color && (
                <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: selected.color }} />
              )}
              {selected.label}
            </span>
          ) : placeholder}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      <PortalMenu anchorRef={ref} menuRef={menuRef} open={open}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                opt.value === value ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"
              }`}
            >
              {opt.color && (
                <span className="mt-1 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: opt.color }} />
              )}
              <span>
                <span className="block">{opt.label}</span>
                {opt.description && (
                  <span className="block text-xs text-slate-400 mt-0.5">{opt.description}</span>
                )}
              </span>
              {opt.value === value && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="ml-auto h-4 w-4 flex-shrink-0 text-indigo-600">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
          {allowCreate && (
            <div className="border-t border-slate-100 p-2">
              {creating ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={newLabel}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      setCreateError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreate();
                      }
                      if (e.key === "Escape") {
                        setCreating(false);
                        setNewLabel("");
                        setCreateError("");
                      }
                    }}
                    placeholder="Role name"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                  {createError && (
                    <p className="px-1 text-xs font-semibold text-red-500">{createError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCreate()}
                      className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setNewLabel("");
                        setCreateError("");
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-black text-indigo-600 hover:bg-indigo-50"
                >
                  {createLabel}
                </button>
              )}
            </div>
          )}
      </PortalMenu>
    </div>
  );
}

// ─── Multi Select ─────────────────────────────────────────────────────────────

interface MultiSelectProps {
  options: SelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  maxShow?: number;
}

export function MultiSelect({
  options,
  values,
  onChange,
  placeholder = "Select options",
  className = "",
  error = false,
  maxShow = 2,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(val: string) {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  }

  const selectedLabels = options.filter((o) => values.includes(o.value)).map((o) => o.label);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex w-full min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-sm transition ${
          error
            ? "border-red-400 bg-white"
            : "border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-300"
        }`}
      >
        {selectedLabels.length === 0 ? (
          <span className="text-slate-400 pl-1">{placeholder}</span>
        ) : selectedLabels.length <= maxShow ? (
          selectedLabels.map((l) => (
            <span key={l} className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">{l}</span>
          ))
        ) : (
          <>
            {selectedLabels.slice(0, maxShow).map((l) => (
              <span key={l} className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">{l}</span>
            ))}
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              +{selectedLabels.length - maxShow} more
            </span>
          </>
        )}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`ml-auto h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      <PortalMenu anchorRef={ref} menuRef={menuRef} open={open}>
          {options.map((opt) => {
            const checked = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                  checked ? "bg-indigo-50/50" : ""
                }`}
              >
                <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
                  checked ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
                }`}>
                  {checked && (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {opt.color && (
                  <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: opt.color }} />
                )}
                <span>
                  <span className={`block font-medium ${checked ? "text-indigo-800" : "text-slate-700"}`}>{opt.label}</span>
                  {opt.description && <span className="block text-xs text-slate-400">{opt.description}</span>}
                </span>
              </button>
            );
          })}
          {values.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2">
              <button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-slate-500 hover:text-red-600">
                Clear all
              </button>
            </div>
          )}
      </PortalMenu>
    </div>
  );
}
