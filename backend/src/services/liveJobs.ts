import type { ResumeContent } from "../types/resume";
import { JOBS } from "../data/jobs";

export interface LiveJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  posted: string;
  postedAt: string;
  description: string;
  url: string;
  source: string;
  salary: string;
  matchPercent: number;
  matchedSkills: string[];
}

const cache = new Map<string, { at: number; jobs: LiveJob[] }>();
const CACHE_MS = 8 * 60 * 1000;
const STOP = new Set(["and", "the", "with", "for", "of", "&", "a", "an", "to", "in", "on"]);
const INDIA_RE =
  /india|indian|bengaluru|bangalore|mumbai|delhi|noida|gurgaon|gurugram|hyderabad|pune|chennai|kolkata|ahmedabad|kochi|jaipur|indore|lucknow|coimbatore|remote.?india|\bapac\b/i;
const EUROPE_ONLY_RE =
  /germany|berlin|munich|amsterdam|london|paris|netherlands|sweden|poland|spain|france|italy|zurich|dublin|vienna|prague|europe(?!\/ remote)/i;

export function queryFromResume(content: ResumeContent | null, override = "") {
  const title = content?.experience.find((e) => e.title)?.title?.trim() || "";
  const skills = (content?.skills || []).map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const location = content?.personal.location?.trim() || "";
  const searches = override.trim() ? [override.trim()] : roleSearches(title, skills);
  const query = searches[0] || "software engineer";
  return { query, searches, title, skills, location, intern: /intern/i.test(`${title} ${override}`) };
}

export async function findLiveJobs(opts: {
  content?: ResumeContent | null;
  q?: string;
  location?: string;
}): Promise<{ jobs: LiveJob[]; query: string; live: boolean; sourceNote: string }> {
  const extracted = queryFromResume(opts.content || null, opts.q);
  const location = (opts.location || extracted.location || "India").trim() || "India";
  const cacheKey = `in-all|${extracted.searches.join("|")}|${location}`.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { jobs: hit.jobs, query: extracted.searches.join(" · "), live: true, sourceNote: "Live listings, refreshed recently." };
  }

  const fetches: Promise<LiveJob[]>[] = [
    ...extracted.searches.slice(0, 4).map((term) => fetchRemotive(`${term} India`)),
    ...fetchMuseIndiaAll(extracted),
    fetchJobicyIndia(extracted.query),
  ];

  const results = await Promise.allSettled(fetches);
  const merged = new Map<string, LiveJob>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const job of result.value) {
      const key = `${job.company}|${job.title}`.toLowerCase();
      if (!merged.has(key)) merged.set(key, job);
    }
  }

  let jobs = [...merged.values()]
    .map((job) => scoreJob(job, extracted, location))
    .filter((j) => prefersIndia(j) && j.matchPercent >= 38);
  jobs.sort((a, b) => b.matchPercent - a.matchPercent || b.postedAt.localeCompare(a.postedAt));
  jobs = jobs.slice(0, 24);

  const live = jobs.length > 0;
  if (!live) {
    jobs = JOBS.map((j) =>
      scoreJob(
        {
          id: j.id,
          title: j.title,
          company: j.company,
          location: j.location,
          type: j.type,
          posted: j.posted,
          postedAt: new Date().toISOString(),
          description: j.description,
          url: "",
          source: "Sample",
          salary: "",
          matchPercent: 0,
          matchedSkills: [],
        },
        extracted,
        location
      )
    )
      .filter((j) => j.matchPercent >= 40)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  } else {
    cache.set(cacheKey, { at: Date.now(), jobs });
  }

  return {
    jobs,
    query: extracted.searches.join(" · "),
    live,
    sourceNote: live
      ? "Live openings in India — intern, experienced, and senior; on-site, hybrid, and remote."
      : "No strong matches yet — try a shorter search like “software engineer”.",
  };
}

