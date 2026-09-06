const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const LLM_PROVIDER_KEY = "resume-analysis.llm.provider";
const LLM_API_KEY = "resume-analysis.llm.key";

export type LlmProvider = "builtin" | "openai" | "gemini" | "anthropic";

export function getLlmSettings(): { provider: LlmProvider; apiKey: string } {
  const stored = localStorage.getItem(LLM_PROVIDER_KEY) || "builtin";
  const provider = (["builtin", "openai", "gemini", "anthropic"].includes(stored) ? stored : "builtin") as LlmProvider;
  return {
    provider,
    apiKey: provider === "builtin" ? "" : localStorage.getItem(LLM_API_KEY) || "",
  };
}

export function saveLlmSettings(provider: LlmProvider, apiKey: string) {
  localStorage.setItem(LLM_PROVIDER_KEY, provider);
  localStorage.setItem(LLM_API_KEY, apiKey.trim());
}

function applyLlmHeaders(headers: Headers) {
  const { provider, apiKey } = getLlmSettings();
  headers.set("x-llm-provider", provider);
  if (apiKey) headers.set("x-llm-key", apiKey);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  applyLlmHeaders(headers);
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const message =
      res.status === 401 ? "Please log in first, then try again." : body.error || res.statusText;
    throw new ApiError(message, res.status);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function downloadExport(resumeId: string, format: "pdf" | "ppt", filename: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  applyLlmHeaders(headers);
  const res = await fetch(`${API}/api/resumes/${resumeId}/export`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ format }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error || "Export failed", res.status);
  }
  const blob = await res.blob();
  const ext = format === "ppt" ? "pptx" : "pdf";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename || "resume"}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

export async function parseResumeFile(file: File) {
  const base64 = await fileToBase64(file);
  return api<{ content: import("../types/resume").ResumeContent; warnings: string[] }>("/api/resumes/parse", {
    method: "POST",
    body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
  });
}

export async function createResumeFromImport(content: import("../types/resume").ResumeContent, title?: string) {
  const data = await api<{ templates: { id: string; isPremium: boolean; name: string }[] }>("/api/templates");
  const template = data.templates.find((t) => !t.isPremium) || data.templates[0];
  if (!template) throw new ApiError("No templates available", 500);
  return api<{ resume: import("../types/resume").ResumeDto }>("/api/resumes", {
    method: "POST",
    body: JSON.stringify({
      templateId: template.id,
      title: (title || "Imported Resume").trim(),
      content,
    }),
  });
}

export const IMPORT_STORAGE_KEY = "resume-analysis.import";

export function stashImportedContent(content: import("../types/resume").ResumeContent, title?: string) {
  sessionStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify({ content, title: title || "" }));
}

export function takeImportedContent(): { content: import("../types/resume").ResumeContent; title: string } | null {
  const raw = sessionStorage.getItem(IMPORT_STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(IMPORT_STORAGE_KEY);
  try {
    return JSON.parse(raw) as { content: import("../types/resume").ResumeContent; title: string };
  } catch {
    return null;
  }
}

export async function downloadCoverExport(letterId: string, format: "pdf" | "docx", filename: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  applyLlmHeaders(headers);
  const res = await fetch(`${API}/api/cover-letters/${letterId}/export`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ format }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error || "Export failed", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename || "cover-letter"}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function peekImportedContent(): { content: import("../types/resume").ResumeContent; title: string } | null {
  const raw = sessionStorage.getItem(IMPORT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { content: import("../types/resume").ResumeContent; title: string };
  } catch {
    return null;
  }
}
