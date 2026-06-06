"use client";

import { formatCurrency } from "@/lib/currency";

export type PolicyAppliesTo = "customer_cancel" | "owner_cancel" | "both";
export type PolicyRefundType = "percentage" | "fixed";

export interface RefundRuleDraft {
  id: string;
  ruleName: string;
  minHoursBeforeClass: number;
  maxHoursBeforeClass: number | null;
  refundType: PolicyRefundType;
  refundValue: number;
  appliesTo: PolicyAppliesTo;
  isActive: boolean;
}

export interface StructuredPolicyValue {
  customerCancellationAllowed: boolean;
  cutoffValue: number;
  cutoffUnit: "hours" | "days";
  notes: string;
  rules: RefundRuleDraft[];
}

export function newRefundRuleDraft(partial: Partial<RefundRuleDraft> = {}): RefundRuleDraft {
  return {
    id: partial.id ?? crypto.randomUUID(),
    ruleName: partial.ruleName ?? "Refund rule",
    minHoursBeforeClass: partial.minHoursBeforeClass ?? 24,
    maxHoursBeforeClass: partial.maxHoursBeforeClass ?? null,
    refundType: partial.refundType ?? "percentage",
    refundValue: partial.refundValue ?? 100,
    appliesTo: partial.appliesTo ?? "both",
    isActive: partial.isActive ?? true,
  };
}

export function defaultPolicyValue(): StructuredPolicyValue {
  return {
    customerCancellationAllowed: true,
    cutoffValue: 24,
    cutoffUnit: "hours",
    notes: "",
    rules: [
      newRefundRuleDraft({
        ruleName: "Full refund",
        minHoursBeforeClass: 48,
        refundType: "percentage",
        refundValue: 100,
        appliesTo: "both",
      }),
      newRefundRuleDraft({
        ruleName: "Half refund",
        minHoursBeforeClass: 24,
        maxHoursBeforeClass: 48,
        refundType: "percentage",
        refundValue: 50,
        appliesTo: "both",
      }),
      newRefundRuleDraft({
        ruleName: "No refund close to class",
        minHoursBeforeClass: 0,
        maxHoursBeforeClass: 24,
        refundType: "percentage",
        refundValue: 0,
        appliesTo: "both",
      }),
    ],
  };
}

export function policyCutoffHours(policy: StructuredPolicyValue): number {
  const value = Math.max(0, Number(policy.cutoffValue) || 0);
  return policy.cutoffUnit === "days" ? value * 24 : value;
}

function formatWindow(rule: RefundRuleDraft) {
  if (rule.maxHoursBeforeClass == null || rule.maxHoursBeforeClass <= 0) {
    return `${rule.minHoursBeforeClass}+ hours before class`;
  }
  return `${rule.minHoursBeforeClass}-${rule.maxHoursBeforeClass} hours before class`;
}

function formatRefundValue(rule: RefundRuleDraft, currency: string) {
  return rule.refundType === "percentage"
    ? `${rule.refundValue}%`
    : formatCurrency(rule.refundValue, currency);
}

export function policySummaries(policy: StructuredPolicyValue, currency = "INR") {
  if (!policy.customerCancellationAllowed) {
    return {
      cancellationPolicy: "Customers cannot cancel this booking from their portal.",
      refundPolicySummary:
        policy.notes.trim() || "Owner/admin cancellation refunds are handled by the studio in dummy refund mode.",
    };
  }

  const cutoff = policyCutoffHours(policy);
  const cutoffText =
    cutoff >= 24 && cutoff % 24 === 0
      ? `${cutoff / 24} day${cutoff / 24 === 1 ? "" : "s"}`
      : `${cutoff} hour${cutoff === 1 ? "" : "s"}`;
  const activeRules = policy.rules.filter((rule) => rule.isActive);
  const ruleSummary =
    activeRules.length > 0
      ? activeRules
          .map((rule) => `${formatRefundValue(rule, currency)} refund ${formatWindow(rule)}`)
          .join("; ")
      : "Refunds are reviewed manually by the studio.";

  return {
    cancellationPolicy: `Customers can cancel up to ${cutoffText} before class.${policy.notes.trim() ? ` ${policy.notes.trim()}` : ""}`,
    refundPolicySummary: ruleSummary,
  };
}

