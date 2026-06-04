"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/appStore";

function inputClass(hasError = false) {
  return `w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-sm ${
    hasError ? "border-red-400 focus:ring-red-300" : "border-slate-200"
  }`;
}

function ProfileEditIllustration() {
  return (
    <svg viewBox="0 0 160 160" fill="none" className="h-28 w-auto" aria-hidden="true">
      <circle cx="80" cy="80" r="70" fill="#eef2ff" />
      {/* Person */}
      <circle cx="80" cy="55" r="22" fill="#818cf8" />
      <circle cx="80" cy="55" r="16" fill="#e0e7ff" />
      {/* Face */}
      <circle cx="74" cy="52" r="2.5" fill="#6366f1" />
      <circle cx="86" cy="52" r="2.5" fill="#6366f1" />
      <path d="M74 60 Q80 65 86 60" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Body */}
      <path d="M55 105 Q60 85 80 80 Q100 85 105 105" fill="#818cf8" opacity="0.7" />
      {/* Edit pencil */}
      <rect x="98" y="38" width="26" height="8" rx="3" fill="#6366f1" transform="rotate(-45 98 38)" />
      <polygon points="88,68 92,62 95,65" fill="#6366f1" />
      <rect x="88" y="68" width="4" height="4" rx="1" fill="#fbbf24" />
    </svg>
  );
}

