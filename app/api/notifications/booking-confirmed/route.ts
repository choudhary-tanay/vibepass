import { createClient } from "@supabase/supabase-js";
import { sendBookingEmails } from "@/lib/emailService";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    classId,
    businessId,
    customerName,
    customerEmail,
    customerPhone,
    amount,
    isPaid,
  } = body;

  if (!classId || !businessId || !customerName || !customerEmail || !customerPhone) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch class details for the email
  const { data: cls } = await supabase
    .from("classes")
    .select("title, date, start_time, end_time, location")
    .eq("id", classId)
    .single();

  // Fetch business details (name + owner email for notification)
  const { data: business } = await supabase
    .from("businesses")
    .select("business_name, email")
    .eq("id", businessId)
    .single();

  if (!cls || !business) {
    // Don't fail the response if we can't fetch details — just skip email
    return Response.json({ sent: false, reason: "Could not fetch class or business details" });
  }

  await sendBookingEmails({
    customerName,
    customerEmail,
    customerPhone,
    classTitle: cls.title,
    classDate: cls.date,
    classStartTime: cls.start_time,
    classEndTime: cls.end_time,
    classLocation: cls.location,
    businessName: business.business_name,
    ownerEmail: business.email,
    amount: amount ?? 0,
    isPaid: isPaid ?? false,
  });

  return Response.json({ sent: true });
}
