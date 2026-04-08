import { formatRub } from "./moneyFormat";

export function offlineAvgCheck(
  offRev: string,
  offOrd: string,
): { text: string; isDash: boolean; noOrders: boolean } {
  const ordRaw = offOrd.trim();
  const ord = parseInt(ordRaw, 10);
  if (!ordRaw || Number.isNaN(ord)) {
    return { text: "—", isDash: true, noOrders: false };
  }
  if (ord === 0) {
    return { text: "—", isDash: true, noOrders: true };
  }
  const rev = parseFloat(offRev.trim().replace(",", "."));
  if (Number.isNaN(rev)) {
    return { text: "—", isDash: true, noOrders: false };
  }
  return { text: formatRub(rev / ord), isDash: false, noOrders: false };
}

export function offlineRetAvg(
  offRetSum: string,
  offRetN: string,
): { text: string; isDash: boolean } {
  const sum = parseFloat(offRetSum.trim().replace(",", "."));
  const n = parseInt(offRetN.trim(), 10);
  if (!offRetN.trim() || Number.isNaN(n) || n <= 0) {
    return { text: "—", isDash: true };
  }
  if (Number.isNaN(sum)) {
    return { text: "—", isDash: true };
  }
  return { text: formatRub(sum / n), isDash: false };
}

