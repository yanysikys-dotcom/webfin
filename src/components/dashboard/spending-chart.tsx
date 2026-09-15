"use client";

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { DayPoint } from "@/lib/analytics";
import { formatDate, formatMoney } from "@/lib/format";

export function SpendingChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-700">Витрати за 30 днів</h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e1e0d9" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#c3c2b7" }}
              tick={{ fill: "#898781", fontSize: 12 }}
              interval={6}
            />
            <YAxis
              tickFormatter={(v) => String(Math.round(Number(v) / 100))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#898781", fontSize: 12 }}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "rgba(11,11,11,0.04)" }}
              formatter={(value) => [formatMoney(Number(value)), "Витрати"]}
              labelFormatter={(label, payload) =>
                payload?.[0] ? formatDate((payload[0].payload as DayPoint).date) : String(label)
              }
            />
            <Bar
              dataKey="total"
              name="Витрати"
              fill="#2a78d6"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-400">Вертикальна вісь — гривні</p>
    </div>
  );
}
