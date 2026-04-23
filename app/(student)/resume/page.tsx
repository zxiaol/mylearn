"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardBody, ButtonLink } from "@/src/ui/components";
import { Icons } from "@/src/ui/icons";

export default function ResumePage() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated: () => router.push("/login"),
  });
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    setPath(null);
    if (status !== "authenticated") return;
    (async () => {
      const res = await fetch("/api/student/resume");
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) return;
      setPath(json?.path ?? null);
    })().catch(() => {});
  }, [status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">一键继续</h1>
        <p className="mt-2 text-sm text-slate-600">自动定位你上一次的学习节点，继续完成即可。</p>
      </div>

      <Card className="overflow-hidden">
        <CardBody>
          {path ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-700">
                建议跳转到：<span className="font-mono text-xs text-slate-600">{path}</span>
              </div>
              <ButtonLink href={path} variant="mint">
                继续学习 <Icons.ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="h-9 w-9 rounded-2xl bg-surface-100" />
              正在为你查找最近学习节点…
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

