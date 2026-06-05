"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { COUNTRY_CURRENCY, SUPPORTED_COUNTRIES, getCurrencySymbol } from "@/lib/currency";

const CATEGORIES = [
  "Yoga",
  "Fitness",
  "Pilates",
  "Dance",
  "Martial Arts",
  "Swimming",
  "Cycling",
  "Meditation",
  "Wellness",
  "Other",
];

export default function OwnerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    category: "",
    location: "",
    country: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Derive operating currency from selected country
  const operatingCurrency = form.country ? (COUNTRY_CURRENCY[form.country] ?? "INR") : "";
  const currencySymbol = operatingCurrency ? getCurrencySymbol(operatingCurrency) : "";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Your name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    if (!form.password || form.password.length < 6)
      errs.password = "Password must be at least 6 characters.";
    if (!form.businessName.trim()) errs.businessName = "Business name is required.";
    if (!form.category) errs.category = "Please select a category.";
    if (!form.location.trim()) errs.location = "Location is required.";
    if (!form.country) errs.country = "Please select your country.";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);

    const currency = COUNTRY_CURRENCY[form.country] ?? "INR";

    // Step 1: Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpError || !data.user) {
      setServerError(signUpError?.message ?? "Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // Step 2: Create owner profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: null,
      role: "owner",
    });

    if (profileError) {
      setServerError("Account created but profile setup failed. Please log in.");
      setLoading(false);
      return;
    }

    // Step 3: Create their business
    const { error: bizError } = await supabase.from("businesses").insert({
      owner_id: userId,
      business_name: form.businessName.trim(),
      category: form.category,
      location: form.location.trim(),
      description: "",
      phone: "",
      email: form.email,
      status: "pending_approval",
      is_marketplace_visible: false, // admin sets this to true on approval
      country: form.country,
      default_currency: currency,
      reporting_currency: currency,
    });

    if (bizError) {
      setServerError(
        "Account created but business setup failed. Please log in and try again."
      );
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
    router.refresh();
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-black text-amber-700">
            VP
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            Your business is pending approval
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Thanks for applying to list on VibePass. An admin needs to approve
            the business before classes can be published on the marketplace.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="flex-1 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Log in
            </Link>
            <Link
              href="/classes"
              className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              Browse classes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          Create your business account
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Apply to list your classes on VibePass
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Personal info */}
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Your Details
          </p>

          <Field label="Your Full Name" error={errors.name}>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Priya Sharma"
              className={inputCls(!!errors.name)}
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={inputCls(!!errors.email)}
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
              className={inputCls(!!errors.password)}
            />
          </Field>

          {/* Business info */}
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Business Details
          </p>

          <Field label="Business Name" error={errors.businessName}>
            <input
              name="businessName"
              type="text"
              value={form.businessName}
              onChange={handleChange}
              placeholder="Zen Yoga Studio"
              className={inputCls(!!errors.businessName)}
            />
          </Field>

          <Field label="Category" error={errors.category}>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className={inputCls(!!errors.category)}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Location" error={errors.location}>
            <input
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              placeholder="Andheri West, Mumbai"
              className={inputCls(!!errors.location)}
            />
          </Field>

          {/* Country & Currency */}
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Country &amp; Currency
          </p>

          <Field
            label="Country *"
            error={errors.country}
            hint="Sets the operating currency for your studio — all classes, revenue, and payouts will use this currency."
          >
            <select
              name="country"
              value={form.country}
              onChange={handleChange}
              className={inputCls(!!errors.country)}
            >
              <option value="">Select your country</option>
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          {/* Derived operating currency — read-only */}
          {form.country && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
                {currencySymbol}
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Operating currency: <span className="font-black">{operatingCurrency}</span>
                </p>
                <p className="text-xs text-emerald-600">
                  All your class prices, revenue, and staff payments will be in {operatingCurrency}.
                </p>
              </div>
            </div>
          )}

          {serverError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create business account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? "border-red-400" : "border-gray-300"
  }`;
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
