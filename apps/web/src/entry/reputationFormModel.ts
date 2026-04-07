import type { ReputationPutBody, ReputationSubmission } from "../api/submissionsTypes";
import { parseIntInput, parseMoneyInput } from "./moneyFormat";
import { REPUTATION_SLOTS } from "./reputationSlots";

export interface ReputationDraft {
  snapshot_date: string;
  rep: Record<string, { rating: string; reviews: string }>;
}

export function emptyReputationDraft(): ReputationDraft {
  const rep: ReputationDraft["rep"] = {};
  for (const s of REPUTATION_SLOTS) {
    rep[s.key] = { rating: "", reviews: "" };
  }
  return { snapshot_date: "", rep };
}

function nStr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function draftFromReputationSubmission(r: ReputationSubmission): ReputationDraft {
  const rep: ReputationDraft["rep"] = {};
  for (const s of REPUTATION_SLOTS) {
    rep[s.key] = { rating: "", reviews: "" };
  }
  for (const cell of r.cells) {
    const slot = REPUTATION_SLOTS.find(
      (x) => x.outlet_code === cell.outlet_code && x.platform === cell.platform,
    );
    if (slot) {
      rep[slot.key] = {
        rating: nStr(cell.rating),
        reviews: nStr(cell.review_cnt),
      };
    }
  }
  return {
    snapshot_date: r.snapshot_date,
    rep,
  };
}

export function validateReputationDraft(d: ReputationDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.snapshot_date.trim() === "") {
    e.snapshot_date = "Заполните поле";
  }
  for (const s of REPUTATION_SLOTS) {
    const cell = d.rep[s.key];
    const rk = `rep_${s.key}_rating`;
    const ck = `rep_${s.key}_reviews`;
    if (cell.rating.trim() === "") {
      e[rk] = "Заполните поле";
    } else {
      const r = parseMoneyInput(cell.rating);
      if (r === null || r < 0 || r > 5) {
        e[rk] = "Оценка от 0 до 5";
      }
    }
    if (cell.reviews.trim() === "") {
      e[ck] = "Заполните поле";
    } else {
      const n = parseIntInput(cell.reviews);
      if (n === null || n < 0) {
        e[ck] = "Целое число ≥ 0";
      }
    }
  }
  return e;
}

export function buildReputationPutBody(d: ReputationDraft): ReputationPutBody | null {
  const err = validateReputationDraft(d);
  if (Object.keys(err).length > 0) return null;
  const cells = REPUTATION_SLOTS.map((s) => ({
    outlet_code: s.outlet_code,
    platform: s.platform,
    rating: Math.round(parseMoneyInput(d.rep[s.key].rating)! * 100) / 100,
    review_cnt: parseIntInput(d.rep[s.key].reviews)!,
  }));
  return {
    snapshot_date: d.snapshot_date,
    cells,
  };
}
