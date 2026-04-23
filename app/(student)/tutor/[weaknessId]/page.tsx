"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody } from "@/src/ui/components";
import { Icons } from "@/src/ui/icons";
import { MathText } from "@/src/ui/MathText";
import { MathKeypadInput } from "@/src/ui/MathKeypadInput";

export default function TutorPage() {
  const params = useParams<{ weaknessId: string }>();
  const weaknessId = params.weaknessId;
  const router = useRouter();

  const { status } = useSession({
    required: true,
    onUnauthenticated: () => router.push("/login"),
  });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const practice = useMemo(() => (state?.practice ?? []) as any[], [state]);
  const currentPractice = practice[selectedIndex] ?? null;

  useEffect(() => {
    setSessionId(null);
    setState(null);
    setError(null);
    setValue("");
    setPhotoKeys([]);
    setSelectedIndex(0);
  }, [weaknessId]);

  async function startIfNeeded() {
    setError(null);
    const res = await fetch("/api/student/tutor/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weaknessId }),
    });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      setError(json?.error ?? "start_failed");
      return;
    }
    setSessionId(json.sessionId);
  }

  async function loadState() {
    setError(null);
    const res = await fetch(`/api/student/tutor/state?weaknessId=${encodeURIComponent(weaknessId)}`);
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      setError(json?.error ?? "load_failed");
      return;
    }
    setState(json.state);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      await startIfNeeded();
      await loadState();
    })().catch(() => setError("load_failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, weaknessId]);

  async function submit() {
    if (!currentPractice) return;
    setError(null);
    const res = await fetch("/api/student/tutor/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        weaknessId,
        questionId: currentPractice.questionId,
        valueText: currentPractice.type === "PHOTO_SOLUTION" ? "" : value,
        imageKeys: currentPractice.type === "PHOTO_SOLUTION" ? photoKeys : undefined,
      }),
    });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      setError(json?.error ?? json?.message ?? "answer_failed");
      return;
    }
    setState(json.state);
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">针对性辅导</h1>
          <p className="mt-2 text-sm text-slate-600">讲解 → 例题 → 练习 3 题 → 小结（全对即掌握）。</p>
        </div>
        <Badge tone="brand" className="hidden sm:inline-flex">
          weakness: {String(weaknessId).slice(0, 8)}…
        </Badge>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">错误：{error}</p> : null}

      {sessionId ? <p className="mt-2 text-xs text-slate-500">sessionId: {sessionId}</p> : null}

      {state ? (
        <div className="mt-6 grid gap-4">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500">讲解</div>
                <Badge tone="mint">要点清晰</Badge>
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{state.explanation}</pre>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="text-xs font-semibold text-slate-500">例题（1 道）</div>
              <div className="mt-3 whitespace-pre-wrap text-slate-900">
                {state.example?.stem ? <MathText text={state.example.stem} /> : null}
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700 hover:underline">查看解析</summary>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{state.example?.analysis}</div>
              </details>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">练习（3 道，全对=掌握）</div>
                <div className="mt-1 text-xs text-slate-500">第 {selectedIndex + 1}/{practice.length} 题</div>
              </div>
              <div className="text-sm">
                掌握状态：
                {state.mastered ? <span className="text-mint-800"> 已掌握</span> : <span className="text-blush-700"> 未掌握</span>}
              </div>
            </div>

            {currentPractice ? (
              <div className="mt-3">
                <div className="whitespace-pre-wrap">
                  <MathText text={currentPractice.stem} />
                </div>

                {currentPractice.type === "SINGLE_CHOICE" && currentPractice.options ? (
                  <div className="mt-4 space-y-2">
                    {currentPractice.options.map((opt: string, i: number) => (
                      <label key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="opt"
                          checked={value === String(i)}
                          onChange={() => setValue(String(i))}
                        />
                        <span className="text-slate-900">
                          <MathText text={opt} />
                        </span>
                      </label>
                    ))}
                  </div>
                ) : currentPractice.type === "PHOTO_SOLUTION" ? (
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
                    {currentPractice.type === "FILL_BLANK" ? (
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
                  <Button onClick={submit}>提交本题</Button>
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-surface-100 active:scale-[0.98]"
                    onClick={() => {
                      setSelectedIndex((v) => Math.min(v + 1, practice.length - 1));
                      setValue("");
                      setPhotoKeys([]);
                    }}
                  >
                    下一题
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-surface-100 active:scale-[0.98]"
                    onClick={() => router.push("/map")}
                  >
                    返回学习地图
                  </button>
                </div>

                {typeof currentPractice.isCorrect === "boolean" ? (
                  <p className="mt-3 text-sm">
                    判定：{currentPractice.isCorrect ? <span className="text-green-700">正确</span> : <span className="text-red-700">错误</span>}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">暂无练习题（题库不足）。</p>
            )}
            </CardBody>
          </Card>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-600">加载中…</p>
      )}
    </div>
  );
}

