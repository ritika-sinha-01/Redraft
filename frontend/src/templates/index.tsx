import type { LayoutPreferences, ResumeContent, SectionKey } from "../types/resume";
import { sanitizeHtml } from "../types/resume";

const FONT: Record<string, string> = {
  georgia: 'Georgia, "Times New Roman", serif',
  garamond: "Garamond, Georgia, serif",
  palatino: 'Palatino, "Palatino Linotype", serif',
  segoe: '"Segoe UI", Arial, Helvetica, sans-serif',
  calibri: "Calibri, Arial, sans-serif",
  trebuchet: '"Trebuchet MS", Arial, sans-serif',
  courier: '"Courier New", Courier, monospace',
};

const BAND = new Set(["professional", "executive", "sidebar", "aurora"]);

function contactLine(c: ResumeContent) {
  const p = c.personal;
  return [p.email, p.phone, p.location, p.linkedin, p.website, p.portfolioUrl].filter(Boolean).join("  ·  ");
}

function dates(start: string, end: string, current?: boolean) {
  const right = current ? "Present" : end;
  if (!start && !right) return "";
  return [start, right].filter(Boolean).join(" – ");
}

function Html({ html }: { html: string }) {
  return <div className="rb-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

function Sections({ content }: { content: ResumeContent }) {
  const vis = content.sectionVisibility;
  const order = content.sectionOrder?.length
    ? content.sectionOrder
    : (["summary", "experience", "education", "skills", "projects", "awards"] as SectionKey[]);

  return (
    <>
      {order.map((key) => {
        if (vis[key] === false) return null;
        if (key === "summary" && content.summary) {
          return (
            <section key={key}>
              <h2>Summary</h2>
              <Html html={content.summary} />
            </section>
          );
        }
        if (key === "experience") {
          const items = content.experience.filter((e) => e.company || e.title || e.description);
          if (!items.length) return null;
          return (
            <section key={key}>
              <h2>Experience</h2>
              {items.map((e) => (
                <div className="rb-item" key={e.id}>
                  <div className="rb-item-head">
                    <div>
                      <span className="rb-item-title">{e.title}</span>
                      {e.company ? <span className="rb-item-org"> · {e.company}</span> : null}
                    </div>
                    <div className="rb-item-meta">
                      {dates(e.startDate, e.endDate, e.current)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  {e.description ? <Html html={e.description} /> : null}
                </div>
              ))}
            </section>
          );
        }
        if (key === "education") {
          const items = content.education.filter((e) => e.school || e.degree);
          if (!items.length) return null;
          return (
            <section key={key}>
              <h2>Education</h2>
              {items.map((e) => (
                <div className="rb-item" key={e.id}>
                  <div className="rb-item-head">
                    <div>
                      <span className="rb-item-title">
                        {e.degree}
                        {e.field ? ` in ${e.field}` : ""}
                      </span>
                      {e.school ? <span className="rb-item-org"> · {e.school}</span> : null}
                    </div>
                    <div className="rb-item-meta">{dates(e.startDate, e.endDate)}</div>
                  </div>
                </div>
              ))}
            </section>
          );
        }
        if (key === "skills" && content.skills.length) {
          return (
            <section key={key}>
              <h2>Skills</h2>
              <div className="rb-skills">
                {content.skills.map((s) => (
                  <span className="rb-skill" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </section>
          );
        }
        if (key === "projects") {
          const items = (content.projects || []).filter((p) => p.name || p.description);
          if (!items.length) return null;
          return (
            <section key={key}>
              <h2>Projects</h2>
              {items.map((p) => (
                <div className="rb-item" key={p.id}>
                  <div className="rb-item-head">
                    <span className="rb-item-title">{p.name}</span>
                    {p.url ? <span className="rb-item-meta">{p.url}</span> : null}
                  </div>
                  {p.description ? <Html html={p.description} /> : null}
                </div>
              ))}
            </section>
          );
        }
        if (key === "awards") {
          const items = (content.awards || []).filter((a) => a.title);
          if (!items.length) return null;
          return (
            <section key={key}>
              <h2>Awards</h2>
              {items.map((a) => (
                <div className="rb-item" key={a.id}>
                  <div className="rb-item-head">
                    <span className="rb-item-title">{a.title}</span>
                    <span className="rb-item-meta">{[a.issuer, a.date].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
              ))}
            </section>
          );
        }
        return null;
      })}
    </>
  );
}

export function ResumeDocument({
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
  const header = (
    <>
      <h1>{content.personal.fullName || "Your Name"}</h1>
      <p className="rb-contact">{contactLine(content) || "email · phone · location"}</p>
    </>
  );
  const band = BAND.has(slug);
  return (
    <article
      className={`rb rb-${slug}`}
      style={{
        fontFamily: FONT[fontFamily || "georgia"],
        ["--accent" as string]: accentColor || "#1f3a4c",
        lineHeight: layout?.lineHeight,
        padding: band ? 0 : layout?.pagePadding ? `${layout.pagePadding}px` : undefined,
        ["--section-gap" as string]: layout?.sectionGap ? `${layout.sectionGap}px` : undefined,
      }}
    >
      {band ? <div className="rb-band">{header}</div> : <header className="rb-header">{header}</header>}
      {band ? (
        <div className="rb-inner">
          <Sections content={content} />
        </div>
      ) : (
        <Sections content={content} />
      )}
    </article>
  );
}
