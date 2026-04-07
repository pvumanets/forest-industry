import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

export const MenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & { showBadge?: boolean }
>(function MenuButton({ showBadge, className, children, ...props }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      className={cn("relative shrink-0", className)}
      {...props}
    >
      {children}
      {showBadge ? (
        <span
          className="pointer-events-none absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive"
          aria-hidden
        />
      ) : null}
    </Button>
  );
});
MenuButton.displayName = "MenuButton";
