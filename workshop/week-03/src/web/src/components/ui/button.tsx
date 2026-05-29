import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)]/90",
  outline:
    "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
  ghost:
    "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
  destructive:
    "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:bg-[var(--color-destructive)]/90",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-6 text-base",
  icon: "h-10 w-10",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
