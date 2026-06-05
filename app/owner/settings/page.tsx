"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/appStore";
import { supabase } from "@/lib/supabaseClient";
import { LocationInput } from "@/components/LocationInput";
import { COUNTRY_CURRENCY, SUPPORTED_COUNTRIES } from "@/lib/currency";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

const CATEGORIES = [
  "Yoga",
  "Pilates",
  "Fitness",
  "Dance",
  "Martial Arts",
  "Meditation",
  "Swimming",
  "Cycling",
  "Nutrition",
  "Wellness",
  "Other",
];

function colorInputValue(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default function OwnerSettingsPage() {
  const { currentBusiness, updateBusiness, loading } = useAppStore();

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoWarning, setLogoWarning] = useState<string | null>(null);
  const [publicDisplayName, setPublicDisplayName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [brandColor, setBrandColor] = useState("#4f46e5");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#14b8a6");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isMarketplaceVisible, setIsMarketplaceVisible] = useState(true);
  const [country, setCountry] = useState("India");
  const [operatingCurrency, setOperatingCurrency] = useState("INR"); // derived from country
  const [currencyLocked, setCurrencyLocked] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [reviewNote, setReviewNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function handleRequestReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewSubmitting(true);
    setReviewError(null);
    const res = await fetch("/api/owner/businesses/request-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: reviewNote }),
    });
    setReviewSubmitting(false);
    if (res.ok) {
      setReviewSubmitted(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setReviewError(data.error ?? "Failed to submit request.");
    }
  }

  // Pre-fill form when business loads
  useEffect(() => {
    if (currentBusiness) {
      queueMicrotask(() => {
        setBusinessName(currentBusiness.businessName);
        setCategory(currentBusiness.category);
        setDescription(currentBusiness.description ?? "");
        setLocation(currentBusiness.location ?? "");
        setPhone(currentBusiness.phone ?? "");
        setEmail(currentBusiness.email ?? "");
        setLogoUrl(currentBusiness.logoUrl ?? "");
        setPublicDisplayName(currentBusiness.publicDisplayName ?? "");
        setBrandTagline(currentBusiness.brandTagline ?? "");
        setBrandColor(currentBusiness.brandColor ?? "#4f46e5");
        setBrandSecondaryColor(currentBusiness.brandSecondaryColor ?? "#14b8a6");
        setCoverImageUrl(currentBusiness.coverImageUrl ?? "");
        setIsMarketplaceVisible(currentBusiness.isMarketplaceVisible);
        const bCountry = currentBusiness.country ?? "India";
        setCountry(bCountry);
        setOperatingCurrency(currentBusiness.defaultCurrency ?? COUNTRY_CURRENCY[bCountry] ?? "INR");
      });
      // Check if operating currency is locked (paid bookings exist)
      // Use the actual class currency from a paid booking — not DB default_currency
      supabase
        .from("bookings")
        .select("class_id, classes(currency)")
        .eq("business_id", currentBusiness.id)
        .eq("payment_status", "paid")
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setCurrencyLocked(true);
            // Lock to the ACTUAL currency of paid bookings, not what's in default_currency
            const actualCurrency =
              (Array.isArray(data.classes) ? data.classes[0] : data.classes as { currency?: string } | null)?.currency ?? "INR";
            setOperatingCurrency(actualCurrency);
            setCountry(Object.entries({ India: "INR", USA: "USD", Australia: "AUD", Europe: "EUR" })
              .find(([, v]) => v === actualCurrency)?.[0] ?? "India");
          }
        }, () => {});
    }
  }, [currentBusiness]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  if (!currentBusiness) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-600">No business found for your account.</p>
          </div>
        </div>
      </main>
    );
  }

  async function uploadLogo(): Promise<string | undefined> {
    if (!logoFile) return undefined;
    setUploadingLogo(true);
    setLogoWarning(null);

    const ext = logoFile.name.split(".").pop() ?? "jpg";
    const path = `${currentBusiness?.id ?? "business"}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("business-logos")
      .upload(path, logoFile, { upsert: true });

    setUploadingLogo(false);

    if (error || !data) {
      const errorMessage = error?.message ?? "Logo upload failed.";
      setLogoWarning(
        errorMessage.toLowerCase().includes("bucket")
          ? "Logo upload skipped because the business-logos bucket is missing. Run supabase/phase11-admin-safety-storage.sql, then try again."
          : "Logo upload skipped. The rest of the profile can still be saved."
      );
      return undefined;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("business-logos").getPublicUrl(data.path);

    return publicUrl;
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;

    if (!businessName.trim()) {
      setSaveError("Business name is required.");
      return;
    }
    if (!category) {
      setSaveError("Category is required.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const uploadedLogoUrl = await uploadLogo();

    const ok = await updateBusiness(currentBusiness.id, {
      businessName: businessName.trim(),
      category,
      description: description.trim(),
      location: location.trim(),
      phone: phone.trim(),
      email: email.trim(),
      logoUrl: (uploadedLogoUrl ?? logoUrl.trim()) || undefined,
      publicDisplayName: publicDisplayName.trim() || undefined,
      brandTagline: brandTagline.trim() || undefined,
      brandColor: brandColor.trim() || undefined,
      brandSecondaryColor: brandSecondaryColor.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      isMarketplaceVisible,
      country,
      defaultCurrency: operatingCurrency,
      reportingCurrency: operatingCurrency, // keep in sync
    });

    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError("Failed to save. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/owner/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
          <p className="text-sm text-gray-500">
            Manage how your business appears in the marketplace.
          </p>
        </div>

        {/* Business status banner */}
        {currentBusiness.status !== "active" && (
          <div
            className={`mb-6 rounded-2xl p-5 ${
              currentBusiness.status === "pending_approval"
                ? "border border-amber-200 bg-amber-50"
                : currentBusiness.status === "suspended"
                ? "border border-orange-200 bg-orange-50"
                : currentBusiness.status === "rejected"
                ? "border border-red-200 bg-red-50"
                : "border border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                  currentBusiness.status === "pending_approval"
                    ? "bg-amber-100 text-amber-700"
                    : currentBusiness.status === "suspended"
                    ? "bg-orange-100 text-orange-700"
                    : currentBusiness.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {currentBusiness.status.replace(/_/g, " ")}
              </span>
            </div>
            <p
              className={`mt-2 text-sm font-bold ${
                currentBusiness.status === "suspended"
                  ? "text-orange-900"
                  : currentBusiness.status === "rejected"
                  ? "text-red-900"
                  : "text-amber-900"
              }`}
            >
              {currentBusiness.status === "pending_approval" &&
                "Your business is under review. We will approve it soon before your classes appear in the marketplace."}
              {currentBusiness.status === "suspended" &&
                "Your business has been suspended and is not visible in the marketplace."}
              {currentBusiness.status === "rejected" &&
                "Your application was not approved. See the reason below and request a re-review if you have addressed it."}
            </p>

            {currentBusiness.suspensionReason && (
              <p className="mt-2 text-sm text-orange-800">
                <strong>Reason:</strong> {currentBusiness.suspensionReason}
              </p>
            )}
            {currentBusiness.rejectionReason && (
              <p className="mt-2 text-sm text-red-800">
                <strong>Reason:</strong> {currentBusiness.rejectionReason}
              </p>
            )}

            {(currentBusiness.status === "suspended" ||
              currentBusiness.status === "rejected") && (
              <div className="mt-4">
                {currentBusiness.reviewRequested || reviewSubmitted ? (
                  <p className="text-sm font-semibold text-green-700">
                    Re-review request sent — our team will get back to you.
                  </p>
                ) : (
                  <form onSubmit={(e) => void handleRequestReview(e)}>
                    <p className="mb-2 text-sm font-bold text-slate-700">
                      Request a re-review
                    </p>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      placeholder="Describe what you have changed or why you should be reconsidered..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400"
                    />
                    {reviewError && (
                      <p className="mt-2 text-xs text-red-600">{reviewError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="mt-3 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {reviewSubmitting ? "Submitting..." : "Submit re-review request"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="mb-3 text-sm font-bold text-gray-700">
                  Business logo
                </p>
                {logoWarning && (
                  <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    {logoWarning}
                  </p>
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white text-xl font-black text-blue-700 shadow-sm">
                    {logoPreview || logoUrl ? (
                      <img
                        src={logoPreview ?? logoUrl}
                        alt={`${businessName || "Business"} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (businessName || "CV").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <label className="inline-flex w-fit cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                    {logoFile ? "Change logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleLogoChange}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div
                    className="min-h-32 flex-1 overflow-hidden rounded-2xl bg-white shadow-sm"
                    style={{
                      borderColor: brandColor,
                      borderWidth: 2,
                    }}
                  >
                    {coverImageUrl ? (
                      <div
                        className="h-20 bg-cover bg-center"
                        style={{ backgroundImage: `url(${coverImageUrl})` }}
                      />
                    ) : (
                      <div
                        className="h-20"
                        style={{
                          background: `linear-gradient(135deg, ${brandColor}, ${brandSecondaryColor})`,
                        }}
                      />
                    )}
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-sm font-black text-slate-700">
                        {logoPreview || logoUrl ? (
                          <img
                            src={logoPreview ?? logoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (publicDisplayName || businessName || "CV").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">
                          {publicDisplayName || businessName || "Business"}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {brandTagline || "Marketplace profile"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Public display name
                    </label>
                    <input
                      type="text"
                      value={publicDisplayName}
                      onChange={(e) => setPublicDisplayName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder={businessName || "Marketplace name"}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Brand tagline
                    </label>
                    <input
                      type="text"
                      value={brandTagline}
                      onChange={(e) => setBrandTagline(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. Movement, recovery, and community"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Primary brand color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={colorInputValue(brandColor, "#4f46e5")}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="h-11 w-14 rounded-xl border border-gray-200 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Secondary brand color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={colorInputValue(brandSecondaryColor, "#14b8a6")}
                          onChange={(e) => setBrandSecondaryColor(e.target.value)}
                          className="h-11 w-14 rounded-xl border border-gray-200 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={brandSecondaryColor}
                          onChange={(e) => setBrandSecondaryColor(e.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Cover image URL
                    </label>
                    <input
                      type="url"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              {/* Business name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Zen Yoga Studio"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Tell customers what your business is about..."
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <LocationInput
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g. Koramangala, Bangalore"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. hello@yourstudio.com"
                />
              </div>

              {/* Business country & operating currency */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Business country
                </label>
                <select
                  value={country}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCountry(c);
                    if (!currencyLocked) setOperatingCurrency(COUNTRY_CURRENCY[c] ?? "INR");
                  }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Sets the operating currency for your studio — all classes, revenue, and staff payments use this currency.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Operating currency
                  {currencyLocked && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Locked</span>
                  )}
                </label>
                {currencyLocked ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
                    {operatingCurrency} — locked (matches your paid booking currency)
                  </div>
                ) : (
                  <select
                    value={operatingCurrency}
                    onChange={(e) => setOperatingCurrency(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="AUD">AUD — Australian Dollar (A$)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                  </select>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {currencyLocked
                    ? "Currency is locked to match the currency of your existing paid bookings. Contact support to change it."
                    : "All classes, revenue, staff earnings, and expenses will use this currency."}
                </p>
              </div>

              {/* Marketplace visibility toggle */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Show in Marketplace
                  </p>
                  <p className="text-xs text-gray-500">
                    When off, customers cannot find your business or classes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMarketplaceVisible((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    isMarketplaceVisible ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      isMarketplaceVisible ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Error/success feedback */}
          {saveError && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          )}
          {saved && (
            <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              Business profile saved successfully.
            </div>
          )}

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving || uploadingLogo}
              className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {uploadingLogo ? "Uploading logo..." : saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Change Password */}
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-800">Change Password</h2>
          <p className="mb-4 text-sm text-gray-500">
            Update your account password. Choose a strong password of at least 8 characters.
          </p>
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
