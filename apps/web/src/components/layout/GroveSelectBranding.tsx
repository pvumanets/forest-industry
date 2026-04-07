import { Trees } from "lucide-react";

/** Брендинг Grove Pulse в сайдбаре. */
export function GroveSelectBranding() {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Trees className="size-[18px]" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight text-sidebar-primary">Grove Pulse</p>
        <p className="text-xs font-light text-muted-foreground">Пульс ваших каналов</p>
      </div>
    </div>
  );
}
