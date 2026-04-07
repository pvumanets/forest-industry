import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import { parseValidationDetail } from "../api/parse422";
import { fetchSelectableWeeks } from "../api/referenceApi";
import {
  getMarketingSubmission,
  putMarketingSubmission,
} from "../api/submissionsApi";
import * as hints from "../copy/dataMapHints";
import { SaveErrorToast } from "../components/feedback/SaveErrorToast";
import { SaveSuccessToast } from "../components/feedback/SaveSuccessToast";
import { FieldError } from "../components/forms/FieldError";
import { FieldHint } from "../components/forms/FieldHint";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { nativeSelectClass } from "../lib/formNativeClasses";
import {
  buildMarketingPutBody,
  draftFromMarketingSubmission,
  emptyMarketingDraft,
  validateMarketingDraft,
  type MarketingDraft,
} from "../entry/marketingFormModel";
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

export function EntryWeekPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState("");
  const [draft, setDraft] = useState<MarketingDraft>(() => emptyMarketingDraft());
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

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
    if (weekStart) {
      setDraft(emptyMarketingDraft());
    }
  }, [weekStart]);

  const subQ = useQuery({
    queryKey: ["submission", "marketing", weekStart],
    queryFn: () => getMarketingSubmission(weekStart),
    enabled: Boolean(weekStart),
  });

  useEffect(() => {
    if (subQ.data) {
      setDraft(draftFromMarketingSubmission(subQ.data));
      setClientErrors({});
      setServerErrors({});
      setBanner(null);
    }
  }, [subQ.data]);

  useEffect(() => {
    if (subQ.error instanceof ApiError) {
      if (subQ.error.status === 403) {
        setBanner("Недостаточно прав для ввода за неделю.");
      } else if (subQ.error.status === 404) {
        setBanner("Неделя недоступна для ввода.");
      }
    }
  }, [subQ.error]);

  const putM = useMutation({
    mutationFn: (body: Parameters<typeof putMarketingSubmission>[1]) =>
      putMarketingSubmission(weekStart, body),
    onSuccess: async () => {
      setBanner(null);
      setSavedFlash(true);
      setServerErrors({});
      setClientErrors({});
      setTimeout(() => setSavedFlash(false), 4000);
      await qc.invalidateQueries({ queryKey: ["submission", "marketing", weekStart] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 401) return;
        if (err.status === 403) {
          setBanner("Недостаточно прав для сохранения.");
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

  function updateDraft(patch: Partial<MarketingDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setServerErrors({});
  }

  function updateOzon(patch: Partial<MarketingDraft["ozon"]>) {
    setDraft((d) => ({ ...d, ozon: { ...d.ozon, ...patch } }));
    setServerErrors({});
  }

  function onSave() {
    setBanner(null);
    const v = validateMarketingDraft(draft);
    if (Object.keys(v).length > 0) {
      setClientErrors(v);
      setServerErrors({});
      scrollToFirstError(Object.keys(v));
      return;
    }
    setClientErrors({});
    const body = buildMarketingPutBody(draft, weekStart);
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

  return (
    <div className="pb-28 md:pb-8">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Ввод за неделю</h1>

      <div className="mt-4 w-full max-w-md">
        <Label htmlFor="entry-week-select" className="mb-2">
          Отчётная неделя
        </Label>
        <select
          id="entry-week-select"
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

      {!weekStart ? (
        <p className="mt-8 text-sm text-muted-foreground">Выберите неделю, чтобы открыть форму.</p>
      ) : subQ.isPending && !subQ.data ? (
        <p className="mt-8 text-sm text-muted-foreground">Загрузка данных…</p>
      ) : subQ.isError ? (
        <p className="mt-8 text-sm text-muted-foreground">Не удалось загрузить форму для недели.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-primary">Реклама</h2>
            <div className="mt-4 space-y-4">
              <div data-field="mkt_ad_ctx">
                <label className="gp-label">
                  Расход, Яндекс Директ (неделя), ₽
                </label>
                <input
                  className="gp-input gp-input-md tabular-nums"
                  inputMode="decimal"
                  value={draft.mkt_ad_ctx}
                  onChange={(e) => updateDraft({ mkt_ad_ctx: e.target.value })}
                />
                <FieldHint>{hints.hintMktAdCtx}</FieldHint>
                {mergedErrors.mkt_ad_ctx ? (
                  <FieldError message={mergedErrors.mkt_ad_ctx} />
                ) : null}
              </div>
              <div data-field="mkt_ad_map">
                <label className="gp-label">
                  Расход, реклама на картах 2ГИС + Я.Карты (сумма за неделю), ₽
                </label>
                <input
                  className="gp-input gp-input-md tabular-nums"
                  inputMode="decimal"
                  value={draft.mkt_ad_map}
                  onChange={(e) => updateDraft({ mkt_ad_map: e.target.value })}
                />
                <FieldHint>{hints.hintMktAdMap}</FieldHint>
                {mergedErrors.mkt_ad_map ? (
                  <FieldError message={mergedErrors.mkt_ad_map} />
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-primary">Сайт: посетители</h2>
            <div className="mt-2 space-y-4">
              <div data-field="visitors_organic">
                <label className="gp-label">
                  Посетители, органика
                </label>
                <input
                  className="gp-input gp-input-md tabular-nums"
                  inputMode="numeric"
                  value={draft.visitors_organic}
                  onChange={(e) => updateDraft({ visitors_organic: e.target.value })}
                />
                <FieldHint>{hints.hintWebOrganic}</FieldHint>
                {mergedErrors.visitors_organic ? (
                  <FieldError message={mergedErrors.visitors_organic} />
                ) : null}
              </div>
              <div data-field="visitors_cpc_direct">
                <label className="gp-label">
                  Посетители, CPC (Директ)
                </label>
                <input
                  className="gp-input gp-input-md tabular-nums"
                  inputMode="numeric"
                  value={draft.visitors_cpc_direct}
                  onChange={(e) =>
                    updateDraft({ visitors_cpc_direct: e.target.value })
                  }
                />
                <FieldHint>{hints.hintWebCpc}</FieldHint>
                {mergedErrors.visitors_cpc_direct ? (
                  <FieldError message={mergedErrors.visitors_cpc_direct} />
                ) : null}
              </div>
              <div data-field="visitors_direct">
                <label className="gp-label">
                  Посетители, прямые заходы
                </label>
                <input
                  className="gp-input gp-input-md tabular-nums"
                  inputMode="numeric"
                  value={draft.visitors_direct}
                  onChange={(e) => updateDraft({ visitors_direct: e.target.value })}
                />
                <FieldHint>{hints.hintWebDirect}</FieldHint>
                {mergedErrors.visitors_direct ? (
                  <FieldError message={mergedErrors.visitors_direct} />
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-primary">Сайт: поведение</h2>
            <div className="mt-2 grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="gp-field-col" data-field="web_beh_bounce">
                <label className="gp-label-aligned">
                  Отказы, % (по сайту)
                </label>
                <input
                  className="gp-input tabular-nums"
                  inputMode="decimal"
                  value={draft.web_beh_bounce}
                  onChange={(e) => updateDraft({ web_beh_bounce: e.target.value })}
                />
                <FieldHint>{hints.hintWebBounce}</FieldHint>
                {mergedErrors.web_beh_bounce ? (
                  <FieldError message={mergedErrors.web_beh_bounce} />
                ) : null}
              </div>
              <div className="gp-field-col" data-field="web_beh_time">
                <label className="gp-label-aligned">
                  Средняя длительность визита, сек
                </label>
                <input
                  className="gp-input tabular-nums"
                  inputMode="decimal"
                  value={draft.web_beh_time}
                  onChange={(e) => updateDraft({ web_beh_time: e.target.value })}
                />
                <FieldHint>{hints.hintWebTime}</FieldHint>
                {mergedErrors.web_beh_time ? (
                  <FieldError message={mergedErrors.web_beh_time} />
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-primary">Ozon</h2>
            <div className="mt-2 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="gp-field-col" data-field="oz_rev">
                <label className="gp-label-aligned">
                  Выручка Ozon (операционная), ₽
                </label>
                <input
                  className="gp-input tabular-nums"
                  inputMode="decimal"
                  value={draft.ozon.oz_rev}
                  onChange={(e) =>
                    updateOzon({ oz_rev: e.target.value })
                  }
                />
                <FieldHint>{hints.hintOzRev}</FieldHint>
                {mergedErrors.oz_rev ? (
                  <FieldError message={mergedErrors.oz_rev} />
                ) : null}
              </div>
              <div className="gp-field-col" data-field="oz_ord">
                <label className="gp-label-aligned">
                  Заказы, шт.
                </label>
                <input
                  className="gp-input tabular-nums"
                  inputMode="numeric"
                  value={draft.ozon.oz_ord}
                  onChange={(e) =>
                    updateOzon({ oz_ord: e.target.value })
                  }
                />
                <FieldHint>{hints.hintOzOrd}</FieldHint>
                {mergedErrors.oz_ord ? (
                  <FieldError message={mergedErrors.oz_ord} />
                ) : null}
              </div>
              <div className="gp-field-col" data-field="oz_ret_n">
                <label className="gp-label-aligned">
                  Возвраты, количество
                </label>
                <input
                  className="gp-input tabular-nums"
                  inputMode="numeric"
                  value={draft.ozon.oz_ret_n}
                  onChange={(e) =>
                    updateOzon({ oz_ret_n: e.target.value })
                  }
                />
                <FieldHint>{hints.hintOzRetN}</FieldHint>
                {mergedErrors.oz_ret_n ? (
                  <FieldError message={mergedErrors.oz_ret_n} />
                ) : null}
              </div>
              <div className="gp-field-col" data-field="oz_ret_sum">
                <label className="gp-label-aligned">
                  Возвраты, сумма, ₽
                </label>
                <input
                  className="gp-input tabular-nums"
                  inputMode="decimal"
                  value={draft.ozon.oz_ret_sum}
                  onChange={(e) =>
                    updateOzon({ oz_ret_sum: e.target.value })
                  }
                />
                <FieldHint>{hints.hintOzRetSum}</FieldHint>
                {mergedErrors.oz_ret_sum ? (
                  <FieldError message={mergedErrors.oz_ret_sum} />
                ) : null}
              </div>
              <div className="gp-field-col sm:col-span-2" data-field="oz_ad_spend">
                <label className="gp-label">
                  Реклама на Ozon, ₽
                </label>
                <input
                  className="gp-input gp-input-md tabular-nums"
                  inputMode="decimal"
                  value={draft.ozon.oz_ad_spend}
                  onChange={(e) =>
                    updateOzon({ oz_ad_spend: e.target.value })
                  }
                />
                <FieldHint>{hints.hintOzAdSpend}</FieldHint>
                {mergedErrors.oz_ad_spend ? (
                  <FieldError message={mergedErrors.oz_ad_spend} />
                ) : null}
              </div>
            </div>
          </section>
        </div>
      )}

      {weekStart && subQ.data ? (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm md:static md:z-0 md:mt-10 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <div className="mx-auto flex max-w-6xl justify-end">
            <Button
              size="lg"
              className="min-h-12 px-6"
              disabled={putM.isPending || loadingSub}
              onClick={() => onSave()}
            >
              {putM.isPending ? "Сохранение…" : "Сохранить неделю"}
            </Button>
          </div>
        </footer>
      ) : null}

      <SaveErrorToast visible={Boolean(banner)} message={banner ?? ""} />
      <SaveSuccessToast
        visible={savedFlash}
        action={{ label: "Открыть дашборд", to: "/dashboard" }}
      />
    </div>
  );
}
