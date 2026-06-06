import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { classId, businessId, amount, seatCount, customerName, customerEmail, customerPhone } = body;

  if (!classId || !businessId || amount === undefined || !seatCount || !customerName || !customerEmail || !customerPhone) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof amount !== "number" || amount <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  const seatsNeeded = Number(seatCount);
  if (!Number.isInteger(seatsNeeded) || seatsNeeded <= 0) {
    return Response.json({ error: "Invalid seat count" }, { status: 400 });
  }

  // Instantiate Razorpay here (not at module level) so env vars are available at runtime
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  // Use service role to check class capacity (bypasses RLS since this is server-side)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: cls, error: clsErr } = await supabase
    .from("classes")
    .select("id, business_id, capacity, booked_count, status, price, currency")
    .eq("id", classId)
    .single();

  if (clsErr || !cls) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  if (cls.business_id !== businessId) {
    return Response.json({ error: "Business does not match class." }, { status: 400 });
  }

  if (cls.status !== "published") {
    return Response.json({ error: "Class is not available for booking" }, { status: 400 });
  }

  const bookedCount = Number(cls.booked_count ?? 0);
  const capacity = Number(cls.capacity ?? 0);
  if (bookedCount + seatsNeeded > capacity) {
    return Response.json({ error: "Class is fully booked" }, { status: 400 });
  }

  const currency = String(cls.currency ?? "INR").toUpperCase();
  const expectedAmount = Number(cls.price ?? 0) * seatsNeeded;
  if (Math.abs(amount - expectedAmount) > 0.01) {
    return Response.json({ error: "Payment amount does not match class price." }, { status: 400 });
  }

  try {
    // Razorpay expects amount in the smallest currency unit.
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: `cls_${classId.slice(0, 8)}_${Date.now()}`,
    });

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return Response.json({ error: "Failed to create payment order." }, { status: 500 });
  }
}
