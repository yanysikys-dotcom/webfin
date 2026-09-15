"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySlice } from "@/lib/analytics";
import { colorForCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/format";

export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  const sum = data.reduce((s, x) => s + x.total, 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-700">Витрати за категоріями (30 днів)</h2>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={(value, name) => [formatMoney(Number(value)), String(name)]} />
              <Pie
                data={data}
                dataKey="total"
                nameKey="category"
                innerRadius={50}
                outerRadius={85}
                stroke="#ffffff"
                strokeWidth={2}
                paddingAngle={1}
                isAnimationActive={false}
              >
                {data.map((s) => (
                  <Cell key={s.category} fill={colorForCategory(s.category)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-2">
          {data.map((s) => (
            <li key={s.category} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: colorForCategory(s.category) }}
              />
              <span className="min-w-0 flex-1 truncate text-slate-700">{s.category}</span>
              <span className="whitespace-nowrap font-medium tabular-nums text-slate-900">
                {formatMoney(s.total)}
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums text-slate-400">
                {sum ? Math.round((s.total / sum) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
