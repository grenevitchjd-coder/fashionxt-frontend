import { useState } from "react";

const PASSWORD = "Fash10nxt";
const UNLOCK_KEY = "fx_unlocked";

function isUnlocked() {
  return sessionStorage.getItem(UNLOCK_KEY) === "true";
}

// Wraps a sensitive page (Roster, Model Pools, Decks, Add Guest). Shows a
// password prompt in place of the page content until unlocked for this
// browser session — protects direct/bookmarked links too, not just clicks.
export default function RequireAuth({ children }) {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (password === PASSWORD) {
      sessionStorage.setItem(UNLOCK_KEY, "true");
      setUnlocked(true);
    } else {
      setError("Incorrect password");
    }
  }

  if (unlocked) return children;

  return (
    <div className="page" style={{ maxWidth: 360 }}>
      <div className="card">
        <div className="card-name" style={{ marginBottom: 4 }}>Staff access</div>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
          Enter the password to continue.
        </p>
        <form onSubmit={handleSubmit}>
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
          {error && <p style={{ color: "var(--no)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button type="submit" className="btn btn-brass btn-block">Continue</button>
        </form>
      </div>
    </div>
  );
}