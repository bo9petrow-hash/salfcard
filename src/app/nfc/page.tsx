"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Nfc,
  Plus,
  Radio,
  Trash2,
  Info,
  Check,
} from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { writeNfcTag, cn } from "@/lib/utils";

export default function NfcPage() {
  return (
    <AuthGuard>
      <NfcManager />
    </AuthGuard>
  );
}

type Feedback = { id: string; ok: boolean; text: string };

function NfcManager() {
  const hydrated = useHydrated();
  const devices = useStore((s) => s.user.nfcDevices);
  const multilinks = useStore((s) => s.user.multilinks);
  const addNfcDevice = useStore((s) => s.addNfcDevice);
  const updateNfcDevice = useStore((s) => s.updateNfcDevice);
  const deleteNfcDevice = useStore((s) => s.deleteNfcDevice);

  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleAdd = () => {
    const name = newName.trim() || "Моя визитка NFC";
    addNfcDevice(name);
    setNewName("");
  };

  const linkMultilink = (deviceId: string, multilinkId: string) => {
    updateNfcDevice(deviceId, {
      multilinkId: multilinkId || undefined,
    });
  };

  const activate = async (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return;

    const ml = multilinks.find((m) => m.id === device.multilinkId);
    if (!ml) {
      setFeedback({
        id: deviceId,
        ok: false,
        text: "Сначала привяжите мультиссылку к носителю.",
      });
      return;
    }

    const url = `https://selfcard.ru/p/${ml.slug}`;
    setBusyId(deviceId);
    setFeedback(null);

    const result = await writeNfcTag(url);
    setBusyId(null);

    if (!result.supported) {
      // Нет Web NFC — показываем инструкцию и имитируем успех для демо.
      updateNfcDevice(deviceId, { status: "active" });
      setFeedback({
        id: deviceId,
        ok: true,
        text: "Ваш браузер не поддерживает Web NFC. Для реальной записи откройте сайт в Chrome на Android. Статус отмечен активным (демо).",
      });
      return;
    }

    if (result.ok) {
      updateNfcDevice(deviceId, { status: "active" });
      setFeedback({
        id: deviceId,
        ok: true,
        text: "Метка записана. Поднесите носитель к телефону для проверки.",
      });
    } else {
      setFeedback({
        id: deviceId,
        ok: false,
        text: result.error || "Не удалось записать метку. Попробуйте ещё раз.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">NFC-носители</h1>
        <p className="mt-1 text-sm text-slate-400">
          Привяжите мультиссылку к носителю и запишите NFC-метку.
        </p>
      </div>

      {/* Добавление */}
      <SectionCard title="Добавить носитель">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Название носителя">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например, Карта визитная (чёрная)"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </Field>
          </div>
          <Button onClick={handleAdd} className="sm:mb-[2px]">
            <Plus size={16} />
            Добавить
          </Button>
        </div>
      </SectionCard>

      {/* Список */}
      <SectionCard title="Ваши носители">
        {!hydrated ? (
          <div className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        ) : devices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
            Пока нет добавленных носителей.
          </div>
        ) : (
          <ul className="space-y-4">
            {devices.map((device) => {
              const active = device.status === "active";
              const busy = busyId === device.id;
              const fb = feedback?.id === device.id ? feedback : null;
              return (
                <li
                  key={device.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gradient text-white">
                      <Nfc size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {device.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        ID: {device.id}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/10 text-slate-400"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          active ? "bg-emerald-400" : "bg-slate-500"
                        )}
                      />
                      {active ? "Активен" : "Не активен"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <Field label="Привязанная мультиссылка">
                      {multilinks.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Нет мультиссылок.{" "}
                          <Link
                            href="/multilink/create"
                            className="text-brand-light hover:underline"
                          >
                            Создать
                          </Link>
                        </p>
                      ) : (
                        <Select
                          value={device.multilinkId ?? ""}
                          onChange={(e) =>
                            linkMultilink(device.id, e.target.value)
                          }
                        >
                          <option value="">— не выбрано —</option>
                          {multilinks.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title} (selfcard.ru/p/{m.slug})
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => activate(device.id)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Radio size={16} />
                        )}
                        Активировать NFC
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label="Удалить"
                        onClick={() => deleteNfcDevice(device.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  {fb && (
                    <div
                      className={cn(
                        "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                        fb.ok
                          ? "bg-emerald-500/10 text-emerald-200"
                          : "bg-red-500/10 text-red-200"
                      )}
                    >
                      {fb.ok ? (
                        <Check size={14} className="mt-0.5 shrink-0" />
                      ) : (
                        <Info size={14} className="mt-0.5 shrink-0" />
                      )}
                      <span>{fb.text}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
