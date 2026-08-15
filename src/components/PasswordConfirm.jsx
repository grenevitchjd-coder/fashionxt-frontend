import { useState } from "react";

const PASSWORD = "Fash10nxt";

// A confirmation gate for a single destructive action — same password as
// the staff area, but scoped to one button rather than a whole page.
export default function PasswordConfirm({ title, message, confirmLabel, onConfirm, onCancel }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== PASSWORD) {
      setError("Incorrect password");
      return;
    }
    setRunning(true);
    try {
      await onConfirm();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 380, width: "100%" }}>
        <div className="card-name" style={{ marginBottom: 4, color: "var(--no)" }}>{title}</div>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>{message}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoFocus
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--line-strong)", fontSize: 15, marginBottom: 8, boxSizing: "border-box" }}
          />
          {error && <p style={{ color: "var(--no)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={running}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ flex: 1, background: "var(--no)", color: "#fff" }}
              disabled={running}
            >
              {running ? "Working…" : (confirmLabel || "Confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}