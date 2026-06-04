import Link from "next/link";

const options = [
  {
    title: "Customer",
    description: "Find events, save your details, and book classes faster.",
    href: "/auth/signup",
    badge: "Book classes",
    badgeColor: "bg-teal-50 text-teal-700",
    btnColor: "bg-slate-950 group-hover:bg-teal-700",
    cardClass: "bg-white shadow-sm hover:-translate-y-1",
    btnLabel: "Continue",
  },
  {
    title: "Business / Owner",
    description: "Apply to list your studio. Admin approval is required before publishing.",
    href: "/owner/auth/signup",
    badge: "List a business",
    badgeColor: "bg-teal-50 text-teal-700",
    btnColor: "bg-slate-950 group-hover:bg-teal-700",
    cardClass: "bg-white shadow-sm hover:-translate-y-1",
    btnLabel: "Continue",
  },
  {
    title: "Staff",
    description: "Have an invite link from your studio owner? Accept it here to create your staff account and access your portal.",
    href: "/staff/invite",
    badge: "Invite only",
    badgeColor: "bg-indigo-100 text-indigo-700",
    btnColor: "bg-indigo-600 group-hover:bg-indigo-700",
    cardClass: "bg-indigo-50/60 border border-indigo-100 hover:-translate-y-1",
    btnLabel: "Accept Invite",
  },
];

export default function SignupChoicePage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center">
          <span className="text-base font-black text-slate-950 tracking-tight">
            Vibe<span className="bg-gradient-to-r from-violet-600 to-teal-400 bg-clip-text text-transparent">Pass</span>
          </span>
        </Link>

        <div className="mt-10 max-w-2xl">
          <p className="text-sm font-black uppercase text-teal-700">
            Choose your account
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            What are you signing up as?
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Customers can book right away. Business owners apply first so admins can keep the marketplace trusted and high quality. Staff join via an invite link from their owner.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {options.map((option) => (
            <Link
              key={option.title}
              href={option.href}
              className={`group rounded-2xl p-6 transition-transform ${option.cardClass}`}
            >
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${option.badgeColor}`}>
                {option.badge}
              </span>
              <h2 className="mt-6 text-2xl font-black text-slate-950">
                {option.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {option.description}
              </p>
              <span className={`mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-black text-white transition-colors ${option.btnColor}`}>
                {option.btnLabel}
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-bold text-teal-700 hover:underline">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
