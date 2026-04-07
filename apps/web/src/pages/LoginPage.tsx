import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { login } from "../api/authApi";
import { LoginTimberTipCard } from "../components/auth/LoginTimberTipCard";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { meQueryKey } from "../auth/queryKeys";
import { useMe } from "../auth/useMe";

const TELEGRAM_HANDLE = "@pavelou";

/** Локальные лёгкие файлы из `public/login-bg/` (не импорт в TS — без прогона через бандл Vite). */
const LOGIN_BG_URLS = ["/login-bg/forest-1.svg", "/login-bg/forest-2.svg"] as const;

const LOGIN_BG_INDEX_KEY = "gp_login_bg_i";

function useSessionLoginBackground(urls: readonly string[]): string {
  const [url] = useState(() => {
    try {
      const raw = sessionStorage.getItem(LOGIN_BG_INDEX_KEY);
      if (raw != null) {
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed < urls.length) {
          return urls[parsed]!;
        }
      }
    } catch {
      /* sessionStorage недоступен */
    }
    const pick = Math.floor(Math.random() * urls.length);
    try {
      sessionStorage.setItem(LOGIN_BG_INDEX_KEY, String(pick));
    } catch {
      /* ignore */
    }
    return urls[pick] ?? urls[0]!;
  });
  return url;
}

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const loginBgUrl = useSessionLoginBackground(LOGIN_BG_URLS);

  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [nickCopied, setNickCopied] = useState(false);

  useEffect(() => {
    if (me.isSuccess && me.data) {
      navigate("/", { replace: true });
    }
  }, [me.isSuccess, me.data, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(loginName.trim(), password);
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Не удалось выполнить вход. Проверьте соединение.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copyTelegramNick() {
    try {
      await navigator.clipboard.writeText(TELEGRAM_HANDLE);
      setNickCopied(true);
      window.setTimeout(() => setNickCopied(false), 2500);
      return;
    } catch {
      /* fallback */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = TELEGRAM_HANDLE;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setNickCopied(true);
      window.setTimeout(() => setNickCopied(false), 2500);
    } catch {
      /* не удалось */
    }
  }

  if (me.isSuccess && me.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Переход…</div>
    );
  }

  /* Не блокируем форму на /me: при сбое или зависании прокси к API экран «Загрузка…» не снимался бы. */
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-muted/80 via-background to-accent/20 px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-20%] top-[10%] h-[240px] w-[200px] rotate-12 overflow-hidden rounded-2xl opacity-50 shadow-sm md:right-[8%]"
      >
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${loginBgUrl})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-white/65 to-white/45" />
      </div>
      <div className="relative z-[1] flex w-full max-w-3xl flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
        <Card className="w-full shrink-0 border-border shadow-sm md:max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Вход в Grove Pulse</CardTitle>
            <CardDescription>
              Рады видеть вас. Введите логин и пароль — откроем дашборд или форму ввода. Нужен доступ?{" "}
              <a
                href="https://t.me/pavelou"
                className="text-primary underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={(e) => {
                  e.preventDefault();
                  setAccessDialogOpen(true);
                }}
              >
                Как получить вход
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <Label htmlFor="login">Логин</Label>
                <Input
                  id="login"
                  name="login"
                  type="text"
                  autoComplete="username"
                  required
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="mt-2 w-full min-h-12" disabled={submitting}>
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="min-w-0 flex-1 md:flex md:min-h-0 md:flex-col">
          <LoginTimberTipCard />
        </div>
      </div>

      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Как получить доступ</DialogTitle>
            <DialogDescription asChild>
              <div className="grid gap-3 text-sm text-muted-foreground">
                <p>
                  Доступ к Grove Pulse выдаётся вручную. Свяжитесь с Павлом Уманцем (владелец продукта) в Telegram —{" "}
                  {TELEGRAM_HANDLE} — и попросите учётные данные для входа.
                </p>
                <p>
                  <a
                    href="https://t.me/pavelou"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    https://t.me/pavelou
                  </a>
                </p>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void copyTelegramNick()}>
                  {nickCopied ? "Скопировано" : "Скопировать ник в буфер"}
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
