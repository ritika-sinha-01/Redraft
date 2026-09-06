export interface CoverLetterContent {
  greeting: string;
  paragraphs: string[];
  signoff: string;
  senderName: string;
}

export interface CoverLetterDesign {
  layout: "classic" | "modern" | "compact";
  fontFamily: "georgia" | "garamond" | "segoe";
  accentColor: string;
  align: "left" | "center";
  spacing: "comfortable" | "tight";
}

export interface CoverLetterDto {
  id: string;
  userId: string;
  resumeId: string | null;
  title: string;
  company: string;
  role: string;
  jobDescription: string;
  content: CoverLetterContent;
  design: CoverLetterDesign;
  createdAt: string;
  updatedAt: string;
}

export const COVER_FONTS: Record<CoverLetterDesign["fontFamily"], string> = {
  georgia: 'Georgia, "Times New Roman", serif',
  garamond: "Garamond, Georgia, serif",
  segoe: '"Segoe UI", Arial, sans-serif',
};

export const DEFAULT_COVER_CONTENT: CoverLetterContent = {
  greeting: "Dear Hiring Manager,",
  paragraphs: [""],
  signoff: "Sincerely,",
  senderName: "",
};

export const DEFAULT_COVER_DESIGN: CoverLetterDesign = {
  layout: "classic",
  fontFamily: "georgia",
  accentColor: "#c45c26",
  align: "left",
  spacing: "comfortable",
};
