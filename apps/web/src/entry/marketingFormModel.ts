import type { MarketingPutBody, MarketingSubmission } from "../api/submissionsTypes";
import { parseIntInput, parseMoneyInput } from "./moneyFormat";
import { CHANNEL_ORDER } from "./reputationSlots";

export interface MarketingDraft {
  mkt_ad_ctx: string;
  mkt_ad_map: string;
  visitors_organic: string;
  visitors_cpc_direct: string;
  visitors_direct: string;
  web_beh_bounce: string;
  web_beh_time: string;
  ozon: {
    oz_rev: string;
    oz_ord: string;
    oz_ret_n: string;
    oz_ret_sum: string;
    oz_ad_spend: string;
  };
}

export function emptyMarketingDraft(): MarketingDraft {
  return {
    mkt_ad_ctx: "",
    mkt_ad_map: "",
    visitors_organic: "",
    visitors_cpc_direct: "",
    visitors_direct: "",
    web_beh_bounce: "",
    web_beh_time: "",
    ozon: {
      oz_rev: "",
      oz_ord: "",
      oz_ret_n: "",
      oz_ret_sum: "",
      oz_ad_spend: "",
    },
  };
}

function nStr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function draftFromMarketingSubmission(m: MarketingSubmission): MarketingDraft {
  const ch: Record<string, number | null> = {};
  for (const row of m.web_channels) {
    ch[row.channel] = row.visitors;
  }
  return {
    mkt_ad_ctx: nStr(m.advertising.mkt_ad_ctx),
    mkt_ad_map: nStr(m.advertising.mkt_ad_map),
    visitors_organic: nStr(ch.organic),
    visitors_cpc_direct: nStr(ch.cpc_direct),
    visitors_direct: nStr(ch.direct),
    web_beh_bounce: nStr(m.web_behavior.web_beh_bounce),
    web_beh_time: nStr(m.web_behavior.web_beh_time),
    ozon: {
      oz_rev: nStr(m.ozon.oz_rev),
      oz_ord: nStr(m.ozon.oz_ord),
      oz_ret_n: nStr(m.ozon.oz_ret_n),
      oz_ret_sum: nStr(m.ozon.oz_ret_sum),
      oz_ad_spend: nStr(m.ozon.oz_ad_spend),
    },
  };
}

export function validateMarketingDraft(d: MarketingDraft): Record<string, string> {
  const e: Record<string, string> = {};
  const reqMoney = (raw: string, key: string) => {
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
  const reqInt = (raw: string, key: string) => {
    if (raw.trim() === "") {
      e[key] = "Заполните поле";
      return null;
    }
    const v = parseIntInput(raw);
    if (v === null || v < 0) {
      e[key] = "Введите целое число ≥ 0";
      return null;
    }
    return v;
  };

  reqMoney(d.mkt_ad_ctx, "mkt_ad_ctx");
  reqMoney(d.mkt_ad_map, "mkt_ad_map");
  reqInt(d.visitors_organic, "visitors_organic");
  reqInt(d.visitors_cpc_direct, "visitors_cpc_direct");
  reqInt(d.visitors_direct, "visitors_direct");

  const bounceRaw = d.web_beh_bounce.trim();
  if (bounceRaw === "") {
    e.web_beh_bounce = "Заполните поле";
  } else {
    const b = parseMoneyInput(bounceRaw);
    if (b === null || b < 0 || b > 100) {
      e.web_beh_bounce = "От 0 до 100%";
    }
  }
  const timeRaw = d.web_beh_time.trim();
  if (timeRaw === "") {
    e.web_beh_time = "Заполните поле";
  } else {
    const t = parseMoneyInput(timeRaw);
    if (t === null || t < 0) {
      e.web_beh_time = "Введите неотрицательное число";
    }
  }

  reqMoney(d.ozon.oz_rev, "oz_rev");
  reqInt(d.ozon.oz_ord, "oz_ord");
  reqInt(d.ozon.oz_ret_n, "oz_ret_n");
  reqMoney(d.ozon.oz_ret_sum, "oz_ret_sum");
  reqMoney(d.ozon.oz_ad_spend, "oz_ad_spend");

  return e;
}

export function buildMarketingPutBody(
  d: MarketingDraft,
  weekStart: string,
): MarketingPutBody | null {
  const err = validateMarketingDraft(d);
  if (Object.keys(err).length > 0) return null;

  const mkt_ad_ctx = parseMoneyInput(d.mkt_ad_ctx)!;
  const mkt_ad_map = parseMoneyInput(d.mkt_ad_map)!;
  const web_channels = CHANNEL_ORDER.map((channel) => ({
    channel,
    visitors: parseIntInput(
      channel === "organic"
        ? d.visitors_organic
        : channel === "cpc_direct"
          ? d.visitors_cpc_direct
          : d.visitors_direct,
    )!,
  }));
  const bounce = Math.round(parseMoneyInput(d.web_beh_bounce)! * 100) / 100;
  const time = Math.round(parseMoneyInput(d.web_beh_time)! * 100) / 100;

  return {
    week_start: weekStart,
    advertising: {
      mkt_ad_ctx: Math.round(mkt_ad_ctx * 100) / 100,
      mkt_ad_map: Math.round(mkt_ad_map * 100) / 100,
    },
    web_channels,
    web_behavior: { web_beh_bounce: bounce, web_beh_time: time },
    ozon: {
      oz_rev: Math.round(parseMoneyInput(d.ozon.oz_rev)! * 100) / 100,
      oz_ord: parseIntInput(d.ozon.oz_ord)!,
      oz_ret_n: parseIntInput(d.ozon.oz_ret_n)!,
      oz_ret_sum: Math.round(parseMoneyInput(d.ozon.oz_ret_sum)! * 100) / 100,
      oz_ad_spend: Math.round(parseMoneyInput(d.ozon.oz_ad_spend)! * 100) / 100,
    },
  };
}
