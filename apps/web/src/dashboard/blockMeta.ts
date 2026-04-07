/** Ключи `blocks` в summary → маршруты SPA и topic API для series. */

export const DASHBOARD_BLOCKS = [
  {
    blockKey: "site" as const,
    title: "Сайт",
    reportPath: "/reports/site",
    seriesTopic: "site" as const,
  },
  {
    blockKey: "outlets" as const,
    title: "Точки",
    reportPath: "/reports/outlets",
    seriesTopic: "outlets" as const,
  },
  {
    blockKey: "ozon" as const,
    title: "Ozon",
    reportPath: "/reports/ozon",
    seriesTopic: "ozon" as const,
  },
  {
    blockKey: "maps_2gis" as const,
    title: "Карты — 2ГИС",
    reportPath: "/reports/maps/2gis",
    seriesTopic: "maps-2gis" as const,
  },
  {
    blockKey: "maps_yandex" as const,
    title: "Карты — Яндекс",
    reportPath: "/reports/maps/yandex",
    seriesTopic: "maps-yandex" as const,
  },
  {
    blockKey: "returns" as const,
    title: "Возвраты",
    reportPath: "/reports/returns",
    seriesTopic: "returns" as const,
  },
];

export type BlockKey = (typeof DASHBOARD_BLOCKS)[number]["blockKey"];
