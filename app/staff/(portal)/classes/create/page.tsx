"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { ClassImageTemplate, type ClassArtworkVariant } from "@/components/ClassImageTemplate";
import { MultiSelect } from "@/components/CustomSelect";
import { supabase } from "@/lib/supabaseClient";
import {
  StructuredPolicyEditor,
  defaultPolicyValue,
  policyCutoffHours,
  policySummaries,
  type StructuredPolicyValue,
} from "@/components/StructuredPolicyEditor";

const CATEGORIES = [
  "Yoga", "Fitness", "Pilates", "Dance", "Martial Arts",
  "Swimming", "Cycling", "Meditation", "Wellness", "Other",
];

const DIFFICULTY_LEVELS = [
  { value: "", label: "Any level (optional)" },
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

function inputClass(hasError = false) {
  return `w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-sm ${
    hasError ? "border-red-400 focus:ring-red-300" : "border-slate-200"
  }`;
}

function Field({
  label, name, required, error, hint, children,
}: {
  label: string; name: string; required?: boolean;
  error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-bold text-slate-700">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function StaffProposeClassPage() {
  const router = useRouter();
  const { profile, staff, loading } = useAppStore();
  const currentStaff = staff.find(
    (member) => profile?.email && member.email.toLowerCase() === profile.email.toLowerCase()
  );
  const isManagement = currentStaff?.userGroup === "management" || profile?.role === "admin";
  const canManageClasses = isManagement;
  const instructorOptions = staff
    .filter(
      (member) =>
        member.businessId === currentStaff?.businessId &&
        member.status === "active" &&
        member.userGroup !== "management"
    )
    .map((member) => ({
      value: member.id,
      label: member.name,
      description: `${member.role} · instructor`,
    }));

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    instructorName: profile?.name ?? "",
    date: "",
    startTime: "",
    endTime: "",
    price: "0",
    capacity: "15",
    locationType: "in_person",
    location: "",
    venueDetails: "",
    onlineLink: "",
    difficultyLevel: "",
    whatToExpect: "",
    whoThisIsFor: "",
    whatToBring: "",
    cancellationPolicy: "",
    refundPolicySummary: "",
    noteToOwner: "",
    instructorIds: [] as string[],
    publishNow: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState("");
  const [submittedPublished, setSubmittedPublished] = useState(false);
  const [coverArtworkVariant, setCoverArtworkVariant] =
    useState<ClassArtworkVariant>("primary");
  const [coverTextColor, setCoverTextColor] = useState("#ffffff");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadWarning, setImageUploadWarning] = useState<string | null>(null);
  const [policyValue, setPolicyValue] = useState<StructuredPolicyValue>(() => defaultPolicyValue());

  const selectedInstructorNames = form.instructorIds
    .map((staffId) => staff.find((member) => member.id === staffId)?.name)
    .filter((name): name is string => Boolean(name));
  const displayInstructorName =
    form.instructorName || selectedInstructorNames.join(", ") || profile?.name || "Instructor";

  function handlePolicyChange(next: StructuredPolicyValue) {
    const summaries = policySummaries(next, "INR");
    setPolicyValue(next);
    setForm((prev) => ({
      ...prev,
      cancellationPolicy: summaries.cancellationPolicy,
      refundPolicySummary: summaries.refundPolicySummary,
    }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Class title is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.category) e.category = "Please choose a category.";
    if (!displayInstructorName.trim()) e.instructorName = "Instructor name is required.";
    if (!form.date) e.date = "Date is required.";
    if (!form.startTime) e.startTime = "Start time is required.";
    if (!form.endTime) e.endTime = "End time is required.";
    else if (form.endTime <= form.startTime) e.endTime = "End time must be after start time.";
    if (Number(form.price) < 0) e.price = "Price cannot be negative.";
    if (!form.capacity || Number(form.capacity) < 1) e.capacity = "Capacity must be at least 1.";
    if (!form.location.trim()) e.location = "Location is required.";
    if (form.locationType !== "in_person" && !form.onlineLink.trim())
      e.onlineLink = "Online link is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleInstructorSelection(values: string[]) {
    const names = values
      .map((staffId) => staff.find((member) => member.id === staffId)?.name)
      .filter((name): name is string => Boolean(name));

    setForm((prev) => ({
      ...prev,
      instructorIds: values,
      instructorName: names.join(", "),
    }));
    if (errors.instructorName) setErrors((p) => ({ ...p, instructorName: "" }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUploadWarning(null);
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
      const message = error?.message ?? "Image upload failed.";
      setImageUploadWarning(
        message.toLowerCase().includes("bucket")
          ? "Artwork upload skipped because the class-images bucket is missing. Run the storage SQL, then try again."
          : "Artwork upload skipped. The class can still be proposed with the category artwork."
      );
      return undefined;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("class-images").getPublicUrl(data.path);
    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError("");

    const imageUrl = await uploadImage();
    const generatedPolicySummaries = policySummaries(policyValue, "INR");

    const res = await fetch("/api/staff/classes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        category: form.category,
        instructorName: displayInstructorName,
        instructorIds: form.instructorIds,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        price: Number(form.price),
        capacity: Number(form.capacity),
        location: form.location,
        locationType: form.locationType,
        venueDetails: form.venueDetails || null,
        onlineLink: form.onlineLink || null,
        difficultyLevel: form.difficultyLevel || null,
        whatToExpect: form.whatToExpect || null,
        whoThisIsFor: form.whoThisIsFor || null,
        whatToBring: form.whatToBring || null,
        cancellationPolicy: form.cancellationPolicy || generatedPolicySummaries.cancellationPolicy,
        refundPolicySummary: form.refundPolicySummary || generatedPolicySummaries.refundPolicySummary,
        customerCancellationAllowed: policyValue.customerCancellationAllowed,
        cancellationCutoffHours: policyValue.customerCancellationAllowed ? policyCutoffHours(policyValue) : null,
        cancellationCutoffBehavior: "block",
        refundFallbackOwnerCancel: "full_refund",
        refundFallbackCustomerCancel: policyValue.customerCancellationAllowed ? "manual_review" : "no_refund",
        refundRules: policyValue.rules,
        noteToOwner: form.noteToOwner || null,
        imageUrl,
        publishImmediately: isManagement ? form.publishNow : false,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSaveError(d.error ?? "Failed to submit proposal. Please try again.");
      return;
    }
    setSubmittedTitle(form.title);
    setSubmittedPublished(isManagement && form.publishNow);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-md text-center">
          <div className="rounded-3xl bg-white p-10 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {isManagement ? "Class Created!" : "Proposal Submitted!"}
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {isManagement ? (
                submittedPublished ? (
                  <><span className="font-semibold text-slate-700">{submittedTitle}</span> has been published and is now visible to customers.</>
                ) : (
                  <><span className="font-semibold text-slate-700">{submittedTitle}</span> has been saved as a draft. You can publish it from My Classes.</>
                )
              ) : (
                <><span className="font-semibold text-slate-700">{submittedTitle}</span> has been sent to your studio owner for review. You&apos;ll be able to see the status in My Classes.</>
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setForm({
                    title: "",
                    description: "",
                    category: "",
                    instructorName: profile?.name ?? "",
                    date: "",
                    startTime: "",
                    endTime: "",
                    price: "0",
                    capacity: "15",
                    locationType: "in_person",
                    location: "",
                    venueDetails: "",
                    onlineLink: "",
                    difficultyLevel: "",
                    whatToExpect: "",
                    whoThisIsFor: "",
                    whatToBring: "",
                    cancellationPolicy: "",
                    refundPolicySummary: "",
                    noteToOwner: "",
                    instructorIds: [],
                    publishNow: true,
                  });
                  setPolicyValue(defaultPolicyValue());
                  setSaveError("");
                  setErrors({});
                  setCoverArtworkVariant("primary");
                  setCoverTextColor("#ffffff");
                  setImageFile(null);
                  setImagePreview(null);
                  setImageUploadWarning(null);
                }}
                className="rounded-xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700"
              >
                {isManagement ? "Create Another Class" : "Propose Another Class"}
              </button>
              <button onClick={() => router.push("/staff/classes")} className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
                View My Classes
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/staff/classes" className="text-sm text-slate-500 hover:text-slate-700">
            ← My Classes
          </Link>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-stretch">
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-500">Staff Portal</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">
                {isManagement ? "Create a Class" : "Propose a Class"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {isManagement
                  ? "Fill in the details below. You can publish immediately or save as a draft."
                  : "Fill in the details below. Your owner will review and approve before it goes live."}
              </p>
            </div>
            <div className="visual-panel rounded-[1.75rem] p-3">
              <ClassImageTemplate
                title={form.title || "Your class idea"}
                category={form.category || "Wellness"}
                instructorName={form.instructorName || profile?.name || "Instructor"}
                className="min-h-56"
                artworkVariant={coverArtworkVariant}
                textColor={coverTextColor}
                imageUrl={imagePreview ?? undefined}
              />
            </div>
          </div>
          {!isManagement && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3">
              <span className="text-indigo-500">ℹ</span>
              <p className="text-xs text-indigo-700 font-medium">
                Submitted classes wait for owner approval before becoming visible to customers.
              </p>
            </div>
          )}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, category }))}
                className={`touch-pill shrink-0 rounded-full px-4 text-sm font-black ${
                  form.category === category
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-indigo-700 shadow-sm hover:bg-indigo-50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 rounded-3xl bg-white p-4 shadow-sm md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex gap-2">
              {(["primary", "alternate"] as ClassArtworkVariant[]).map((variant) => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => setCoverArtworkVariant(variant)}
                  className={`touch-pill rounded-full px-4 text-sm font-black capitalize ${
                    coverArtworkVariant === variant
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-400">
                Text color
              </span>
              {COVER_TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setCoverTextColor(color.value)}
                  aria-label={color.label}
                  className={`h-9 w-9 rounded-full border-2 shadow-sm ${
                    coverTextColor.toLowerCase() === color.value
                      ? "border-slate-950"
                      : "border-white"
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
              <label className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-500">
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

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Core details */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Cover Artwork</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload class artwork or keep the designed category fallback.
              </p>
              {imageUploadWarning && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {imageUploadWarning}
                </p>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:bg-slate-100">
                  <span className="text-sm font-black text-slate-700">
                    {imageFile ? imageFile.name : "Upload artwork"}
                  </span>
                  <span className="mt-1 text-xs text-slate-400">
                    JPEG, PNG, WebP, or GIF
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>
                <ClassImageTemplate
                  title={form.title || "Your class idea"}
                  category={form.category || "Wellness"}
                  instructorName={displayInstructorName}
                  className="min-h-36"
                  artworkVariant={coverArtworkVariant}
                  textColor={coverTextColor}
                  imageUrl={imagePreview ?? undefined}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Class Details</h2>
            </div>

            <Field label="Class title" name="title" required error={errors.title}>
              <input id="title" name="title" type="text" value={form.title} onChange={handleChange}
                placeholder="e.g. Morning Vinyasa Flow" className={inputClass(!!errors.title)} />
            </Field>

            <Field label="Description" name="description" required error={errors.description}>
              <textarea id="description" name="description" value={form.description} onChange={handleChange}
                rows={3} placeholder="What will students experience in this class?"
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

              <Field label="Difficulty" name="difficultyLevel">
                <select id="difficultyLevel" name="difficultyLevel" value={form.difficultyLevel} onChange={handleChange}
                  className={inputClass()}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Field>
            </div>

            {canManageClasses && (
              <Field label="Assign instructors" name="instructorIds" hint="Select one or more instructors for this class.">
                <MultiSelect
                  options={instructorOptions}
                  values={form.instructorIds}
                  onChange={handleInstructorSelection}
                  placeholder="Select instructors"
                />
              </Field>
            )}

            <Field label="Instructor name" name="instructorName" required error={errors.instructorName} hint="Shown to customers">
              <input id="instructorName" name="instructorName" type="text" value={form.instructorName}
                onChange={handleChange} placeholder={selectedInstructorNames.join(", ") || "Your name"} className={inputClass(!!errors.instructorName)} />
            </Field>
          </div>

          {/* Additional info */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">What to Expect</h2>

            <Field label="What students will experience" name="whatToExpect" hint="Optional — shown on class detail page">
              <textarea id="whatToExpect" name="whatToExpect" value={form.whatToExpect} onChange={handleChange}
                rows={2} placeholder="e.g. A 60-minute flow combining breathwork and movement..."
                className={inputClass()} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Who this is for" name="whoThisIsFor">
                <textarea id="whoThisIsFor" name="whoThisIsFor" value={form.whoThisIsFor} onChange={handleChange}
                  rows={2} placeholder="e.g. All levels, beginners welcome" className={inputClass()} />
              </Field>
              <Field label="What to bring" name="whatToBring">
                <textarea id="whatToBring" name="whatToBring" value={form.whatToBring} onChange={handleChange}
                  rows={2} placeholder="e.g. Yoga mat, water bottle" className={inputClass()} />
              </Field>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Schedule</h2>

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

            <div className="grid grid-cols-2 gap-5">
              <Field label="Price" name="price" required error={errors.price} hint="0 for free; uses your studio operating currency">
                <input id="price" name="price" type="number" min="0" value={form.price} onChange={handleChange}
                  placeholder="500" className={inputClass(!!errors.price)} />
              </Field>
              <Field label="Capacity" name="capacity" required error={errors.capacity} hint="Max students">
                <input id="capacity" name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange}
                  placeholder="20" className={inputClass(!!errors.capacity)} />
              </Field>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Location</h2>

            <Field label="Location type" name="locationType">
              <select id="locationType" name="locationType" value={form.locationType} onChange={handleChange}
                className={inputClass()}>
                <option value="in_person">In-person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>

            <Field label="Address / venue" name="location" required error={errors.location}>
              <input id="location" name="location" type="text" value={form.location} onChange={handleChange}
                placeholder="e.g. Studio A, Andheri West, Mumbai" className={inputClass(!!errors.location)} />
            </Field>

            {(form.locationType === "in_person" || form.locationType === "hybrid") && (
              <Field label="Venue details" name="venueDetails" hint="Floor, parking, landmark">
                <input id="venueDetails" name="venueDetails" type="text" value={form.venueDetails}
                  onChange={handleChange} placeholder="e.g. 2nd floor, near elevator" className={inputClass()} />
              </Field>
            )}

            {(form.locationType === "online" || form.locationType === "hybrid") && (
              <Field label="Online meeting link" name="onlineLink" required error={errors.onlineLink}>
                <input id="onlineLink" name="onlineLink" type="url" value={form.onlineLink} onChange={handleChange}
                  placeholder="https://meet.google.com/..." className={inputClass(!!errors.onlineLink)} />
              </Field>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Policies</h2>
            <StructuredPolicyEditor
              value={policyValue}
              onChange={handlePolicyChange}
              currency="INR"
            />
          </div>

          {/* Note to owner — only for instructors */}
          {!isManagement && (
            <div className="rounded-3xl bg-indigo-50 p-6 space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-indigo-500">Note to Owner</h2>
              <p className="text-xs text-indigo-600">
                Optional — explain why you&apos;re proposing this class, any special requirements, or context for the owner.
              </p>
              <textarea
                id="noteToOwner"
                name="noteToOwner"
                value={form.noteToOwner}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. There's high demand for beginner yoga on weekday mornings. I can handle 15–20 students comfortably."
                className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          {/* Publish toggle — only for management */}
          {isManagement && (
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Publishing</h2>
              <p className="text-xs text-slate-500">Choose whether to publish this class immediately or save it as a draft.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, publishNow: true }))}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-black transition-colors ${
                    form.publishNow
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Publish immediately
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, publishNow: false }))}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-black transition-colors ${
                    !form.publishNow
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Save as draft
                </button>
              </div>
            </div>
          )}

          {saveError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="flex-1 rounded-xl bg-indigo-600 py-4 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {uploadingImage
              ? "Uploading artwork…"
              : saving
              ? isManagement ? "Saving…" : "Submitting…"
              : isManagement
              ? form.publishNow ? "Publish Class" : "Save as Draft"
              : "Submit for Owner Review"}
            </button>
            <Link
              href="/staff/classes"
              className="rounded-xl border border-slate-200 px-6 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
