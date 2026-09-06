import { useEffect, useState } from "react";
import { api, getLlmSettings, saveLlmSettings, type LlmProvider } from "../../api/client";

const PAID: { id: Exclude<LlmProvider, "builtin">; label: string; hint: string }[] = [
  { id: "openai", label: "ChatGPT", hint: "OpenAI API key" },
  { id: "gemini", label: "Gemini", hint: "Google AI Studio key" },
  { id: "anthropic", label: "Claude", hint: "Anthropic API key" },
];

export function LlmSettingsPanel({ compact }: { compact?: boolean }) {
  const initial = getLlmSettings();
  const [provider, setProvider] = useState<LlmProvider>(initial.provider);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [saved, setSaved] = useState(false);
  const [server, setServer] = useState<{ providers: Record<string, boolean>; hasServerKey: boolean } | null>(null);

  useEffect(() => {
    api<{ providers: Record<string, boolean>; hasServerKey: boolean }>("/api/ai/status")
      .then(setServer)
      .catch(() => undefined);
  }, []);

  function choose(next: LlmProvider) {
    setProvider(next);
    saveLlmSettings(next, next === "builtin" ? "" : apiKey);
  }

  return (
    <div className={compact ? "space-y-3" : "card space-y-3 p-5"}>
      {!compact ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">AI model</p>
          <p className="text-sm text-[var(--muted)]">
            Included assistant is ready — click Send. No API key. ChatGPT, Gemini, and Claude are optional if you have your own key.
          </p>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">Included assistant works without a key.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${provider === "builtin" ? "btn-copper" : "btn-ghost"}`}
          onClick={() => choose("builtin")}
        >
          Included assistant
        </button>
      </div>
      <details className="rounded-xl border border-[var(--line)] p-3">
        <summary className="cursor-pointer text-sm font-medium">Use my own ChatGPT, Gemini, or Claude</summary>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Those companies require a key. Leave this closed unless you want their exact models.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAID.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`btn btn-sm ${provider === p.id ? "btn-copper" : "btn-ghost"}`}
              onClick={() => choose(p.id)}
            >
              {p.label}
              {server?.providers[p.id] ? " · server" : ""}
            </button>
          ))}
        </div>
        {provider !== "builtin" ? (
          <>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {PAID.find((p) => p.id === provider)?.hint}
              <input
                className="field mt-1"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={server?.hasServerKey ? "Optional — server key is already set" : "Paste your API key"}
              />
            </label>
            <button
              type="button"
              className="btn btn-sm btn-ink mt-3"
              onClick={() => {
                saveLlmSettings(provider, apiKey);
                setSaved(true);
                window.setTimeout(() => setSaved(false), 1600);
              }}
            >
              {saved ? "Saved" : "Save key"}
            </button>
          </>
        ) : null}
      </details>
    </div>
  );
}
