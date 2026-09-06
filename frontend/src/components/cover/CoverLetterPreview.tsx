import { COVER_FONTS, type CoverLetterContent, type CoverLetterDesign } from "../../types/coverLetter";

export function CoverLetterPreview({
  content,
  design,
  company,
  role,
  email,
  phone,
  location,
}: {
  content: CoverLetterContent;
  design: CoverLetterDesign;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  location?: string;
}) {
  const contact = [email, phone, location].filter(Boolean).join(" · ");
  const pad = design.spacing === "tight" ? "36px 44px" : design.layout === "compact" ? "32px 40px" : "52px 56px";
  return (
    <article
      className={`cover-paper cover-${design.layout}`}
      style={{
        fontFamily: COVER_FONTS[design.fontFamily],
        padding: pad,
        textAlign: design.align,
        borderLeft: design.layout === "modern" ? `8px solid ${design.accentColor}` : undefined,
      }}
    >
      <header className="cover-head">
        <h1 style={{ fontSize: design.layout === "compact" ? 22 : 28 }}>{content.senderName || "Your Name"}</h1>
        {contact ? <p className="cover-meta">{contact}</p> : null}
        {role || company ? <p className="cover-meta">{[role, company].filter(Boolean).join(" · ")}</p> : null}
      </header>
      <hr className="cover-rule" style={{ background: design.accentColor }} />
      <p>{content.greeting}</p>
      {(content.paragraphs || []).map((p, i) => (
        <p key={i} style={{ lineHeight: design.spacing === "tight" ? 1.4 : 1.65 }}>
          {p}
        </p>
      ))}
      <div className="cover-sign">
        <p>{content.signoff}</p>
        <p>{content.senderName}</p>
      </div>
    </article>
  );
}
