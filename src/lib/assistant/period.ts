export type Period = { from: Date; to: Date; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Понеділок вважаємо першим днем тижня (українська норма).
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const shift = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - shift);
  return x;
}

export function parsePeriod(question: string, now = new Date()): Period {
  const q = question.toLowerCase();

  if (q.includes("сьогодні")) {
    return { from: startOfDay(now), to: endOfDay(now), label: "сьогодні" };
  }

  if (q.includes("вчора")) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y), label: "вчора" };
  }

  // Корінь «тиж» покриває всі форми: тиждень, тижня, тижні, тижнів.
  if (q.includes("тиж")) {
    const thisWeek = startOfWeek(now);
    if (q.includes("минул") || q.includes("попередн")) {
      const from = new Date(thisWeek);
      from.setDate(from.getDate() - 7);
      const to = new Date(thisWeek);
      to.setDate(to.getDate() - 1);
      return { from, to: endOfDay(to), label: "минулого тижня" };
    }
    return { from: thisWeek, to: endOfDay(now), label: "цього тижня" };
  }

  const days = q.match(/(\d+)\s*(дн|день|днів|дні)/);
  if (days) {
    const n = Number(days[1]);
    const from = new Date(now);
    from.setDate(from.getDate() - (n - 1));
    return {
      from: startOfDay(from),
      to: endOfDay(now),
      label: `за останні ${n} днів`,
    };
  }

  if (q.includes("рік") || q.includes("року")) {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: endOfDay(now),
      label: "цього року",
    };
  }

  if (q.includes("минул") || q.includes("попередн")) {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      label: "минулого місяця",
    };
  }

  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: endOfDay(now),
    label: "цього місяця",
  };
}
