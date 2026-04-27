import { ButtonLink, Card, CardBody, Badge } from "@/src/ui/components";
import { Icons } from "@/src/ui/icons";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/auth/options";
import { prisma } from "@/src/db/client";

export default function Home() {
  const sessionPromise = getServerSession(authOptions);
  // Keep component sync by awaiting inside (server component).
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  return (
    <main className="bg-soft-gradient">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-3xl bg-white shadow-soft" />
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">AI 学习助手</h1>
                <Badge tone="mint">青春活力</Badge>
              </div>
            </div>
            <p className="max-w-2xl text-slate-600">
              清新蓝 + 薄荷绿 + 淡粉点缀的学习空间。先诊断、再辅导、再巩固，让你把薄弱点一口气补齐。
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <StartLearningButton sessionPromise={sessionPromise} />
              <ButtonLink href="/login" variant="ghost">
                我有账号
              </ButtonLink>
              <ButtonLink href="/photo-grade-demo" variant="blush">
                <Icons.Sparkles className="h-4 w-4" />
                AI 答疑
              </ButtonLink>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-lift transition">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">课程卡片</div>
                  <div className="text-brand-600">
                    <Icons.Layers className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">章节进度一目了然，继续学习更顺畅。</p>
                <div className="mt-4">
                  <Link className="text-sm font-semibold text-brand-700 hover:underline" href="/map">
                    去学习地图 →
                  </Link>
                </div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lift transition">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">错题本</div>
                  <div className="text-blush-600">
                    <Icons.Clipboard className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">聚焦薄弱点，反复巩固直到掌握。</p>
                <div className="mt-4 text-xs text-slate-500">MVP：入口预留</div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lift transition">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">刷题模块</div>
                  <div className="text-mint-700">
                    <Icons.Target className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">练习 3 题全对，系统就认为你掌握了。</p>
                <div className="mt-4">
                  <Link className="text-sm font-semibold text-mint-800 hover:underline" href="/resume">
                    继续学习 →
                  </Link>
                </div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lift transition">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">AI 答疑入口</div>
                  <div className="text-brand-600">
                    <Icons.Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">拍照判分、结构化反馈、参考解法。</p>
                <div className="mt-4">
                  <Link className="text-sm font-semibold text-brand-700 hover:underline" href="/photo-grade-demo">
                    立即提问 →
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

async function StartLearningButton({ sessionPromise }: { sessionPromise: ReturnType<typeof getServerSession> }) {
  const session = await sessionPromise;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error MVP: extend session user
  const userId = session?.user?.id as string | undefined;

  if (!userId) {
    return (
      <ButtonLink href="/register" variant="primary">
        开始学习 <Icons.ArrowRight className="h-4 w-4" />
      </ButtonLink>
    );
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } });
  const href = profile ? "/map" : `/onboarding?userId=${encodeURIComponent(userId)}`;

  return (
    <ButtonLink href={href} variant="primary">
      开始学习 <Icons.ArrowRight className="h-4 w-4" />
    </ButtonLink>
  );
}

