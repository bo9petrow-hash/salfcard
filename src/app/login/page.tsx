"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";

import { AuthShell } from "@/components/AuthShell";
import { SmartCaptcha } from "@/components/SmartCaptcha";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { useStore } from "@/store/useStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);

  const [captcha, setCaptcha] = useState(false);
  const [formError, setFormError] = useState("");
  const [showReset, setShowReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginValues) => {
    setFormError("");
    const result = login(values.email, values.password);
    if (result.ok) {
      router.push("/");
    } else {
      setFormError(result.message);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-xl font-bold text-white">Личный кабинет</h1>
      <p className="mt-1 text-sm text-slate-400">
        Войдите для управления мультиссылками
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
          />
        </Field>

        <Field label="Пароль" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
        </Field>

        <SmartCaptcha checked={captcha} onChange={setCaptcha} />

        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={!captcha || isSubmitting}
        >
          <LogIn size={17} />
          Войти в систему
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setShowReset((v) => !v)}
          className="text-slate-400 underline-offset-2 hover:text-white hover:underline"
        >
          Забыли пароль?
        </button>
        <Link
          href="/register"
          className="font-medium text-white underline-offset-2 hover:underline"
        >
          Регистрация
        </Link>
      </div>

      {showReset && (
        <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
          Восстановление пароля скоро будет доступно. Напишите в поддержку —
          Телеграм @salfcard.
        </p>
      )}
    </AuthShell>
  );
}