function roleSearches(title: string, skills: string[]) {
  const parts = title.split(/\s*[&/,|]\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
  const queries = new Set<string>();

  if (/artificial intelligence|\bai\b/i.test(title)) {
    queries.add("AI intern");
    queries.add("machine learning intern");
    queries.add("AI engineer");
    queries.add("machine learning engineer");
  }
  if (/software/i.test(title)) {
    queries.add("software engineering intern");
    queries.add("software engineer");
    queries.add("senior software engineer");
  }
  if (/data/i.test(title)) {
    queries.add("data science intern");
    queries.add("data scientist");
    queries.add("senior data scientist");
  }
  if (/design/i.test(title)) {
    queries.add("product design intern");
    queries.add("product designer");
    queries.add("senior product designer");
  }

  for (const part of parts) {
    const cleaned = part.replace(/\b(intern|internship|trainee|associate|senior|junior)\b/gi, "").replace(/\s+/g, " ").trim();
    if (cleaned.length > 3) {
      queries.add(cleaned);
      queries.add(`${cleaned} intern`);
      queries.add(`senior ${cleaned}`);
    }
  }

  const skill = skills.find((s) => /python|java|react|figma|sql|typescript|c\+\+|ml|pytorch|tensorflow/i.test(s));
  if (skill) {
    queries.add(skill);
    queries.add(`${skill} intern`);
    queries.add(`senior ${skill}`);
  }

  const list = [...queries].filter(Boolean).slice(0, 6);
  return list.length ? list : ["software engineer", "software engineering intern", "senior software engineer"];
}

function scoreJob(job: LiveJob, extracted: ReturnType<typeof queryFromResume>, location: string): LiveJob {
  const titleHay = job.title.toLowerCase();
  const descHay = `${job.description} ${job.location}`.toLowerCase();
  const roleTokens = meaningfulTokens(`${extracted.title} ${extracted.query}`);
  const skillTokens = extracted.skills.map((s) => s.toLowerCase()).filter((s) => s.length > 1);

  let score = 0;
  const matched: string[] = [];

  for (const token of roleTokens) {
    if (titleHay.includes(token)) {
      score += token.length > 6 ? 18 : 14;
      matched.push(token);
    } else if (descHay.includes(token)) {
      score += 6;
      matched.push(token);
    }
  }
  for (const skill of skillTokens) {
    if (titleHay.includes(skill)) {
      score += 16;
      matched.push(skill);
    } else if (descHay.includes(skill)) {
      score += 8;
      matched.push(skill);
    }
  }

  if (/intern|internship|graduate|entry/i.test(job.title)) score += 6;
  if (/senior|staff|lead/i.test(job.title)) score += 6;
  if (/software engineer|software engineering/i.test(extracted.title) && /software engineer|software engineering/i.test(job.title)) {
    score += 16;
  }
  if (isIndiaJob(job)) score += 14;
  if (location && INDIA_RE.test(location) && isIndiaJob(job)) score += 8;
  if (EUROPE_ONLY_RE.test(job.location) && !isIndiaJob(job)) score -= 20;

  const matchPercent = Math.max(0, Math.min(99, Math.round(score)));
  return { ...job, matchPercent, matchedSkills: unique(matched).slice(0, 6) };
}

function meaningfulTokens(text: string) {
  return unique(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w) && w !== "artificial" && w !== "intelligence")
      .map((w) => (w === "engineering" ? "engineer" : w))
  );
}

async function fetchRemotive(search: string, category = ""): Promise<LiveJob[]> {
  const params = new URLSearchParams({ limit: "20" });
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  const url = `https://remotive.com/api/remote-jobs?${params.toString()}`;
  const data = (await fetchJson(url)) as {
    jobs?: {
      id: number;
      url: string;
      title: string;
      company_name: string;
      job_type?: string;
      publication_date?: string;
      candidate_required_location?: string;
      salary?: string;
      description?: string;
    }[];
  };
  return (data.jobs || []).map((j) => ({
    id: `remotive-${j.id}`,
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    type: [prettyType(j.job_type || "full_time"), workMode(j.candidate_required_location || "Remote", j.description || "")].join(" · "),
    posted: timeAgo(j.publication_date),
    postedAt: j.publication_date || "",
    description: clip(stripHtml(decodeEntities(j.description || ""))),
    url: j.url,
    source: "Remotive",
    salary: j.salary || "",
    matchPercent: 0,
    matchedSkills: [],
  }));
}

function isIndiaJob(job: LiveJob) {
  return INDIA_RE.test(`${job.location} ${job.title} ${job.description}`);
}

function prefersIndia(job: LiveJob) {
  if (EUROPE_ONLY_RE.test(job.location) && !isIndiaJob(job)) return false;
  return isIndiaJob(job);
}

