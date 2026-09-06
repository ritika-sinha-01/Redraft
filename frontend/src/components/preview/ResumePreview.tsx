import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LayoutPreferences, ResumeContent } from "../../types/resume";
import { ResumeDocument } from "../../templates";

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

export function PreviewStage({ children, maxScale = 0.85 }: { children: ReactNode; maxScale?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      setScale(Math.min(maxScale, Math.max(0.34, width / PAGE_WIDTH)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxScale]);

  return (
    <div ref={ref} className="preview-stage">
      <div className="preview-stage-frame" style={{ height: PAGE_HEIGHT * scale }}>
        <div
          style={{
            width: PAGE_WIDTH,
            flexShrink: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function ResumePreview({
  content,
  slug,
  accentColor,
  fontFamily,
  layout,
}: {
  content: ResumeContent;
  slug: string;
  accentColor?: string;
  fontFamily?: string;
  layout?: LayoutPreferences;
}) {
  return (
    <div className="resume-paper">
      <ResumeDocument content={content} slug={slug} accentColor={accentColor} fontFamily={fontFamily} layout={layout} />
    </div>
  );
}
