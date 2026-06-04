"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/appStore";
import { supabase } from "@/lib/supabaseClient";

const PRESET_COLORS = [
  "#6366f1", "#0d9488", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#64748b",
];

interface StaffRole {
  id: string;
  role_name: string;
  description: string | null;
  color: string;
}

export default function StaffRolesPage() {
  const { currentBusiness } = useAppStore();
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    if (!currentBusiness) return;
    const { data } = await supabase
      .from("business_staff_roles")
      .select("id, role_name, description, color")
      .eq("business_id", currentBusiness.id)
      .order("created_at");
    setRoles((data as StaffRole[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !currentBusiness) return;
    setAdding(true);
    setAddError("");

    const { error } = await supabase.from("business_staff_roles").insert({
      business_id: currentBusiness.id,
      role_name: newName.trim(),
      description: newDesc.trim() || null,
      color: newColor,
    });

    if (error) {
      setAddError(error.message.includes("unique") ? "A role with this name already exists." : error.message);
    } else {
      setNewName(""); setNewDesc(""); setNewColor("#6366f1");
      await load();
    }
    setAdding(false);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    await supabase.from("business_staff_roles").update({
      role_name: editName.trim(),
      description: editDesc.trim() || null,
      color: editColor,
    }).eq("id", id);
    setSaving(false);
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("business_staff_roles").delete().eq("id", id);
    setDeletingId(null);
    await load();
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/owner/staff" className="text-sm text-slate-500 hover:text-slate-700">← Staff</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Staff Roles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define custom roles for your studio. These appear when adding staff and assigning to classes.
          </p>
        </div>

        {/* Add new role */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-400">Add New Role</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role name <span className="text-red-400">*</span></label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Guest Instructor" className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Short description (optional)" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Badge color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`h-8 w-8 rounded-full transition ${newColor === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : ""}`}
                    style={{ background: c }}
                  />
                ))}
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 p-0" title="Custom color" />
              </div>
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <button type="submit" disabled={adding || !newName.trim()}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
              {adding ? "Adding…" : "Add Role"}
            </button>
          </form>
        </div>

        {/* Roles list */}
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : roles.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">No custom roles yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="rounded-2xl bg-white p-5 shadow-sm">
                {editingId === role.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className={inputClass} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button key={c} type="button" onClick={() => setEditColor(c)}
                          className={`h-7 w-7 rounded-full transition ${editColor === c ? "ring-2 ring-offset-1 ring-indigo-500 scale-110" : ""}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(role.id)} disabled={saving}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-60">
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                        style={{ background: role.color }}>
                        {role.role_name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{role.role_name}</p>
                        {role.description && <p className="text-xs text-slate-400">{role.description}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => { setEditingId(role.id); setEditName(role.role_name); setEditDesc(role.description ?? ""); setEditColor(role.color); }}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        disabled={deletingId === role.id}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === role.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
