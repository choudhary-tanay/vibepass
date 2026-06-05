"use client";
import { useAppStore } from "@/lib/appStore";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function CustomerProfilePage() {
  const { user } = useAppStore();
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-black text-slate-950 mb-6">My Account</h1>
        {user && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Email</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{user.email}</p>
          </div>
        )}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950 mb-4">Change Password</h2>
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
