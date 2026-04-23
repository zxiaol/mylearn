import Link from "next/link";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("rounded-3xl border border-slate-200/70 bg-white shadow-card", className)}>{children}</div>;
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "brand" | "mint" | "blush";
  className?: string;
  children: React.ReactNode;
}) {
  const map = {
    neutral: "bg-slate-100 text-slate-700",
    brand: "bg-brand-50 text-brand-700",
    mint: "bg-mint-50 text-mint-800",
    blush: "bg-blush-50 text-blush-800",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", map[tone], className)}>
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "mint" | "blush";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition will-change-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  const map = {
    primary: "bg-brand-500 text-white hover:translate-y-[-1px] hover:shadow-lift",
    mint: "bg-mint-500 text-white hover:translate-y-[-1px] hover:shadow-lift",
    blush: "bg-blush-500 text-white hover:translate-y-[-1px] hover:shadow-lift",
    ghost: "bg-white text-slate-800 border border-slate-200 hover:bg-surface-100 hover:translate-y-[-1px] hover:shadow-soft",
  } as const;
  return (
    <button className={cn(base, map[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: "primary" | "ghost" | "mint" | "blush";
  className?: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition will-change-transform active:scale-[0.98]";
  const map = {
    primary: "bg-brand-500 text-white hover:translate-y-[-1px] hover:shadow-lift",
    mint: "bg-mint-500 text-white hover:translate-y-[-1px] hover:shadow-lift",
    blush: "bg-blush-500 text-white hover:translate-y-[-1px] hover:shadow-lift",
    ghost: "bg-white text-slate-800 border border-slate-200 hover:bg-surface-100 hover:translate-y-[-1px] hover:shadow-soft",
  } as const;
  return (
    <Link href={href} className={cn(base, map[variant], className)}>
      {children}
    </Link>
  );
}

