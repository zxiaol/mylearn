"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Badge, Card, CardBody } from "@/src/ui/components";
import { Icons } from "@/src/ui/icons";

type WeaknessItem = {
  id: string;
  knowledgePointId: string;
  knowledgePointTitle: string;
  abilityTag: string;
  status: "WEAK" | "MASTERED";
};

export default function ReviewPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();

  const { status } = useSession({
    required: true,
    onUnauthenticated: () => router.push("/login"),
  });

  const [attempt, setAttempt] = useState<any>(null);
  const [weaknesses, setWeaknesses] = useState<WeaknessItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAttempt(null);
    setWeaknesses([]);
    setError(null);
    if (status !== "authenticated") return;
    (async () => {
      const res = await fetch(`/api/student/review?attemptId=${encodeURIComponent(attemptId)}`);
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "load_failed");
        return;
      }
      setAttempt(json.attempt);
      setWeaknesses(json.weaknesses ?? []);
    })().catch(() => setError("load_failed"));
  }, [attemptId, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">测验结果</h1>
          <p className="mt-2 text-sm text-slate-600">做得不错。接下来把薄弱点补齐，你会提升得很快。</p>
        </div>
        <Badge tone="brand" className="hidden sm:inline-flex">
          attempt: {String(attemptId).slice(0, 8)}…
        </Badge>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">错误：{error}</p> : null}

      {attempt ? (
        <Card>
          <CardBody className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">得分</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {attempt.totalScore}/{attempt.maxScore}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-surface-100 px-3 py-2">
              <Icons.Target className="h-4 w-4 text-mint-700" />
              <span className="text-sm font-semibold text-slate-800">下一步：薄弱点辅导</span>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-semibold">薄弱点</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {weaknesses.length === 0 ? (
            <Card>
              <CardBody className="text-sm text-slate-600">暂无薄弱点（或还未生成）。</CardBody>
            </Card>
          ) : (
            weaknesses.map((w) => (
              <Card key={w.id} className="hover:shadow-lift transition">
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">{w.knowledgePointTitle}</div>
                    {w.status === "WEAK" ? <Badge tone="blush">薄弱</Badge> : <Badge tone="mint">已掌握</Badge>}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">能力/题型：{w.abilityTag}</div>
                  <div className="mt-4">
                    <a
                      className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
                      href={`/tutor/${encodeURIComponent(w.id)}`}
                    >
                      开始辅导 <Icons.ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

