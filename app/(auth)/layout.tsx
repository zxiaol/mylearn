export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-soft-gradient">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-card backdrop-blur">
            <div className="h-12 w-12 rounded-3xl bg-soft-gradient shadow-soft" />
            <h2 className="mt-6 text-2xl font-semibold text-slate-900">青春活力学习空间</h2>
            <p className="mt-3 text-slate-600">
              明亮柔和的清新蓝与薄荷绿，让学习更轻松。用 AI 帮你发现薄弱点、快速巩固、稳步提升。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-brand-200/60 bg-brand-50 p-4">
                <div className="text-sm font-semibold text-brand-800">课程卡片</div>
                <div className="mt-1 text-xs text-brand-700/80">章节进度一目了然</div>
              </div>
              <div className="rounded-3xl border border-mint-200/60 bg-mint-50 p-4">
                <div className="text-sm font-semibold text-mint-800">刷题模块</div>
                <div className="mt-1 text-xs text-mint-700/80">练习 3 全对=掌握</div>
              </div>
              <div className="rounded-3xl border border-blush-200/60 bg-blush-50 p-4">
                <div className="text-sm font-semibold text-blush-800">AI 答疑</div>
                <div className="mt-1 text-xs text-blush-700/80">拍照判分 & 讲解</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-800">错题本</div>
                <div className="mt-1 text-xs text-slate-600">聚焦薄弱点巩固</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-card">
            <div className="p-6 sm:p-8">{children}</div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} AI 学习助手 · 清爽易用</p>
        </div>
      </div>
    </div>
  );
}

