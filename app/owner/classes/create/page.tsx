"use client";

import Link from "next/link";
import { useState } from "react";
import type { Class, ClassStatus } from "@/types";
import { useAppStore } from "@/lib/appStore";
import { ClassImageTemplate, type ClassArtworkVariant } from "@/components/ClassImageTemplate";
import { LocationInput } from "@/components/LocationInput";
import { supabase } from "@/lib/supabaseClient";
import { MultiSelect } from "@/components/CustomSelect";

const CATEGORIES = [
  "Yoga", "Fitness", "Pilates", "Dance", "Martial Arts",
  "Swimming", "Cycling", "Meditation", "Wellness", "Other",
];

const DIFFICULTY_LEVELS = [
  { value: "all_levels", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const COVER_TEXT_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Ink", value: "#0f172a" },
  { label: "Teal", value: "#5eead4" },
  { label: "Gold", value: "#fbbf24" },
  { label: "Rose", value: "#fb7185" },
  { label: "Sky", value: "#7dd3fc" },
];

interface FormData {
  title: string; tagline: string; description: string;
  whatToExpect: string; whoThisIsFor: string; whatToBring: string;
  difficultyLevel: string; category: string; tagsInput: string;
  ageSuitability: string;
  staffId: string; staffIds: string[]; instructorName: string; staffCommissionPercent: string;
  date: string; startTime: string; endTime: string;
  price: string; capacity: string;
  locationType: string; location: string; venueDetails: string; onlineLink: string;
  cancellationPolicy: string; refundPolicySummary: string;
  status: string; featureRequested: boolean; featureRequestNote: string;
}

const emptyForm: FormData = {
  title: "", tagline: "", description: "",
  whatToExpect: "", whoThisIsFor: "", whatToBring: "",
  difficultyLevel: "", category: "", tagsInput: "", ageSuitability: "",
  staffId: "", staffIds: [], instructorName: "", staffCommissionPercent: "0",
  date: "", startTime: "", endTime: "",
  price: "", capacity: "",
  locationType: "in_person", location: "", venueDetails: "", onlineLink: "",
  cancellationPolicy: "", refundPolicySummary: "",
  status: "draft", featureRequested: false, featureRequestNote: "",
};

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
    hasError ? "border-red-400" : "border-gray-200"
  }`;
}

function Field({ label, name, required, error, hint, children }: {
  label: string; name: string; required?: boolean;
  error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-bold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

export default function CreateClassPage() {
  const { addClass, currentBusiness, staff, classes, loading } = useAppStore();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadWarning, setImageUploadWarning] = useState<string | null>(null);
  const [coverArtworkVariant, setCoverArtworkVariant] =
    useState<ClassArtworkVariant>("primary");
  const [coverTextColor, setCoverTextColor] = useState("#ffffff");

  const activeStaff = currentBusiness
    ? staff.filter((s) => s.businessId === currentBusiness.id && s.status === "active")
    : [];
  const instructorStaff = activeStaff.filter((member) => member.userGroup !== "management");
  const selectedStaffIds = form.staffIds.length > 0 ? form.staffIds : form.staffId ? [form.staffId] : [];
  const selectedStaff = activeStaff.find((s) => s.id === selectedStaffIds[0]);
  const selectedInstructors = selectedStaffIds
    .map((staffId) => activeStaff.find((s) => s.id === staffId))
    .filter((member): member is (typeof activeStaff)[number] => Boolean(member));
  const selectedInstructorNames = selectedInstructors.map((member) => member.name);
  const displayInstructorName =
    form.instructorName || selectedInstructorNames.join(", ") || selectedStaff?.name || "";

  const scheduleConflict =
    selectedStaffIds.length > 0 && form.date
      ? classes.some(
          (c) =>
            c.date === form.date &&
            c.status !== "cancelled" &&
            selectedStaffIds.some((staffId) => c.staffId === staffId || c.staffIds?.includes(staffId))
        )
      : false;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: undefined as unknown as string }));
  }

  function handleInstructorSelection(values: string[]) {
    const names = values
      .map((staffId) => activeStaff.find((member) => member.id === staffId)?.name)
      .filter((name): name is string => Boolean(name));

    setForm((prev) => ({
      ...prev,
      staffIds: values,
      staffId: values[0] ?? "",
      instructorName: names.join(", "),
    }));
    if (errors.instructorName) setErrors((p) => ({ ...p, instructorName: undefined as unknown as string }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Class title is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.category) e.category = "Please select a category.";
    if (!displayInstructorName.trim()) e.instructorName = "Instructor name is required.";
    if (!form.date) e.date = "Date is required.";
    if (!form.startTime) e.startTime = "Start time is required.";
    if (!form.endTime) e.endTime = "End time is required.";
    else if (form.startTime && form.endTime <= form.startTime) e.endTime = "End time must be after start time.";
    if (form.price === "") e.price = "Price is required.";
    else if (Number(form.price) < 0) e.price = "Price cannot be negative.";
    if (!form.capacity) e.capacity = "Capacity is required.";
    else if (Number(form.capacity) < 1) e.capacity = "Capacity must be at least 1.";
    if (!form.location.trim()) e.location = "Location is required.";
    if (form.locationType === "online" || form.locationType === "hybrid") {
      if (!form.onlineLink.trim()) e.onlineLink = "Online link is required for online/hybrid classes.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function uploadImage(): Promise<string | undefined> {
    if (!imageFile) return undefined;
    setUploadingImage(true);
    setImageUploadWarning(null);
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("class-images")
      .upload(path, imageFile, { upsert: false });
    setUploadingImage(false);
    if (error || !data) {
      console.error("Image upload failed:", error);
      const errorMessage = error?.message ?? "Image upload failed.";
      setImageUploadWarning(
        errorMessage.toLowerCase().includes("bucket")
          ? "Image upload skipped because the class-images bucket is missing. Run supabase/phase11-admin-safety-storage.sql, then try uploading again. The class can still be saved with the fallback image."
          : "Image upload skipped. The class can still be saved with the fallback image."
      );
      return undefined;
    }
    const { data: { publicUrl } } = supabase.storage
      .from("class-images")
      .getPublicUrl(data.path);
    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) { setSaveError("No business found. Please log in as an owner."); return; }
    if (!validate()) return;
    if (currentBusiness.status !== "active" && form.status === "published") {
      setSaveError("Your business needs admin approval before public classes can be published. Save this as a draft for now.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    const imageUrl = await uploadImage();

    const tags = form.tagsInput
      ? form.tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const newClass: Omit<Class, "id" | "bookedCount"> = {
      businessId: currentBusiness.id,
      title: form.title,
      description: form.description,
      category: form.category,
      instructorName: displayInstructorName,
      staffId: selectedStaffIds[0] ?? null,
      staffIds: selectedStaffIds,
      // @ts-expect-error staffCommissionPercent is new column from phase13 migration
      staffCommissionPercent: Number(form.staffCommissionPercent) || 0,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      price: Number(form.price),
      capacity: Number(form.capacity),
      location: form.location,
      status: form.status as ClassStatus,
      tagline: form.tagline || undefined,
      whatToExpect: form.whatToExpect || undefined,
      whoThisIsFor: form.whoThisIsFor || undefined,
      whatToBring: form.whatToBring || undefined,
      difficultyLevel: form.difficultyLevel || undefined,
      tags,
      ageSuitability: form.ageSuitability || undefined,
      locationType: form.locationType,
      venueDetails: form.venueDetails || undefined,
      onlineLink: form.onlineLink || undefined,
      cancellationPolicy: form.cancellationPolicy || undefined,
      refundPolicySummary: form.refundPolicySummary || undefined,
      featured: false,
      featureRequested: form.featureRequested,
      featureRequestNote: form.featureRequestNote || undefined,
      imageUrl,
    };

    const success = await addClass(newClass);
    if (!success) { setSaveError("Failed to save the class. Please try again."); setSaving(false); return; }
    setSubmitted(true);
  }

  function handleReset() {
    setForm(emptyForm); setErrors({}); setSubmitted(false);
    setSaveError(null); setImagePreview(null); setImageFile(null); setImageUploadWarning(null);
    setCoverArtworkVariant("primary"); setCoverTextColor("#ffffff");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg"><p className="text-gray-500">Loading...</p></div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Class Created!</h2>
            <p className="mb-8 text-gray-500">
              <span className="font-medium text-gray-800">{form.title}</span> saved as{" "}
              <span className="font-medium capitalize">{form.status}</span>.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={handleReset} className="rounded-full bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700">
                Create Another Class
              </button>
              <Link href="/owner/classes" className="text-sm text-gray-500 hover:text-gray-700">
                Back to Classes
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="visual-panel mb-6 rounded-[2.25rem] p-5 sm:p-8">
          <Link href="/owner/classes" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
            ← Back to Classes
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">
                Visual class builder
              </p>
              <h1 className="mt-2 text-4xl font-black text-slate-950 dark:text-white sm:text-6xl">
                Design a class people want to tap.
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 dark:text-slate-300">
                Pick a category, assign the staff driver, and let the cover preview shape itself before you publish.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-950 px-5 py-4 text-white">
              <p className="text-xs font-black uppercase text-indigo-200">Current status</p>
              <p className="mt-1 text-lg font-black capitalize">{form.status}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="visual-panel rounded-[2rem] p-4">
              <ClassImageTemplate
                title={form.title || "Your class"}
                category={form.category || "Wellness"}
                instructorName={displayInstructorName}
                className="min-h-72"
                artworkVariant={coverArtworkVariant}
                imageUrl={imagePreview ?? undefined}
                textColor={coverTextColor}
              />
              <div className="mt-4 rounded-[1.4rem] bg-white/70 p-4 dark:bg-slate-950/40">
                <p className="text-xs font-black uppercase text-slate-400">
                  Marketplace preview
                </p>
                <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                  {form.title || "Class title appears here"}
                </p>
                <p className="mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-300">
                  {form.category || "Pick a category"} · {displayInstructorName || "Assign instructor"}
                </p>
              </div>
            </div>

            <div className="visual-panel rounded-[2rem] p-5">
              <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-300">
                Choose class mood
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, category }))}
                    className={`touch-pill rounded-full px-4 text-sm font-black ${
                      form.category === category
                        ? "bg-indigo-600 text-white"
                        : "bg-white/75 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-950/40 dark:text-slate-300"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                No image? The category template becomes the fallback now. Later this is where AI-generated class images can plug in.
              </p>
              <div className="mt-5 grid gap-4 rounded-[1.4rem] bg-white/70 p-4 dark:bg-slate-950/40">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Artwork option
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["primary", "alternate"] as ClassArtworkVariant[]).map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => setCoverArtworkVariant(variant)}
                        className={`touch-pill rounded-full px-4 text-sm font-black capitalize ${
                          coverArtworkVariant === variant
                            ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Artwork text color
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {COVER_TEXT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setCoverTextColor(color.value)}
                        aria-label={color.label}
                        className={`h-9 w-9 rounded-full border-2 shadow-sm ${
                          coverTextColor.toLowerCase() === color.value
                            ? "border-slate-950 dark:border-white"
                            : "border-white/80 dark:border-slate-700"
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                    <label className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                      Custom
                      <input
                        type="color"
                        value={coverTextColor}
                        onChange={(e) => setCoverTextColor(e.target.value)}
                        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <form onSubmit={handleSubmit} noValidate className="min-w-0">
          <div className="space-y-6">
            {/* Image */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base font-bold text-gray-900">Cover artwork</h2>
              <p className="mb-4 text-sm text-gray-500">
                Upload a cover image or keep the category-designed fallback. Future AI image generation will connect here later.
              </p>
              {imageUploadWarning && (
                <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {imageUploadWarning}
                </p>
              )}
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:bg-slate-100">
                  <span className="text-sm font-semibold text-slate-700">
                    {imageFile ? imageFile.name : "Choose image"}
                  </span>
                  <span className="mt-1 text-xs text-slate-400">
                    {imageFile ? "Click to change" : "JPEG, PNG, WebP"}
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="sr-only" />
                </label>
                <div className="overflow-hidden rounded-xl bg-slate-50">
                  <ClassImageTemplate
                    title={form.title || "Your class"}
                    category={form.category || "Wellness"}
                    instructorName={displayInstructorName}
                    className="h-40"
                    artworkVariant={coverArtworkVariant}
                    imageUrl={imagePreview ?? undefined}
                    textColor={coverTextColor}
                  />
                </div>
              </div>
            </div>

            {/* Core details */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-base font-bold text-gray-900">Class details</h2>
              <div className="space-y-5">
                <Field label="Class title" name="title" required error={errors.title}>
                  <input id="title" name="title" type="text" value={form.title} onChange={handleChange}
                    placeholder="e.g. Morning Vinyasa Flow" className={inputClass(!!errors.title)} />
                </Field>

                <Field label="Short tagline" name="tagline" hint="One line shown under the title">
                  <input id="tagline" name="tagline" type="text" value={form.tagline} onChange={handleChange}
                    placeholder="e.g. A grounding flow to start your day" className={inputClass(false)} />
                </Field>

                <Field label="Description" name="description" required error={errors.description}>
                  <textarea id="description" name="description" value={form.description} onChange={handleChange}
                    rows={3} placeholder="Describe what customers can expect..."
                    className={inputClass(!!errors.description)} />
                </Field>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Category" name="category" required error={errors.category}>
                    <select id="category" name="category" value={form.category} onChange={handleChange}
                      className={inputClass(!!errors.category)}>
                      <option value="">Select category</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>

                  <Field label="Difficulty level" name="difficultyLevel">
                    <select id="difficultyLevel" name="difficultyLevel" value={form.difficultyLevel} onChange={handleChange}
                      className={inputClass(false)}>
                      <option value="">Select level (optional)</option>
                      {DIFFICULTY_LEVELS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Assign instructors" name="staffIds" hint={instructorStaff.length === 0 ? "Add instructor staff first" : "Select one or more instructors. First selected becomes primary."}>
                    <MultiSelect
                      options={instructorStaff.map((s) => ({
                        value: s.id,
                        label: s.name,
                        description: `${s.role} · ${s.userGroup ?? "instructor"}`,
                      }))}
                      values={selectedStaffIds}
                      onChange={handleInstructorSelection}
                      placeholder="Select instructors"
                    />
                  </Field>

                  <Field label="Instructor name" name="instructorName" required error={errors.instructorName}
                    hint="Shown to customers">
                    <input id="instructorName" name="instructorName" type="text" value={form.instructorName}
                      onChange={handleChange} placeholder={selectedInstructorNames.join(", ") || "e.g. Priya Sharma"}
                      className={inputClass(!!errors.instructorName)} />
                  </Field>
                </div>

                {selectedStaffIds.length > 0 && (
                  <Field label="Staff commission %" name="staffCommissionPercent"
                    hint="Percentage of class revenue paid to the primary instructor">
                    <div className="relative">
                      <input id="staffCommissionPercent" name="staffCommissionPercent" type="number"
                        min="0" max="100" step="0.5" value={form.staffCommissionPercent}
                        onChange={handleChange} placeholder="0" className={`${inputClass(false)} pr-10`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                    </div>
                    {Number(form.staffCommissionPercent) > 0 && Number(form.price) > 0 && (
                      <p className="mt-1 text-xs text-indigo-600">
                        On a ₹{Number(form.price).toLocaleString("en-IN")} class: staff earns ₹{(Number(form.price) * Number(form.staffCommissionPercent) / 100).toFixed(0)}
                      </p>
                    )}
                  </Field>
                )}

                {scheduleConflict && (
                  <div className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    This staff member already has a class on this date. You can still save — just a reminder.
                  </div>
                )}

                <SectionHeader title="Event details" subtitle="Help customers understand what to expect." />

                <Field label="What to expect" name="whatToExpect">
                  <textarea id="whatToExpect" name="whatToExpect" value={form.whatToExpect} onChange={handleChange}
                    rows={2} placeholder="e.g. A 60-minute flow combining breathwork and movement..."
                    className={inputClass(false)} />
                </Field>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Who this is for" name="whoThisIsFor">
                    <textarea id="whoThisIsFor" name="whoThisIsFor" value={form.whoThisIsFor} onChange={handleChange}
                      rows={2} placeholder="e.g. All levels welcome, suitable for beginners"
                      className={inputClass(false)} />
                  </Field>
                  <Field label="What to bring" name="whatToBring">
                    <textarea id="whatToBring" name="whatToBring" value={form.whatToBring} onChange={handleChange}
                      rows={2} placeholder="e.g. Yoga mat, water bottle, comfortable clothes"
                      className={inputClass(false)} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Tags" name="tagsInput" hint="Comma-separated, e.g. morning, flow, beginner">
                    <input id="tagsInput" name="tagsInput" type="text" value={form.tagsInput} onChange={handleChange}
                      placeholder="morning, high-energy, flow" className={inputClass(false)} />
                  </Field>
                  <Field label="Age suitability" name="ageSuitability">
                    <input id="ageSuitability" name="ageSuitability" type="text" value={form.ageSuitability}
                      onChange={handleChange} placeholder="e.g. 18+" className={inputClass(false)} />
                  </Field>
                </div>

                <SectionHeader title="Schedule" />

                <Field label="Date" name="date" required error={errors.date}>
                  <input id="date" name="date" type="date" value={form.date} onChange={handleChange}
                    className={inputClass(!!errors.date)} />
                </Field>

                <div className="grid grid-cols-2 gap-5">
                  <Field label="Start time" name="startTime" required error={errors.startTime}>
                    <input id="startTime" name="startTime" type="time" value={form.startTime} onChange={handleChange}
                      className={inputClass(!!errors.startTime)} />
                  </Field>
                  <Field label="End time" name="endTime" required error={errors.endTime}>
                    <input id="endTime" name="endTime" type="time" value={form.endTime} onChange={handleChange}
                      className={inputClass(!!errors.endTime)} />
                  </Field>
                </div>

                <SectionHeader title="Pricing & capacity" />

                <div className="grid grid-cols-2 gap-5">
                  <Field label="Price (₹)" name="price" required error={errors.price} hint="Enter 0 for free classes">
                    <input id="price" name="price" type="number" min="0" value={form.price} onChange={handleChange}
                      placeholder="e.g. 500" className={inputClass(!!errors.price)} />
                  </Field>
                  <Field label="Capacity" name="capacity" required error={errors.capacity} hint="Max students">
                    <input id="capacity" name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange}
                      placeholder="e.g. 20" className={inputClass(!!errors.capacity)} />
                  </Field>
                </div>

                <SectionHeader title="Location" />

                <Field label="Location type" name="locationType">
                  <select id="locationType" name="locationType" value={form.locationType} onChange={handleChange}
                    className={inputClass(false)}>
                    <option value="in_person">In-person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid (in-person + online)</option>
                  </select>
                </Field>

                <Field label="Location / address" name="location" required error={errors.location}>
                  <LocationInput
                    id="location"
                    value={form.location}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, location: val }))
                    }
                    placeholder="e.g. Studio A, Andheri West, Mumbai"
                    className={inputClass(!!errors.location)}
                  />
                </Field>

                {(form.locationType === "in_person" || form.locationType === "hybrid") && (
                  <Field label="Venue details" name="venueDetails" hint="Parking, floor, landmark, etc.">
                    <input id="venueDetails" name="venueDetails" type="text" value={form.venueDetails}
                      onChange={handleChange} placeholder="e.g. 2nd floor, near the elevator"
                      className={inputClass(false)} />
                  </Field>
                )}

                {(form.locationType === "online" || form.locationType === "hybrid") && (
                  <Field label="Online meeting link" name="onlineLink" required error={errors.onlineLink}>
                    <input id="onlineLink" name="onlineLink" type="url" value={form.onlineLink} onChange={handleChange}
                      placeholder="https://meet.google.com/..." className={inputClass(!!errors.onlineLink)} />
                  </Field>
                )}

                <SectionHeader title="Policies" />

                <Field label="Cancellation policy" name="cancellationPolicy">
                  <textarea id="cancellationPolicy" name="cancellationPolicy" value={form.cancellationPolicy}
                    onChange={handleChange} rows={2}
                    placeholder="e.g. Cancellations accepted up to 24 hours before the class."
                    className={inputClass(false)} />
                </Field>

                <Field label="Refund policy summary" name="refundPolicySummary">
                  <textarea id="refundPolicySummary" name="refundPolicySummary" value={form.refundPolicySummary}
                    onChange={handleChange} rows={2}
                    placeholder="e.g. Full refund if cancelled 24 hours before. No refund for no-shows."
                    className={inputClass(false)} />
                </Field>

                <SectionHeader title="Publishing" />

                <Field label="Status" name="status" required hint="Draft classes are not visible to customers">
                  <select id="status" name="status" value={form.status} onChange={handleChange}
                    className={inputClass(false)}>
                    <option value="draft">Draft (hidden)</option>
                    <option value="published" disabled={currentBusiness?.status !== "active"}>
                      Published (visible)
                    </option>
                  </select>
                </Field>

                {currentBusiness && currentBusiness.status !== "active" && (
                  <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Your business is {currentBusiness.status.replace("_", " ")}. Admin approval is required before publishing public classes.
                  </div>
                )}

                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" name="featureRequested" checked={form.featureRequested} onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Request homepage featured placement
                  </span>
                </label>

                {form.featureRequested && (
                  <Field label="Featured request note" name="featureRequestNote" hint="Tell admin why this class should be highlighted">
                    <textarea
                      id="featureRequestNote"
                      name="featureRequestNote"
                      value={form.featureRequestNote}
                      onChange={handleChange}
                      rows={2}
                      placeholder="e.g. Launch event, high demand, special guest instructor"
                      className={inputClass(false)}
                    />
                  </Field>
                )}
              </div>

              {saveError && (
                <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{saveError}</p>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="submit" disabled={saving || uploadingImage}
                  className="flex-1 rounded-full bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                  {uploadingImage ? "Uploading image..." : saving ? "Saving..." : "Create Class"}
                </button>
                <Link href="/owner/classes"
                  className="rounded-full border border-gray-200 px-6 py-3.5 text-center text-sm font-bold text-gray-600 hover:bg-gray-50">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
      </div>
    </main>
  );
}
