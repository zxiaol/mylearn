import { z } from "zod";

const OpenAiResponseSchema = z.object({
  output_text: z.string().optional(),
});

const ChatCompletionsSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().optional(),
        }),
      }),
    )
    .min(1),
});

export function hasOpenAiConfigured(): boolean {
  // backward-compatible: this now means "has any AI provider configured"
  return Boolean(process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY);
}

function getProvider() {
  // explicit override, otherwise auto-detect
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  if (forced === "dashscope" || forced === "bailian") return "dashscope";
  if (forced === "openai") return "openai";
  if (process.env.DASHSCOPE_API_KEY) return "dashscope";
  return "openai";
}

function dashscopeBaseUrl() {
  return process.env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
}

export async function openAiJson<T>({
  model,
  system,
  user,
  schema,
}: {
  model: string;
  system: string;
  user: any;
  schema: z.ZodType<T>;
}): Promise<T> {
  const provider = getProvider();

  // Provider 1: DashScope / Bailian OpenAI-compatible mode (chat.completions)
  if (provider === "dashscope") {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) throw new Error("DASHSCOPE_API_KEY not set");

    // OpenAI-compatible chat.completions message format.
    // For multimodal, caller can pass "user" as an array of parts.
    // DashScope supports part types: text, image_url, video_url, video.
    const userParts = Array.isArray(user)
      ? user.map((p: any) => {
          if (p?.type === "input_image") return { ...p, type: "image_url" };
          return p;
        })
      : [{ type: "text", text: String(user ?? "") }];

    const messages = [
      { role: "system", content: [{ type: "text", text: system }] },
      { role: "user", content: userParts },
    ];

    const res = await fetch(`${dashscopeBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        // OpenAI-compatible structured output (if supported by model)
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`dashscope_http_${res.status}: ${txt.slice(0, 500)}`);
    }

    const json = await res.json().catch(() => null);
    const parsed = ChatCompletionsSchema.parse(json);
    const text = parsed.choices[0]?.message?.content ?? "";
    const obj = JSON.parse(text);
    return schema.parse(obj);
  }

  // Provider 2: OpenAI Responses API (existing behavior)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: [{ type: "text", text: system }] },
        { role: "user", content: user },
      ],
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`openai_http_${res.status}: ${txt.slice(0, 500)}`);
  }

  const json = await res.json().catch(() => null);
  const parsed = OpenAiResponseSchema.safeParse(json);
  const rawText: string | undefined = (json as any)?.output_text ?? parsed.data?.output_text;

  const text =
    rawText ??
    (Array.isArray((json as any)?.output)
      ? (json as any).output
          .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
          .filter((c: any) => c?.type === "output_text" || c?.type === "text")
          .map((c: any) => c?.text ?? "")
          .join("\n")
      : "");

  const obj = JSON.parse(text);
  return schema.parse(obj);
}

