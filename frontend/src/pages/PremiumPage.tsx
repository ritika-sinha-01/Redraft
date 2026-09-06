import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";

export function PremiumPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [features, setFeatures] = useState<{ free: string[]; premium: string[] } | null>(null);
  const [pricing, setPricing] = useState({ display: "₹999 / mo", note: "Priced in Indian rupees (converted from $12 USD)." });
  const [payments, setPayments] = useState<{ id: string; amount: number; method: string; status: string; createdAt: string }[]>([]);

  useEffect(() => {
    api<{
      user: typeof user;
      features: { free: string[]; premium: string[] };
      pricing?: { display: string; note: string };
    }>("/api/billing/status").then((d) => {
      if (d.user) setUser(d.user);
      setFeatures(d.features);
      if (d.pricing) setPricing(d.pricing);
    }).catch(() => undefined);
    api<{ payments: typeof payments }>("/api/billing/payments")
      .then((d) => setPayments(d.payments))
      .catch(() => undefined);
  }, [setUser]);

  return (
    <div className="page">
      <p className="chip">Membership</p>
      <h1 className="serif mt-3 text-4xl">Free craft. Premium polish.</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="serif text-3xl">Free</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(features?.free || []).map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </div>
        <div className="card p-6" style={{ background: "var(--navy)", color: "var(--on-navy)" }}>
          <h2 className="serif text-3xl">Premium · {pricing.display}</h2>
          <p className="mt-1 text-xs text-[var(--on-navy-muted)]">{pricing.note}</p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--on-navy-muted)]">
            {(features?.premium || []).map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
          {user?.isPremium ? (
            <button
              type="button"
              className="btn btn-ghost mt-6"
              style={{ color: "var(--on-navy)", borderColor: "#3a5560" }}
              onClick={async () => {
                const data = await api<{ user: NonNullable<typeof user> }>("/api/billing/cancel", { method: "POST" });
                setUser(data.user);
              }}
            >
              Cancel membership
            </button>
          ) : (
            <Link to="/checkout" className="btn btn-copper mt-6">
              Pay ₹999 / mo
            </Link>
          )}
        </div>
      </div>
      {payments.length ? (
        <div className="mt-10">
          <h2 className="serif text-2xl">Payment history</h2>
          <ul className="mt-3 space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="card flex flex-wrap justify-between gap-2 p-4 text-sm">
                <span>
                  ₹{p.amount} · {p.method} · {p.status}
                </span>
                <span className="text-[var(--muted)]">{new Date(p.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function PortfolioPage() {
  const premium = useAuthStore((s) => s.user?.isPremium);
  const [title, setTitle] = useState("My Portfolio");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [items, setItems] = useState<{ id: string; title: string; url: string; description: string }[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<{ portfolio: { title: string; data: { headline?: string; bio?: string; items?: typeof items } } }>("/api/portfolio")
      .then((d) => {
        setTitle(d.portfolio.title);
        setHeadline(d.portfolio.data.headline || "");
        setBio(d.portfolio.data.bio || "");
        setItems(d.portfolio.data.items || []);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="page">
      <p className="chip">Portfolio</p>
      <h1 className="serif mt-3 text-4xl">A page behind the resume</h1>
      {!premium ? (
        <p className="mt-4 max-w-xl text-[var(--muted)]">
          Free accounts can paste a portfolio URL in the editor. The visual builder is included with Premium.
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-emerald-800">{msg}</p> : null}
      <div className="card mt-8 max-w-2xl space-y-4 p-6">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" disabled={!premium} />
        <input className="field" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" disabled={!premium} />
        <textarea className="field min-h-24" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" disabled={!premium} />
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={!premium}
          onClick={() => setItems((i) => [...i, { id: crypto.randomUUID(), title: "", url: "", description: "" }])}
        >
          + Add project
        </button>
        {items.map((item) => (
          <div key={item.id} className="grid gap-2 md:grid-cols-3">
            <input className="field" placeholder="Title" value={item.title} onChange={(e) => setItems((list) => list.map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)))} />
            <input className="field" placeholder="URL" value={item.url} onChange={(e) => setItems((list) => list.map((x) => (x.id === item.id ? { ...x, url: e.target.value } : x)))} />
            <input className="field" placeholder="Note" value={item.description} onChange={(e) => setItems((list) => list.map((x) => (x.id === item.id ? { ...x, description: e.target.value } : x)))} />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-copper"
          disabled={!premium}
          onClick={async () => {
            await api("/api/portfolio", {
              method: "PUT",
              body: JSON.stringify({ title, data: { headline, bio, items } }),
            });
            setMsg("Portfolio saved.");
          }}
        >
          Save portfolio
        </button>
      </div>
    </div>
  );
}
