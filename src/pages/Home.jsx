import { useState } from "react";
import { useNavigate } from "react-router-dom";

const PASSWORD = "Fash10nxt";
const UNLOCK_KEY = "fx_unlocked";

const BUTTONS = [
  { label: "Roster", path: "/roster", accent: "var(--brass)", protected: true },
  { label: "Model Pools", path: "/pools", accent: "var(--navy)", protected: true },
  { label: "Decks", path: "/decks", accent: "var(--brass)", protected: true },
  { label: "Add Guest", path: "/add", accent: "var(--navy)", protected: true },
  { label: "Portland Auditions", path: "/audition/portland", accent: "var(--yes)", protected: false },
  { label: "Seattle Auditions", path: "/audition/seattle", accent: "var(--yes)", protected: false },
];

function isUnlocked() {
  return sessionStorage.getItem(UNLOCK_KEY) === "true";
}

export default function Home() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(null); // { label, path } or null
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleClick(btn) {
    if (!btn.protected || isUnlocked()) {
      navigate(btn.path);
    } else {
      setPending(btn);
      setPassword("");
      setError("");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (password === PASSWORD) {
      sessionStorage.setItem(UNLOCK_KEY, "true");
      navigate(pending.path);
    } else {
      setError("Incorrect password");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
      <h1 style={{ color: "#fff", fontFamily: "var(--font-display)", fontSize: 26, marginBottom: 4 }}>
        FashioNXT Casting
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 40 }}>
        Select where you'd like to go
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 480 }}>
        {BUTTONS.map((btn) => (
          <button
            key={btn.path}
            onClick={() => handleClick(btn)}
            style={{
              background: "#1e1f26",
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "28px 16px",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              borderTop: `3px solid ${btn.accent}`,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {pending && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 320 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
              {pending.label}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>Enter password to continue</div>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1.5px solid var(--line-strong)",
                fontSize: 15,
                marginBottom: 8,
                boxSizing: "border-box",
              }}
            />
            {error && <div style={{ color: "var(--no)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-brass" style={{ flex: 1 }}>
                Continue
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}