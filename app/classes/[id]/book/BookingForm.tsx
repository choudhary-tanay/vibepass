"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Class } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { useAppStore } from "@/lib/appStore";

interface Props {
  cls: Class;
  businessName: string;
  businessId: string;
}

interface Attendee {
  name: string;
  email: string;
  phone: string;
}

const AGE_RANGES = ["Under 13", "13–17", "18–24", "25–34", "35–44", "45+", "Prefer not to say"];
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const EXPERIENCE_LEVELS = ["First time", "Beginner", "Intermediate", "Advanced"];
const GOALS_OPTIONS = [
  "Strength",
  "Flexibility",
  "Weight loss",
  "Mindfulness",
  "Social / fun",
  "Skill learning",
  "Other",
];

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="razorpay"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function AttendeeCard({
  index,
  attendee,
  onChange,
  onRemove,
  errors,
  isFirst,
}: {
  index: number;
  attendee: Attendee;
  onChange: (field: keyof Attendee, value: string) => void;
  onRemove?: () => void;
  errors: Record<string, string>;
  isFirst: boolean;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">
          {isFirst ? "Your details" : `Attendee ${index + 1}`}
        </h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
          >
            Remove
          </button>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={attendee.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Full name"
          className={`w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-300 ${
            errors[`${index}.name`] ? "border-red-400" : "border-slate-200"
          }`}
        />
        {errors[`${index}.name`] && (
          <p className="mt-1 text-xs text-red-500">{errors[`${index}.name`]}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={attendee.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="email@example.com"
          className={`w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-300 ${
            errors[`${index}.email`] ? "border-red-400" : "border-slate-200"
          }`}
        />
        {errors[`${index}.email`] && (
          <p className="mt-1 text-xs text-red-500">{errors[`${index}.email`]}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Phone number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={attendee.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="+91 98765 43210"
          className={`w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-300 ${
            errors[`${index}.phone`] ? "border-red-400" : "border-slate-200"
          }`}
        />
        {errors[`${index}.phone`] && (
          <p className="mt-1 text-xs text-red-500">{errors[`${index}.phone`]}</p>
        )}
      </div>
    </div>
  );
}

export default function BookingForm({ cls, businessName, businessId }: Props) {
  const router = useRouter();
  const { user, profile } = useAppStore();

  const [attendees, setAttendees] = useState<Attendee[]>(() => [
    {
      name: (profile as { name?: string })?.name ?? "",
      email: user?.email ?? "",
      phone: (profile as { phone?: string })?.phone ?? "",
    },
  ]);

  // Optional insight fields (primary attendee only)
  const [showInsights, setShowInsights] = useState(false);
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [healthNote, setHealthNote] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDummyModal, setShowDummyModal] = useState(false);
  const [confirmingDummy, setConfirmingDummy] = useState(false);

  const paymentsMode = process.env.NEXT_PUBLIC_PAYMENTS_MODE ?? "dummy";
  const isDummyMode = paymentsMode === "dummy";
  const isRazorpayMode =
    paymentsMode === "razorpay" &&
    process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
  const isPaid = cls.price > 0 && (isDummyMode || isRazorpayMode);
  const seatsLeft = Math.max(0, cls.capacity - cls.bookedCount);

  function updateAttendee(index: number, field: keyof Attendee, value: string) {
    setAttendees((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${index}.${field}`];
      return next;
    });
  }

  function addAttendee() {
    setAttendees((prev) => [...prev, { name: "", email: "", phone: "" }]);
  }

  function removeAttendee(index: number) {
    setAttendees((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (attendees.length > seatsLeft) {
      e.seats = `Only ${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} remaining.`;
    }
    attendees.forEach((a, i) => {
      if (!a.name.trim()) e[`${i}.name`] = "Full name is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim()))
        e[`${i}.email`] = "Enter a valid email address.";
      if (!a.phone.trim()) e[`${i}.phone`] = "Phone number is required.";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function navigateToSuccess(opts?: { paid?: boolean; amount?: number }) {
    const params = new URLSearchParams({
      className: cls.title,
      date: formatDate(cls.date),
      time: `${formatTime(cls.startTime)} – ${formatTime(cls.endTime)}`,
      customerName: attendees[0].name,
      seats: String(attendees.length),
    });
    if (opts?.paid) params.set("paid", "true");
    if (opts?.amount) params.set("amount", String(opts.amount));
    router.push(`/booking/success?${params.toString()}`);
  }

  function buildAttendeePayload() {
    return {
      classId: cls.id,
      businessId,
      attendees: attendees.map((a) => ({
        name: a.name.trim(),
        email: a.email.trim(),
        phone: a.phone.trim(),
      })),
      ageRange: ageRange || null,
      gender: gender || null,
      experienceLevel: experienceLevel || null,
      goals: goals.length > 0 ? goals : null,
      healthNote: healthNote.trim() || null,
      marketingConsent,
    };
  }

  async function submitBookings() {
    const res = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildAttendeePayload()),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setServerError(d.error ?? "Failed to create booking. Please try again.");
      return false;
    }

    return true;
  }

  async function submitDummyPaidBooking() {
    const totalAmount = cls.price * attendees.length;
    const res = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildAttendeePayload(),
        isDummyPaid: true,
        amount: totalAmount,
      }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setServerError(d.error ?? "Failed to create booking. Please try again.");
      return false;
    }

    return true;
  }

  async function confirmDummyPayment() {
    setConfirmingDummy(true);
    setServerError(null);
    const ok = await submitDummyPaidBooking();
    if (ok) {
      setShowDummyModal(false);
      navigateToSuccess({ paid: true, amount: cls.price * attendees.length });
    }
    setConfirmingDummy(false);
  }

  async function handlePaidBooking() {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setServerError("Could not load payment gateway. Please try again.");
      return;
    }

    const totalAmount = cls.price * attendees.length;

    const orderRes = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: cls.id,
        businessId,
        amount: totalAmount,
        customerName: attendees[0].name.trim(),
        customerEmail: attendees[0].email.trim(),
        customerPhone: attendees[0].phone.trim(),
      }),
    });

    if (!orderRes.ok) {
      const d = await orderRes.json().catch(() => ({}));
      setServerError(d.error ?? "Failed to create payment order.");
      return;
    }

    const { orderId, amount, currency } = await orderRes.json();

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      currency,
      order_id: orderId,
      name: businessName,
      description: `${cls.title} × ${attendees.length} seat${attendees.length !== 1 ? "s" : ""}`,
      prefill: {
        name: attendees[0].name.trim(),
        email: attendees[0].email.trim(),
        contact: attendees[0].phone.trim(),
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            classId: cls.id,
            businessId,
            amount: totalAmount,
            // Full attendee list so the server creates one booking row per person
            attendees: attendees.map((a) => ({
              name: a.name.trim(),
              email: a.email.trim(),
              phone: a.phone.trim(),
            })),
            // Optional insight fields for the primary attendee
            ageRange: ageRange || null,
            gender: gender || null,
            experienceLevel: experienceLevel || null,
            goals: goals.length > 0 ? goals : null,
            healthNote: healthNote.trim() || null,
            marketingConsent,
          }),
        });

        if (verifyRes.ok) {
          navigateToSuccess({ paid: true, amount: totalAmount });
        } else {
          const d = await verifyRes.json().catch(() => ({}));
          setServerError(d.error ?? "Payment verification failed.");
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => setSubmitting(false),
      },
    });
    rzp.open();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);

    if (isPaid && isDummyMode) {
      // Show dummy payment modal — actual submission happens inside it
      setShowDummyModal(true);
    } else if (isPaid && isRazorpayMode) {
      setSubmitting(true);
      await handlePaidBooking();
      setSubmitting(false);
    } else {
      setSubmitting(true);
      const ok = await submitBookings();
      if (ok) navigateToSuccess();
      setSubmitting(false);
    }
  }

  const totalPrice = cls.price * attendees.length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Seat capacity warning */}
      {attendees.length > seatsLeft && seatsLeft > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
          Only {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} remaining — please reduce the number of attendees.
        </div>
      )}
      {seatsLeft === 0 && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 ring-1 ring-red-200">
          This class is fully booked.
        </div>
      )}
      {errors.seats && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {errors.seats}
        </p>
      )}

      {/* Attendee cards */}
      {attendees.map((a, i) => (
        <AttendeeCard
          key={i}
          index={i}
          attendee={a}
          onChange={(field, value) => updateAttendee(i, field, value)}
          onRemove={i > 0 ? () => removeAttendee(i) : undefined}
          errors={errors}
          isFirst={i === 0}
        />
      ))}

      {/* Add attendee button */}
      {attendees.length < seatsLeft && (
        <button
          type="button"
          onClick={addAttendee}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-bold text-slate-500 transition hover:border-teal-300 hover:text-teal-600"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 6 V14 M6 10 H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add another person
        </button>
      )}

      {/* Optional insights (primary attendee only) */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setShowInsights(!showInsights)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="text-sm font-bold text-slate-900">
              Help us personalise your experience
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Optional — won&apos;t affect your booking.
            </p>
          </div>
          <span className="ml-4 text-slate-400 text-xl">{showInsights ? "−" : "+"}</span>
        </button>

        {showInsights && (
          <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Age range</p>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAgeRange(ageRange === r ? "" : r)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      ageRange === r
                        ? "border-teal-400 bg-teal-50 text-teal-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Gender</p>
              <div className="flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(gender === g ? "" : g)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      gender === g
                        ? "border-teal-400 bg-teal-50 text-teal-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Experience level</p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setExperienceLevel(experienceLevel === l ? "" : l)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      experienceLevel === l
                        ? "border-teal-400 bg-teal-50 text-teal-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Goals{" "}
                <span className="font-normal text-slate-400">(select all that apply)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {GOALS_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      goals.includes(g)
                        ? "border-teal-400 bg-teal-50 text-teal-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Health note or special requirement
              </label>
              <textarea
                value={healthNote}
                onChange={(e) => setHealthNote(e.target.value)}
                rows={2}
                placeholder="e.g. lower back injury, pregnant, need accessible space…"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              <span className="text-sm text-slate-600">
                I&apos;d like to receive updates and offers from {businessName}.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Booking summary */}
      <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          Booking summary
        </p>
        <p className="mt-2 text-base font-bold text-slate-900">{cls.title}</p>
        <p className="text-sm text-slate-600">{businessName}</p>
        <div className="mt-3 space-y-1 text-sm text-slate-600">
          <p>
            {formatDate(cls.date)} · {formatTime(cls.startTime)} –{" "}
            {formatTime(cls.endTime)}
          </p>
          <p>{cls.location}</p>
          <p>
            {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left
          </p>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            {attendees.length > 1 && (
              <p className="text-xs text-slate-500">
                {attendees.length} attendees ×{" "}
                {cls.price === 0 ? "Free" : `₹${cls.price.toLocaleString("en-IN")}`}
              </p>
            )}
            <p className="text-2xl font-black text-slate-900">
              {cls.price === 0
                ? "Free"
                : `₹${totalPrice.toLocaleString("en-IN")}`}
            </p>
          </div>
          {attendees.length > 1 && (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
              {attendees.length} seats
            </span>
          )}
        </div>
      </div>

      {serverError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || seatsLeft === 0}
        className="w-full rounded-full bg-teal-600 py-4 text-base font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
      >
        {submitting
          ? "Processing…"
          : isPaid
          ? `Confirm & Pay ₹${totalPrice.toLocaleString("en-IN")}`
          : attendees.length > 1
          ? `Confirm ${attendees.length} Bookings`
          : "Confirm Booking"}
      </button>

      {/* Dummy payment modal — shown when NEXT_PUBLIC_PAYMENTS_MODE=dummy */}
      {showDummyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
            {/* Demo warning */}
            <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-center ring-1 ring-amber-200">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                Demo Mode — No real payment
              </p>
              <p className="mt-1 text-xs text-amber-600">
                This is a simulated payment. No money is charged.
              </p>
            </div>

            <h2 className="text-xl font-black text-slate-900">Simulated Payment</h2>
            <p className="mt-1 text-sm text-slate-500">{cls.title}</p>
            <p className="text-xs text-slate-400">{businessName}</p>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              {attendees.length > 1 && (
                <p className="mb-1 text-xs text-slate-500">
                  {attendees.length} attendees × ₹{cls.price.toLocaleString("en-IN")}
                </p>
              )}
              <p className="text-3xl font-black text-slate-900">
                ₹{totalPrice.toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Payable to: {businessName}
              </p>
            </div>

            {serverError && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {serverError}
              </p>
            )}

            <button
              type="button"
              onClick={confirmDummyPayment}
              disabled={confirmingDummy}
              className="mt-5 w-full rounded-full bg-teal-600 py-4 text-base font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {confirmingDummy ? "Processing…" : "Simulate Payment Success"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDummyModal(false);
                setServerError(null);
              }}
              disabled={confirmingDummy}
              className="mt-3 w-full rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
