import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

function parseIsoDate(s: string): Date | undefined {
  if (!s) return undefined;
  try {
    const d = parseISO(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateRangePickerField({
  from,
  to,
  onRangeChange,
  disabled,
  className,
  ariaLabel = "Период",
}: {
  from: string;
  to: string;
  onRangeChange: (next: { from: string; to: string }) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const fromD = parseIsoDate(from);
  const toD = parseIsoDate(to);
  const selected: DateRange | undefined =
    fromD != null ? { from: fromD, to: toD ?? fromD } : undefined;

  const label =
    fromD != null && toD != null
      ? `${format(fromD, "d MMMM yyyy", { locale: ru })} — ${format(toD, "d MMMM yyyy", { locale: ru })}`
      : "Выберите период";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "h-9 min-w-0 justify-start text-left font-normal sm:min-w-[min(100%,320px)]",
              !(fromD != null && toD != null) && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 opacity-60" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-2xl p-4 shadow-md" align="start">
          <Calendar
            mode="range"
            selected={selected}
            defaultMonth={fromD ?? toD ?? new Date()}
            onSelect={(range) => {
              if (!range?.from) {
                return;
              }
              const nextFrom = toIso(range.from);
              const nextTo = range.to != null ? toIso(range.to) : nextFrom;
              onRangeChange({ from: nextFrom, to: nextTo });
              if (range.from && range.to != null) {
                setOpen(false);
              }
            }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
