"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/appStore";

type FieldType =
  | "text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "dropdown"
  | "multi_select"
  | "radio"
  | "checkbox"
  | "date"
  | "consent";

type FieldDraft = {
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: boolean;
  placeholder: string;
  optionsText: string;
};

type TemplateRow = {
  id: string;
  name: string;
  description?: string | null;
  fields?: Array<{ id: string; field_label: string; field_type: string; is_required?: boolean | null }>;
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "multi_select", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "consent", label: "Consent" },
];

function emptyField(): FieldDraft {
  return {
    fieldLabel: "",
    fieldType: "text",
    isRequired: false,
    placeholder: "",
    optionsText: "",
  };
}

function slugFieldKey(label: string, index: number) {
  const key = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || `field_${index + 1}`;
}

export default function OwnerBookingFormsPage() {
  const { currentBusiness, classes, loading } = useAppStore();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDraft[]>([emptyField()]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const businessId = currentBusiness?.id ?? "";
  const ownerClasses = useMemo(
    () => classes.filter((cls) => cls.businessId === businessId),
    [classes, businessId]
  );

  async function loadTemplates() {
    if (!businessId) return;
    setLoadingTemplates(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/booking-form-templates?businessId=${businessId}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setTemplates(Array.isArray(body.templates) ? body.templates : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates.");
    } finally {
      setLoadingTemplates(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  async function createTemplate() {
    setStatus(null);
    setError(null);
    const cleanName = name.trim();
    const validFields = fields
      .map((field, index) => ({
        ...field,
        fieldLabel: field.fieldLabel.trim(),
        displayOrder: index,
      }))
      .filter((field) => field.fieldLabel);

    if (!businessId || !cleanName || validFields.length === 0) {
      setError("Template name and at least one field are required.");
      return;
    }

    try {
      const response = await fetch("/api/owner/booking-form-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: cleanName,
          description: description.trim() || null,
          fields: validFields.map((field, index) => ({
            fieldKey: slugFieldKey(field.fieldLabel, index),
            fieldLabel: field.fieldLabel,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            placeholder: field.placeholder.trim() || null,
            options: field.optionsText
              ? field.optionsText.split(",").map((option) => option.trim()).filter(Boolean)
              : null,
            displayOrder: field.displayOrder,
          })),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setName("");
      setDescription("");
      setFields([emptyField()]);
      setStatus("Template created.");
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template.");
    }
  }

  async function assignTemplate() {
    setStatus(null);
    setError(null);
    if (!businessId || !selectedClassId || !selectedTemplateId) {
      setError("Choose a class and a template.");
      return;
    }

    try {
      const response = await fetch(`/api/owner/classes/${selectedClassId}/booking-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, templateId: selectedTemplateId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setStatus("Template assigned to class.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign template.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl text-sm text-slate-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/owner/classes" className="text-sm text-slate-500 hover:text-slate-700">
              Classes
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Booking Forms</h1>
            <p className="mt-1 text-sm text-slate-500">{currentBusiness?.businessName ?? "Studio"}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadTemplates()}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {status && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div>}

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Create Template</h2>
            <div className="mt-5 grid gap-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Template name"
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description optional"
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            <div className="mt-5 grid gap-3">
              {fields.map((field, index) => (
                <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_11rem]">
                    <input
                      value={field.fieldLabel}
                      onChange={(event) => updateField(index, { fieldLabel: event.target.value })}
                      placeholder="Field label"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                    />
                    <select
                      value={field.fieldType}
                      onChange={(event) => updateField(index, { fieldType: event.target.value as FieldType })}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={field.placeholder}
                      onChange={(event) => updateField(index, { placeholder: event.target.value })}
                      placeholder="Placeholder or consent text"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                    />
                    <input
                      value={field.optionsText}
                      onChange={(event) => updateField(index, { optionsText: event.target.value })}
                      placeholder="Options, comma-separated"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                    />
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(event) => updateField(index, { isRequired: event.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setFields((prev) => [...prev, emptyField()])}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Add Field
              </button>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFields((prev) => prev.slice(0, -1))}
                  className="rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  Remove Last
                </button>
              )}
              <button
                type="button"
                onClick={() => void createTemplate()}
                className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
              >
                Save Template
              </button>
            </div>
          </section>

          <aside className="grid gap-6 self-start">
            <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Assign to Class</h2>
              <div className="mt-4 grid gap-3">
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="">Choose class</option>
                  {ownerClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.title}</option>
                  ))}
                </select>
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="">Choose template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void assignTemplate()}
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700"
                >
                  Assign
                </button>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Templates</h2>
              <div className="mt-4 grid gap-3">
                {loadingTemplates ? (
                  <p className="text-sm text-slate-400">Loading templates...</p>
                ) : templates.length === 0 ? (
                  <p className="text-sm text-slate-400">No templates yet.</p>
                ) : (
                  templates.map((template) => (
                    <div key={template.id} className="rounded-xl border border-slate-100 px-4 py-3">
                      <p className="font-black text-slate-950 dark:text-white">{template.name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {template.fields?.length ?? 0} field{(template.fields?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
