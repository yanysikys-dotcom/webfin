// Вмикає або вимикає преміум для користувача — щоб перевірити преміум-функції
// без проходження оплати. Використання:
//   node scripts/set-premium.mjs test1@webfin.local on
//   node scripts/set-premium.mjs test1@webfin.local off
import { readFileSync } from "node:fs";

const [email, mode = "on"] = process.argv.slice(2);
if (!email) {
  console.log("Використання: node scripts/set-premium.mjs <email> [on|off]");
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

const until = new Date();
until.setDate(until.getDate() + 30);
const sql =
  mode === "off"
    ? `update public.profiles set is_premium = false, premium_until = null where email = '${email}';`
    : `update public.profiles set is_premium = true, premium_until = '${until.toISOString()}' where email = '${email}';`;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

console.log(
  res.ok
    ? `✅ Преміум ${mode === "off" ? "вимкнено" : "увімкнено"} для ${email}`
    : `❌ Помилка HTTP ${res.status}: ${await res.text()}`,
);
process.exit(res.ok ? 0 : 1);
