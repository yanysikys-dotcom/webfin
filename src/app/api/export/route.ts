import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getProfile, getVisibleTransactions } from "@/lib/data";
import { isPremiumActive } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const profile = await getProfile(supabase);
  if (!isPremiumActive(profile)) {
    return NextResponse.json({ error: "Експорт доступний у Преміумі" }, { status: 403 });
  }

  const transactions = await getVisibleTransactions(supabase, profile, { limit: 5000 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Транзакції");
  sheet.columns = [
    { header: "Дата", key: "date", width: 20 },
    { header: "Опис", key: "description", width: 36 },
    { header: "Категорія", key: "category", width: 22 },
    { header: "Сума, ₴", key: "amount", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const t of transactions) {
    sheet.addRow({
      date: new Date(t.occurred_at),
      description: t.description,
      category: t.category,
      amount: t.amount / 100,
    });
  }
  sheet.getColumn("date").numFmt = "dd.mm.yyyy hh:mm";
  sheet.getColumn("amount").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `webfin-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
