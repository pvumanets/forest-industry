import type { MapsPlatform, PhysicalOutletCode } from "../api/submissionsTypes";

export const REPUTATION_SLOTS: ReadonlyArray<{
  outlet_code: PhysicalOutletCode;
  platform: MapsPlatform;
  key: string;
}> = [
  { outlet_code: "NOVOGRAD", platform: "2gis", key: "nov_2gis" },
  { outlet_code: "NOVOGRAD", platform: "yandex", key: "nov_yandex" },
  { outlet_code: "SVERDLOV", platform: "2gis", key: "sver_2gis" },
  { outlet_code: "SVERDLOV", platform: "yandex", key: "sver_yandex" },
];

export const CHANNEL_ORDER = ["organic", "cpc_direct", "direct"] as const;
