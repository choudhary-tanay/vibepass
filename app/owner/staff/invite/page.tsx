"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/appStore";

const ROLES = ["instructor", "trainer", "assistant", "manager"];

export default function InviteStaffPage() {
  const { currentBusiness } = useAppStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("instructor");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !currentBusiness) return;
    setLoading(true);
    setError("");
    setInviteUrl(null);
    setCopied(false);

    const res = await fetch("/api/owner/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role, businessId: currentBusiness.id }),
    });

    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to create invite.");
      return;
    }
    const d = await res.json();
    setInviteUrl(d.inviteUrl);
    setEmail("");
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/owner/staff" className="text-sm text-slate-500 hover:text-slate-700">
            ← Staff
          </Link>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Invite Staff via Link</h1>
          <p className="mt-2 text-sm text-slate-500">
            Generate a unique invite link and share it with your staff member. The link expires after 7 days and can only be used once.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Staff member&apos;s email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="instructor@studio.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold capitalize transition ${
                      role === r
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Generating…" : "Generate Invite Link"}
            </button>
          </form>

          {inviteUrl && (
            <div className="mt-6 rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
              <p className="mb-1 text-sm font-bold text-green-800">
                ✓ Invite link ready — copy and send it to your staff member
              </p>
              <p className="mb-3 text-xs text-green-600">
                They can open this link to register or log in and join your studio. Link expires in 7 days.
              </p>
              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-green-200">
                <code className="flex-1 overflow-auto break-all text-xs text-slate-700">
                  {inviteUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-xs text-green-600">
                Send via email, WhatsApp, or any messaging app. The staff member will be prompted to create an account or log in.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-indigo-50 p-4">
          <p className="text-xs font-bold text-indigo-700">How it works</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-indigo-600">
            <li>Generate a unique invite link for the staff member.</li>
            <li>Copy and send the link via email, WhatsApp, or any message.</li>
            <li>They open it, create an account (or log in), and join your studio automatically.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
