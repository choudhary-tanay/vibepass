"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/appStore";

type FavoriteType = "class" | "category" | "instructor" | "business";

interface Favorite {
  id: string;
  user_id: string;
  favorite_type: FavoriteType;
  entity_id: string;
  entity_name?: string | null;
  created_at: string;
}

type TabKey = "all" | FavoriteType;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "class", label: "Classes" },
  { key: "category", label: "Categories" },
  { key: "instructor", label: "Instructors" },
  { key: "business", label: "Businesses" },
];

const TYPE_BADGE_STYLES: Record<FavoriteType, string> = {
  class: "bg-blue-100 text-blue-700",
  category: "bg-purple-100 text-purple-700",
  instructor: "bg-emerald-100 text-emerald-700",
  business: "bg-orange-100 text-orange-700",
};

function TypeBadge({ type }: { type: FavoriteType }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        TYPE_BADGE_STYLES[type] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {type}
    </span>
  );
}

function formatSavedDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerFavoritesPage() {
  const { user, loading: storeLoading } = useAppStore();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeErrorMap, setRemoveErrorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    setFetchLoading(true);
    setFetchError(null);
    fetch("/api/customer/favorites")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setFetchError(data.error);
        } else {
          setFavorites(data.favorites ?? []);
        }
      })
      .catch(() => setFetchError("Failed to load favorites."))
      .finally(() => setFetchLoading(false));
  }, [user]);

  if (storeLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">
              Log in to save favorites.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Log In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setRemoveErrorMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch(`/api/customer/favorites/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.id !== id));
      } else {
        const msg = data.error ?? "Failed to remove favorite.";
        setRemoveErrorMap((prev) => ({ ...prev, [id]: msg }));
      }
    } catch {
      setRemoveErrorMap((prev) => ({ ...prev, [id]: "Failed to remove favorite." }));
    } finally {
      setRemovingId(null);
    }
  }

  const filtered =
    activeTab === "all"
      ? favorites
      : favorites.filter((f) => f.favorite_type === activeTab);

  const tabCounts: Record<TabKey, number> = {
    all: favorites.length,
    class: favorites.filter((f) => f.favorite_type === "class").length,
    category: favorites.filter((f) => f.favorite_type === "category").length,
    instructor: favorites.filter((f) => f.favorite_type === "instructor").length,
    business: favorites.filter((f) => f.favorite_type === "business").length,
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/classes"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Browse Classes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
          <p className="text-sm text-gray-500">
            {favorites.length} saved item{favorites.length !== 1 ? "s" : ""}
          </p>
        </div>

        {fetchError && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {fetchError}
          </div>
        )}

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    activeTab === tab.key
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {fetchLoading ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-400">Loading your favorites...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">Nothing saved yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Browse classes and save your favorites.
            </p>
            <Link
              href="/classes"
              className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse Classes
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((fav) => (
              <div
                key={fav.id}
                className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                    {fav.entity_name ?? fav.entity_id}
                  </p>
                  <TypeBadge type={fav.favorite_type} />
                </div>
                <p className="text-xs text-gray-400">
                  Saved {formatSavedDate(fav.created_at)}
                </p>
                {removeErrorMap[fav.id] && (
                  <p className="text-xs text-red-500">{removeErrorMap[fav.id]}</p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2">
                  {fav.favorite_type === "class" && (
                    <Link
                      href={`/classes/${fav.entity_id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      View class &rarr;
                    </Link>
                  )}
                  {fav.favorite_type === "business" && (
                    <Link
                      href={`/businesses/${fav.entity_id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      View business &rarr;
                    </Link>
                  )}
                  {(fav.favorite_type === "category" ||
                    fav.favorite_type === "instructor") && (
                    <Link
                      href="/classes"
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Browse &rarr;
                    </Link>
                  )}
                  <button
                    onClick={() => handleRemove(fav.id)}
                    disabled={removingId === fav.id}
                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {removingId === fav.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
