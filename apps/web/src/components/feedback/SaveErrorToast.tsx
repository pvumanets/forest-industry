export type SaveErrorToastProps = {
  visible: boolean;
  message: string;
};

/** Та же позиция и тень, что у SaveSuccessToast; ошибки загрузки/сохранения. */
export function SaveErrorToast({ visible, message }: SaveErrorToastProps) {
  if (!visible || !message) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 max-w-sm sm:left-auto sm:right-4 sm:max-w-md"
      role="alert"
      aria-live="assertive"
    >
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-lg">
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}
