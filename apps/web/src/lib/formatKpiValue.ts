/** Форматирование KPI для дашборда (ui-copy §5, табличные цифры на стороне className). */

import { formatRubKpiCompact, formatRubKpiDisplay, type RubKpiDisplay } from "../entry/moneyFormat";

const intFmt = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

const dec1 = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dec4 = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Денежная ветка KPI (всё, что не целые/проценты/время/рейтинг). */
export function isDashboardMoneyKpi(id: string): boolean {
  return !(
    id === "WEB-TRF-TOT" ||
    id === "DER-ORD-TOT" ||
    id === "OFF-ORD" ||
    id === "OFF-ORD-SUM" ||
    id === "OZ-ORD" ||
    id === "OZ-RET-N" ||
    id === "REP-REV-CNT-TOT" ||
    id === "OFF-RET-N-TOT" ||
    id === "DER-RET-N-TOT" ||
    id === "REP-REV-DELTA" ||
    id === "DER-OZ-SHARE" ||
    id === "WEB-BEH-BOUNCE" ||
    id === "WEB-BEH-TIME" ||
    id === "REP-RATING-AVG"
  );
}

export function getDashboardKpiMoneyDisplay(id: string, v: number | null): RubKpiDisplay | null {
  if (v === null || !isDashboardMoneyKpi(id)) return null;
  return formatRubKpiDisplay(v);
}

function formatKpiValueCore(id: string, v: number): { text: string; title?: string } {
  if (
    id === "WEB-TRF-TOT" ||
    id === "DER-ORD-TOT" ||
    id === "OFF-ORD" ||
    id === "OFF-ORD-SUM" ||
    id === "OZ-ORD" ||
    id === "OZ-RET-N" ||
    id === "REP-REV-CNT-TOT" ||
    id === "OFF-RET-N-TOT" ||
    id === "DER-RET-N-TOT" ||
    id === "REP-REV-DELTA"
  ) {
    return { text: intFmt.format(v) };
  }

  if (id === "DER-OZ-SHARE") {
    return { text: `${dec4.format(v)}%` };
  }

  if (id === "WEB-BEH-BOUNCE") {
    return { text: `${dec1.format(v)}%` };
  }

  if (id === "WEB-BEH-TIME") {
    return { text: dec1.format(v) };
  }

  if (id === "REP-RATING-AVG") {
    return { text: dec4.format(v) };
  }

  const { short, full } = formatRubKpiCompact(v);
  return { text: short, title: short !== full ? full : undefined };
}

export function formatKpiValue(id: string, v: number | null): string {
  if (v === null) return "—";
  return formatKpiValueCore(id, v).text;
}

/** Полная сумма в рублях для native title при компактном виде (тыс / млн / млрд). */
export function formatKpiValueTitle(id: string, v: number | null): string | undefined {
  if (v === null) return undefined;
  return formatKpiValueCore(id, v).title;
}
