"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ChangePasswordPage() {
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("New passwords don't match."); return; }
    if (!oldPassword) { setError("Please enter your current password."); return; }
    setError("");
    setLoading(true);

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: oldPassword,
    });

    if (verifyError) {
      setError("Current password is incorrect.");
      setLoading(false);
      return;
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200";

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-black text-slate-900">Password Updated!</h1>
          <p className="mt-3 text-sm text-slate-500">
            Your password has been changed successfully. Use your new password next time you log in.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-indigo-600 px-8 py-3 text-sm font-black text-white hover:bg-indigo-700">
            Continue
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back</Link>
          <h1 className="mt-4 text-3xl font-black text-slate-900">Change Password</h1>
          {email && (
            <p className="mt-1 text-sm text-slate-500">Signed in as <strong>{email}</strong></p>
          )}
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Current password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Your current password"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Need portal access first?{" "}
          <Link href="/auth/login" className="text-indigo-600 hover:underline">
            Return to login
          </Link>
        </p>
      </div>
    </main>
  );
}
