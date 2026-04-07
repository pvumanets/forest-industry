import { Trees } from "lucide-react";
import { getTimberTipForDisplay } from "../../data/timberTips";
import { Card, CardContent } from "../ui/card";

export function LoginTimberTipCard() {
  const tip = getTimberTipForDisplay();

  return (
    <Card className="h-full border-border shadow-md">
      <CardContent className="p-6 pt-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
          <Trees className="size-[18px] opacity-90" aria-hidden />
          Совет по древесине
        </p>
        {tip.title ? <p className="mb-2 text-lg font-bold text-foreground">{tip.title}</p> : null}
        <p className="text-sm leading-relaxed text-muted-foreground">{tip.body}</p>
      </CardContent>
    </Card>
  );
}
