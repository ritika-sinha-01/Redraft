import { create } from "zustand";
import { api } from "../api/client";
import {
  DEFAULT_DESIGN,
  DEFAULT_LAYOUT,
  type DesignPreferences,
  type LayoutPreferences,
  type ResumeContent,
  type ResumeDto,
} from "../types/resume";

interface EditorState {
  resumeId: string | null;
  title: string;
  templateId: string;
  templateSlug: string;
  content: ResumeContent | null;
  design: DesignPreferences;
  layout: LayoutPreferences;
  saving: boolean;
  dirty: boolean;
  lastSaved: Date | null;
  load: (resume: ResumeDto) => void;
  setTitle: (title: string) => void;
  setTemplate: (id: string, slug: string) => void;
  setDesign: (design: DesignPreferences) => void;
  setLayout: (layout: LayoutPreferences) => void;
  updateContent: (updater: (c: ResumeContent) => ResumeContent) => void;
  setContent: (content: ResumeContent) => void;
  save: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  resumeId: null,
  title: "",
  templateId: "",
  templateSlug: "classic",
  content: null,
  design: DEFAULT_DESIGN,
  layout: DEFAULT_LAYOUT,
  saving: false,
  dirty: false,
  lastSaved: null,
  load: (resume) =>
    set({
      resumeId: resume.id,
      title: resume.title,
      templateId: resume.templateId,
      templateSlug: resume.template?.slug ?? "classic",
      content: resume.content,
      design: { ...DEFAULT_DESIGN, ...resume.designPreferences },
      layout: { ...DEFAULT_LAYOUT, ...resume.layoutPreferences },
      dirty: false,
      lastSaved: new Date(resume.updatedAt),
    }),
  setTitle: (title) => set({ title, dirty: true }),
  setTemplate: (id, slug) => set({ templateId: id, templateSlug: slug, dirty: true }),
  setDesign: (design) => set({ design, dirty: true }),
  setLayout: (layout) => set({ layout, dirty: true }),
  updateContent: (updater) => {
    const current = get().content;
    if (!current) return;
    set({ content: updater(current), dirty: true });
  },
  setContent: (content) => set({ content, dirty: true }),
  save: async () => {
    const { resumeId, title, templateId, content, design, layout, dirty } = get();
    if (!resumeId || !content || !dirty) return;
    set({ saving: true });
    try {
      await api(`/api/resumes/${resumeId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          templateId,
          content,
          designPreferences: design,
          layoutPreferences: layout,
        }),
      });
      set({ dirty: false, lastSaved: new Date(), saving: false });
    } catch (err) {
      set({ saving: false });
      throw err;
    }
  },
}));
