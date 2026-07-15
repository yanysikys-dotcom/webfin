// Виконує SQL-файл у базі проєкту через Supabase Management API.
// Використання: node scripts/run-sql.mjs supabase/schema.sql
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.log("Використання: node scripts/run-sql.mjs <шлях-до-sql-файлу>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: readFileSync(file, "utf8") }),
  },
);

if (!res.ok) {
  console.log(`❌ Помилка HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const rows = await res.json();
if (Array.isArray(rows) && rows.length > 0) {
  console.table(rows);
}
console.log(`✅ ${file} виконано успішно`);
