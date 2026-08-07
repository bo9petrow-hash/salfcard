"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("glass rounded-2xl shadow-card", className)}>
      {children}
    </div>
  );
}

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-white">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-slate-400">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
    </Card>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-strong relative z-10 w-full max-w-md rounded-2xl shadow-pop">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