export default function StaffProfileEditPage() {
  const { profile } = useAppStore();

  const [form, setForm] = useState({
    name: "",
    imageUrl: "",
    bio: "",
    specialtiesInput: "",
    experienceYears: "",
    instagramUrl: "",
    websiteUrl: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoWarning, setPhotoWarning] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadStaffData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: staffRow } = await supabase
        .from("staff")
        .select("image_url, bio, specialties, experience_years, instagram_url, website_url")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();

      setForm({
        name: profile?.name ?? "",
        imageUrl: staffRow?.image_url ?? profile?.imageUrl ?? "",
        bio: staffRow?.bio ?? "",
        specialtiesInput: (staffRow?.specialties as string[] | null)?.join(", ") ?? "",
        experienceYears: staffRow?.experience_years?.toString() ?? "",
        instagramUrl: staffRow?.instagram_url ?? "",
        websiteUrl: staffRow?.website_url ?? "",
      });
      setLoading(false);
    }
    void loadStaffData();
  }, [profile]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoWarning("");
    setSaved(false);

    if (file.size > 5 * 1024 * 1024) {
      setPhotoWarning("Choose an image under 5 MB.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(): Promise<string | undefined> {
    if (!photoFile) return undefined;

    setUploadingPhoto(true);
    setPhotoWarning("");

    const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${profile?.id ?? "staff"}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("profile-images")
      .upload(path, photoFile, { upsert: true });

    setUploadingPhoto(false);

    if (error || !data) {
      setPhotoWarning(
        error?.message.toLowerCase().includes("bucket")
          ? "Photo upload skipped because the profile-images bucket is missing. Run the Phase 11 storage SQL, then try again."
          : "Photo upload skipped. Your text details can still be saved."
      );
      return undefined;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-images").getPublicUrl(data.path);

    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaved(false);

    const specialties = form.specialtiesInput
      ? form.specialtiesInput.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const uploadedPhotoUrl = await uploadPhoto();
    const nextImageUrl = (uploadedPhotoUrl ?? form.imageUrl.trim()) || null;

    const res = await fetch("/api/staff/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim() || undefined,
        imageUrl: nextImageUrl,
        bio: form.bio || null,
        specialties: specialties.length ? specialties : null,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        instagramUrl: form.instagramUrl || null,
        websiteUrl: form.websiteUrl || null,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSaveError(d.error ?? "Failed to save. Please try again.");
      return;
    }

    setForm((prev) => ({ ...prev, imageUrl: nextImageUrl ?? "" }));
    setPhotoFile(null);
    setSaved(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl">
          <p className="text-slate-400">Loading profile…</p>
        </div>
      </main>
    );
  }

  const previewImage = photoPreview ?? form.imageUrl;
  const initials = (form.name || profile?.email || "ST").slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/staff/profile" className="text-sm text-slate-500 hover:text-slate-700">
            ← My Profile
          </Link>
          <div className="mt-4 flex items-start gap-6">
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-500">Staff Portal</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">Edit Profile</h1>
              <p className="mt-2 text-sm text-slate-500">
                Update your instructor details — customers see this on your public profile.
              </p>
            </div>
            <ProfileEditIllustration />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Basic Info</h2>

            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4">
              <label className="mb-3 block text-sm font-bold text-slate-700">
                Profile photo
              </label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-indigo-100 bg-cover bg-center text-2xl font-black text-indigo-700 shadow-inner ring-1 ring-white"
                  style={previewImage ? { backgroundImage: `url(${previewImage})` } : undefined}
                  aria-label="Profile photo preview"
                >
                  {!previewImage && initials}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700">
                      {photoFile ? "Change photo" : "Upload photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handlePhotoChange}
                        className="sr-only"
                      />
                    </label>
                    {(photoFile || form.imageUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          setForm((prev) => ({ ...prev, imageUrl: "" }));
                          setSaved(false);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    value={form.imageUrl}
                    onChange={handleChange}
                    placeholder="Or paste an image URL"
                    className={inputClass()}
                  />
                  {photoWarning && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      {photoWarning}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-bold text-slate-700">
                Display name
              </label>
              <input
                id="name" name="name" type="text" value={form.name}
                onChange={handleChange} placeholder="Your full name"
                className={inputClass()}
              />
            </div>

            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-bold text-slate-700">
                Bio
              </label>
              <textarea
                id="bio" name="bio" value={form.bio} onChange={handleChange}
                rows={4} placeholder="Tell customers about yourself, your teaching style, and what you love about your practice…"
                className={inputClass()}
              />
              <p className="mt-1 text-xs text-slate-400">Shown on your public instructor page.</p>
            </div>
          </div>

          {/* Professional details */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Professional Details</h2>

            <div>
              <label htmlFor="specialtiesInput" className="mb-1.5 block text-sm font-bold text-slate-700">
                Specialties
              </label>
              <input
                id="specialtiesInput" name="specialtiesInput" type="text"
                value={form.specialtiesInput} onChange={handleChange}
                placeholder="e.g. Vinyasa, Yin Yoga, Breathwork"
                className={inputClass()}
              />
              <p className="mt-1 text-xs text-slate-400">Comma-separated — shown as tags on your profile.</p>
            </div>

            <div>
              <label htmlFor="experienceYears" className="mb-1.5 block text-sm font-bold text-slate-700">
                Years of experience
              </label>
              <input
                id="experienceYears" name="experienceYears" type="number" min="0" max="60"
                value={form.experienceYears} onChange={handleChange}
                placeholder="e.g. 5"
                className={inputClass()}
              />
            </div>
          </div>

          {/* Social links */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Social Links</h2>

            <div>
              <label htmlFor="instagramUrl" className="mb-1.5 block text-sm font-bold text-slate-700">
                Instagram URL
              </label>
              <input
                id="instagramUrl" name="instagramUrl" type="url"
                value={form.instagramUrl} onChange={handleChange}
                placeholder="https://instagram.com/yourhandle"
                className={inputClass()}
              />
            </div>

            <div>
              <label htmlFor="websiteUrl" className="mb-1.5 block text-sm font-bold text-slate-700">
                Website
              </label>
              <input
                id="websiteUrl" name="websiteUrl" type="url"
                value={form.websiteUrl} onChange={handleChange}
                placeholder="https://yourwebsite.com"
                className={inputClass()}
              />
            </div>
          </div>

          {saveError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</div>
          )}

          {saved && (
            <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              ✓ Profile saved successfully!
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || uploadingPhoto}
              className="flex-1 rounded-xl bg-indigo-600 py-4 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {uploadingPhoto ? "Uploading photo…" : saving ? "Saving…" : "Save Changes"}
            </button>
            <Link
              href="/staff/profile"
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
