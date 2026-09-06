import { Link } from "react-router-dom";
import { SiteHeader } from "../components/layout/SiteHeader";
import { PreviewStage, ResumePreview } from "../components/preview/ResumePreview";
import { SAMPLE_CONTENT } from "../types/resume";
import { useAuthStore } from "../store/authStore";

const FEATURES = [
  { to: "/templates", k: "01", t: "12 live templates", d: "Classic to editorial. Pick a layout and see your words on paper instantly." },
  { to: "/resumes", k: "02", t: "Import any resume", d: "Drop a PDF, Word, or text file. We fill the fields and open the editor." },
  { to: "/editor", k: "03", t: "Split editor", d: "Edit on the left, preview on the right. Fonts, accents, and spacing stay in your control." },
  { to: "/analyzer", k: "04", t: "ATS score you can trust", d: "Pass/fail checklist, job-keyword match, and a verdict — not a vanity number." },
  { to: "/ai", k: "05", t: "AI assistant", d: "Rewrite bullets, review the resume, or export a PDF. No API key required." },
  { to: "/cover-letters", k: "06", t: "Cover letters", d: "Paste a job description, generate from your resume, style it, download PDF or Word." },
  { to: "/jobs", k: "07", t: "Live job board", d: "Openings in India — intern to senior, on-site, hybrid, and remote — ranked to your resume." },
  { to: "/community", k: "08", t: "Community review", d: "Share a draft and get notes from other job seekers." },
  { to: "/portfolio", k: "09", t: "Portfolio page", d: "A simple public page for projects when the resume is not enough." },
  { to: "/premium", k: "10", t: "Premium", d: "Extra layouts and priority styling for ₹999/mo when you want the full set." },
];

