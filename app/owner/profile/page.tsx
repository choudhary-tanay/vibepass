"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/appStore";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { OwnerPageHeader } from "@/components/OwnerUI";

function validColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default function OwnerProfilePage() {
  const { profile, user, currentBusiness, updateBusiness } = useAppStore();
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [secondaryColor, setSecondaryColor] = useState("#14b8a6");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusiness) return;
    queueMicrotask(() => {
      setDisplayName(currentBusiness.publicDisplayName ?? currentBusiness.businessName);
      setTagline(currentBusiness.brandTagline ?? "");
      setPrimaryColor(currentBusiness.brandColor ?? "#4f46e5");
      setSecondaryColor(currentBusiness.brandSecondaryColor ?? "#14b8a6");
      setLogoUrl(currentBusiness.logoUrl ?? "");
      setCoverUrl(currentBusiness.coverImageUrl ?? "");
    });
  }, [currentBusiness]);

  function previewFile(file: File, setter: (value: string) => void) {
    const url = URL.createObjectURL(file);
    setter(url);
  }

  async function uploadLogo() {
    if (!logoFile || !currentBusiness) return undefined;
    const ext = logoFile.name.split(".").pop() ?? "jpg";
    const path = `${currentBusiness.id}-${Date.now()}.${ext}`;
    const { data, error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(path, logoFile, { upsert: true });
    if (uploadError || !data) {
      setNotice("Logo preview is local only because the business-logos storage bucket is not available.");
      return undefined;
    }
    return supabase.storage.from("business-logos").getPublicUrl(data.path).data.publicUrl;
  }

  async function uploadCover() {
    if (!coverFile || !currentBusiness) return undefined;
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const path = `${currentBusiness.id}-cover-${Date.now()}.${ext}`;
    const { data, error: uploadError } = await supabase.storage
      .from("business-covers")
      .upload(path, coverFile, { upsert: true });
    if (uploadError || !data) {
      setNotice("Cover upload failed — paste a public URL instead.");
      return undefined;
    }
    return supabase.storage.from("business-covers").getPublicUrl(data.path).data.publicUrl;
  }

  async function saveBrand() {
    if (!currentBusiness) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const [uploadedLogoUrl, uploadedCoverUrl] = await Promise.all([uploadLogo(), uploadCover()]);
    const finalCoverUrl = uploadedCoverUrl ?? coverUrl.trim();
    if (uploadedCoverUrl) setCoverUrl(uploadedCoverUrl);
    const ok = await updateBusiness(currentBusiness.id, {
      publicDisplayName: displayName.trim() || undefined,
      brandTagline: tagline.trim() || undefined,
      brandColor: primaryColor,
      brandSecondaryColor: secondaryColor,
      logoUrl: (uploadedLogoUrl ?? logoUrl.trim()) || undefined,
      coverImageUrl: finalCoverUrl || undefined,
    });
    setSaving(false);
    if (!ok) {
      setError("Could not save profile. Please try again.");
      return;
    }
    setNotice("Brand profile saved.");
  }

  if (!currentBusiness) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">
          No business profile is linked yet.
        </div>
      </main>
    );
  }

  const logoSrc = logoPreview || logoUrl;
  const coverSrc = coverPreview || coverUrl;
  const previewName = displayName || currentBusiness.businessName;
  const previewInitials = previewName.slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <OwnerPageHeader
          eyebrow="White-label"
          title="Business Profile"
          description="Upload brand assets, tune marketplace colors, and preview how your studio appears to customers."
          primaryAction={
            <button
              type="button"
              onClick={() => void saveBrand()}
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          }
        />

        {notice && <div className="mb-5 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">{notice}</div>}
        {error && <div className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black uppercase text-slate-500">Business logo</h2>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Recommended 512 x 512.</p>
                    </div>
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-lg font-black text-indigo-700 shadow-sm">
                      {logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-cover" /> : previewInitials}
                    </div>
                  </div>
                  <label className="mt-4 inline-flex cursor-pointer rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
                    Upload logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setLogoFile(file);
                        previewFile(file, setLogoPreview);
                      }}
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <h2 className="text-sm font-black uppercase text-slate-500">Cover image</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Recommended 1600 x 600.</p>
                  <div className="mt-4 aspect-[8/3] overflow-hidden rounded-2xl bg-white shadow-sm">
                    {coverSrc ? (
                      <img src={coverSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
                      Upload cover
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setCoverFile(file);
                          previewFile(file, setCoverPreview);
                        }}
                      />
                    </label>
                    <input
                      value={coverUrl}
                      onChange={(event) => setCoverUrl(event.target.value)}
                      placeholder="Saved cover URL, optional"
                      className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-bold text-slate-700">
                  Display name
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Tagline
                  <input
                    value={tagline}
                    onChange={(event) => setTagline(event.target.value)}
                    placeholder="Movement, recovery, and community"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Primary color
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={validColor(primaryColor, "#4f46e5")}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      className="h-11 w-14 rounded-xl border border-slate-200 p-1"
                    />
                    <input
                      value={primaryColor}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Secondary color
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={validColor(secondaryColor, "#14b8a6")}
                      onChange={(event) => setSecondaryColor(event.target.value)}
                      className="h-11 w-14 rounded-xl border border-slate-200 p-1"
                    />
                    <input
                      value={secondaryColor}
                      onChange={(event) => setSecondaryColor(event.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                </label>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="h-28 bg-cover bg-center" style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
              <div className="p-5">
                <div className="-mt-12 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 text-lg font-black text-slate-700 shadow-md">
                  {logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-cover" /> : previewInitials}
                </div>
                <h2 className="mt-4 text-2xl font-black text-slate-950">{previewName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{tagline || "Marketplace studio profile"}</p>
                <div className="mt-4 flex gap-2">
                  <span className="h-8 w-8 rounded-full border border-slate-200" style={{ backgroundColor: primaryColor }} />
                  <span className="h-8 w-8 rounded-full border border-slate-200" style={{ backgroundColor: secondaryColor }} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase text-slate-400">Account</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-400">Name</p>
                  <p className="mt-1 font-bold text-slate-900">{profile?.name ?? user?.email ?? "Owner"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-400">Email</p>
                  <p className="mt-1 break-all font-bold text-slate-900">{profile?.email ?? user?.email ?? "Not available"}</p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-black uppercase text-slate-400">Change Password</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </main>
  );
}
