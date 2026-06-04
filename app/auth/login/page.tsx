"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function LeftPanel() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12">
      {/* Background glow */}
      <div className="motion-float pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="motion-float-slow pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />

      {/* Brand */}
      <div className="relative z-10">
        <span className="text-lg font-black text-white tracking-tight">
          Vibe<span className="bg-gradient-to-r from-violet-400 to-teal-300 bg-clip-text text-transparent">Pass</span>
        </span>
      </div>

      {/* Center artwork */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-8">
        <svg
          viewBox="0 0 360 360"
          fill="none"
          className="motion-float-slow w-full max-w-[280px]"
          aria-hidden="true"
        >
          {/* Aura circles */}
          <circle className="login-orbit" cx="180" cy="180" r="150" stroke="url(#auraGrad)" strokeWidth="0.8" opacity="0.2" />
          <circle className="login-orbit login-orbit-slow" cx="180" cy="180" r="120" stroke="url(#auraGrad)" strokeWidth="1" opacity="0.15" />
          <circle className="login-orbit" cx="180" cy="180" r="90"  stroke="url(#auraGrad)" strokeWidth="1.2" opacity="0.12" />

          {/* Background glow blob */}
          <circle className="login-pulse" cx="180" cy="180" r="110" fill="url(#centerBlob)" opacity="0.22" />

          {/* Meditation figure — seated, hands on knees */}
          <g className="login-breathe">
            {/* Head */}
            <circle cx="180" cy="108" r="28" fill="url(#panelFig)" />
            {/* Neck */}
            <rect x="174" y="133" width="12" height="20" rx="6" fill="url(#panelFig)" />
            {/* Body */}
            <ellipse cx="180" cy="185" rx="34" ry="42" fill="url(#panelFig)" />
            {/* Left leg */}
            <path
              d="M148 208 Q115 235 96 262"
              stroke="url(#panelFig)"
              strokeWidth="22"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="90" cy="265" rx="26" ry="11" fill="url(#panelFig)" opacity="0.85" />
            {/* Right leg */}
            <path
              d="M212 208 Q245 235 264 262"
              stroke="url(#panelFig)"
              strokeWidth="22"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="270" cy="265" rx="26" ry="11" fill="url(#panelFig)" opacity="0.85" />
            {/* Left arm */}
            <path
              d="M150 170 Q122 192 110 218"
              stroke="url(#panelFig)"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right arm */}
            <path
              d="M210 170 Q238 192 250 218"
              stroke="url(#panelFig)"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Sparkles */}
          <path className="login-sparkle" d="M98 92 L100 85 L102 92 L109 94 L102 96 L100 103 L98 96 L91 94Z" fill="#fbbf24" opacity="0.9" />
          <path className="login-sparkle login-sparkle-delay" d="M264 112 L266 106 L268 112 L274 114 L268 116 L266 122 L264 116 L258 114Z" fill="#818cf8" opacity="0.85" />
          <path className="login-sparkle login-sparkle-slow" d="M76 210 L78 204 L80 210 L86 212 L80 214 L78 220 L76 214 L70 212Z" fill="#2dd4bf" opacity="0.75" />
          <path className="login-sparkle" d="M280 240 L282 234 L284 240 L290 242 L284 244 L282 250 L280 244 L274 242Z" fill="#fbbf24" opacity="0.75" />

          {/* Floating dots */}
          <circle cx="134" cy="64" r="5" fill="#2dd4bf" opacity="0.5" />
          <circle cx="234" cy="72" r="4" fill="#818cf8" opacity="0.5" />
          <circle cx="304" cy="162" r="6" fill="#2dd4bf" opacity="0.4" />
          <circle cx="54" cy="164" r="5" fill="#818cf8" opacity="0.4" />
          <circle cx="186" cy="46" r="4" fill="#fbbf24" opacity="0.5" />

          <defs>
            <radialGradient id="centerBlob" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="panelFig" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom quote + features */}
      <div className="relative z-10">
        <blockquote className="text-sm font-semibold italic leading-7 text-indigo-200">
          &ldquo;The best investment you can make is in your own wellbeing.&rdquo;
        </blockquote>
        <div className="mt-5 space-y-2">
          {[
            "Browse hundreds of local classes",
            "Instant booking confirmation",
            "Track all your sessions in one place",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
              <svg viewBox="0 0 12 12" fill="none" className="h-3.5 w-3.5 flex-shrink-0">
                <circle cx="6" cy="6" r="6" fill="rgba(45,212,191,0.25)" />
                <path
                  d="M3.5 6 L5 7.5 L8.5 4.5"
                  stroke="#2dd4bf"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      { email, password }
    );

    if (signInError || !data.user) {
      setError(signInError?.message ?? "Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role;
    if (role === "admin") router.push("/admin/dashboard");
    else if (role === "owner") router.push("/owner/dashboard");
    else if (role === "staff") router.push("/staff/dashboard");
    else router.push("/classes");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen">
      {/* Left panel — illustration (desktop only) */}
      <div className="hidden lg:block lg:w-[44%] xl:w-[42%]">
        <LeftPanel />
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col justify-center bg-white px-8 py-12 sm:px-12 lg:px-16">
        {/* Mobile logo */}
        <Link href="/" className="mb-10 inline-flex lg:hidden">
          <span className="text-base font-black text-slate-950 tracking-tight">
            Vibe<span className="bg-gradient-to-r from-violet-600 to-teal-400 bg-clip-text text-transparent">Pass</span>
          </span>
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-950">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">
              Log in to your account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-200"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-200"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-600 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-100 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
            >
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>

          <div className="mt-8 space-y-3 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
            <p>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-teal-600 hover:underline">
                Create an account
              </Link>
            </p>
            <p>
              Joining as staff?{" "}
              <Link href="/staff/invite" className="font-semibold text-indigo-600 hover:underline">
                Accept your invite
              </Link>
            </p>
            <p>
              <Link href="/auth/change-password" className="text-slate-400 hover:text-slate-600 hover:underline">
                Change password
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
