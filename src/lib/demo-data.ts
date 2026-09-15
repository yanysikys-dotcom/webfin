import { categoryForMcc } from "@/lib/categories";

export type DemoTx = {
  occurred_at: string;
  description: string;
  amount: number;
  mcc: number;
  category: string;
  balance_after: number;
  is_demo: true;
};

type Merchant = { name: string; mcc: number; min: number; max: number; weight: number };

// Суми — у гривнях (конвертуються в копійки при генерації)
const MERCHANTS: Merchant[] = [
  { name: "Сільпо", mcc: 5411, min: 150, max: 1800, weight: 10 },
  { name: "АТБ", mcc: 5411, min: 100, max: 900, weight: 10 },
  { name: "Кавʼярня Aroma", mcc: 5814, min: 60, max: 220, weight: 8 },
  { name: "Glovo", mcc: 5812, min: 250, max: 700, weight: 6 },
  { name: "Uklon", mcc: 4121, min: 90, max: 350, weight: 6 },
  { name: "Київський метрополітен", mcc: 4111, min: 8, max: 50, weight: 5 },
  { name: "Аптека АНЦ", mcc: 5912, min: 80, max: 600, weight: 3 },
  { name: "WOG", mcc: 5541, min: 800, max: 2500, weight: 2 },
  { name: "Rozetka", mcc: 5732, min: 300, max: 5000, weight: 2 },
  { name: "Netflix", mcc: 5815, min: 199, max: 199, weight: 1 },
  { name: "Київстар", mcc: 4814, min: 200, max: 200, weight: 1 },
  { name: "Multiplex", mcc: 7832, min: 180, max: 500, weight: 1 },
  { name: "Zara", mcc: 5651, min: 500, max: 3500, weight: 1 },
  { name: "Booking.com", mcc: 4722, min: 1500, max: 8000, weight: 1 },
];

const TOTAL_WEIGHT = MERCHANTS.reduce((s, m) => s + m.weight, 0);

function pickMerchant(): Merchant {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const m of MERCHANTS) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return MERCHANTS[0];
}

function makeTx(
  day: Date, hour: number, description: string, amount: number,
  mcc: number, category: string, balance: number,
): DemoTx {
  const d = new Date(day);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return {
    occurred_at: d.toISOString(),
    description,
    amount,
    mcc,
    category,
    balance_after: balance,
    is_demo: true,
  };
}

export function generateDemoTransactions(days = 120, until = new Date()): DemoTx[] {
  const txs: DemoTx[] = [];
  let balance = 50_000_00; // 50 000 грн стартовий баланс
  const start = new Date(until);
  start.setDate(start.getDate() - days);

  for (let i = 0; i <= days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);

    if (day.getDate() === 1) {
      balance += 45_000_00;
      txs.push(makeTx(day, 9, "Зарахування заробітної плати", 45_000_00, 0, "Надходження", balance));
    }

    const purchases = Math.floor(Math.random() * 4); // 0–3 покупки на день
    for (let p = 0; p < purchases; p++) {
      const m = pickMerchant();
      const amount = -Math.round((m.min + Math.random() * (m.max - m.min)) * 100);
      balance += amount;
      const hour = 8 + Math.floor(Math.random() * 14);
      txs.push(makeTx(day, hour, m.name, amount, m.mcc, categoryForMcc(m.mcc), balance));
    }
  }
  return txs;
}
