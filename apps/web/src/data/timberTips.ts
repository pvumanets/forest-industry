/** Советы по древесине и складу — позже можно подставлять из API или CMS. */

export type TimberTip = {
  id: string;
  title?: string;
  body: string;
  tags?: string[];
};

export const timberTips: TimberTip[] = [
  {
    id: "moisture-storage-1",
    title: "Влажность и склад",
    body: "Для большинства пиломатериалов влажность на складе ближе к 12–15% снижает риск деформации после распила. Контролируйте измерения по партиям — это дешевле, чем переделка заказа.",
    tags: ["склад", "качество"],
  },
];

export function getTimberTipForDisplay(): TimberTip {
  return timberTips[0]!;
}
