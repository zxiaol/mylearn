"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink, Card, CardBody, cn, Badge } from "./components";
import { Icons } from "./icons";
import { useSession } from "next-auth/react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const studentNav: NavItem[] = [
  { href: "/", label: "首页", icon: <Icons.Home className="h-5 w-5" /> },
  { href: "/map", label: "学习地图", icon: <Icons.Layers className="h-5 w-5" /> },
  { href: "/resume", label: "继续学习", icon: <Icons.ArrowRight className="h-5 w-5" /> },
  { href: "/photo-grade-demo", label: "拍照判分", icon: <Icons.Clipboard className="h-5 w-5" /> },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data } = useSession();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const title = useMemo(() => {
    const hit = studentNav.find((n) => n.href === pathname);
    if (hit) return hit.label;
    if (pathname.startsWith("/quiz/")) return "章节小测";
    if (pathname.startsWith("/review/")) return "测验结果";
    if (pathname.startsWith("/tutor/")) return "针对性辅导";
    return "学习空间";
  }, [pathname]);

  const Sidebar = (
    <div className="flex h-full flex-col gap-3 p-4">
      <Link href="/" className="flex items-center gap-2 px-2 py-2">
        <div className="h-9 w-9 rounded-2xl bg-soft-gradient shadow-soft" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">AI 学习助手</div>
          <div className="text-xs text-slate-500">青春活力 · 七下数学</div>
        </div>
      </Link>

      <Card className="overflow-hidden">
        <CardBody className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">学科</div>
          <div className="grid gap-2">
            <div className="rounded-2xl border border-brand-200/60 bg-brand-50 px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                  <Icons.Book className="h-4 w-4" />
                  数学
                </div>
                <Badge tone="mint">已开通</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 opacity-70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Icons.Book className="h-4 w-4" />
                  语文
                </div>
                <Badge>即将上线</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 opacity-70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Icons.Book className="h-4 w-4" />
                  英语
                </div>
                <Badge>即将上线</Badge>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardBody className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">导航</div>
          <nav className="grid gap-1">
            {studentNav.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                    active ? "bg-surface-100 text-slate-900" : "text-slate-700 hover:bg-surface-50",
                  )}
                >
                  <span className={cn(active ? "text-brand-600" : "text-slate-500")}>{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </CardBody>
      </Card>

      <div className="mt-auto">
        <Card className="overflow-hidden">
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500">AI 答疑</div>
              <Icons.Sparkles className="h-4 w-4 text-blush-600" />
            </div>
            <div className="text-sm text-slate-700">遇到不会的题？拍照或输入题目，立刻获得清晰讲解。</div>
            <ButtonLink href="/photo-grade-demo" variant="blush" className="w-full">
              立即提问 <Icons.ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </CardBody>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-soft-gradient">
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:translate-y-[-1px] sm:hidden"
                onClick={() => setOpen(true)}
                aria-label="打开菜单"
              >
                <Icons.Menu className="h-5 w-5 text-slate-700" />
              </button>
              <div>
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <div className="text-xs text-slate-500">清新蓝 · 薄荷绿 · 淡粉点缀</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink href="/map" variant="ghost" className="hidden sm:inline-flex">
                学习地图
              </ButtonLink>
              <ButtonLink href="/photo-grade-demo" variant="primary" className="hidden sm:inline-flex">
                <Icons.Sparkles className="h-4 w-4" />
                AI 答疑
              </ButtonLink>
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-soft">
                <div className="h-7 w-7 rounded-full bg-surface-100" />
                <div className="text-sm font-semibold text-slate-800">{data?.user?.name ?? "学习者"}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden h-[calc(100vh-88px)] lg:sticky lg:top-[88px] lg:block">{Sidebar}</aside>
          <main>{children}</main>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} aria-label="关闭菜单" />
          <div className="absolute left-0 top-0 h-full w-[88%] max-w-xs animate-[slideIn_.18s_ease-out] bg-white shadow-lift">
            {Sidebar}
          </div>
          <style>{`@keyframes slideIn {from{transform:translateX(-12px);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>
        </div>
      ) : null}
    </div>
  );
}

