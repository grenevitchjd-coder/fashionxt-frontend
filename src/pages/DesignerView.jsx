import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";

export default function DesignerView() {
  const { token } = useParams();
  const [deck, setDeck] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.viewDeckByToken(token).then(setDeck).catch(() => setError("This link is invalid or has expired."));
  }, [token]);

  async function handlePick(applicantId, value) {
    const current = deck.models.find((m) => m.applicant_id === applicantId).designer_response;
    const next = current === value ? null : value;
    await api.setDesignerResponse(token, applicantId, next);
    setDeck((d) => ({
      ...d,
      models: d.models.map((m) =>
        m.applicant_id === applicantId ? { ...m, designer_response: next } : m
      ),
    }));
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ink)", color: "#fff" }}>
        <div className="page" style={{ maxWidth: 480, paddingTop: 80, textAlign: "center" }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ink)" }}>
        <div className="page" style={{ paddingTop: 80, textAlign: "center", color: "#fff" }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <div className="page" style={{ maxWidth: 480, paddingTop: 40 }}>
        <h1 style={{ color: "#fff", fontSize: 20, marginBottom: 4 }}>Your model deck</h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 24 }}>
          Tap 1 or 2 on the models you'd like. Tap again to clear.
        </p>

        {deck.models.map((m) => (
          <div
            key={m.applicant_id}
            style={{
              background: "#1e1f26",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            {m.photos[0] && (
              <img
                src={m.photos[0]}
                alt={m.name}
                style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 8, marginBottom: 12 }}
              />
            )}
            <div style={{ color: "#fff", fontWeight: 600, fontFamily: "var(--font-display)", marginBottom: 6 }}>
              {m.name}
            </div>
            {m.measurements && (
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 12 }}>
                {m.measurements.height} · Bust/chest {m.measurements.bust_chest} · Waist {m.measurements.waist_size}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {["one", "two"].map((val) => (
                <button
                  key={val}
                  onClick={() => handlePick(m.applicant_id, val)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 8,
                    border: "1.5px solid rgba(255,255,255,0.2)",
                    background: m.designer_response === val ? "var(--brass)" : "transparent",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {val === "one" ? "1" : "2"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}