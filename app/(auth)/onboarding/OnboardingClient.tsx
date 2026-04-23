"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, cn } from "@/src/ui/components";

type Chapter = { id: string; order: number; title: string };

export default function OnboardingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId") ?? "";

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) setError("missing_userId");
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/chapters");
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) return;
      const list = (json?.chapters ?? []) as Chapter[];
      if (cancelled) return;
      setChapters(list);
      if (!currentChapterId && list.length > 0) setCurrentChapterId(list[0].id);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentChapterId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, term: "七下", currentChapterId }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "onboarding_failed");
        return;
      }
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">建档</h1>
        <Badge tone="brand">七下 · 人教版</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600">请选择你正在学习的章节，系统会围绕该章出小测并定位薄弱点。</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <div className="text-sm text-slate-700">当前章</div>
          <select
            className={cn(
              "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100",
            )}
            value={currentChapterId}
            onChange={(e) => setCurrentChapterId(e.target.value)}
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                第{c.order}章 · {c.title}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm text-red-600">错误：{error}</p> : null}

        <Button disabled={loading || !userId || !currentChapterId} className="w-full sm:w-auto">
          {loading ? "保存中…" : "保存建档"}
        </Button>
      </form>
    </main>
  );
}

