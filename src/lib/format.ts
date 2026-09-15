const MONTHS = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];

export function formatMoney(kopecks: number): string {
  const sign = kopecks < 0 ? "−" : "";
  const abs = Math.abs(kopecks);
  const hrn = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const kop = String(abs % 100).padStart(2, "0");
  return `${sign}${hrn},${kop} ₴`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Українські числівники: 1 покупка, 2–4 покупки, 5+ покупок.
// Числа 11–14 — виняток: завжди форма «багато» (11 покупок, а не 11 покупка).
export function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
