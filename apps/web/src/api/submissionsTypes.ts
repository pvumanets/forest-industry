export type WebChannelKey = "organic" | "cpc_direct" | "direct";
export type MapsPlatform = "2gis" | "yandex";
export type PhysicalOutletCode = "NOVOGRAD" | "SVERDLOV";

export interface MarketingReputationCell {
  outlet_code: PhysicalOutletCode;
  platform: MapsPlatform;
  rating: number | null;
  review_cnt: number | null;
}

export interface MarketingSubmission {
  week_start: string;
  advertising: {
    mkt_ad_ctx: number | null;
    mkt_ad_map: number | null;
  };
  web_channels: Array<{ channel: WebChannelKey; visitors: number | null }>;
  web_behavior: {
    web_beh_bounce: number | null;
    web_beh_time: number | null;
  };
  reputation: {
    snapshot_date: string | null;
    cells: MarketingReputationCell[];
  };
  ozon: {
    oz_rev: number | null;
    oz_ord: number | null;
    oz_ret_n: number | null;
    oz_ret_sum: number | null;
    oz_ad_spend: number | null;
  };
  updated_at: string | null;
}

export interface MarketingPutBody {
  week_start: string;
  advertising: { mkt_ad_ctx: number; mkt_ad_map: number };
  web_channels: Array<{ channel: WebChannelKey; visitors: number }>;
  web_behavior: { web_beh_bounce: number; web_beh_time: number };
  ozon: {
    oz_rev: number;
    oz_ord: number;
    oz_ret_n: number;
    oz_ret_sum: number;
    oz_ad_spend: number;
  };
}

export interface ReputationSubmission {
  snapshot_date: string;
  cells: MarketingReputationCell[];
}

export interface ReputationPutBody {
  snapshot_date: string;
  cells: Array<{
    outlet_code: PhysicalOutletCode;
    platform: MapsPlatform;
    rating: number;
    review_cnt: number;
  }>;
}

export interface OfflineSubmission {
  week_start: string;
  outlet_code: string;
  off_rev: number | null;
  off_ord: number | null;
  off_ret_n: number | null;
  off_ret_sum: number | null;
  updated_at: string | null;
}

export interface OfflinePutBody {
  off_rev: number;
  off_ord: number;
  off_ret_n: number;
  off_ret_sum: number;
}
