"use client";

import katex from "katex";

type Part =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string; display: boolean };

function normalizeMathLikeText(input: string): string {
  let s = input;

  // Normalize unicode roots into LaTeX so KaTeX can render them.
  // Examples:
  // - √[3]{-27}  -> \sqrt[3]{-27}
  // - √(x)       -> \sqrt{x}
  // - ∛(x)       -> \sqrt[3]{x}
  s = s.replace(/√\s*\[\s*(\d+)\s*\]\s*\{([^}]+)\}/g, String.raw`\sqrt[$1]{$2}`);
  s = s.replace(/√\s*\{([^}]+)\}/g, String.raw`\sqrt{$1}`);
  s = s.replace(/√\s*\(\s*([^)]+?)\s*\)/g, String.raw`\sqrt{$1}`);

  s = s.replace(/∛\s*\{([^}]+)\}/g, String.raw`\sqrt[3]{$1}`);
  s = s.replace(/∛\s*\(\s*([^)]+?)\s*\)/g, String.raw`\sqrt[3]{$1}`);

  return s;
}

function parseLatexFragmentsInText(text: string): Part[] {
  // Detect common LaTeX fragments embedded in normal text (including CJK),
  // e.g. "已知\\sqrt{x-3}有意义" without any $...$ delimiters.
  const parts: Part[] = [];
  const re = /\\[a-zA-Z]+(?:\[[^\]]*\])?(?:\{[^}]*\})+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? -1;
    if (idx < 0) continue;
    if (idx > last) parts.push({ kind: "text", value: text.slice(last, idx) });
    parts.push({ kind: "math", value: m[0], display: false });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts.length ? parts : [{ kind: "text", value: text }];
}

function parseLatex(text: string): Part[] {
  const parts: Part[] = [];
  let i = 0;

  const pushText = (s: string) => {
    if (!s) return;
    const prev = parts[parts.length - 1];
    if (prev && prev.kind === "text") prev.value += s;
    else parts.push({ kind: "text", value: s });
  };

  const pushMath = (expr: string, display: boolean) => {
    parts.push({ kind: "math", value: expr, display });
  };

  while (i < text.length) {
    const inlineParenStart = text.indexOf("\\(", i);
    const blockBracketStart = text.indexOf("\\[", i);
    const inlineDollarStart = text.indexOf("$", i);

    // Find next delimiter among: \(, \[, $, $$
    let next = -1;
    for (const idx of [inlineParenStart, blockBracketStart, inlineDollarStart]) {
      if (idx === -1) continue;
      next = next === -1 ? idx : Math.min(next, idx);
    }

    if (next === -1) {
      pushText(text.slice(i));
      break;
    }

    pushText(text.slice(i, next));

    if (next === inlineParenStart) {
      const end = text.indexOf("\\)", next + 2);
      if (end === -1) {
        pushText(text.slice(next));
        break;
      }
      const expr = text.slice(next + 2, end);
      pushMath(expr, false);
      i = end + 2;
      continue;
    }

    if (next === blockBracketStart) {
      const end = text.indexOf("\\]", next + 2);
      if (end === -1) {
        pushText(text.slice(next));
        break;
      }
      const expr = text.slice(next + 2, end);
      pushMath(expr, true);
      i = end + 2;
      continue;
    }

    // Dollar math: $...$ (inline) or $$...$$ (display)
    if (next === inlineDollarStart) {
      const isDouble = text.startsWith("$$", next);
      const startLen = isDouble ? 2 : 1;
      const endDelim = isDouble ? "$$" : "$";

      const end = text.indexOf(endDelim, next + startLen);
      if (end === -1) {
        pushText(text.slice(next));
        break;
      }

      const expr = text.slice(next + startLen, end);
      pushMath(expr, isDouble);
      i = end + startLen;
      continue;
    }
  }

  return parts;
}

export function MathText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const normalized = normalizeMathLikeText(text);
  let parts = parseLatex(normalized);

  // If no explicit delimiters were found, try extracting LaTeX fragments inside text.
  if (parts.every((p) => p.kind === "text") && normalized.includes("\\")) {
    parts = parseLatexFragmentsInText(normalized);
  }

  // Fallback: some question banks store raw LaTeX fragments without delimiters.
  // If we didn't detect any math parts but the string looks like pure LaTeX, render as inline math.
  if (parts.every((p) => p.kind === "text")) {
    const s = normalized.trim();
    const hasCjk = /[\u3400-\u9FFF]/.test(s);
    const looksLikeLatex = /\\[a-zA-Z]+/.test(s) || /[\^_]\{?/.test(s);
    if (!hasCjk && looksLikeLatex) {
      parts = [{ kind: "math", value: s, display: false }];
    }
  }
  return (
    <span className={className}>
      {parts.map((p, idx) => {
        if (p.kind === "text") return <span key={idx}>{p.value}</span>;
        let html = "";
        try {
          html = katex.renderToString(p.value, {
            throwOnError: false,
            displayMode: p.display,
            strict: "ignore",
          });
        } catch {
          html = p.value;
        }
        return (
          <span
            key={idx}
            className={p.display ? "my-2 block overflow-x-auto" : "inline"}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}

