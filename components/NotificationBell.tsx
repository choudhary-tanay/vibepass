"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface NotificationRow {
  id: string;
  title: string;
  message?: string | null;
  action_url?: string | null;
  priority: "low" | "normal" | "high";
  read_at?: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications() {
    const response = await fetch("/api/notifications").catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    setItems((data.notifications ?? []) as NotificationRow[]);
    setUnreadCount(Number(data.unreadCount ?? 0));
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (active) await loadNotifications();
    });
    return () => {
      active = false;
    };
  }, []);

  async function markRead(notificationId: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    }).catch(() => null);
    await loadNotifications();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => null);
    await loadNotifications();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label="Notifications"
      >
        <span className="text-base">!</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[20rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-950 lg:left-auto lg:right-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-900 dark:text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 dark:bg-slate-900">
                No notifications yet.
              </p>
            ) : (
              <div className="grid gap-2">
                {items.map((item) => {
                  const content = (
                    <div
                      className={`rounded-xl border px-3 py-2 text-left ${
                        item.read_at
                          ? "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
                          : "border-indigo-100 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            item.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : item.priority === "low"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-teal-100 text-teal-700"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      {item.message && (
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {item.message}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {new Date(item.created_at).toLocaleString("en-IN")}
                        </span>
                        {!item.read_at && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              void markRead(item.id);
                            }}
                            className="text-[10px] font-black uppercase text-indigo-600"
                          >
                            Read
                          </button>
                        )}
                      </div>
                    </div>
                  );

                  return item.action_url ? (
                    <Link key={item.id} href={item.action_url} onClick={() => void markRead(item.id)}>
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
