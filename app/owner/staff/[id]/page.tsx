"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { StaffRole } from "@/types";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime, isFutureDate } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Select } from "@/components/CustomSelect";

const DEFAULT_ROLES: { value: string; label: string }[] = [
  { value: "instructor", label: "Instructor" },
  { value: "trainer", label: "Trainer" },
  { value: "assistant", label: "Assistant" },
  { value: "manager", label: "Manager" },
];

const ROLE_COLOR = "#6366f1";

function roleOption(roleName: string, color?: string) {
  return { value: roleName, label: roleName, color };
}

function inputClass(hasError?: boolean) {
  return `w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
    hasError ? "border-red-400" : "border-gray-200"
  }`;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { staff, classes, updateStaff, updateClass, cancelClassWithBookings, deactivateStaff, reactivateStaff, loading } = useAppStore();

  const member = staff.find((s) => s.id === id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("instructor");
  const [userGroup, setUserGroup] = useState<"instructor" | "management">("instructor");
  const [imageUrl, setImageUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [specialtiesInput, setSpecialtiesInput] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [publicProfileVisible, setPublicProfileVisible] = useState(false);
  const [customRoles, setCustomRoles] = useState<{ value: string; label: string; color?: string }[]>(DEFAULT_ROLES);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [showDeactivateWarning, setShowDeactivateWarning] = useState(false);
  const [deactivateAction, setDeactivateAction] = useState<"reassign" | "cancel" | "none">("none");
  const [reassignToId, setReassignToId] = useState<string>("");
  const [deactivateResult, setDeactivateResult] = useState<string | null>(null);

  // Load custom roles for this business
  useEffect(() => {
    if (!member) return;
    supabase
      .from("business_staff_roles")
      .select("role_name, color")
      .eq("business_id", member.businessId)
      .order("role_name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const loaded = data.map((r) => roleOption(r.role_name, r.color ?? undefined));
          const merged = [...DEFAULT_ROLES];
          for (const staffRole of loaded) {
            if (!merged.some((item) => item.value.toLowerCase() === staffRole.value.toLowerCase())) {
              merged.push(staffRole);
            }
          }
          setCustomRoles(merged);
        }
      });
  }, [member?.businessId]);

  useEffect(() => {
    if (member) {
      queueMicrotask(() => {
        setName(member.name);
        setEmail(member.email);
        setPhone(member.phone);
        setRole(member.role);
        setUserGroup(member.userGroup ?? "instructor");
        setImageUrl(member.imageUrl ?? "");
        setPhotoFile(null);
        setPhotoPreview(null);
        setBio(member.bio ?? "");
        setSpecialtiesInput((member.specialties ?? []).join(", "));
        setExperienceYears(member.experienceYears != null ? String(member.experienceYears) : "");
        setInstagramUrl(member.instagramUrl ?? "");
        setWebsiteUrl(member.websiteUrl ?? "");
        setPublicProfileVisible(member.publicProfileVisible ?? false);
      });
    }
  }, [member]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">Staff member not found.</p>
            <Link href="/owner/staff" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
              ← Back to Staff
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const assignedClasses = classes
    .filter((c) => c.staffId === id || c.staffIds?.includes(id))
    .sort((a, b) => a.date.localeCompare(b.date));
  const futureClasses = assignedClasses.filter((c) => c.date >= today);

  async function createCustomRole(label: string) {
    const roleName = label.trim();
    if (!roleName || !member) return roleName;

    const { error } = await supabase.from("business_staff_roles").insert({
      business_id: member.businessId,
      role_name: roleName,
      color: ROLE_COLOR,
    });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      console.error("Failed to save custom role:", error);
    }

    setCustomRoles((prev) => {
      if (prev.some((item) => item.value.toLowerCase() === roleName.toLowerCase())) return prev;
      return [...prev, roleOption(roleName, ROLE_COLOR)];
    });

    return roleName;
  }

  async function uploadPhoto(): Promise<string | undefined> {
    if (!photoFile) return undefined;
    setUploadingPhoto(true);
    setPhotoWarning(null);

    const ext = photoFile.name.split(".").pop() ?? "jpg";
    const path = `${id}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("profile-images")
      .upload(path, photoFile, { upsert: true });

    setUploadingPhoto(false);

    if (error || !data) {
      const errorMessage = error?.message ?? "Profile photo upload failed.";
      setPhotoWarning(
        errorMessage.toLowerCase().includes("bucket")
          ? "Photo upload skipped because the profile-images bucket is missing. Run supabase/phase11-admin-safety-storage.sql, then try again."
          : "Photo upload skipped. The rest of the profile can still be saved."
      );
      return undefined;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-images").getPublicUrl(data.path);

    return publicUrl;
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setSaveError("Name is required."); return; }
    setSaving(true); setSaveError(null); setSaved(false);

    const specialties = specialtiesInput
      ? specialtiesInput.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const uploadedPhotoUrl = await uploadPhoto();

    const ok = await updateStaff(id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      userGroup,
      imageUrl: (uploadedPhotoUrl ?? imageUrl.trim()) || undefined,
      bio: bio.trim() || undefined,
      specialties,
      experienceYears: experienceYears ? Number(experienceYears) : undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      publicProfileVisible,
    });

    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setSaveError("Failed to save. Please try again.");
  }

  async function handleDeactivate() {
    setDeactivating(true);
    setDeactivateResult(null);

    // Handle future classes first
    if (futureClasses.length > 0 && deactivateAction !== "none") {
      if (deactivateAction === "cancel") {
        // Cancel classes + cascade-cancel all their bookings, reset revenue
        const results = await Promise.all(futureClasses.map((cls) => cancelClassWithBookings(cls.id)));
        const totalBookingsCancelled = results.reduce((sum, r) => sum + (r.cancelledBookings ?? 0), 0);
        const suffix = totalBookingsCancelled > 0
          ? ` (${totalBookingsCancelled} booking${totalBookingsCancelled !== 1 ? "s" : ""} also cancelled)`
          : "";
        setDeactivateResult(`${futureClasses.length} upcoming class${futureClasses.length !== 1 ? "es" : ""} cancelled${suffix}.`);
      } else if (deactivateAction === "reassign" && reassignToId) {
        const newStaff = staff.find((s) => s.id === reassignToId);
        await Promise.all(futureClasses.map((cls) =>
          updateClass(cls.id, {
            staffId: reassignToId,
            instructorName: newStaff?.name ?? cls.instructorName,
          })
        ));
        setDeactivateResult(`${futureClasses.length} class${futureClasses.length !== 1 ? "es" : ""} reassigned to ${newStaff?.name ?? "selected staff"}.`);
      }
    }

    await deactivateStaff(id);
    setDeactivating(false);
    setShowDeactivateWarning(false);
  }

  async function handleReactivate() {
    setDeactivating(true);
    await reactivateStaff(id);
    setDeactivating(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <Link href="/owner/staff" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            ← Back to Staff
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
              member.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {member.status}
            </span>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave}>
          <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Basic info</h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Full Name *">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass()} />
              </Field>
              <Field label="User group" hint="Management can create classes and assign instructors.">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "instructor", label: "Instructor" },
                    { value: "management", label: "Management" },
                  ].map((group) => (
                    <button
                      key={group.value}
                      type="button"
                      onClick={() => setUserGroup(group.value as "instructor" | "management")}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-black transition ${
                        userGroup === group.value
                          ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Role">
                <Select
                  options={customRoles}
                  value={role}
                  onChange={(v) => setRole(v as StaffRole)}
                  allowCreate
                  createLabel="+ Add new role"
                  onCreate={createCustomRole}
                />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass()} />
              </Field>
              <Field label="Phone">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass()} />
              </Field>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h2 className="mb-4 text-base font-bold text-gray-900">Instructor profile</h2>
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-bold text-gray-700">
                    Profile photo
                  </p>
                  {photoWarning && (
                    <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                      {photoWarning}
                    </p>
                  )}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white text-xl font-black text-blue-700 shadow-sm">
                      {photoPreview || imageUrl ? (
                        <img
                          src={photoPreview ?? imageUrl}
                          alt={name || "Staff profile"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (name || "ST").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="space-y-3">
                      <label className="inline-flex w-fit cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        {photoFile ? "Change photo" : "Upload photo"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handlePhotoChange}
                          className="sr-only"
                        />
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Or paste image URL"
                        className={inputClass()}
                      />
                    </div>
                  </div>
                </div>

                <Field label="Bio">
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                    placeholder="Tell customers about this instructor background and teaching style..."
                    className={`${inputClass()} resize-none`} />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Specialties" hint="Comma-separated, e.g. Vinyasa, Meditation">
                    <input type="text" value={specialtiesInput} onChange={(e) => setSpecialtiesInput(e.target.value)}
                      placeholder="Vinyasa, Hot Yoga, Meditation" className={inputClass()} />
                  </Field>
                  <Field label="Years of experience">
                    <input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="e.g. 5" className={inputClass()} />
                  </Field>
                  <Field label="Instagram handle or URL">
                    <input type="text" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="@username or full URL" className={inputClass()} />
                  </Field>
                  <Field label="Website / link">
                    <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://..." className={inputClass()} />
                  </Field>
                </div>

                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={publicProfileVisible}
                    onChange={(e) => setPublicProfileVisible(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Show public instructor profile</p>
                    <p className="text-xs text-gray-400">
                      When enabled, customers can view this instructor profile page from class listings.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {saveError && (
            <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</div>
          )}
          {saved && (
            <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              Changes saved successfully.
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={saving || uploadingPhoto}
              className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {uploadingPhoto ? "Uploading photo..." : saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Assigned classes */}
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Assigned Classes ({assignedClasses.length})
          </h2>
          {assignedClasses.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">No classes assigned yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3.5 font-medium text-gray-500">Class</th>
                    <th className="px-5 py-3.5 font-medium text-gray-500">Date</th>
                    <th className="px-5 py-3.5 font-medium text-gray-500">Time</th>
                    <th className="px-5 py-3.5 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assignedClasses.map((cls) => (
                    <tr key={cls.id} className={!isFutureDate(cls.date) ? "opacity-50" : ""}>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{cls.title}</td>
                      <td className="px-5 py-3.5 text-gray-600">{formatDate(cls.date)}</td>
                      <td className="px-5 py-3.5 text-gray-600">{formatTime(cls.startTime)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          cls.status === "published" ? "bg-green-100 text-green-700"
                            : cls.status === "cancelled" ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-500"
                        }`}>{cls.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deactivate / Reactivate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {member.status === "active" ? (
            <>
              <h3 className="text-base font-black text-slate-900">Deactivate Staff Member</h3>
              <p className="mt-1 text-sm text-slate-500">Deactivated staff cannot be assigned to new classes.</p>

              {deactivateResult && (
                <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  ✓ {deactivateResult}
                </div>
              )}

              {!showDeactivateWarning ? (
                <button
                  onClick={() => { setShowDeactivateWarning(true); setDeactivateAction(futureClasses.length > 0 ? "reassign" : "none"); }}
                  disabled={deactivating}
                  className="mt-4 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Deactivate
                </button>
              ) : (
                <div className="mt-4 space-y-4">
                  {futureClasses.length > 0 ? (
                    <>
                      <div className="rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                        <p className="text-sm font-bold text-amber-900">
                          ⚠ {member.name} has {futureClasses.length} upcoming class{futureClasses.length !== 1 ? "es" : ""}.
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700">Choose what happens to those classes:</p>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        {[
                          { value: "reassign", label: "Reassign to another staff member" },
                          { value: "cancel", label: "Cancel all upcoming classes" },
                          { value: "none", label: "Leave as-is (unassign staff but keep classes)" },
                        ].map((opt) => (
                          <label key={opt.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                            deactivateAction === opt.value ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                          }`}>
                            <input
                              type="radio"
                              name="deactivate_action"
                              value={opt.value}
                              checked={deactivateAction === opt.value}
                              onChange={() => setDeactivateAction(opt.value as "reassign" | "cancel" | "none")}
                              className="mt-0.5"
                            />
                            <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      {/* Reassign dropdown */}
                      {deactivateAction === "reassign" && (
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Reassign to:</label>
                          <select
                            value={reassignToId}
                            onChange={(e) => setReassignToId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                          >
                            <option value="">Select staff member…</option>
                            {staff.filter((s) => s.id !== id && s.status === "active" && s.businessId === member.businessId).map((s) => (
                              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">No upcoming classes. Deactivating will remove this member from future assignments.</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleDeactivate}
                      disabled={deactivating || (deactivateAction === "reassign" && !reassignToId)}
                      className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deactivating ? "Deactivating…" : "Confirm Deactivation"}
                    </button>
                    <button
                      onClick={() => setShowDeactivateWarning(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-base font-black text-slate-900">Reactivate Staff Member</h3>
              <p className="mt-1 text-sm text-slate-500">Allow this member to be assigned to new classes again.</p>
              <button onClick={handleReactivate} disabled={deactivating}
                className="mt-4 rounded-xl border border-green-200 px-5 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 disabled:opacity-60">
                {deactivating ? "Reactivating…" : "Reactivate"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
