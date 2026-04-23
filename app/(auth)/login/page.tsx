"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, cn } from "@/src/ui/components";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (!res?.ok) {
        setError("login_failed");
        return;
      }
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">登录</h1>
        <span className="text-xs text-slate-500">欢迎回来</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">使用用户名 + 密码登录（MVP 暂不支持找回密码）。</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
        {error ? <p className="text-sm text-red-600">错误：{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button disabled={loading} className="w-full sm:w-auto">
            {loading ? "登录中…" : "登录"}
          </Button>
          <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => router.push("/register")}>
            没有账号？去注册 →
          </button>
        </div>
      </form>
    </main>
  );
}