function workMode(location: string, description: string) {
  const t = `${location} ${description}`;
  if (/hybrid/i.test(t)) return "Hybrid";
  if (/on.?site|in-office|office based|work from office/i.test(t)) return "On-site";
  if (/remote|worldwide|anywhere/i.test(t)) return "Remote";
  return "On-site";
}

function fetchMuseIndiaAll(extracted: ReturnType<typeof queryFromResume>) {
  const levels = ["Internship", "Entry Level", "Mid Level", "Senior Level"];
  return levels.map((level) => fetchMuseIndia(extracted, level));
}

async function fetchMuseIndia(extracted: ReturnType<typeof queryFromResume>, level: string): Promise<LiveJob[]> {
  const params = new URLSearchParams({ page: "0", descending: "true" });
  for (const city of [
    "Bengaluru, India",
    "Mumbai, India",
    "New Delhi, India",
    "Hyderabad, India",
    "Pune, India",
    "Chennai, India",
    "Noida, India",
    "Gurgaon, India",
  ]) {
    params.append("location", city);
  }
  params.append("level", level);
  if (/engineer|software|developer|intern|ai /i.test(extracted.query)) params.append("category", "Software Engineering");
  const data = (await fetchJson(`https://www.themuse.com/api/public/jobs?${params.toString()}`)) as {
    results?: {
      id: number;
      name?: string;
      contents?: string;
      publication_date?: string;
      refs?: { landing_page?: string };
      company?: { name?: string };
      locations?: { name?: string }[];
      levels?: { name?: string }[];
    }[];
  };
  return (data.results || []).map((j) => ({
    id: `muse-${j.id}`,
    title: j.name || "Role",
    company: j.company?.name || "Company",
    location: j.locations?.map((l) => l.name).filter(Boolean).join(" · ") || "India",
    type: [prettyType(j.levels?.[0]?.name || level), workMode(j.locations?.map((l) => l.name).join(" ") || "", j.contents || "")].join(" · "),
    posted: timeAgo(j.publication_date),
    postedAt: j.publication_date || "",
    description: clip(stripHtml(decodeEntities(j.contents || ""))),
    url: j.refs?.landing_page || `https://www.themuse.com/jobs/${j.id}`,
    source: "The Muse",
    salary: "",
    matchPercent: 0,
    matchedSkills: [],
  }));
}

async function fetchJobicyIndia(search: string): Promise<LiveJob[]> {
  const params = new URLSearchParams({ count: "20", geo: "india" });
  if (search) params.set("tag", search.split(" ")[0] || "software");
  const data = (await fetchJson(`https://jobicy.com/api/v2/remote-jobs?${params.toString()}`)) as {
    jobs?: {
      id: number;
      url?: string;
      jobTitle?: string;
      companyName?: string;
      jobGeo?: string;
      jobType?: string;
      pubDate?: string;
      jobExcerpt?: string;
      jobDescription?: string;
    }[];
  };
  return (data.jobs || []).map((j) => ({
    id: `jobicy-${j.id}`,
    title: j.jobTitle || "Role",
    company: j.companyName || "Company",
    location: j.jobGeo || "India / Remote",
    type: [prettyType(j.jobType || "full_time"), workMode(j.jobGeo || "India / Remote", j.jobDescription || "")].join(" · "),
    posted: timeAgo(j.pubDate),
    postedAt: j.pubDate || "",
    description: clip(stripHtml(decodeEntities(j.jobExcerpt || j.jobDescription || ""))),
    url: j.url || "",
    source: "Jobicy",
    salary: "",
    matchPercent: 0,
    matchedSkills: [],
  }));
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/json", "User-Agent": "ResumeAnalysis/1.0" },
  });
  if (!res.ok) throw new Error(`Job source failed (${res.status})`);
  return res.json();
}

function decodeEntities(html: string) {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripHtml(html: string) {
  return decodeEntities(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function clip(text: string, n = 280) {
  return text.length > n ? `${text.slice(0, n).replace(/\s+\S*$/, "")}…` : text;
}

function prettyType(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso?: string) {
  if (!iso) return "Recently";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "Recently";
  const d = Math.floor(ms / 86400000);
  if (d < 1) return "Today";
  if (d === 1) return "1d ago";
  if (d < 14) return `${d}d ago`;
  if (d < 60) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
