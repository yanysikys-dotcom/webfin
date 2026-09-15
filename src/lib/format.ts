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
