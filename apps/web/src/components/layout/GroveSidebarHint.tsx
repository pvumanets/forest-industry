import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "../ui/card";

export function GroveSidebarHint() {
  return (
    <Card className="mx-2 my-3 shrink-0">
      <CardContent className="px-4 py-4">
        <Lightbulb className="size-4 text-sidebar-primary" aria-hidden />
        <p className="mt-2 font-normal">Подсказка</p>
        <p className="mt-1 text-sm font-light text-muted-foreground">
          Детальная динамика по каналам — в разделе «Отчёты» в меню слева.
        </p>
      </CardContent>
    </Card>
  );
}
