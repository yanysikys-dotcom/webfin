import { NextResponse } from "next/server";
import {
  buildPurchaseParams, createOrderReference, PREMIUM_PRICE_KOPECKS,
} from "@/lib/wayforpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const orderReference = createOrderReference(user.id);
  const orderDate = Math.floor(Date.now() / 1000);

  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({
    user_id: user.id,
    order_reference: orderReference,
    amount: PREMIUM_PRICE_KOPECKS,
    status: "created",
  });
  if (error) {
    return NextResponse.json({ error: "Не вдалося створити замовлення" }, { status: 500 });
  }

  return NextResponse.json({ params: buildPurchaseParams(orderReference, orderDate) });
}
