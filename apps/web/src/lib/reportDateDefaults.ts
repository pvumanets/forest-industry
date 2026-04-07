/** Дефолтный диапазон для отчётов: последние 8 календарных недель (понедельник–воскресенье). */

export function isoTodayLocal(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/** Понедельник ISO-недели для даты (локально). */
function mondayOfWeekContaining(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function isoDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** «Последние 8 недель»: from = понедельник 7 недель назад от понедельника недели, содержащей to; to = сегодня. */
export function defaultReportRange(): { from: string; to: string } {
  const toD = new Date();
  toD.setHours(0, 0, 0, 0);
  const to = isoDateString(toD);
  const mon = mondayOfWeekContaining(toD);
  mon.setDate(mon.getDate() - 7 * 7);
  const from = isoDateString(mon);
  return { from, to };
}

export function presetLast8Weeks(): { from: string; to: string } {
  return defaultReportRange();
}
