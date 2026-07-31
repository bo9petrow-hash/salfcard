"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";

import { AuthShell } from "@/components/AuthShell";
import { SmartCaptcha } from "@/components/SmartCaptcha";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { registerSchema, type RegisterValues } from "@/lib/schemas";
import { useStore } from "@/store/useStore";

export default function RegisterPage() {
  const router = useRouter();
  const registerAccount = useStore((s) => s.register);

  const [captcha, setCaptcha] = useState(false);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (values: RegisterValues) => {
    setFormError("");
    const result = registerAccount(values.email, values.password);
    if (result.ok) {
      router.push("/");
    } else {
      setFormError(result.message);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-xl font-bold text-white">Регистрация</h1>
      <p className="mt-1 text-sm text-slate-400">
        Создайте аккаунт для выпуска NFC-визиток
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

        <Field
          label="Пароль"
          htmlFor="password"
          error={errors.password?.message}
          hint="Минимум 6 символов"
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("password")}
          />
        </Field>

        <Field
          label="Повторите пароль"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("confirmPassword")}
          />
        </Field>

        <SmartCaptcha checked={captcha} onChange={setCaptcha} />

        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={!captcha || isSubmitting}
        >
          <UserPlus size={17} />
          Зарегистрироваться
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-slate-400">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="font-medium text-white underline-offset-2 hover:underline"
        >
          Войти
        </Link>
      </div>
    </AuthShell>
  );
}
