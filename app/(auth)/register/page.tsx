"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, cn, Badge } from "@/src/ui/components";

type RegisterRole = "STUDENT" | "GUARDIAN";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("STUDENT");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, username, password, nickname }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "register_failed");
        return;
      }

      if (json?.role === "STUDENT") {
        router.push(`/onboarding?userId=${encodeURIComponent(json.userId)}`);
      } else {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">注册</h1>
        <Badge tone="mint">免费体验</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600">创建账号后即可开始“诊断 → 辅导 → 巩固”的学习闭环。</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <div className="text-sm text-slate-700">角色</div>
          <select
            className={cn(
              "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100",
            )}
            value={role}
            onChange={(e) => setRole(e.target.value as RegisterRole)}
          >
            <option value="STUDENT">学生</option>
            <option value="GUARDIAN">家长/老师</option>
          </select>
        </label>

        <label className="block">
          <div className="text-sm text-slate-700">用户名</div>
          <input
            className={cn(
              "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100",
            )}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="block">
          <div className="text-sm text-slate-700">密码</div>
          <input
            className={cn(
              "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100",
            )}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="block">
          <div className="text-sm text-slate-700">昵称</div>
          <input
            className={cn(
              "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100",
            )}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-red-600">错误：{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button disabled={loading} className="w-full sm:w-auto">
            {loading ? "提交中…" : "注册"}
          </Button>
          <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => router.push("/login")}>
            已有账号？去登录 →
          </button>
        </div>
      </form>
    </main>
  );
}

