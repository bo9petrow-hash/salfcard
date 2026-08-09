"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, KeyRound } from "lucide-react";

import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/components/AuthProvider";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setSaving(true);
    const result = await updatePassword(password);
    setSaving(false);
    if (result.ok) {
      setDone(true);
      window.setTimeout(() => router.push("/"), 1500);
    } else {
      // Обычно — если ссылка устарела или открыта не из письма.
      setError(
        result.message.includes("session") || result.message.includes("Auth")
          ? "Ссылка недействительна или устарела. Запросите сброс пароля заново."
          : result.message
      );
    }
  };

  return (
    <AuthShell>
      <h1 className="text-xl font-bold text-white">Новый пароль</h1>
      <p className="mt-1 text-sm text-slate-400">
        Придумайте новый пароль для входа.
      </p>

      {done ? (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
          <Check size={16} />
          Пароль изменён. Перенаправляем в кабинет…
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Field label="Новый пароль" hint="Минимум 6 символов">
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Повторите пароль">
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </Field>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button className="w-full" onClick={handleSubmit} disabled={saving}>
            <KeyRound size={16} />
            {saving ? "Сохраняем…" : "Сохранить новый пароль"}
          </Button>

          <div className="text-center text-sm text-slate-400">
            <Link
              href="/login"
              className="font-medium text-white underline-offset-2 hover:underline"
            >
              Вернуться ко входу
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
