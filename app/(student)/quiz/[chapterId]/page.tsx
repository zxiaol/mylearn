"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Badge, Button, ButtonLink, Card, CardBody } from "@/src/ui/components";
import { Icons } from "@/src/ui/icons";
import { MathText } from "@/src/ui/MathText";
import { MathKeypadInput } from "@/src/ui/MathKeypadInput";

type QuizQuestion = {
  id: string;
  type: "SINGLE_CHOICE" | "FILL_BLANK" | "PHOTO_SOLUTION";
  stem: string;
  options: string[] | null;
};

export default function QuizPage() {
  const params = useParams<{ chapterId: string }>();
  const chapterId = useMemo(() => {
    const raw = params.chapterId;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.chapterId]);

  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated: () => router.push("/login"),
  });

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [graded, setGraded] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<{ attemptId: string; answeredCount: number; totalCount: number } | null>(null);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [bankWarning, setBankWarning] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);

  const current = useMemo(() => questions[idx] ?? null, [idx, questions]);

  useEffect(() => {
    setAttemptId(null);
    setQuestions([]);
    setIdx(0);
    setValue("");
    setPhotoKeys([]);
    setGraded(null);
    setError(null);
    setPending(null);
    setAnsweredIds([]);
    setBankWarning(null);
  }, [chapterId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (status !== "authenticated") return;
      const res = await fetch(`/api/student/quiz/pending?chapterId=${encodeURIComponent(chapterId)}`);
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || cancelled) return;
      if (json?.pending) {
        setPending({
          attemptId: String(json.attemptId),
          answeredCount: Number(json.answeredCount ?? 0),
          totalCount: Number(json.totalCount ?? 0),
        });
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chapterId, status]);

  async function start(mode: "resume" | "new") {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/student/quiz/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chapterId, mode }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "start_failed");
        return;
      }
      const qs = (json.questions as QuizQuestion[]) ?? [];
      if (qs.length === 0) {
        setError("no_questions_for_chapter");
        return;
      }
      if (Array.isArray(json.questions) && typeof json.expectedCount === "number" && qs.length < json.expectedCount) {
        setBankWarning(`题库题量不足：本次仅抽到 ${qs.length}/${json.expectedCount} 题。可点“扩充题库”补到更接近 20 题体验。`);
      } else {
        setBankWarning(null);
      }
      const answered = (json.answeredQuestionIds ?? []) as string[];
      setAttemptId(json.attemptId);
      setQuestions(qs);
      setAnsweredIds(answered);
      const firstUnanswered = qs.findIndex((q) => !answered.includes(q.id));
      setIdx(firstUnanswered >= 0 ? firstUnanswered : 0);
      setValue("");
      setPhotoKeys([]);
      setGraded(null);
      setPending(null);
    } finally {
      setStarting(false);
    }
  }

  async function expandBank() {
    setError(null);
    setBankWarning(null);
    setExpanding(true);
    try {
      const res = await fetch("/api/student/quiz/expand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chapterId, targetInsert: 20 }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "expand_failed");
        return;
      }
      setBankWarning(`已扩充题库：${json.before} → ${json.after}（本次新增 ${json.inserted} 题）。现在可再点“新做 20 题”。`);
    } finally {
      setExpanding(false);
    }
  }

  async function uploadPhoto(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/student/upload", { method: "POST", body: fd });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "upload_failed");
        return;
      }
      setPhotoKeys((prev) => [...prev, json.key]);
    } finally {
      setUploading(false);
    }
  }

  async function submitAnswer() {
    if (!attemptId || !current) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/student/quiz/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: current.id,
          valueText: current.type === "PHOTO_SOLUTION" ? "" : value,
          imageKeys: current.type === "PHOTO_SOLUTION" ? photoKeys : undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.message ?? json?.error ?? "answer_failed");
        return;
      }
      setGraded(json.graded);
    } finally {
      setSubmitting(false);
    }
  }

  async function finishQuiz() {
    if (!attemptId) return;
    const res = await fetch("/api/student/quiz/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId, durationSec: 0 }),
    });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      setError(json?.error ?? "finish_failed");
      return;
    }
    router.push(`/review/${encodeURIComponent(attemptId)}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">章节小测</h1>
          <p className="mt-2 text-sm text-slate-600">20 题左右的轻量诊断，快速定位薄弱点。</p>
        </div>
        <Badge tone="brand" className="hidden sm:inline-flex">
          chapter: {String(chapterId).slice(0, 8)}…
        </Badge>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="h-10 w-10 rounded-2xl bg-surface-100" />
            <div>
              <div className="font-semibold text-slate-900">准备就绪</div>
              <div className="text-xs text-slate-500">点击开始后即可进入逐题作答</div>
            </div>
          </div>
          {status === "authenticated" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => start("resume")}
                disabled={starting || !pending}
              >
                继续上次 {pending ? `(${pending.answeredCount}/${pending.totalCount})` : ""}
              </Button>
              <Button onClick={() => start("new")} disabled={starting}>
                {starting ? "开始中…" : "新做 20 题"} <Icons.ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : status === "loading" ? (
            <Button disabled>
              加载中… <Icons.ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <ButtonLink href="/login" variant="primary">
              去登录后开始 <Icons.ArrowRight className="h-4 w-4" />
            </ButtonLink>
          )}
        </CardBody>
      </Card>

      {error ? <p className="text-sm text-red-600">错误：{error}</p> : null}
      {bankWarning ? (
        <div className="rounded-2xl border border-brand-200/60 bg-brand-50 p-4 text-sm text-brand-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>{bankWarning}</div>
            <Button variant="ghost" onClick={expandBank} disabled={expanding}>
              {expanding ? "扩充中…" : "扩充题库"}
            </Button>
          </div>
        </div>
      ) : null}
      {error === "no_questions_for_chapter" ? (
        <p className="text-sm text-slate-600">
          这个章节暂时没有题目（题库未导入或 chapterId 不匹配）。你可以先回到学习地图换一个章节，或先运行题库导入脚本。
        </p>
      ) : null}

      {attemptId && current ? (
        <Card className="max-w-3xl">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500">
                第 {idx + 1}/{questions.length} 题
              </div>
              <Badge tone={current.type === "PHOTO_SOLUTION" ? "blush" : "neutral"}>{current.type}</Badge>
            </div>
            <div className="mt-3 whitespace-pre-wrap text-slate-900">
              <MathText text={current.stem} />
            </div>

          {current.type === "SINGLE_CHOICE" && current.options ? (
            <div className="mt-4 space-y-2">
              {current.options.map((opt, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input type="radio" name="opt" checked={value === String(i)} onChange={() => setValue(String(i))} />
                  <span className="text-slate-900">
                    <MathText text={opt} />
                  </span>
                </label>
              ))}
            </div>
          ) : current.type === "PHOTO_SOLUTION" ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm text-slate-700">上传你的解答照片（可多张）</div>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                  e.currentTarget.value = "";
                }}
              />
              {photoKeys.length > 0 ? (
                <div className="space-y-2">
                  {photoKeys.map((k) => (
                    <div key={k} className="text-xs text-slate-600 break-all">
                      已上传：{k}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">未上传图片</div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              {current.type === "FILL_BLANK" ? (
                <MathKeypadInput value={value} onChange={setValue} placeholder="填空答案" />
              ) : (
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  placeholder="请输入答案"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              )}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              onClick={submitAnswer}
              disabled={
                submitting ||
                current.type === "PHOTO_SOLUTION"
                  ? photoKeys.length === 0
                  : current.type === "SINGLE_CHOICE"
                    ? value === ""
                    : value.trim() === ""
              }
            >
              {submitting ? "提交中…" : "提交本题"}
            </Button>
            <button
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-surface-100 active:scale-[0.98]"
              onClick={() => {
                setIdx((v) => Math.min(v + 1, questions.length - 1));
                setValue("");
                setPhotoKeys([]);
                setGraded(null);
              }}
            >
              下一题
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-surface-100 active:scale-[0.98]"
              onClick={finishQuiz}
            >
              交卷
            </button>
          </div>

          {graded ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">判题结果</div>
                {"score" in graded && "maxScore" in graded ? (
                  <Badge tone={graded.score === graded.maxScore ? "mint" : "blush"}>
                    {graded.score === graded.maxScore ? "正确" : "不正确"} · {graded.score}/{graded.maxScore}
                  </Badge>
                ) : (
                  <Badge tone="brand">已返回</Badge>
                )}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:underline">查看原始返回</summary>
                <pre className="mt-2 overflow-auto rounded-xl bg-slate-50 p-3 text-xs">{JSON.stringify(graded, null, 2)}</pre>
              </details>
            </div>
          ) : null}
          </CardBody>
        </Card>
      ) : null}

      {!attemptId ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 sm:hidden">
          <div className="pointer-events-auto border-t border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold text-slate-900">开始测试</div>
                <div className="text-xs text-slate-500">未开始时按钮固定在底部</div>
              </div>
              {status === "authenticated" ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => start("resume")} disabled={starting || !pending}>
                    继续上次
                  </Button>
                  <Button onClick={() => start("new")} disabled={starting}>
                    {starting ? "开始中…" : "新做 20 题"} <Icons.ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : status === "loading" ? (
                <Button disabled>
                  加载中… <Icons.ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <ButtonLink href="/login" variant="primary">
                  去登录后开始 <Icons.ArrowRight className="h-4 w-4" />
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

