"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ChecklistStep {
  label: string;
  done: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  storageKey: string;
  title: string;
  description: string;
  steps: ChecklistStep[];
}

export function OnboardingChecklist({
  storageKey,
  title,
  description,
  steps,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(true);
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const val = localStorage.getItem(storageKey);
      if (!val) setDismissed(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!dismissed && allDone) {
      localStorage.setItem(storageKey, "1");
    }
  }, [allDone, dismissed, storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  }

  if (dismissed) return null;
  if (allDone) return null;

  return (
    <div className="mb-6 rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm dark:border-indigo-900 dark:from-indigo-950/40 dark:to-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-300">
            Getting started
          </p>
          <h2 className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          Dismiss
        </button>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900">
        <div
          className="h-2 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }}
        />
      </div>
      <p className="mb-3 text-xs font-semibold text-slate-500">
        {doneCount} of {steps.length} done
      </p>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              step.done
                ? "opacity-50"
                : "bg-white/70 dark:bg-slate-900/40"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                step.done
                  ? "bg-green-500 text-white"
                  : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <span className={`flex-1 text-sm font-semibold ${step.done ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
              {step.label}
            </span>
            {!step.done && step.href && (
              <Link
                href={step.href}
                className="shrink-0 rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-600"
              >
                Go
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
