"use client";

import { useCallback, useMemo, useRef } from "react";
import { cn } from "@/src/ui/components";

type Key = { label: string; insert: string; cursorShift?: number };

export function MathKeypadInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  const keys: Key[] = useMemo(
    () => [
      { label: "∛( )", insert: "∛()", cursorShift: -1 },
      { label: "√( )", insert: "√()", cursorShift: -1 },
      { label: "^", insert: "^" },
      { label: "π", insert: "π" },
      { label: "±", insert: "±" },
      { label: "| |", insert: "||", cursorShift: -1 },
      { label: "( )", insert: "()", cursorShift: -1 },
      { label: "分数", insert: "()/()", cursorShift: -4 }, // 光标落在第一个括号内
      { label: "−", insert: "-" },
    ],
    [],
  );

  const insertAtCursor = useCallback(
    (k: Key) => {
      const el = ref.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const next = value.slice(0, start) + k.insert + value.slice(end);
      onChange(next);

      // 将光标移动到更适合继续输入的位置
      queueMicrotask(() => {
        const el2 = ref.current;
        if (!el2) return;
        const base = start + k.insert.length;
        const pos = k.cursorShift ? base + k.cursorShift : base;
        el2.focus();
        el2.setSelectionRange(pos, pos);
      });
    },
    [onChange, value],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100 disabled:opacity-60",
        )}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {keys.map((k) => (
          <button
            key={k.label}
            type="button"
            disabled={disabled}
            onClick={() => insertAtCursor(k)}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-soft transition hover:bg-surface-100 active:scale-[0.98] disabled:opacity-50"
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-500">提示：可点上方按钮快速输入根号、立方根、分数等。</div>
    </div>
  );
}