const STEPS = [
  { n: "1", t: "Drop your old resume", d: "Or start from a template. Either way you are in the editor in under a minute." },
  { n: "2", t: "Let AI tighten it", d: "Ask for a review, a stronger summary, or a finished PDF." },
  { n: "3", t: "Score it against a job", d: "Paste the posting. Fix every Fail on the ATS checklist." },
  { n: "4", t: "Apply today", d: "Write the cover letter, pick a live opening, send it." },
];

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const cta = user ? "/templates" : "/register";
  const featureHref = (to: string) => (user || to === "/premium" ? to : "/register");

  return (
    <div className="bg-[var(--cream)]">
      <SiteHeader variant="public" />

      <section className="hero-grid">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="chip mb-4">Redraft — resume, letters, jobs</p>
            <h1 className="serif text-5xl leading-[1.05] md:text-6xl">Land the interview. Then the offer.</h1>
            <p className="mt-5 max-w-md text-[var(--on-navy-muted)]">
              Build, score, and send. AI writes with you. ATS tells you the truth. Live India jobs wait when you are ready.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={cta} className="btn btn-copper">
                Start free — build now
              </Link>
              <a href="#features" className="btn btn-ghost-navy">
                See every feature
              </a>
            </div>
          </div>
          <div className="hero-preview">
            <div className="hero-doc">
              <PreviewStage maxScale={1}>
                <ResumePreview content={SAMPLE_CONTENT} slug="classic" accentColor="#ff5a3c" fontFamily="georgia" />
              </PreviewStage>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-marquee" aria-hidden>
        <div className="landing-marquee-track">
          {["Templates", "ATS score", "AI assistant", "Cover letters", "Live jobs", "PDF + Word", "Import resume", "Portfolio", "Community"].concat(
            ["Templates", "ATS score", "AI assistant", "Cover letters", "Live jobs", "PDF + Word", "Import resume", "Portfolio", "Community"]
          ).map((item, i) => (
            <span key={`${item}-${i}`}>✦ {item}</span>
          ))}
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-3xl bg-[var(--line)] px-0 py-0 md:grid-cols-4 m-6">
        {[
          ["12", "templates"],
          ["75+", "ATS target"],
          ["PDF", "& Word"],
          ["Live", "India jobs"],
        ].map(([n, l]) => (
          <div key={l} className="landing-stat bg-[var(--paper)]">
            <strong>{n}</strong>
            <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{l}</span>
          </div>
        ))}
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-10">
        <p className="chip">How it works</p>
        <h2 className="serif mt-3 text-4xl">Four moves. One sitting.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-5">
              <div className="step-num">{s.n}</div>
              <h3 className="serif mt-4 text-2xl">{s.t}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-10">
        <p className="chip">Everything inside</p>
        <h2 className="serif mt-3 text-4xl">All features, on the first visit</h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Nothing is hidden behind a second product. Open an account and every tool below is in the header.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {FEATURES.map((f) => (
            <Link key={f.t} to={featureHref(f.to === "/editor" ? "/templates" : f.to)} className="card feature-tile">
              <p className="feature-kicker">{f.k}</p>
              <h3 className="serif mt-3 text-xl">{f.t}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{f.d}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="ats" className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-12 md:grid-cols-2">
        <div>
          <p className="chip">ATS analyser</p>
          <h2 className="serif mt-3 text-4xl">Know if the resume is actually good</h2>
          <p className="mt-3 text-[var(--muted)]">
            Paste the job. Get a pass/fail checklist, keyword match, and a verdict. 75+ with 70% job match is the bar — not a lucky ring.
          </p>
          <Link to={user ? "/analyzer" : "/register"} className="btn btn-copper mt-6">
            Score a resume
          </Link>
        </div>
        <div className="card p-6">
          <div className="score-ring good mx-auto">
            <span className="serif">82</span>
            <small>/ 100</small>
          </div>
          <p className="mt-4 text-center text-sm text-[var(--muted)]">Strong — apply with this version</p>
        </div>
      </section>

      <section id="ai" className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-12 md:grid-cols-2">
        <div className="card space-y-3 p-6 order-2 md:order-1">
          <div className="chat-bubble chat-user">Make my resume and send a PDF</div>
          <div className="chat-bubble chat-ai">Polished. PDF is ready — open the editor to tweak layout.</div>
        </div>
        <div className="order-1 md:order-2">
          <p className="chip">AI assistant</p>
          <h2 className="serif mt-3 text-4xl">Ask. It writes. You download.</h2>
          <p className="mt-3 text-[var(--muted)]">
            Included assistant works without a key. Optional ChatGPT, Gemini, or Claude if you bring your own.
          </p>
          <Link to={user ? "/ai" : "/register"} className="btn btn-ink mt-6">
            Open the assistant
          </Link>
        </div>
      </section>

      <section id="jobs" className="mx-auto max-w-6xl px-6 py-12">
        <p className="chip">Jobs + letters</p>
        <h2 className="serif mt-3 text-4xl">See a role. Write the letter. Apply.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link to={user ? "/jobs" : "/register"} className="card feature-tile">
            <p className="feature-kicker">Live openings</p>
            <h3 className="serif mt-3 text-2xl">Roles matched to your resume</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Intern, experienced, senior. On-site, hybrid, remote. India-first boards.</p>
          </Link>
          <Link to={user ? "/cover-letters" : "/register"} className="card feature-tile">
            <p className="feature-kicker">Cover letters</p>
            <h3 className="serif mt-3 text-2xl">From your resume + the JD</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Edit layout and type, then download PDF or Word.</p>
          </Link>
        </div>
      </section>

      <section className="landing-cta mx-6 mb-16 rounded-[28px] px-6 py-16 text-center md:mx-auto md:max-w-6xl">
        <h2 className="serif text-4xl md:text-5xl">Your next week of applications, in one tab</h2>
        <p className="mx-auto mt-3 max-w-lg text-[var(--on-navy-muted)]">
          Free to start. Templates, AI, ATS, letters, and jobs are waiting after you create an account.
        </p>
        <Link to={cta} className="btn btn-copper mt-8">
          Build Your Resume Now
        </Link>
      </section>
    </div>
  );
}
