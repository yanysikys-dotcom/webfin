import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url?.startsWith("https://") || !key || key.startsWith("встав_сюди") || key.startsWith("заповню")) {
  console.log("❌ У .env.local ще не вставлені справжні значення");
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
console.log(res.ok ? "✅ Supabase доступний, ключі працюють" : `❌ Помилка: HTTP ${res.status}`);
process.exit(res.ok ? 0 : 1);
