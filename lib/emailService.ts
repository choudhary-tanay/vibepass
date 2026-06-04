import { Resend } from "resend";

export interface BookingEmailParams {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  classTitle: string;
  classDate: string;
  classStartTime: string;
  classEndTime: string;
  classLocation: string;
  businessName: string;
  ownerEmail: string;
  amount: number;
  isPaid: boolean;
  seatCount?: number;
}

function formatTime(t: string): string {
  if (!t) return t;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(d: string): string {
  if (!d) return d;
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function sendBookingEmails(params: BookingEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email notifications");
    return;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "notifications@resend.dev";
  const resend = new Resend(apiKey);

  const formattedDate = formatDate(params.classDate);
  const formattedTime = `${formatTime(params.classStartTime)} – ${formatTime(params.classEndTime)}`;
  const priceText = params.isPaid
    ? `₹${params.amount.toLocaleString("en-IN")}`
    : "Free";

  const customerHtml = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1d4ed8; margin-bottom: 4px;">Booking Confirmed!</h2>
      <p style="color: #374151; margin-top: 0;">Hi ${params.customerName},</p>
      <p style="color: #374151;">Your booking has been confirmed. Here are your details:</p>

      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #111827;">${params.classTitle}</p>
        <p style="margin: 0 0 4px; color: #374151;">📍 ${params.businessName}</p>
        <p style="margin: 0 0 4px; color: #374151;">📅 ${formattedDate}</p>
        <p style="margin: 0 0 4px; color: #374151;">🕐 ${formattedTime}</p>
        <p style="margin: 0 0 4px; color: #374151;">📌 ${params.classLocation}</p>
        <p style="margin: 8px 0 0; font-weight: 600; color: #111827;">Amount: ${priceText}</p>
      </div>

      <p style="color: #374151;">We look forward to seeing you!</p>
      <p style="color: #6b7280; font-size: 13px;">— The ${params.businessName} Team</p>
    </div>
  `;

  const ownerHtml = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1d4ed8; margin-bottom: 4px;">New Booking Received</h2>
      <p style="color: #374151;">A new booking has been confirmed for <strong>${params.classTitle}</strong>.</p>

      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 6px; font-weight: 700; color: #111827;">Class Details</p>
        <p style="margin: 0 0 4px; color: #374151;">📅 ${formattedDate}</p>
        <p style="margin: 0 0 4px; color: #374151;">🕐 ${formattedTime}</p>
        <p style="margin: 0 0 4px; color: #374151;">📌 ${params.classLocation}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
        <p style="margin: 0 0 6px; font-weight: 700; color: #111827;">Customer Details</p>
        <p style="margin: 0 0 4px; color: #374151;">👤 ${params.customerName}</p>
        <p style="margin: 0 0 4px; color: #374151;">✉️ ${params.customerEmail}</p>
        <p style="margin: 0 0 4px; color: #374151;">📞 ${params.customerPhone}</p>
        <p style="margin: 8px 0 0; font-weight: 600; color: #111827;">Amount: ${priceText}</p>
      </div>
    </div>
  `;

  // Send both emails concurrently; errors are caught so they never break the booking
  await Promise.allSettled([
    resend.emails.send({
      from: fromEmail,
      to: [params.customerEmail],
      subject: `Booking Confirmed – ${params.classTitle}`,
      html: customerHtml,
    }),
    resend.emails.send({
      from: fromEmail,
      to: [params.ownerEmail],
      subject: `New Booking – ${params.classTitle}`,
      html: ownerHtml,
    }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`Email ${i === 0 ? "customer" : "owner"} send failed:`, r.reason);
      }
    });
  });
}
