"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Badge, Card, CardBody } from "@/src/ui/components";
import { Icons } from "@/src/ui/icons";

type Item = {
  chapterId: string;
  order: number;
  title: string;
  status: "unstarted" | "in_progress" | "mastered";
};

export default function StudentMapPage() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated: () => router.push("/login"),
  });

  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems([]);
    setError(null);
    if (status !== "authenticated") return;
    (async () => {
      const res = await fetch("/api/student/map");
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "load_failed");
        return;
      }
      setItems((json?.items ?? []) as Item[]);
    })().catch(() => setError("load_failed"));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">学习地图</h1>
          <p className="mt-2 text-sm text-slate-600">按章学习，系统会根据测验与辅导自动更新掌握状态。</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-soft">
          <Icons.Target className="h-4 w-4 text-mint-700" />
          <span className="text-sm font-semibold text-slate-800">目标：薄弱清零</span>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">错误：{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <Card key={it.chapterId} className="hover:shadow-lift transition">
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-500">第{it.order}章</div>
                {it.status === "unstarted" ? (
                  <Badge>未测</Badge>
                ) : it.status === "in_progress" ? (
                  <Badge tone="brand">学习中</Badge>
                ) : (
                  <Badge tone="mint">已掌握</Badge>
                )}
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{it.title}</div>
              <div className="mt-3 flex items-center justify-between">
                <a
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
                  href={`/quiz/${encodeURIComponent(it.chapterId)}`}
                >
                  进入小测 <Icons.ArrowRight className="h-4 w-4" />
                </a>
                {it.status === "mastered" ? <Icons.Check className="h-5 w-5 text-mint-700" /> : null}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

