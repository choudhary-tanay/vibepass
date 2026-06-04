import Link from "next/link";

export const metadata = {
  title: "Booking Confirmed | Class Booking MVP",
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    className?: string;
    date?: string;
    time?: string;
    customerName?: string;
    seats?: string;
    paid?: string;
    amount?: string;
  }>;
}) {
  const { className, date, time, customerName, seats, paid, amount } = await searchParams;
  const isPaid = paid === "true";
  const paidAmount = amount ? parseInt(amount, 10) : null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <p className="mb-2 text-sm font-bold uppercase text-green-700">
            You are all set
          </p>
          <h1 className="mb-2 text-3xl font-black text-slate-950">
            Booking Confirmed!
          </h1>
          <p className="mb-8 text-gray-500">
            Your spot has been reserved. See you there!
          </p>

          <div className="mb-8 rounded-2xl bg-gray-50 p-5 text-left">
            <p className="mb-3 text-xs font-bold uppercase text-slate-500">
              Booking Details
            </p>
            <div className="space-y-3">
              {className && (
                <div>
                  <p className="text-xs text-gray-400">Class</p>
                  <p className="font-semibold text-gray-900">{className}</p>
                </div>
              )}
              {date && (
                <div>
                  <p className="text-xs text-gray-400">Date</p>
                  <p className="font-medium text-gray-800">{date}</p>
                </div>
              )}
              {time && (
                <div>
                  <p className="text-xs text-gray-400">Time</p>
                  <p className="font-medium text-gray-800">{time}</p>
                </div>
              )}
              {customerName && (
                <div>
                  <p className="text-xs text-gray-400">Name</p>
                  <p className="font-medium text-gray-800">{customerName}</p>
                </div>
              )}
              {seats && parseInt(seats, 10) > 1 && (
                <div>
                  <p className="text-xs text-gray-400">Seats</p>
                  <p className="font-medium text-gray-800">{seats} seats booked</p>
                </div>
              )}
              {isPaid && paidAmount !== null && (
                <div>
                  <p className="text-xs text-gray-400">Payment</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      ₹{paidAmount.toLocaleString("en-IN")}
                    </p>
                    {process.env.NEXT_PUBLIC_PAYMENTS_MODE === "dummy" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Demo
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  Confirmed
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <Link
            href="/classes"
            className="block w-full rounded-full bg-blue-600 py-3 text-center font-bold text-white hover:bg-blue-700"
          >
            Browse More Classes
          </Link>
          <Link
            href="/"
            className="mt-3 block text-sm text-gray-500 hover:text-gray-700"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
