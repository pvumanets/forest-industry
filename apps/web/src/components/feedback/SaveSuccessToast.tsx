import { Link } from "react-router-dom";

export type SaveSuccessToastAction = { label: string; to: string };

export type SaveSuccessToastProps = {
  visible: boolean;
  /** По умолчанию: «Данные сохранены» */
  title?: string;
  /** Дополнительная нейтральная подсказка под заголовком */
  hint?: string;
  action?: SaveSuccessToastAction;
};

export function SaveSuccessToast({
  visible,
  title = "Данные сохранены",
  hint,
  action,
}: SaveSuccessToastProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 max-w-sm sm:left-auto sm:right-4 sm:max-w-md"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-md border border-success/35 bg-success-muted px-4 py-3 text-sm text-foreground shadow-lg">
        <p className="font-medium">{title}</p>
        {hint ? <p className="mt-1 text-muted-foreground">{hint}</p> : null}
        {action ? (
          <p className="mt-2">
            <Link
              to={action.to}
              className="font-medium text-primary underline decoration-primary/50 underline-offset-2 hover:opacity-90"
            >
              {action.label}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
