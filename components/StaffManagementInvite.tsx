"use client";

import { useState } from "react";

const ROLES = ["instructor", "trainer", "assistant", "manager"];

export function StaffManagementInvite({ businessId }: { businessId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("instructor");
  const [userGroup, setUserGroup] = useState<"instructor" | "management">("instructor");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setInviteUrl(null);
    setCopied(false);
    const res = await fetch("/api/staff/management/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role, userGroup, businessId }),
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
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-black text-slate-900">Invite a Staff Member</p>
          <p className="text-sm text-slate-500">Generate a unique invite link to share with them.</p>
        </div>
        <button
          onClick={() => { setOpen((v) => !v); setInviteUrl(null); setError(""); }}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
        >
          {open ? "Cancel" : "+ Invite"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="instructor@studio.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">User Group</label>
            <div className="flex gap-2">
              {(["instructor", "management"] as const).map((g) => (
                <button key={g} type="button" onClick={() => setUserGroup(g)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold capitalize transition ${userGroup === g ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold capitalize transition ${role === r ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading || !email.trim()}
            className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Generating…" : "Generate Invite Link"}
          </button>

          {inviteUrl && (
            <div className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
              <p className="mb-2 text-sm font-bold text-green-800">✓ Invite link ready</p>
              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-green-200">
                <code className="flex-1 overflow-auto break-all text-xs text-slate-700">{inviteUrl}</code>
                <button type="button" onClick={handleCopy}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-black transition ${copied ? "bg-green-500 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
