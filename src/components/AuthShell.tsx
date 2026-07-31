import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Центрированная обёртка для экранов входа и регистрации. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center py-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="SALFCARD">
            <Logo />
          </Link>
        </div>

        <div className="glass-strong rounded-2xl p-6 shadow-card sm:p-7">
          {children}
        </div>

        <p className="mt-6 text-center text-xs tracking-wide text-slate-500">
          salfcard.site
        </p>
      </div>
    </div>
  );
}
