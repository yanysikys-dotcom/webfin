type Card = { label: string; value: string; hint?: string };

export function SummaryCards({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">{c.label}</p>
          <p className="mt-1 truncate text-2xl font-semibold text-slate-900">{c.value}</p>
          {c.hint && <p className="mt-1 truncate text-xs text-slate-400">{c.hint}</p>}
        </div>
      ))}
    </div>
  );
}
