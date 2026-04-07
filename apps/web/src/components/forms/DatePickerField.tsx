import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export type DatePickerFieldProps = {
  id?: string;
  /** Видимая подпись над полем; если не задана — задайте `ariaLabel` для screen readers */
  label?: string;
  /** Доступное имя кнопки, если `label` скрыт */
  ariaLabel?: string;
  /** YYYY-MM-DD или пустая строка */
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  className?: string;
  /** Ограничения календаря (react-day-picker) */
  disabledDays?: (date: Date) => boolean;
};

export function DatePickerField({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  disabled,
  className,
  disabledDays,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  let selected: Date | undefined;
  try {
    selected = value ? parseISO(value) : undefined;
    if (selected && Number.isNaN(selected.getTime())) selected = undefined;
  } catch {
    selected = undefined;
  }

  const a11yName = ariaLabel ?? label ?? "Дата";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={a11yName}
            className={cn(
              "h-9 w-full min-w-[160px] justify-start text-left font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 opacity-60" />
            {selected ? format(selected, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-2xl p-4 shadow-md" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${day}`);
              }
              setOpen(false);
            }}
            disabled={disabledDays}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
