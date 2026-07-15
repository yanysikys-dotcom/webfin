// Одноразове налаштування: за Personal Access Token знаходить проєкт,
// витягує ключі через Supabase Management API і записує їх у .env.local.
// Секрети на екран не виводить.
import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = ".env.local";
const API = "https://api.supabase.com";

function readEnv() {
  return Object.fromEntries(
    readFileSync(ENV_PATH, "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} → HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

const token = readEnv().SUPABASE_ACCESS_TOKEN;
if (!token || !token.startsWith("sbp_")) {
  console.log("❌ У .env.local немає токена sbp_...");
  process.exit(1);
}

const projects = await api("/v1/projects");
const project =
  projects.find((p) => p.name === "webfin") ?? (projects.length === 1 ? projects[0] : null);
if (!project) {
  console.log(`❌ Не знайшов проєкт "webfin". Є проєкти: ${projects.map((p) => p.name).join(", ")}`);
  process.exit(1);
}
console.log(`✅ Проєкт знайдено: ${project.name} (регіон: ${project.region}, статус: ${project.status})`);

const keys = await api(`/v1/projects/${project.id}/api-keys?reveal=true`);
const anonKey =
  keys.find((k) => k.name === "anon")?.api_key ??
  keys.find((k) => k.type === "publishable")?.api_key;
const serviceKey =
  keys.find((k) => k.name === "service_role")?.api_key ??
  keys.find((k) => k.type === "secret")?.api_key;
if (!anonKey || !serviceKey) {
  console.log(`❌ Не знайшов ключі. Доступні: ${keys.map((k) => k.name ?? k.type).join(", ")}`);
  process.exit(1);
}

const lines = [
  "# Секрети WebFin — цей файл НЕ потрапляє в git",
  `SUPABASE_ACCESS_TOKEN=${token}`,
  `SUPABASE_PROJECT_REF=${project.id}`,
  `NEXT_PUBLIC_SUPABASE_URL=https://${project.id}.supabase.co`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
  `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
  "",
];
writeFileSync(ENV_PATH, lines.join("\n"));
console.log("✅ Ключі проєкту записано в .env.local");

const rows = await api(`/v1/projects/${project.id}/database/query`, {
  method: "POST",
  body: JSON.stringify({ query: "select 1 as ok" }),
});
console.log(rows[0]?.ok === 1 ? "✅ SQL-доступ працює: можу створювати таблиці та політики" : "❌ SQL-перевірка не пройшла");
