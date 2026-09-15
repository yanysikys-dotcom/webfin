import { NextResponse } from "next/server";
import { checkPaymentStatus, PREMIUM_DAYS } from "@/lib/wayforpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { orderReference } = await request.json().catch(() => ({}));
  if (typeof orderReference !== "string" || !orderReference) {
    return NextResponse.json({ error: "Не вказано замовлення" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Замовлення має належати цьому користувачеві — інакше чужу оплату можна
  // було б «привласнити», підставивши чужий orderReference.
  const { data: payment } = await admin
    .from("payments")
    .select("id, user_id, status")
    .eq("order_reference", orderReference)
    .maybeSingle();
  if (!payment || payment.user_id !== user.id) {
    return NextResponse.json({ error: "Замовлення не знайдено" }, { status: 404 });
  }

  // Джерело істини — відповідь WayForPay, а не браузер користувача.
  const status = await checkPaymentStatus(orderReference);
  const approved = status.transactionStatus === "Approved";

  await admin
    .from("payments")
    .update({ status: status.transactionStatus ?? "Unknown" })
    .eq("id", payment.id);

  if (!approved) {
    return NextResponse.json({
      premium: false,
      status: status.transactionStatus ?? "Unknown",
    });
  }

  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + PREMIUM_DAYS);
  await admin
    .from("profiles")
    .update({ is_premium: true, premium_until: premiumUntil.toISOString() })
    .eq("id", user.id);

  return NextResponse.json({
    premium: true,
    status: status.transactionStatus,
    premiumUntil: premiumUntil.toISOString(),
  });
}
