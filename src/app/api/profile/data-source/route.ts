import { NextResponse } from "next/server";
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

  const { source } = await request.json().catch(() => ({}));
  if (source !== "demo" && source !== "monobank") {
    return NextResponse.json({ error: "Невідоме джерело даних" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (source === "monobank") {
    const { data } = await admin
      .from("monobank_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) {
      return NextResponse.json(
        { error: "Спочатку підключи Monobank токеном нижче" },
        { status: 400 },
      );
    }
  }

  await admin.from("profiles").update({ data_source: source }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