export function StructuredPolicyEditor({
  value,
  onChange,
  currency = "INR",
}: {
  value: StructuredPolicyValue;
  onChange: (value: StructuredPolicyValue) => void;
  currency?: string;
}) {
  function patch(next: Partial<StructuredPolicyValue>) {
    onChange({ ...value, ...next });
  }

  function updateRule(id: string, patchValue: Partial<RefundRuleDraft>) {
    patch({
      rules: value.rules.map((rule) => (rule.id === id ? { ...rule, ...patchValue } : rule)),
    });
  }

  function removeRule(id: string) {
    patch({ rules: value.rules.filter((rule) => rule.id !== id) });
  }

  const summaries = policySummaries(value, currency);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-black text-slate-900">Is customer cancellation allowed?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[
            [true, "Yes", "Customers can cancel from their portal."],
            [false, "No", "Customer portal cancellation is disabled."],
          ].map(([allowed, label, hint]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => patch({ customerCancellationAllowed: allowed as boolean })}
              className={`rounded-2xl border px-4 py-3 text-left ${
                value.customerCancellationAllowed === allowed
                  ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
              }`}
            >
              <span className="block text-sm font-black">{label as string}</span>
              <span className="mt-1 block text-xs font-semibold">{hint as string}</span>
            </button>
          ))}
        </div>
      </div>

      {!value.customerCancellationAllowed ? (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Customers cannot cancel this booking from their portal. Owner/admin cancellation can still trigger dummy refund logic.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Cancellation cutoff</span>
              <input
                type="number"
                min={0}
                value={value.cutoffValue}
                onChange={(event) => patch({ cutoffValue: Number(event.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Unit</span>
              <select
                value={value.cutoffUnit}
                onChange={(event) => patch({ cutoffUnit: event.target.value as "hours" | "days" })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </label>
          </div>

          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Refund rules</p>
                <p className="text-xs font-semibold text-slate-500">
                  Rules are evaluated by hours before class and can apply to customer, owner, or both flows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => patch({ rules: [...value.rules, newRefundRuleDraft()] })}
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700"
              >
                + Add rule
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {value.rules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="grid gap-3 lg:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]">
                    <input
                      value={rule.ruleName}
                      onChange={(event) => updateRule(rule.id, { ruleName: event.target.value })}
                      aria-label="Rule name"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    />
                    <input
                      type="number"
                      min={0}
                      value={rule.minHoursBeforeClass}
                      onChange={(event) => updateRule(rule.id, { minHoursBeforeClass: Number(event.target.value) })}
                      aria-label="Min hours before class"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    />
                    <input
                      type="number"
                      min={0}
                      value={rule.maxHoursBeforeClass ?? ""}
                      onChange={(event) =>
                        updateRule(rule.id, {
                          maxHoursBeforeClass: event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                      aria-label="Max hours before class"
                      placeholder="Max optional"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    />
                    <select
                      value={rule.refundType}
                      onChange={(event) => updateRule(rule.id, { refundType: event.target.value as PolicyRefundType })}
                      aria-label="Refund type"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={rule.refundType === "percentage" ? 100 : undefined}
                      value={rule.refundValue}
                      onChange={(event) => updateRule(rule.id, { refundValue: Number(event.target.value) })}
                      aria-label="Refund value"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <select
                      value={rule.appliesTo}
                      onChange={(event) => updateRule(rule.id, { appliesTo: event.target.value as PolicyAppliesTo })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-400"
                    >
                      <option value="both">Applies to both</option>
                      <option value="customer_cancel">Customer cancellation</option>
                      <option value="owner_cancel">Owner cancellation</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={(event) => updateRule(rule.id, { isActive: event.target.checked })}
                        className="accent-indigo-600"
                      />
                      Active
                    </label>
                  </div>
                </div>
              ))}
              {value.rules.length === 0 && (
                <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                  No refund rules yet. Add at least one rule or refunds will be reviewed manually.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Manual policy notes</span>
        <textarea
          value={value.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          rows={2}
          placeholder="Optional extra notes shown to customers."
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase text-slate-400">Generated cancellation summary</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{summaries.cancellationPolicy}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase text-slate-400">Generated refund summary</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{summaries.refundPolicySummary}</p>
        </div>
      </div>
    </div>
  );
}
