import PptxGenJS from "pptxgenjs";
import type { ResumeContent } from "../../types/resume";

export async function renderPpt(content: ResumeContent, title: string): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "A4", width: 8.27, height: 11.69 });
  pptx.layout = "A4";
  pptx.title = title;

  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 8.27,
    h: 1.35,
    fill: { color: "0F2744" },
    line: { color: "0F2744" },
  });

  const p = content.personal;
  slide.addText(p.fullName || "Your Name", {
    x: 0.45,
    y: 0.22,
    w: 7.4,
    h: 0.55,
    fontSize: 26,
    bold: true,
    color: "FFFFFF",
    fontFace: "Calibri",
  });

  const contact = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).join("  |  ");
  slide.addText(contact || "email  |  phone  |  location", {
    x: 0.45,
    y: 0.78,
    w: 7.4,
    h: 0.35,
    fontSize: 11,
    color: "D6DDE6",
    fontFace: "Calibri",
  });

  let y = 1.55;
  const addHeading = (label: string) => {
    slide.addText(label.toUpperCase(), {
      x: 0.45,
      y,
      w: 7.4,
      h: 0.28,
      fontSize: 12,
      bold: true,
      color: "0F2744",
      fontFace: "Calibri",
    });
    y += 0.08;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: y + 0.2,
      w: 7.37,
      h: 0.015,
      fill: { color: "C9A227" },
      line: { color: "C9A227" },
    });
    y += 0.32;
  };

  if (content.summary) {
    addHeading("Summary");
    slide.addText(content.summary, {
      x: 0.45,
      y,
      w: 7.4,
      h: 1.1,
      fontSize: 12,
      color: "222222",
      fontFace: "Calibri",
      valign: "top",
    });
    y += 1.2;
  }

  const experiences = content.experience.filter((e) => e.company || e.title || e.description);
  if (experiences.length) {
    addHeading("Experience");
    for (const e of experiences.slice(0, 4)) {
      const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – ");
      slide.addText(
        [
          { text: e.title || "Role", options: { bold: true } },
          { text: e.company ? `  ·  ${e.company}` : "" },
          { text: dates ? `    ${dates}` : "", options: { italic: true } },
        ],
        { x: 0.45, y, w: 7.4, h: 0.26, fontSize: 13, color: "111111", fontFace: "Calibri" }
      );
      y += 0.26;
      if (e.description) {
        const h = Math.min(1.1, 0.22 + e.description.length / 220);
        slide.addText(e.description, {
          x: 0.45,
          y,
          w: 7.4,
          h,
          fontSize: 11,
          color: "333333",
          fontFace: "Calibri",
          valign: "top",
        });
        y += h + 0.08;
      }
    }
  }

  const education = content.education.filter((e) => e.school || e.degree);
  if (education.length) {
    addHeading("Education");
    for (const e of education.slice(0, 3)) {
      const line = [e.degree, e.field ? `in ${e.field}` : "", e.school ? `· ${e.school}` : ""]
        .filter(Boolean)
        .join(" ");
      const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
      slide.addText(`${line}${dates ? `    ${dates}` : ""}`, {
        x: 0.45,
        y,
        w: 7.4,
        h: 0.28,
        fontSize: 12,
        color: "111111",
        fontFace: "Calibri",
      });
      y += 0.3;
    }
  }

  if (content.skills.length) {
    addHeading("Skills");
    slide.addText(content.skills.join("  ·  "), {
      x: 0.45,
      y,
      w: 7.4,
      h: 0.6,
      fontSize: 12,
      color: "111111",
      fontFace: "Calibri",
    });
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(output as Buffer);
}
