"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  token: string;
  inviteEmail: string;
  role: string;
  businessName: string;
}

function StaffIllustration() {
  return (
    <svg viewBox="0 0 120 100" fill="none" className="mx-auto h-20 w-auto" aria-hidden="true">
      <circle cx="60" cy="50" r="45" fill="#eef2ff" />
      <circle cx="60" cy="34" r="14" fill="#818cf8" />
      <circle cx="60" cy="34" r="10" fill="#e0e7ff" />
      <circle cx="55" cy="31" r="2" fill="#6366f1" />
      <circle cx="65" cy="31" r="2" fill="#6366f1" />
      <path d="M55 38 Q60 42 65 38" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M38 72 Q44 56 60 52 Q76 56 82 72" fill="#818cf8" opacity="0.7" />
      <circle cx="85" cy="30" r="8" fill="#6366f1" />
      <text x="85" y="34" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">✦</text>
    </svg>
  );
}

export default function StaffInviteForm({ token, inviteEmail, role, businessName }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"register" | "login">("register");

  // New user: server creates/updates auth account, then client signs in
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setError("");
    setLoading(true);

    // Server-side: create/update auth user + profile + link + mark invite used
    const res = await fetch("/api/staff/invite/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: name.trim(), password }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // Sign in client-side to establish session
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: inviteEmail,
      password,
    });

    if (signInError) {
      setError("Account created but sign-in failed. Please go to Log In and use your new password.");
      setLoading(false);
      return;
    }

    router.push("/staff/dashboard");
    router.refresh();
  }

  // Existing account: sign in then mark invite accepted
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError("Please enter your password."); return; }
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: inviteEmail,
      password,
    });

    if (signInError || !data.user) {
      setError(signInError?.message ?? "Login failed. Check your password and try again.");
      setLoading(false);
      return;
    }

    // Accept invite (marks token used, links staff row)
    const res = await fetch("/api/staff/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId: data.user.id, name: "" }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      // If already used, that's fine — just redirect
      if (d.error?.includes("already")) {
        router.push("/staff/dashboard");
        router.refresh();
        return;
      }
      setError(d.error ?? "Failed to link account. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/staff/dashboard");
    router.refresh();
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
      {/* Header */}
      <div className="mb-6 text-center">
        <StaffIllustration />
        <h1 className="mt-3 text-2xl font-black text-slate-900">You&apos;re invited!</h1>
        <p className="mt-2 text-sm text-slate-600">
          Join <strong>{businessName}</strong> as a{" "}
          <strong className="capitalize">{role}</strong>.
        </p>
        <div className="mt-2 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
          {inviteEmail}
        </div>
      </div>

      {/* Mode tabs */}
      <div className="mb-5 flex rounded-xl border border-slate-200 p-1">
        <button
          type="button"
          onClick={() => { setMode("register"); setError(""); }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
            mode === "register" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          New user
        </button>
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
            mode === "login" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Already have account
        </button>
      </div>

      {mode === "register" ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Create a password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className={inputClass} />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Setting up account…" : "Accept Invite & Create Account"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Logging in as <strong>{inviteEmail}</strong>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className={inputClass} />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Logging in…" : "Log In & Accept Invite"}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-xs text-slate-400">
        By accepting you agree to join {businessName} as staff on VibePass.
      </p>
    </div>
  );
}
