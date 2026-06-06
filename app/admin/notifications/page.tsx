"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NotificationRow = {
  id: string;
  title: string;
  message?: string | null;
  action_url?: string | null;
  priority?: string | null;
  read_at?: string | null;
  created_at: string;
};

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications?unread=0");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setItems(Array.isArray(body.notifications) ? body.notifications : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => null);
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">{items.filter((item) => !item.read_at).length} unread</p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-black text-white hover:bg-sky-700"
        >
          Mark All Read
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <section className="rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const content = (
                <div className={`p-4 ${item.read_at ? "bg-white" : "bg-sky-50/60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{item.title}</p>
                      {item.message && <p className="mt-1 text-sm text-slate-500">{item.message}</p>}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600">
                      {item.priority ?? "normal"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleString("en-IN")}</p>
                </div>
              );

              return item.action_url ? (
                <Link key={item.id} href={item.action_url} className="block hover:bg-slate-50">
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
