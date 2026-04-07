import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import { parseValidationDetail } from "../api/parse422";
import { fetchSelectableWeeks } from "../api/referenceApi";
import {
  getOfflineSubmission,
  putOfflineSubmission,
} from "../api/submissionsApi";
import { useMeUser } from "../auth/MeContext";
import * as hints from "../copy/dataMapHints";
import { SaveErrorToast } from "../components/feedback/SaveErrorToast";
import { SaveSuccessToast } from "../components/feedback/SaveSuccessToast";
import { FieldError } from "../components/forms/FieldError";
import { FieldHint } from "../components/forms/FieldHint";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { nativeSelectClass } from "../lib/formNativeClasses";
import {
  buildOfflinePutBody,
  draftFromOfflineSubmission,
  emptyOfflineDraft,
  validateOfflineDraft,
  type OfflineDraft,
} from "../entry/offlineFormModel";
import { offlineAvgCheck, offlineRetAvg } from "../entry/offlineDerivatives";
import { useNavigateOn401 } from "../hooks/useNavigateOn401";

function scrollToFirstError(keys: string[]) {
  for (const k of keys) {
    const el = document.querySelector(`[data-field="${k}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }
  }
}

export function EntryOfflinePage() {
  const user = useMeUser();
  const qc = useQueryClient();
  const outlets = user.outlets.filter((o) => !o.is_virtual);

  const [outletCode, setOutletCode] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [draft, setDraft] = useState<OfflineDraft>(() => emptyOfflineDraft());
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!outletCode && outlets.length === 1) {
      setOutletCode(outlets[0].code);
    }
  }, [outletCode, outlets]);

  const weeksQ = useQuery({
    queryKey: ["weeks", "selectable"],
    queryFn: fetchSelectableWeeks,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (!weekStart && weeksQ.data?.length) {
      setWeekStart(weeksQ.data[0].week_start);
    }
  }, [weekStart, weeksQ.data]);

  useEffect(() => {
    setDraft(emptyOfflineDraft());
  }, [weekStart, outletCode]);

  const subQ = useQuery({
    queryKey: ["submission", "offline", weekStart, outletCode],
    queryFn: () => getOfflineSubmission(weekStart, outletCode),
    enabled: Boolean(weekStart && outletCode),
  });

  useEffect(() => {
    if (subQ.data) {
      setDraft(draftFromOfflineSubmission(subQ.data));
      setClientErrors({});
      setServerErrors({});
      setBanner(null);
    }
  }, [subQ.data]);

  useEffect(() => {
    if (subQ.error instanceof ApiError) {
      if (subQ.error.status === 403) {
        setBanner("Нет доступа к этой точке или недостаточно прав.");
      } else if (subQ.error.status === 404) {
        setBanner("Неделя недоступна для ввода или точка не найдена.");
      }
    }
  }, [subQ.error]);

  const putM = useMutation({
    mutationFn: (body: Parameters<typeof putOfflineSubmission>[2]) =>
      putOfflineSubmission(weekStart, outletCode, body),
    onSuccess: async () => {
      setBanner(null);
      setSavedFlash(true);
      setServerErrors({});
      setClientErrors({});
      setTimeout(() => setSavedFlash(false), 4000);
      await qc.invalidateQueries({
        queryKey: ["submission", "offline", weekStart, outletCode],
      });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 401) return;
        if (err.status === 403) {
          setBanner("Нет доступа к сохранению для этой точки.");
          return;
        }
        if (err.status === 422) {
          const body = err.body;
          const detail =
            typeof body === "object" &&
            body !== null &&
            "detail" in body
              ? (body as { detail: unknown }).detail
              : null;
          const { general, fields } = parseValidationDetail(detail);
          setServerErrors(fields);
          if (general) setBanner(general);
          scrollToFirstError(Object.keys(fields));
          return;
        }
      }
      setBanner("Не удалось сохранить. Проверьте соединение.");
    },
  });

  useNavigateOn401(subQ.error);
  useNavigateOn401(putM.error);

  const mergedErrors = useMemo(
    () => ({ ...clientErrors, ...serverErrors }),
    [clientErrors, serverErrors],
  );

  const avg = offlineAvgCheck(draft.off_rev, draft.off_ord);
  const retAvg = offlineRetAvg(draft.off_ret_sum, draft.off_ret_n);

  function updateDraft(patch: Partial<OfflineDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setServerErrors({});
  }

  function onSave() {
    setBanner(null);
    const v = validateOfflineDraft(draft);
    if (Object.keys(v).length > 0) {
      setClientErrors(v);
      setServerErrors({});
      scrollToFirstError(Object.keys(v));
      return;
    }
    setClientErrors({});
    const body = buildOfflinePutBody(draft);
    if (!body) return;
    putM.mutate(body);
  }

  const loadingWeeks = weeksQ.isPending;
  const loadingSub = subQ.isPending || subQ.isFetching;

  if (weeksQ.isError) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertTitle>Ошибка</AlertTitle>
        <AlertDescription>Не удалось загрузить список недель. Проверьте соединение.</AlertDescription>
      </Alert>
    );
  }

  if (!loadingWeeks && weeksQ.data?.length === 0) {
    return (
      <Alert className="max-w-xl border-amber-200 bg-amber-50 text-amber-950">
        <AlertTitle>Внимание</AlertTitle>
        <AlertDescription>
          Нет доступных отчётных недель. Если это неожиданно, сообщите администратору.
        </AlertDescription>
      </Alert>
    );
  }

  if (outlets.length === 0) {
    return (
      <Alert className="max-w-xl border-border bg-muted">
        <AlertTitle>Информация</AlertTitle>
        <AlertDescription>
          У учётной записи не привязаны физические точки. Обратитесь к администратору.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="pb-24 md:pb-8">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Ввод по точке</h1>

      {outlets.length > 1 ? (
        <ToggleGroup
          type="single"
          value={outletCode || undefined}
          onValueChange={(v) => {
            if (v) {
              setOutletCode(v);
              setBanner(null);
            }
          }}
          className="mt-4 flex flex-wrap justify-start gap-2 bg-transparent p-0"
        >
          {outlets.map((o) => (
            <ToggleGroupItem
              key={o.code}
              value={o.code}
              aria-label={o.display_name}
              className="min-h-10 rounded-lg border border-input px-4 font-semibold data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {o.display_name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}

      <div className="mt-6 w-full max-w-md">
        <Label htmlFor="offline-week-select" className="mb-2">
          Отчётная неделя
        </Label>
        <select
          id="offline-week-select"
          className={nativeSelectClass}
          value={weekStart}
          onChange={(e) => {
            setWeekStart(e.target.value);
            setBanner(null);
          }}
          disabled={loadingWeeks}
        >
          {!weekStart ? <option value="">Выберите неделю</option> : null}
          {weeksQ.data?.map((w) => (
            <option key={w.week_start} value={w.week_start}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {!outletCode || !weekStart ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {!outletCode && outlets.length > 1 ? "Выберите точку." : "Выберите неделю."}
        </p>
      ) : subQ.isPending && !subQ.data ? (
        <p className="mt-8 text-sm text-muted-foreground">Загрузка данных…</p>
      ) : subQ.isError ? (
        <p className="mt-8 text-sm text-muted-foreground">Не удалось загрузить данные точки.</p>
      ) : (
        <div className="mt-8 flex max-w-xl flex-col gap-6">
          <div data-field="off_rev">
            <label className="gp-label">
              Выручка за неделю, ₽
            </label>
            <input
              className="gp-input tabular-nums"
              inputMode="decimal"
              value={draft.off_rev}
              onChange={(e) => updateDraft({ off_rev: e.target.value })}
            />
            <FieldHint>{hints.hintOffRev}</FieldHint>
            {mergedErrors.off_rev ? (
              <FieldError message={mergedErrors.off_rev} />
            ) : null}
          </div>
          <div data-field="off_ord">
            <label className="gp-label">
              Заказы, шт.
            </label>
            <input
              className="gp-input tabular-nums"
              inputMode="numeric"
              value={draft.off_ord}
              onChange={(e) => updateDraft({ off_ord: e.target.value })}
            />
            <FieldHint>{hints.hintOffOrd}</FieldHint>
            {mergedErrors.off_ord ? (
              <FieldError message={mergedErrors.off_ord} />
            ) : null}
          </div>
          <div data-field="off_ret_n">
            <label className="gp-label">
              Возвраты, количество
            </label>
            <input
              className="gp-input tabular-nums"
              inputMode="numeric"
              value={draft.off_ret_n}
              onChange={(e) => updateDraft({ off_ret_n: e.target.value })}
            />
            <FieldHint>{hints.hintOffRetN}</FieldHint>
            {mergedErrors.off_ret_n ? (
              <FieldError message={mergedErrors.off_ret_n} />
            ) : null}
          </div>
          <div data-field="off_ret_sum">
            <label className="gp-label">
              Возвраты, сумма, ₽
            </label>
            <input
              className="gp-input tabular-nums"
              inputMode="decimal"
              value={draft.off_ret_sum}
              onChange={(e) => updateDraft({ off_ret_sum: e.target.value })}
            />
            <FieldHint>{hints.hintOffRetSum}</FieldHint>
            {mergedErrors.off_ret_sum ? (
              <FieldError message={mergedErrors.off_ret_sum} />
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-muted/50 p-5">
            <p className="text-base font-bold text-primary">Считается автоматически</p>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between gap-4 tabular-nums">
                <dt>
                  <span className="text-muted-foreground">Средний чек</span>
                </dt>
                <dd>
                  <span className="font-semibold tabular-nums text-foreground">
                    {avg.isDash ? "—" : avg.text}
                  </span>
                  {avg.noOrders ? (
                    <span className="ml-2 text-xs text-muted-foreground">Нет заказов</span>
                  ) : null}
                </dd>
              </div>
              <div className="flex justify-between gap-4 tabular-nums">
                <dt>
                  <span className="text-muted-foreground">Средний чек возврата</span>
                </dt>
                <dd>
                  <span className="font-semibold tabular-nums text-foreground">
                    {retAvg.isDash ? "—" : retAvg.text}
                  </span>
                </dd>
              </div>
            </dl>
            <FieldHint>{hints.hintOfflineDerivatives}</FieldHint>
          </div>
        </div>
      )}

      {outletCode && weekStart && subQ.data ? (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:static md:z-0 md:mt-10 md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto flex max-w-6xl justify-end">
            <Button
              size="lg"
              className="min-h-12 px-6"
              disabled={putM.isPending || loadingSub}
              onClick={() => onSave()}
            >
              {putM.isPending ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </footer>
      ) : null}

      <SaveErrorToast visible={Boolean(banner)} message={banner ?? ""} />
      <SaveSuccessToast
        visible={savedFlash}
        hint="Можно выбрать другую неделю или точку."
      />
    </div>
  );
}
