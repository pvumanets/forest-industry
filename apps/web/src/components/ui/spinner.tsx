import * as React from "react";
import { cn } from "../../lib/utils";

export function Spinner({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="status"
      aria-label="Загрузка"
      className={cn("inline-block size-8 animate-spin rounded-full border-2 border-muted border-t-primary", className)}
      {...props}
    />
  );
}
