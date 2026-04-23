"use client";

import katex from "katex";

type Part =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string; display: boolean };

function parseLatex(text: string): Part[] {
  const parts: Part[] = [];
  let i = 0;

  const pushText = (s: string) => {
    if (!s) return;
    const prev = parts[parts.length - 1];
    if (prev && prev.kind === "text") prev.value += s;
    else parts.push({ kind: "text", value: s });
  };

  while (i < text.length) {
    const inlineStart = text.indexOf("\\(", i);
    const blockStart = text.indexOf("\\[", i);
    const next =
      inlineStart === -1
        ? blockStart
        : blockStart === -1
          ? inlineStart
          : Math.min(inlineStart, blockStart);

    if (next === -1) {
      pushText(text.slice(i));
      break;
    }

    pushText(text.slice(i, next));

    if (next === inlineStart) {
      const end = text.indexOf("\\)", next + 2);
      if (end === -1) {
        pushText(text.slice(next));
        break;
      }
      const expr = text.slice(next + 2, end);
      parts.push({ kind: "math", value: expr, display: false });
      i = end + 2;
      continue;
    }

    const end = text.indexOf("\\]", next + 2);
    if (end === -1) {
      pushText(text.slice(next));
      break;
    }
    const expr = text.slice(next + 2, end);
    parts.push({ kind: "math", value: expr, display: true });
    i = end + 2;
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
  const parts = parseLatex(text);
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

