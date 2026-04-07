import { apiJson } from "./client";
import type {
  MarketingPutBody,
  MarketingSubmission,
  OfflinePutBody,
  OfflineSubmission,
  ReputationPutBody,
  ReputationSubmission,
} from "./submissionsTypes";

export function getMarketingSubmission(
  weekStart: string,
): Promise<MarketingSubmission> {
  return apiJson<MarketingSubmission>(
    `/api/submissions/marketing/${weekStart}`,
  );
}

export function putMarketingSubmission(
  weekStart: string,
  body: MarketingPutBody,
): Promise<MarketingSubmission> {
  return apiJson<MarketingSubmission>(
    `/api/submissions/marketing/${weekStart}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

export function getReputationSubmission(
  snapshotDate: string,
): Promise<ReputationSubmission> {
  return apiJson<ReputationSubmission>(
    `/api/submissions/reputation/${snapshotDate}`,
  );
}

export function putReputationSubmission(
  body: ReputationPutBody,
): Promise<ReputationSubmission> {
  return apiJson<ReputationSubmission>("/api/submissions/reputation", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function getOfflineSubmission(
  weekStart: string,
  outletCode: string,
): Promise<OfflineSubmission> {
  return apiJson<OfflineSubmission>(
    `/api/submissions/offline/${weekStart}/${outletCode}`,
  );
}

export function putOfflineSubmission(
  weekStart: string,
  outletCode: string,
  body: OfflinePutBody,
): Promise<OfflineSubmission> {
  return apiJson<OfflineSubmission>(
    `/api/submissions/offline/${weekStart}/${outletCode}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}
