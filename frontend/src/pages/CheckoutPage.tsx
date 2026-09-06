import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuthStore, type AuthUser } from "../store/authStore";

type Method = "upi" | "card" | "netbanking";

const BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "Bank of Baroda"];

export function CheckoutPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("upi");
  const [upiId, setUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [bank, setBank] = useState(BANKS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (method === "upi" && !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) {
      setError("Enter a valid UPI ID, like name@oksbi.");
      return;
    }
    if (method === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (digits.length < 12 || !/^\d{2}\/\d{2}$/.test(expiry) || cvv.length < 3 || !cardName.trim()) {
        setError("Enter name, card number, expiry (MM/YY), and CVV.");
        return;
      }
    }

    setBusy(true);
    try {
      const digits = cardNumber.replace(/\s/g, "");
      const data = await api<{ user: AuthUser; receipt: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          method,
          upiId: upiId.trim(),
          last4: digits.slice(-4),
          bank,
          name: cardName.trim(),
        }),
      });
      setUser(data.user);
      setReceipt(data.receipt);
      setTimeout(() => navigate("/resumes"), 1600);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed. Try another method.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <p className="chip">Checkout</p>
      <h1 className="serif mt-3 text-4xl text-[var(--navy)]">Pay ₹999 for Premium</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">UPI, card, or net banking. Amount is in Indian rupees.</p>

      <form onSubmit={onSubmit} className="card mt-8 grid gap-8 p-6 lg:grid-cols-[1fr_280px]" noValidate>
        <div>
          <div className="auth-tabs mb-6" role="tablist">
            {(
              [
                ["upi", "UPI"],
                ["card", "Card"],
                ["netbanking", "Net banking"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={`auth-tab ${method === id ? "active" : ""}`} onClick={() => setMethod(id)}>
                {label}
              </button>
            ))}
          </div>

          {method === "upi" ? (
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              UPI ID
              <input className="field mt-1" placeholder="name@oksbi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </label>
          ) : null}

          {method === "card" ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Name on card
                <input className="field mt-1" value={cardName} onChange={(e) => setCardName(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Card number
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="XXXX XXXX XXXX XXXX"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, "").slice(0, 19))}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Expiry
                  <input className="field mt-1" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value.slice(0, 5))} />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  CVV
                  <input className="field mt-1" inputMode="numeric" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                </label>
              </div>
              <p className="text-xs text-[var(--muted)]">Card number is used only to confirm the payment. We store the last four digits, not the full card.</p>
            </div>
          ) : null}

          {method === "netbanking" ? (
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Bank
              <select className="field mt-1" value={bank} onChange={(e) => setBank(e.target.value)}>
                {BANKS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          ) : null}

          {error ? <p className="form-error mt-4">{error}</p> : null}
          {receipt ? <p className="mt-4 text-sm text-emerald-800">{receipt}</p> : null}
        </div>

        <aside className="card-cream p-5">
          <h2 className="serif text-2xl">Order</h2>
          <p className="mt-3 flex justify-between text-sm">
            <span>Premium membership</span>
            <span>₹999</span>
          </p>
          <p className="mt-1 flex justify-between text-sm text-[var(--muted)]">
            <span>GST included</span>
            <span>₹0 extra</span>
          </p>
          <p className="mt-4 flex justify-between font-semibold">
            <span>Total</span>
            <span>₹999</span>
          </p>
          <button className="btn btn-copper mt-6 w-full" disabled={busy} type="submit">
            {busy ? (
              <>
                <span className="spinner" aria-hidden /> Paying…
              </>
            ) : (
              `Pay ₹999`
            )}
          </button>
        </aside>
      </form>
    </div>
  );
}
