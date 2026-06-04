import Link from "next/link";

export default function StaffInviteLandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-3xl">
          📨
        </div>
        <h1 className="text-2xl font-black text-slate-900">Join as Staff</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          To join a studio as a staff member, you need an invite link from your studio owner. The link looks like:
        </p>
        <code className="mt-3 inline-block rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
          vibepass.com/staff/invite/your-token
        </code>
        <p className="mt-3 text-xs text-slate-500">
          Ask your owner to go to <strong>Owner Studio → Staff → Invite via Link</strong> to generate one.
        </p>
        <div className="mt-8 space-y-3">
          <Link
            href="/auth/login"
            className="block w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Already accepted? Log In
          </Link>
          <Link
            href="/"
            className="block w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
