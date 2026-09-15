import { TrendingDown, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/format";

export function MonthComparison({
  current,
  previous,
  diff,
  percent,
}: {
  current: number;
  previous: number;
  diff: number;
  percent: number;
}) {
  const grew = diff > 0;
  const Icon = grew ? TrendingUp : TrendingDown;
  // Зростання витрат — червоне, зменшення — зелене.
  const tone = diff === 0 ? "text-slate-500" : grew ? "text-red-600" : "text-green-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-slate-700">Цей місяць проти минулого</h2>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Преміум
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-slate-500">Цей місяць</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">
            {formatMoney(current)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Минулий місяць</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-400">
            {formatMoney(previous)}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 ${tone}`}>
          <Icon className="h-5 w-5" />
          <span className="font-medium tabular-nums">
            {diff === 0
              ? "без змін"
              : `${grew ? "+" : "−"}${formatMoney(Math.abs(diff)).replace("−", "")} (${
                  percent > 0 ? "+" : ""
                }${percent}%)`}
          </span>
        </div>
      </div>
    </div>
  );
}
