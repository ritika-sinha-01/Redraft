import type { ResumeContent } from "../types/resume";
import { builtinChat } from "./builtinAssistant";

export type LlmProvider = "builtin" | "openai" | "gemini" | "anthropic";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function serverKey(provider: Exclude<LlmProvider, "builtin">) {
  if (provider === "openai") return process.env.OPENAI_API_KEY || "";
  if (provider === "gemini") return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
}

export function availableProviders() {
  return {
    builtin: true,
    openai: Boolean(serverKey("openai")),
    gemini: Boolean(serverKey("gemini")),
    anthropic: Boolean(serverKey("anthropic")),
  };
}

function headerValue(headers: { [key: string]: string | string[] | undefined }, name: string) {
  const raw = headers[name];
  if (Array.isArray(raw)) return String(raw[0] || "");
  return raw == null ? "" : String(raw);
}

export function resolveLlm(req: { headers: { [key: string]: string | string[] | undefined } }) {
  const headerProvider = headerValue(req.headers, "x-llm-provider").toLowerCase();
  const headerKey = headerValue(req.headers, "x-llm-key").trim();
  const provider = (["builtin", "openai", "gemini", "anthropic"].includes(headerProvider)
    ? headerProvider
    : "builtin") as LlmProvider;
  const apiKey = provider === "builtin" ? "" : headerKey || serverKey(provider);
  return { provider, apiKey };
}

export async function llmChat(opts: {
  provider: LlmProvider;
  apiKey: string;
  messages: ChatMessage[];
  system?: string;
  resume?: ResumeContent | null;
}): Promise<string> {
  if (opts.provider === "builtin" || !opts.apiKey) {
    return builtinChat(opts);
  }
  if (opts.provider === "openai") return chatOpenAi(opts);
  if (opts.provider === "gemini") return chatGemini(opts);
  return chatAnthropic(opts);
}

async function chatOpenAi(opts: { apiKey: string; messages: ChatMessage[]; system?: string }) {
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    ...opts.messages.filter((m) => m.role !== "system"),
  ];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages, temperature: 0.6 }),
  });
  const data = (await res.json()) as { error?: { message?: string }; choices?: { message?: { content?: string } }[] };
  if (!res.ok) throw Object.assign(new Error(data.error?.message || "OpenAI request failed"), { status: 400 });
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function chatGemini(opts: { apiKey: string; messages: ChatMessage[]; system?: string }) {
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(opts.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: opts.system ? { parts: [{ text: opts.system }] } : undefined,
        contents,
      }),
    }
  );
  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!res.ok) throw Object.assign(new Error(data.error?.message || "Gemini request failed"), { status: 400 });
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";
}

async function chatAnthropic(opts: { apiKey: string; messages: ChatMessage[]; system?: string }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
      max_tokens: 1200,
      system: opts.system,
      messages: opts.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    }),
  });
  const data = (await res.json()) as { error?: { message?: string }; content?: { text?: string }[] };
  if (!res.ok) throw Object.assign(new Error(data.error?.message || "Claude request failed"), { status: 400 });
  return data.content?.map((c) => c.text || "").join("").trim() || "";
}
