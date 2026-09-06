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
  customSections: { id: string; heading: string; body: string }[];
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

export const FONT_LABELS: Record<string, string> = {
  georgia: "Georgia",
  garamond: "Garamond",
  palatino: "Palatino",
  segoe: "Segoe UI",
  calibri: "Calibri",
  trebuchet: "Trebuchet",
  courier: "Courier",
};

export const FREE_FONTS = ["georgia", "garamond", "segoe", "calibri", "palatino"];
export const PREMIUM_FONTS = ["trebuchet", "courier"];
export const FREE_COLORS = ["#1f3a4c", "#2563eb", "#c45c26", "#0f766e", "#7c3aed", "#be123c", "#171717"];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  awards: "Awards",
};

export interface TemplateDto {
  id: string;
  name: string;
  slug: string;
  thumbnail: string;
  isPremium: boolean;
  layoutConfig: Record<string, string>;
}

export interface ResumeDto {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  content: ResumeContent;
  designPreferences: DesignPreferences;
  layoutPreferences: LayoutPreferences;
  shareSlug: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  template?: { slug: string; name: string; isPremium?: boolean };
  versionCount?: number;
  atsRunCount?: number;
}

export const SAMPLE_CONTENT: ResumeContent = {
  personal: {
    fullName: "Alex Rivera",
    email: "alex.rivera@email.com",
    phone: "(555) 010-2048",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/alexrivera",
    website: "alexrivera.dev",
    portfolioUrl: "alexrivera.dev/work",
  },
  summary:
    "Product-minded software engineer with 6 years of experience building reliable web applications and mentoring small teams.",
  experience: [
    {
      id: "s1",
      company: "Northwind Labs",
      title: "Senior Software Engineer",
      location: "Austin, TX",
      startDate: "2022",
      endDate: "",
      current: true,
      description:
        "<ul><li>Led a team of 4 to ship a customer dashboard used by 12k monthly users.</li><li>Reduced page load time by 35% and introduced automated testing.</li></ul>",
    },
  ],
  education: [
    {
      id: "e1",
      school: "University of Texas",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2014",
      endDate: "2018",
    },
  ],
  skills: ["TypeScript", "React", "Node.js", "SQL"],
  projects: [
    {
      id: "p1",
      name: "Harbor",
      description: "Open-source job tracker used by 2k developers.",
      url: "github.com/alex/harbor",
    },
  ],
  awards: [{ id: "a1", title: "Engineering Excellence", issuer: "Northwind", date: "2024" }],
  customSections: [],
  sectionOrder: ["summary", "experience", "education", "projects", "skills", "awards"],
  sectionVisibility: {
    summary: true,
    experience: true,
    education: true,
    skills: true,
    projects: true,
    awards: true,
  },
};

export function sanitizeHtml(html: string) {
  return html.replace(/<(?!\/?(b|i|strong|em|ul|ol|li|br|p)\b)[^>]*>/gi, "");
}
