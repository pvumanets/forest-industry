import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import { parseValidationDetail } from "../api/parse422";
import {
  getReputationSubmission,
  putReputationSubmission,
} from "../api/submissionsApi";
import * as hints from "../copy/dataMapHints";
import { SaveErrorToast } from "../components/feedback/SaveErrorToast";
import { SaveSuccessToast } from "../components/feedback/SaveSuccessToast";
import { DatePickerField } from "../components/forms/DatePickerField";
import { FieldError } from "../components/forms/FieldError";
import { FieldHint } from "../components/forms/FieldHint";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  buildReputationPutBody,
  draftFromReputationSubmission,
  emptyReputationDraft,
  validateReputationDraft,
  type ReputationDraft,
} from "../entry/reputationFormModel";
import { REPUTATION_SLOTS } from "../entry/reputationSlots";
import { useNavigateOn401 } from "../hooks/useNavigateOn401";

function outletLabel(code: string): string {
  if (code === "NOVOGRAD") return "Новоградский";
  if (code === "SVERDLOV") return "Свердловский";
  return code;
}

function platformLabel(p: string): string {
  if (p === "2gis") return "2ГИС";
  if (p === "yandex") return "Яндекс.Карты";
  return p;
}

function scrollToFirstError(keys: string[]) {
  for (const k of keys) {
    const el = document.querySelector(`[data-field="${k}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }
  }
}

export function EntryReputationPage() {
  const qc = useQueryClient();
  const [snapshotDate, setSnapshotDate] = useState("");
  const [draft, setDraft] = useState<ReputationDraft>(() => emptyReputationDraft());
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!snapshotDate) {
      setDraft(emptyReputationDraft());
      return;
    }
    setDraft({ ...emptyReputationDraft(), snapshot_date: snapshotDate });
  }, [snapshotDate]);

  const subQ = useQuery({
    queryKey: ["submission", "reputation", snapshotDate],
    queryFn: () => getReputationSubmission(snapshotDate),
    enabled: Boolean(snapshotDate),
  });

  useEffect(() => {
    if (subQ.data) {
      setDraft(draftFromReputationSubmission(subQ.data));
      setClientErrors({});
      setServerErrors({});
      setBanner(null);
    }
  }, [subQ.data]);

  useEffect(() => {
    if (subQ.error instanceof ApiError) {
      if (subQ.error.status === 403) {
        setBanner("Недостаточно прав.");
      } else if (subQ.error.status === 404) {
        setBanner(
          "Эта дата относится к неделе, которая сейчас недоступна для ввода (не более трёх последних завершённых недель).",
        );
      }
    }
  }, [subQ.error]);

  const putM = useMutation({
    mutationFn: putReputationSubmission,
    onSuccess: async (_, variables) => {
      setBanner(null);
      setSavedFlash(true);
      setServerErrors({});
      setClientErrors({});
      setTimeout(() => setSavedFlash(false), 4000);
      await qc.invalidateQueries({ queryKey: ["submission", "reputation", variables.snapshot_date] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 401) return;
        if (err.status === 403) {
          setBanner("Недостаточно прав для сохранения.");
          return;
        }
        if (err.status === 404) {
          setBanner("Неделя недоступна для ввода.");
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

  function updateDraft(patch: Partial<ReputationDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setServerErrors({});
  }

  function updateRep(
    key: string,
    patch: Partial<{ rating: string; reviews: string }>,
  ) {
    setDraft((d) => ({
      ...d,
      rep: { ...d.rep, [key]: { ...d.rep[key], ...patch } },
    }));
    setServerErrors({});
  }

  function onSave() {
    setBanner(null);
    const v = validateReputationDraft(draft);
    if (Object.keys(v).length > 0) {
      setClientErrors(v);
      setServerErrors({});
      scrollToFirstError(Object.keys(v));
      return;
    }
    setClientErrors({});
    const body = buildReputationPutBody(draft);
    if (!body) return;
    putM.mutate(body);
  }

  const loadingSub = subQ.isPending || subQ.isFetching;
  const loadError =
    Boolean(snapshotDate) &&
    subQ.error instanceof ApiError &&
    (subQ.error.status === 404 || subQ.error.status === 403);

  return (
    <div className="pb-28 md:pb-8">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Репутация
      </h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        Укажите дату снимка с карт — данные автоматически относятся к календарной неделе (пн–вс), в
        которую попадает эта дата. В отчётах снимок показывается в этой же неделе.
      </p>

      <div className="mt-6 max-w-md space-y-2" data-field="snapshot_date">
        <DatePickerField
          label="Дата снимка"
          value={snapshotDate}
          onChange={(iso) => {
            setSnapshotDate(iso);
            setBanner(null);
          }}
        />
        <FieldHint>{hints.hintRepSnapshot}</FieldHint>
        {mergedErrors.snapshot_date ? (
          <FieldError message={mergedErrors.snapshot_date} />
        ) : null}
      </div>

      {!snapshotDate ? (
        <p className="mt-8 text-sm text-muted-foreground">Выберите дату, чтобы открыть форму.</p>
      ) : loadError ? (
        <Alert variant="destructive" className="mt-8 max-w-xl">
          <AlertTitle>Недоступно</AlertTitle>
          <AlertDescription>
            {banner ??
              "Выберите дату из одной из трёх последних завершённых отчётных недель или проверьте права доступа."}
          </AlertDescription>
        </Alert>
      ) : subQ.isPending && !subQ.data ? (
        <p className="mt-8 text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          <div className="space-y-6">
            {REPUTATION_SLOTS.map((slot) => (
              <div
                key={slot.key}
                className="rounded-lg border border-border bg-card p-4 sm:rounded-xl sm:p-6"
              >
                <p className="text-sm font-semibold text-foreground">
                  {outletLabel(slot.outlet_code)} — {platformLabel(slot.platform)}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="gp-field-col" data-field={`rep_${slot.key}_rating`}>
                    <label className="gp-rep-label-aligned">Оценка (0–5)</label>
                    <input
                      className="gp-input tabular-nums"
                      inputMode="decimal"
                      value={draft.rep[slot.key].rating}
                      onChange={(e) => updateRep(slot.key, { rating: e.target.value })}
                    />
                    {mergedErrors[`rep_${slot.key}_rating`] ? (
                      <FieldError message={mergedErrors[`rep_${slot.key}_rating`]!} />
                    ) : null}
                  </div>
                  <div className="gp-field-col" data-field={`rep_${slot.key}_reviews`}>
                    <label className="gp-rep-label-aligned">Число отзывов</label>
                    <input
                      className="gp-input tabular-nums"
                      inputMode="numeric"
                      value={draft.rep[slot.key].reviews}
                      onChange={(e) => updateRep(slot.key, { reviews: e.target.value })}
                    />
                    {mergedErrors[`rep_${slot.key}_reviews`] ? (
                      <FieldError message={mergedErrors[`rep_${slot.key}_reviews`]!} />
                    ) : null}
                  </div>
                </div>
                <FieldHint>{hints.hintRepCell}</FieldHint>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshotDate && !loadError ? (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm md:static md:z-0 md:mt-10 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <div className="mx-auto flex max-w-6xl justify-end">
            <Button
              size="lg"
              className="min-h-12 px-6"
              disabled={putM.isPending || loadingSub}
              onClick={() => onSave()}
            >
              {putM.isPending ? "Сохранение…" : "Сохранить снимок"}
            </Button>
          </div>
        </footer>
      ) : null}

      <SaveErrorToast visible={Boolean(banner) && !loadError} message={banner ?? ""} />
      <SaveSuccessToast
        visible={savedFlash}
        action={{ label: "Открыть дашборд", to: "/dashboard" }}
      />
    </div>
  );
}
