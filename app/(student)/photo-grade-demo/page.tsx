"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, cn } from "@/src/ui/components";
import { Icons } from "@/src/ui/icons";

type Q = { id: string; type: string; stem: string; chapterId: string };

export default function PhotoGradeDemoPage() {
  const router = useRouter();
  useSession({ required: true, onUnauthenticated: () => router.push("/login") });

  const [questionId, setQuestionId] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/student/questions?limit=20");
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) return;
      const list = (json?.questions ?? []) as Q[];
      setQuestions(list);
      if (!questionId && list.length > 0) setQuestionId(list[0].id);
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadAndGrade() {
    setError(null);
    setResult(null);
    if (!file || !questionId) {
      setError("missing_input");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/student/upload", { method: "POST", body: fd });
    const upJson = (await up.json().catch(() => null)) as any;
    if (!up.ok) {
      setError(upJson?.error ?? "upload_failed");
      return;
    }

    const gr = await fetch("/api/student/grade-photo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId, imageKeys: [upJson.key] }),
    });
    const grJson = (await gr.json().catch(() => null)) as any;
    if (!gr.ok) {
      setError(grJson?.message ?? grJson?.error ?? "grade_failed");
      setResult(grJson);
      return;
    }
    setResult(grJson);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">拍照判分</h1>
          <p className="mt-2 text-sm text-slate-600">选择题目 + 上传解答图片，调用多模态模型返回结构化判分结果。</p>
        </div>
        <Badge tone="blush" className="hidden sm:inline-flex">
          Multimodal
        </Badge>
      </div>

      <Card className="max-w-3xl">
        <CardBody className="space-y-4">
          <label className="block">
            <div className="text-sm font-semibold text-slate-800">选择题目</div>
            <select
              className={cn(
                "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100",
              )}
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.type} · {q.stem.slice(0, 18)}...
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-slate-500 break-all">
              questionId: <span className="font-mono">{questionId || "-"}</span>
            </div>
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-slate-800">上传解答图片</div>
            <input
              className="mt-2 w-full"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="mt-1 text-xs text-slate-500">建议：清晰、完整、避免反光。</div>
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={uploadAndGrade}>
              <Icons.Sparkles className="h-4 w-4" />
              上传并判分
            </Button>
            <Badge tone="mint">仅用于学习</Badge>
          </div>

          {error ? <p className="text-sm text-red-600">错误：{error}</p> : null}
          {result ? (
            <pre className="overflow-auto rounded-2xl bg-slate-50 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

