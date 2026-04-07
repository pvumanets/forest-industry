import type { OfflinePutBody, OfflineSubmission } from "../api/submissionsTypes";
import { parseIntInput, parseMoneyInput } from "./moneyFormat";

export interface OfflineDraft {
  off_rev: string;
  off_ord: string;
  off_ret_n: string;
  off_ret_sum: string;
}

export function emptyOfflineDraft(): OfflineDraft {
  return {
    off_rev: "",
    off_ord: "",
    off_ret_n: "",
    off_ret_sum: "",
  };
}

function nStr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function draftFromOfflineSubmission(s: OfflineSubmission): OfflineDraft {
  return {
    off_rev: nStr(s.off_rev),
    off_ord: nStr(s.off_ord),
    off_ret_n: nStr(s.off_ret_n),
    off_ret_sum: nStr(s.off_ret_sum),
  };
}

export function validateOfflineDraft(d: OfflineDraft): Record<string, string> {
  const e: Record<string, string> = {};
  const money = (raw: string, key: string) => {
    if (raw.trim() === "") {
      e[key] = "Заполните поле";
      return null;
    }
    const v = parseMoneyInput(raw);
    if (v === null || v < 0) {
      e[key] = "Введите неотрицательное число";
      return null;
    }
    return Math.round(v * 100) / 100;
  };
  const intv = (raw: string, key: string) => {
    if (raw.trim() === "") {
      e[key] = "Заполните поле";
      return null;
    }
    const v = parseIntInput(raw);
    if (v === null || v < 0) {
      e[key] = "Целое число ≥ 0";
      return null;
    }
    return v;
  };
  money(d.off_rev, "off_rev");
  intv(d.off_ord, "off_ord");
  intv(d.off_ret_n, "off_ret_n");
  money(d.off_ret_sum, "off_ret_sum");
  return e;
}

export function buildOfflinePutBody(d: OfflineDraft): OfflinePutBody | null {
  const err = validateOfflineDraft(d);
  if (Object.keys(err).length > 0) return null;
  return {
    off_rev: Math.round(parseMoneyInput(d.off_rev)! * 100) / 100,
    off_ord: parseIntInput(d.off_ord)!,
    off_ret_n: parseIntInput(d.off_ret_n)!,
    off_ret_sum: Math.round(parseMoneyInput(d.off_ret_sum)! * 100) / 100,
  };
}
