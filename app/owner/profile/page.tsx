"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/appStore";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function OwnerProfilePage() {
  const { profile, user, currentBusiness } = useAppStore();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/owner/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Profile</h1>

        <div className="mt-6 grid gap-5">
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
            <h2 className="text-sm font-black uppercase text-slate-400">Account</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div>
                <p className="font-semibold text-slate-400">Name</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{profile?.name ?? user?.email ?? "Owner"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-400">Email</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{profile?.email ?? user?.email ?? "Not available"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-400">Studio</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{currentBusiness?.businessName ?? "Not linked"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-black uppercase text-slate-400">Change Password</h2>
            <ChangePasswordForm />
          </section>
        </div>
      </div>
    </main>
  );
}
