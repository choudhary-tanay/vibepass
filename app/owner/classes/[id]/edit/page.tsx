"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/appStore";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";
import { LocationInput } from "@/components/LocationInput";
import { MultiSelect } from "@/components/CustomSelect";
import type { ClassStatus } from "@/types";

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

function inputClass(hasError?: boolean) {
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h3>
    </div>
  );
}

interface ClassRow {
  id: string; business_id: string; title: string; description: string;
  category: string; instructor_name: string; staff_id: string | null;
  date: string; start_time: string; end_time: string; price: number;
  capacity: number; booked_count: number; location: string; status: string;
  tagline: string | null; what_to_expect: string | null;
  who_this_is_for: string | null; what_to_bring: string | null;
  difficulty_level: string | null; tags: string[] | null;
  image_url: string | null;
  location_type: string | null; venue_details: string | null;
  online_link: string | null; cancellation_policy: string | null;
  refund_policy_summary: string | null; featured: boolean;
  featured_request_status: "none" | "requested" | "approved" | "rejected" | null;
  featured_request_note: string | null;
  featured_requested_at: string | null;
  age_suitability: string | null;
}

export default function EditClassPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { staff, currentBusiness } = useAppStore();

  const [cls, setCls] = useState<ClassRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [confirmedBookings, setConfirmedBookings] = useState(0);

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [whatToExpect, setWhatToExpect] = useState("");
  const [whoThisIsFor, setWhoThisIsFor] = useState("");
  const [whatToBring, setWhatToBring] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [ageSuitability, setAgeSuitability] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [instructorName, setInstructorName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [locationType, setLocationType] = useState("in_person");
  const [location, setLocation] = useState("");
  const [venueDetails, setVenueDetails] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [refundPolicySummary, setRefundPolicySummary] = useState("");
  const [status, setStatus] = useState("draft");
  const [featured, setFeatured] = useState(false);
  const [featureRequested, setFeatureRequested] = useState(false);
  const [featureRequestStatus, setFeatureRequestStatus] = useState<
    "none" | "requested" | "approved" | "rejected"
  >("none");
  const [featureRequestNote, setFeatureRequestNote] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadWarning, setImageUploadWarning] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeStaff = currentBusiness
    ? staff.filter((s) => s.businessId === currentBusiness.id && s.status === "active")
    : [];
  const instructorStaff = activeStaff.filter((member) => member.userGroup !== "management");
  const selectedStaffIds = staffIds.length > 0 ? staffIds : staffId ? [staffId] : [];
  const selectedInstructorNames = selectedStaffIds
    .map((memberId) => activeStaff.find((member) => member.id === memberId)?.name)
    .filter((name): name is string => Boolean(name));

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setLoadError("Class not found.");
        setPageLoading(false);
        return;
      }

      const row = data as ClassRow;
      setCls(row);

      // Count confirmed bookings
      const [{ count }, { data: classStaffRows, error: classStaffError }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact" })
          .eq("class_id", id)
          .eq("booking_status", "confirmed"),
        supabase
          .from("class_staff")
          .select("staff_id, is_primary")
          .eq("class_id", id),
      ]);
      setConfirmedBookings(count ?? 0);
      if (!classStaffError && classStaffRows && classStaffRows.length > 0) {
        const orderedStaffIds = [...classStaffRows]
          .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)))
          .map((row) => row.staff_id as string);
        setStaffIds(orderedStaffIds);
      }

      // Pre-fill fields
      setTitle(row.title);
      setTagline(row.tagline ?? "");
      setDescription(row.description);
      setWhatToExpect(row.what_to_expect ?? "");
      setWhoThisIsFor(row.who_this_is_for ?? "");
      setWhatToBring(row.what_to_bring ?? "");
      setDifficultyLevel(row.difficulty_level ?? "");
      setCategory(row.category);
      setTagsInput((row.tags ?? []).join(", "));
      setAgeSuitability(row.age_suitability ?? "");
      setStaffId(row.staff_id ?? "");
      if (!classStaffRows || classStaffRows.length === 0) {
        setStaffIds(row.staff_id ? [row.staff_id] : []);
      }
      setInstructorName(row.instructor_name);
      setDate(row.date);
      setStartTime(row.start_time);
      setEndTime(row.end_time);
      setPrice(String(row.price));
      setCapacity(String(row.capacity));
      setLocationType(row.location_type ?? "in_person");
      setLocation(row.location);
      setVenueDetails(row.venue_details ?? "");
      setOnlineLink(row.online_link ?? "");
      setCancellationPolicy(row.cancellation_policy ?? "");
      setRefundPolicySummary(row.refund_policy_summary ?? "");
      setStatus(row.status);
      setFeatured(row.featured ?? false);
      setFeatureRequestStatus(row.featured_request_status ?? "none");
      setFeatureRequested(row.featured_request_status === "requested");
      setFeatureRequestNote(row.featured_request_note ?? "");
      setImageUrl(row.image_url ?? "");

      setPageLoading(false);
    }
    load();
  }, [id]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required.";
    if (!description.trim()) e.description = "Description is required.";
    if (!category) e.category = "Category is required.";
    if (!instructorName.trim()) e.instructorName = "Instructor name is required.";
    if (!date) e.date = "Date is required.";
    if (!startTime) e.startTime = "Start time is required.";
    if (!endTime) e.endTime = "End time is required.";
    else if (endTime <= startTime) e.endTime = "End time must be after start time.";
    if (price === "" || isNaN(Number(price))) e.price = "Valid price is required.";
    else if (Number(price) < 0) e.price = "Price cannot be negative.";
    if (!capacity || Number(capacity) < 1) e.capacity = "Capacity must be at least 1.";
    if (Number(capacity) < confirmedBookings) e.capacity = `Cannot reduce below ${confirmedBookings} confirmed bookings.`;
    if (!location.trim()) e.location = "Location is required.";
    if ((locationType === "online" || locationType === "hybrid") && !onlineLink.trim())
      e.onlineLink = "Online link is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleInstructorSelection(values: string[]) {
    const names = values
      .map((memberId) => activeStaff.find((member) => member.id === memberId)?.name)
      .filter((name): name is string => Boolean(name));

    setStaffIds(values);
    setStaffId(values[0] ?? "");
    setInstructorName(names.join(", "));
    if (errors.instructorName) setErrors((p) => ({ ...p, instructorName: "" }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function uploadImage(): Promise<string | undefined> {
    if (!imageFile) return undefined;
    setUploadingImage(true);
    setImageUploadWarning(null);
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
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
    if (!cls) return;
    if (!validate()) return;
    if (currentBusiness?.status !== "active" && status === "published") {
      setSaveError("Your business needs admin approval before public classes can be published. Save this as a draft for now.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const newImageUrl = await uploadImage();
    const tags = tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : null;
    const nextFeatureRequestStatus = featureRequested
      ? "requested"
      : featureRequestStatus === "requested"
        ? "none"
        : featureRequestStatus;

    const primaryStaffId = (selectedStaffIds[0] ?? staffId) || null;
    const displayInstructorName = instructorName.trim() || selectedInstructorNames.join(", ");

    const { error } = await supabase
      .from("classes")
      .update({
        title: title.trim(),
        tagline: tagline.trim() || null,
        description: description.trim(),
        what_to_expect: whatToExpect.trim() || null,
        who_this_is_for: whoThisIsFor.trim() || null,
        what_to_bring: whatToBring.trim() || null,
        difficulty_level: difficultyLevel || null,
        category,
        tags: tags && tags.length > 0 ? tags : null,
        age_suitability: ageSuitability.trim() || null,
        staff_id: primaryStaffId,
        instructor_name: displayInstructorName,
        date,
        start_time: startTime,
        end_time: endTime,
        price: Number(price),
        capacity: Number(capacity),
        location_type: locationType,
        location: location.trim(),
        venue_details: venueDetails.trim() || null,
        online_link: onlineLink.trim() || null,
        cancellation_policy: cancellationPolicy.trim() || null,
        refund_policy_summary: refundPolicySummary.trim() || null,
        status: status as ClassStatus,
        featured,
        featured_request_status: nextFeatureRequestStatus,
        featured_request_note: featureRequestNote.trim() || null,
        featured_requested_at:
          featureRequested && featureRequestStatus !== "requested"
            ? new Date().toISOString()
            : cls.featured_requested_at,
        image_url: (newImageUrl ?? imageUrl.trim()) || null,
      })
      .eq("id", id);

    if (error) {
      setSaveError("Failed to save changes. Please try again.");
      setSaving(false);
      return;
    }

    const { error: deleteClassStaffError } = await supabase
      .from("class_staff")
      .delete()
      .eq("class_id", id);

    if (!deleteClassStaffError && selectedStaffIds.length > 0) {
      const { error: insertClassStaffError } = await supabase.from("class_staff").insert(
        selectedStaffIds.map((memberId, index) => ({
          class_id: id,
          staff_id: memberId,
          is_primary: index === 0,
        }))
      );
      if (insertClassStaffError) {
        console.error("Failed to save class instructors:", insertClassStaffError);
      }
    } else if (deleteClassStaffError && !deleteClassStaffError.message.toLowerCase().includes("does not exist")) {
      console.error("Failed to update class instructors:", deleteClassStaffError);
    }

    router.push("/owner/classes");
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl"><p className="text-gray-500">Loading...</p></div>
      </main>
    );
  }

  if (loadError || !cls) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-800">{loadError ?? "Class not found."}</p>
            <Link href="/owner/classes" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
              ← Back to Classes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const hasBookings = confirmedBookings > 0;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/owner/classes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            ← Back to Classes
          </Link>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Edit Class</h1>
          <p className="mt-1 text-sm text-gray-500">{cls.title}</p>
        </div>

        {hasBookings && (
          <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
            <p className="text-sm font-bold text-amber-900">
              This class has {confirmedBookings} confirmed booking{confirmedBookings !== 1 ? "s" : ""}.
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Changing the date, time, location, or price may affect customers who have already booked.
              You cannot reduce capacity below {confirmedBookings}.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="space-y-5">

              <div>
                <p className="mb-1.5 text-sm font-bold text-gray-700">Class image</p>
                {imageUploadWarning && (
                  <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    {imageUploadWarning}
                  </p>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:bg-slate-100">
                    <span className="text-sm font-semibold text-slate-700">
                      {imageFile ? imageFile.name : "Upload new image"}
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      {imageFile ? "Click to change" : "JPEG, PNG, WebP — max 5 MB"}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="sr-only" />
                  </label>
                  <div className="overflow-hidden rounded-xl bg-slate-50">
                    {imagePreview ? (
                      <div className="h-36 w-full rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${imagePreview})` }} />
                    ) : imageUrl ? (
                      <div className="h-36 w-full rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
                    ) : (
                      <ClassImageTemplate title={title || "Your class"} category={category || "Wellness"} className="h-36" />
                    )}
                  </div>
                </div>
              </div>

              <Field label="Class title" name="title" required error={errors.title}>
                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className={inputClass(!!errors.title)} />
              </Field>

              <Field label="Short tagline" name="tagline" hint="One line shown under the title">
                <input id="tagline" type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
                  className={inputClass()} />
              </Field>

              <Field label="Description" name="description" required error={errors.description}>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3} className={inputClass(!!errors.description)} />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Category" name="category" required error={errors.category}>
                  <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}
                    className={inputClass(!!errors.category)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty level" name="difficultyLevel">
                  <select id="difficultyLevel" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}
                    className={inputClass()}>
                    <option value="">Select level (optional)</option>
                    {DIFFICULTY_LEVELS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Assign instructors" name="staffIds" hint="Select one or more instructors. First selected becomes primary.">
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
                <Field label="Instructor name" name="instructorName" required error={errors.instructorName}>
                  <input type="text" value={instructorName} onChange={(e) => setInstructorName(e.target.value)}
                    className={inputClass(!!errors.instructorName)} />
                </Field>
              </div>

              <SectionHeader title="Event details" />

              <Field label="What to expect" name="whatToExpect">
                <textarea value={whatToExpect} onChange={(e) => setWhatToExpect(e.target.value)} rows={2} className={inputClass()} />
              </Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Who this is for" name="whoThisIsFor">
                  <textarea value={whoThisIsFor} onChange={(e) => setWhoThisIsFor(e.target.value)} rows={2} className={inputClass()} />
                </Field>
                <Field label="What to bring" name="whatToBring">
                  <textarea value={whatToBring} onChange={(e) => setWhatToBring(e.target.value)} rows={2} className={inputClass()} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Tags" name="tagsInput" hint="Comma-separated">
                  <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="morning, flow, beginner" className={inputClass()} />
                </Field>
                <Field label="Age suitability" name="ageSuitability">
                  <input type="text" value={ageSuitability} onChange={(e) => setAgeSuitability(e.target.value)}
                    placeholder="e.g. 18+" className={inputClass()} />
                </Field>
              </div>

              <SectionHeader title="Schedule" />

              <Field label="Date" name="date" required error={errors.date}>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className={inputClass(!!errors.date)} />
              </Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Start time" name="startTime" required error={errors.startTime}>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass(!!errors.startTime)} />
                </Field>
                <Field label="End time" name="endTime" required error={errors.endTime}>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    className={inputClass(!!errors.endTime)} />
                </Field>
              </div>

              <SectionHeader title="Pricing & capacity" />

              <div className="grid grid-cols-2 gap-5">
                <Field label="Price (₹)" name="price" required error={errors.price} hint="0 = free">
                  <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                    className={inputClass(!!errors.price)} />
                </Field>
                <Field label="Capacity" name="capacity" required error={errors.capacity}
                  hint={hasBookings ? `Min: ${confirmedBookings} (confirmed bookings)` : undefined}>
                  <input type="number" min={confirmedBookings} value={capacity} onChange={(e) => setCapacity(e.target.value)}
                    className={inputClass(!!errors.capacity)} />
                </Field>
              </div>

              <SectionHeader title="Location" />

              <Field label="Location type" name="locationType">
                <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className={inputClass()}>
                  <option value="in_person">In-person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
              <Field label="Location / address" name="location" required error={errors.location}>
                <LocationInput
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g. Studio A, Andheri West, Mumbai"
                  className={inputClass(!!errors.location)}
                />
              </Field>
              {(locationType === "in_person" || locationType === "hybrid") && (
                <Field label="Venue details" name="venueDetails">
                  <input type="text" value={venueDetails} onChange={(e) => setVenueDetails(e.target.value)} className={inputClass()} />
                </Field>
              )}
              {(locationType === "online" || locationType === "hybrid") && (
                <Field label="Online link" name="onlineLink" error={errors.onlineLink}>
                  <input type="url" value={onlineLink} onChange={(e) => setOnlineLink(e.target.value)}
                    className={inputClass(!!errors.onlineLink)} />
                </Field>
              )}

              <SectionHeader title="Policies" />

              <Field label="Cancellation policy" name="cancellationPolicy">
                <textarea value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} rows={2} className={inputClass()} />
              </Field>
              <Field label="Refund policy summary" name="refundPolicySummary">
                <textarea value={refundPolicySummary} onChange={(e) => setRefundPolicySummary(e.target.value)} rows={2} className={inputClass()} />
              </Field>

              <SectionHeader title="Publishing" />

              <Field label="Status" name="status">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass()}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="published" disabled={currentBusiness?.status !== "active"}>
                    Published (visible)
                  </option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>

              {currentBusiness && currentBusiness.status !== "active" && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Your business is {currentBusiness.status.replace("_", " ")}. Admin approval is required before publishing public classes.
                </div>
              )}

              {featured && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  This class is currently featured by admin.
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={featureRequested}
                  disabled={featured}
                  onChange={(e) => setFeatureRequested(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">
                  Request homepage featured placement
                  {featureRequestStatus !== "none" ? ` (${featureRequestStatus})` : ""}
                </span>
              </label>

              {(featureRequested || featureRequestNote) && (
                <Field label="Featured request note" name="featureRequestNote">
                  <textarea
                    value={featureRequestNote}
                    onChange={(e) => setFeatureRequestNote(e.target.value)}
                    rows={2}
                    placeholder="Why should admin feature this class?"
                    className={inputClass()}
                  />
                </Field>
              )}
            </div>

            {saveError && (
              <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={saving || uploadingImage}
                className="flex-1 rounded-full bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {uploadingImage ? "Uploading image..." : saving ? "Saving..." : "Save Changes"}
              </button>
              <Link href="/owner/classes"
                className="rounded-full border border-gray-200 px-6 py-3.5 text-center text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
