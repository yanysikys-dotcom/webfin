import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/demo-seed";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  const added = await seedDemoData(user.id);
  return NextResponse.json({ added });
}
