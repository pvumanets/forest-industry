/** Разбор тела ошибки FastAPI 422 для привязки к полям формы. */

export type FieldErrors = Record<string, string>;

const CHANNEL_BY_IDX = ["organic", "cpc_direct", "direct"] as const;

const REP_CELL_KEYS = [
  "nov_2gis",
  "nov_yandex",
  "sver_2gis",
  "sver_yandex",
] as const;

function joinLoc(loc: unknown[]): string {
  return loc
    .filter((x) => x !== "body" && x !== "query")
    .map(String)
    .join(".");
}

function mapNestedPath(loc: string): string {
  const chM = loc.match(/^web_channels\.(\d+)\.(\w+)$/);
  if (chM) {
    const idx = Number(chM[1]);
    const field = chM[2];
    const key = CHANNEL_BY_IDX[idx];
    if (key && field === "visitors") {
      return `visitors_${key}`;
    }
    return `web_channels_${idx}_${field}`;
  }
  const cellMRep = loc.match(/^reputation\.cells\.(\d+)\.(\w+)$/);
  if (cellMRep) {
    const idx = Number(cellMRep[1]);
    const field = cellMRep[2];
    const slot = REP_CELL_KEYS[idx];
    if (slot !== undefined) {
      if (field === "rating") return `rep_${slot}_rating`;
      if (field === "review_cnt") return `rep_${slot}_reviews`;
    }
    return `rep_cell_${cellMRep[1]}_${field}`;
  }
  const cellMRoot = loc.match(/^cells\.(\d+)\.(\w+)$/);
  if (cellMRoot) {
    const idx = Number(cellMRoot[1]);
    const field = cellMRoot[2];
    const slot = REP_CELL_KEYS[idx];
    if (slot !== undefined) {
      if (field === "rating") return `rep_${slot}_rating`;
      if (field === "review_cnt") return `rep_${slot}_reviews`;
    }
    return `rep_cell_${cellMRoot[1]}_${field}`;
  }
  if (loc === "reputation.snapshot_date" || loc === "reputation.cells") {
    return loc === "reputation.cells" ? "reputation_cells" : "snapshot_date";
  }
  if (loc === "snapshot_date" || loc === "cells") {
    return loc === "cells" ? "reputation_cells" : "snapshot_date";
  }
  if (loc.startsWith("advertising.")) {
    return loc.replace("advertising.", "");
  }
  if (loc.startsWith("web_behavior.")) {
    return loc.replace("web_behavior.", "");
  }
  if (loc.startsWith("ozon.")) {
    return loc.replace("ozon.", "");
  }
  return loc.replace(/\./g, "_");
}

/**
 * Возвращает общее сообщение и/или ошибки по ключам полей (плоские имена).
 */
export function parseValidationDetail(detail: unknown): {
  general: string | null;
  fields: FieldErrors;
} {
  const fields: FieldErrors = {};
  if (detail == null) {
    return { general: "Исправьте ошибки в форме.", fields };
  }
  if (typeof detail === "string") {
    return { general: detail, fields };
  }
  if (!Array.isArray(detail)) {
    return { general: "Исправьте ошибки в форме.", fields };
  }
  const parts: string[] = [];
  for (const item of detail) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const msg = typeof rec.msg === "string" ? rec.msg : "Ошибка";
    const loc = Array.isArray(rec.loc) ? rec.loc : [];
    const joined = joinLoc(loc);
    if (joined) {
      fields[mapNestedPath(joined)] = msg;
    } else {
      parts.push(msg);
    }
  }
  const general =
    parts.length > 0 ? parts.join(" ") : Object.keys(fields).length === 0
      ? "Исправьте ошибки в форме."
      : null;
  return { general, fields };
}
