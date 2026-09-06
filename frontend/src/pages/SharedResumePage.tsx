import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { ResumeDocument } from "../templates";
import type { DesignPreferences, LayoutPreferences, ResumeContent } from "../types/resume";

export function SharedResumePage() {
  const { slug } = useParams();
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    resume: {
      title: string;
      content: ResumeContent;
      designPreferences: DesignPreferences;
      layoutPreferences: LayoutPreferences;
      template: { slug: string; name: string };
      ownerName: string;
    };
    viewCount: number;
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    api<typeof data>(`/api/share/public/${slug}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Link unavailable"));
  }, [slug]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--parchment)]">
        <p className="card p-8">{error}</p>
      </div>
    );
  }
  if (!data) return <div className="p-12 text-center text-[var(--muted)]">Loading resume…</div>;

  return (
    <div className="min-h-screen bg-[var(--parchment)] py-10">
      <div className="mb-6 text-center">
        <p className="text-sm text-[var(--muted)]">
          {data.resume.ownerName} · {data.resume.title} · {data.viewCount} views
        </p>
      </div>
      <div className="mx-auto max-w-[840px] px-4">
        <div className="resume-paper mx-auto max-w-full overflow-auto">
          <ResumeDocument
            content={data.resume.content}
            slug={data.resume.template.slug}
            accentColor={data.resume.designPreferences.accentColor}
            fontFamily={data.resume.designPreferences.fontFamily}
            layout={data.resume.layoutPreferences}
          />
        </div>
      </div>
    </div>
  );
}
