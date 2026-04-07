import { CircleHelp } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

function hintParagraphs(text: string) {
  return text.split("\n\n").map((para, i) => (
    <p key={i} className="m-0 mb-2 text-sm leading-relaxed last:mb-0">
      {para}
    </p>
  ));
}

export function DashboardHintButton({
  hint,
  ariaLabel,
  className,
}: {
  hint: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 shrink-0 text-muted-foreground hover:text-foreground",
            className,
          )}
          aria-label={ariaLabel}
        >
          <CircleHelp className="size-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="end" className="max-w-sm px-3 py-2">
        {hintParagraphs(hint)}
      </TooltipContent>
    </Tooltip>
  );
}

export function DashboardSectionHeading({
  title,
  hint,
  description,
  className,
  titleAs: TitleTag = "h2",
  titleClassName,
  eyebrow,
  hintAriaLabel = "Что означает этот блок",
}: {
  title?: string;
  hint: string;
  description?: React.ReactNode;
  className?: string;
  titleAs?: "h2" | "h3" | "div";
  titleClassName?: string;
  eyebrow?: boolean;
  hintAriaLabel?: string;
}) {
  const Title = TitleTag;
  const defaultTitleClass = eyebrow
    ? "text-xs font-medium uppercase tracking-wide text-muted-foreground"
    : "text-lg font-bold tracking-tight text-foreground";

  return (
    <div className={cn(className)}>
      <div className="flex flex-wrap items-center gap-1">
        {title ? (
          <Title className={cn("m-0 min-w-0", defaultTitleClass, titleClassName)}>{title}</Title>
        ) : (
          <span className="sr-only">{hintAriaLabel}</span>
        )}
        <DashboardHintButton hint={hint} ariaLabel={hintAriaLabel} className={title ? "-mt-0.5" : undefined} />
      </div>
      {description ? (
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      ) : null}
    </div>
  );
}
