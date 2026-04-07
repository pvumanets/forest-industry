import { describe, expect, it } from "vitest";
import {
  buildMarketingPutBody,
  emptyMarketingDraft,
  validateMarketingDraft,
} from "./marketingFormModel";

describe("validateMarketingDraft", () => {
  it("пустой черновик даёт ошибки по всем блокам", () => {
    const e = validateMarketingDraft(emptyMarketingDraft());
    expect(e.mkt_ad_ctx).toBe("Заполните поле");
    expect(e.visitors_organic).toBe("Заполните поле");
    expect(e.oz_rev).toBe("Заполните поле");
  });
});

describe("buildMarketingPutBody", () => {
  it("не строит тело при ошибках", () => {
    expect(buildMarketingPutBody(emptyMarketingDraft(), "2026-02-23")).toBeNull();
  });
});
