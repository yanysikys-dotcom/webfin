// Кольори — перевірена палітра (dataviz validate_palette.js: PASS, ΔE 24.2).
// «Перекази», «Надходження», «Інше» — нейтральні, не з категоріальних слотів.
export const CATEGORY_COLORS: Record<string, string> = {
  "Продукти": "#2a78d6",
  "Кафе і ресторани": "#1baf7a",
  "Транспорт": "#eda100",
  "Здоровʼя": "#008300",
  "Розваги": "#4a3aa7",
  "Комуналка і звʼязок": "#e34948",
  "Шопінг": "#e87ba4",
  "Подорожі": "#eb6834",
  "Перекази": "#898781",
  "Надходження": "#006300",
  "Інше": "#c3c2b7",
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

const MCC_MAP: Record<string, number[]> = {
  "Продукти": [5411, 5422, 5441, 5451, 5462, 5499],
  "Кафе і ресторани": [5811, 5812, 5813, 5814],
  "Транспорт": [4111, 4121, 4131, 5541, 5542, 7523],
  "Здоровʼя": [5912, 8011, 8021, 8043, 8062, 8099],
  "Розваги": [5735, 5815, 5816, 7832, 7922, 7941, 7994, 7996, 7999],
  "Комуналка і звʼязок": [4814, 4899, 4900],
  "Шопінг": [5311, 5331, 5399, 5651, 5661, 5691, 5732, 5942, 5977, 5999],
  "Перекази": [4829, 6012, 6538],
  "Подорожі": [4511, 4722, 7011],
};

// Діапазони MCC авіаліній (3000–3299) і готелів (3501–3999)
const MCC_RANGES: Array<[number, number, string]> = [
  [3000, 3299, "Подорожі"],
  [3501, 3999, "Подорожі"],
];

export function categoryForMcc(mcc: number | null | undefined): string {
  if (!mcc) return "Інше";
  for (const [category, codes] of Object.entries(MCC_MAP)) {
    if (codes.includes(mcc)) return category;
  }
  for (const [from, to, category] of MCC_RANGES) {
    if (mcc >= from && mcc <= to) return category;
  }
  return "Інше";
}

export function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["Інше"];
}
