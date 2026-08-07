import { cn } from "@/lib/utils";

/** Фирменный знак SELFCARD: градиентная плитка-карта с NFC-волнами. */
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-glow">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 8.5a7 7 0 0 1 0 7" />
          <path d="M9.5 6a11 11 0 0 1 0 12" />
          <path d="M13 4a15 15 0 0 1 0 16" />
          <circle cx="3.5" cy="12" r="1.2" fill="white" stroke="none" />
        </svg>
      </span>
      {showText && (
        <span className="text-lg font-bold tracking-tight text-white">
          SELFCARD
        </span>
      )}
    </span>
  );
}
