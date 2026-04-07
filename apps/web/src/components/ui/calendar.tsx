import { ru } from "date-fns/locale";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "../../lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Календарь: `gp-day-picker` + переменные в index.css; навигация как в дизайн-системе. */
function Calendar({ className, locale = ru, navLayout = "around", ...props }: CalendarProps) {
  return <DayPicker className={cn("gp-day-picker", className)} locale={locale} navLayout={navLayout} {...props} />;
}
Calendar.displayName = "Calendar";

export { Calendar };
