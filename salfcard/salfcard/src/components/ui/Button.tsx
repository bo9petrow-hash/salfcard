import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  // Градиентная кнопка (синий → фиолетовый)
  primary: "btn-grad",
  secondary:
    "glass text-white hover:bg-white/10 disabled:opacity-50",
  ghost:
    "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50",
  danger:
    "bg-transparent text-slate-300 border border-white/15 hover:border-red-400/60 hover:text-red-300",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-night-900",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
