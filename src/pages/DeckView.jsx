import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";

export default function DeckView() {
  const { token } = useParams();
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const data = await api.getDesignerDeck(token);
      setDeck(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreference(applicantId, preference) {
    setDeck((prev) => ({
      ...prev,
      models: prev.models.map((m) =>
        m.applicant_id === applicantId ? { ...m, preference: m.preference === preference ? null : preference } : m
      ),
    }));
    const newValue = deck.models.find((m) => m.applicant_id === applicantId)?.preference === preference ? null : preference;
    await api.setDeckPreference(token, applicantId, newValue);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888", fontFamily: "sans-serif" }}>
        Loading your deck…
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Link not found</h2>
        <p style={{ color: "#888" }}>This deck link may be outdated. Please check with FashioNXT staff for your current link.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "sans-serif", background: "#f7f5f2", minHeight: "100vh" }}>
      <div style={{ background: "#1a1a1a", color: "#fff", padding: "24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 13, letterSpacing: 1, color: "#c9962b", fontWeight: 700, marginBottom: 4 }}>FASHIONXT WEEK</div>
        <h1 style={{ margin: 0, fontSize: 24 }}>{deck.designer_name}'s Deck</h1>
        {deck.show_day && <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>{deck.show_day}</div>}
        <p style={{ color: "#ccc", fontSize: 13, maxWidth: 480, margin: "10px auto 0" }}>
          Tap "Preferred 1" or "Preferred 2" on any model to mark your picks — you can change your mind anytime.
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 60px" }}>
        {deck.models.length === 0 && (
          <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>No models assigned to your lineup yet.</p>
        )}
        {deck.models.map((m) => (
          <ModelCard key={m.applicant_id} model={m} onPreference={handlePreference} />
        ))}
      </div>
    </div>
  );
}

function ModelCard({ model, onPreference }) {
  const m = model.measurement || {};
  return (
    <div style={{ background: "#fff", borderRadius: 12, marginBottom: 20, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{model.full_name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {model.category.replace("_", "-")}
            {model.is_minor && <span style={{ color: "#c0392b", fontWeight: 700, marginLeft: 8 }}>MINOR</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onPreference(model.applicant_id, "one")}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: model.preference === "one" ? "2px solid #2e7d32" : "1.5px solid #ccc",
              background: model.preference === "one" ? "#2e7d32" : "#fff",
              color: model.preference === "one" ? "#fff" : "#333",
            }}
          >
            ★ Preferred 1
          </button>
          <button
            onClick={() => onPreference(model.applicant_id, "two")}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: model.preference === "two" ? "2px solid #c9962b" : "1.5px solid #ccc",
              background: model.preference === "two" ? "#c9962b" : "#fff",
              color: model.preference === "two" ? "#fff" : "#333",
            }}
          >
            Preferred 2
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 10, fontSize: 13, marginBottom: 16 }}>
          <Stat label="Height" value={m.height} />
          <Stat label="Bust/Chest" value={m.bust_chest} />
          <Stat label="Waist" value={m.waist_size} />
          <Stat label="Hip" value={m.hip_size} />
          <Stat label="Shoe" value={m.shoe_size} />
          <Stat label="Dress" value={m.dress_size} />
          <Stat label="Jacket" value={m.jacket_size} />
        </div>
        {(m.tattoos || m.piercings) && (
          <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
            {m.tattoos && <div>Tattoos: {m.tattoos}</div>}
            {m.piercings && <div>Piercings: {m.piercings}</div>}
          </div>
        )}

        {model.main_photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: model.extra_photos.length > 0 ? 12 : 0 }}>
            {model.main_photos.map((p) => (
              <img key={p.tag} src={p.url} alt={p.tag} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 8 }} />
            ))}
          </div>
        )}
        {model.extra_photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
            {model.extra_photos.map((p, i) => (
              <img key={p.tag + i} src={p.url} alt={p.tag} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 6 }} />
            ))}
          </div>
        )}
        {model.main_photos.length === 0 && model.extra_photos.length === 0 && (
          <p style={{ fontSize: 12, color: "#aaa" }}>No photos yet.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ color: "#999", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}