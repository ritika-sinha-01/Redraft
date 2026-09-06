export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  portfolioUrl: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  url: string;
}

export interface AwardItem {
  id: string;
  title: string;
  issuer: string;
  date: string;
}

export interface CustomSection {
  id: string;
  heading: string;
  body: string;
}

export type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "awards";

export interface ResumeContent {
  personal: PersonalInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  awards: AwardItem[];
  customSections: CustomSection[];
  sectionOrder: SectionKey[];
  sectionVisibility: Record<SectionKey, boolean>;
}

export interface DesignPreferences {
  fontFamily: string;
  accentColor: string;
}

export interface LayoutPreferences {
  sectionGap: number;
  lineHeight: number;
  pagePadding: number;
}

export const DEFAULT_DESIGN: DesignPreferences = {
  fontFamily: "georgia",
  accentColor: "#1f3a4c",
};

export const DEFAULT_LAYOUT: LayoutPreferences = {
  sectionGap: 18,
  lineHeight: 1.45,
  pagePadding: 52,
};

export const FONT_STACKS: Record<string, string> = {
  georgia: 'Georgia, "Times New Roman", serif',
  garamond: 'Garamond, Georgia, serif',
  palatino: 'Palatino, "Palatino Linotype", serif',
  segoe: '"Segoe UI", Arial, Helvetica, sans-serif',
  calibri: "Calibri, Arial, sans-serif",
  trebuchet: '"Trebuchet MS", Arial, sans-serif',
  courier: '"Courier New", Courier, monospace',
};

export const FREE_FONTS = ["georgia", "garamond", "segoe", "calibri", "palatino"];
export const PREMIUM_FONTS = ["trebuchet", "courier"];
export const FREE_COLORS = ["#1f3a4c", "#2563eb", "#c45c26", "#0f766e", "#7c3aed", "#be123c", "#171717"];

export function createDefaultContent(options?: {
  fullName?: string;
  email?: string;
  id?: () => string;
}): ResumeContent {
  const id = options?.id ?? (() => Math.random().toString(36).slice(2, 11));
  return {
    personal: {
      fullName: options?.fullName ?? "",
      email: options?.email ?? "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
      portfolioUrl: "",
    },
    summary: "",
    experience: [
      {
        id: id(),
        company: "",
        title: "",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        description: "",
      },
    ],
    education: [
      {
        id: id(),
        school: "",
        degree: "",
        field: "",
        startDate: "",
        endDate: "",
      },
    ],
    skills: [],
    projects: [],
    awards: [],
    customSections: [],
    sectionOrder: ["summary", "experience", "education", "skills"],
    sectionVisibility: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: false,
      awards: false,
    },
  };
}

export function parseResumeContent(raw: string): ResumeContent {
  try {
    const parsed = JSON.parse(raw) as ResumeContent;
    const defaults = createDefaultContent();
    return {
      ...defaults,
      ...parsed,
      personal: { ...defaults.personal, ...(parsed.personal || {}) },
      sectionVisibility: { ...defaults.sectionVisibility, ...(parsed.sectionVisibility || {}) },
      sectionOrder: parsed.sectionOrder?.length ? parsed.sectionOrder : defaults.sectionOrder,
      experience: parsed.experience || defaults.experience,
      education: parsed.education || defaults.education,
      skills: parsed.skills || [],
      projects: parsed.projects || [],
      awards: parsed.awards || [],
      customSections: parsed.customSections || [],
    };
  } catch {
    return createDefaultContent();
  }
}

export function parseDesign(raw: string): DesignPreferences {
  try {
    return { ...DEFAULT_DESIGN, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DESIGN };
  }
}

export function parseLayout(raw: string): LayoutPreferences {
  try {
    return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function sanitizeRichText(value: string): string {
  if (!value) return "";
  const hasTags = /<[a-z][\s\S]*>/i.test(value);
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (!hasTags) return escaped.replace(/\n/g, "<br/>");
  return value
    .replace(/<(?!\/?(b|i|strong|em|ul|ol|li|br|p)\b)[^>]*>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
}

export function resumePlainText(c: ResumeContent): string {
  const p = c.personal;
  return [
    p.fullName,
    p.email,
    p.phone,
    p.location,
    p.linkedin,
    p.website,
    p.portfolioUrl,
    c.summary,
    ...c.experience.flatMap((e) => [e.title, e.company, e.description.replace(/<[^>]+>/g, "")]),
    ...c.education.flatMap((e) => [e.school, e.degree, e.field]),
    ...c.skills,
    ...c.projects.flatMap((e) => [e.name, e.description.replace(/<[^>]+>/g, "")]),
    ...c.awards.flatMap((e) => [e.title, e.issuer]),
  ]
    .filter(Boolean)
    .join(" ");
}
