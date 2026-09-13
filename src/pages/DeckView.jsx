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
          Tap any thumbnail below a photo to bring it up full-size.
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 60px" }}>
        {deck.models.length === 0 && (
          <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>No models assigned to your lineup yet.</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {deck.models.map((m) => (
            <ModelCard key={m.applicant_id} model={m} onPreference={handlePreference} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelCard({ model, onPreference }) {
  const m = model.measurement || {};
  const allPhotos = [...model.main_photos, ...model.extra_photos];
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = allPhotos[activeIndex] || null;

  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", aspectRatio: "3/4", background: "#eee" }}>
        {activePhoto ? (
          <img src={activePhoto.url} alt={model.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>
            No photo
          </div>
        )}
        {model.is_minor && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "#c0392b", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, letterSpacing: 0.3 }}>
            MINOR
          </div>
        )}
      </div>

      {allPhotos.length > 1 && (
        <div style={{ display: "flex", gap: 4, padding: "8px 12px 0", overflowX: "auto" }}>
          {allPhotos.map((p, i) => (
            <img
              key={p.tag + i}
              src={p.url}
              alt={p.tag}
              onClick={() => setActiveIndex(i)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                objectFit: "cover",
                flexShrink: 0,
                cursor: "pointer",
                border: i === activeIndex ? "2px solid #c9962b" : "2px solid transparent",
                opacity: i === activeIndex ? 1 : 0.8,
              }}
            />
          ))}
        </div>
      )}

      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{model.full_name}</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 10, textTransform: "capitalize" }}>{model.category.replace("_", "-")}</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 12.5, color: "#444", marginBottom: 12 }}>
          {m.height && <span><strong>Height</strong> {m.height}</span>}
          {m.bust_chest && <span><strong>Bust/Chest</strong> {m.bust_chest}</span>}
          {m.waist_size && <span><strong>Waist</strong> {m.waist_size}</span>}
          {m.hip_size && <span><strong>Hip</strong> {m.hip_size}</span>}
          {m.shoe_size && <span><strong>Shoe</strong> {m.shoe_size}</span>}
          {m.dress_size && <span><strong>Dress</strong> {m.dress_size}</span>}
          {m.jacket_size && <span><strong>Jacket</strong> {m.jacket_size}</span>}
        </div>

        {(m.tattoos || m.piercings) && (
          <div style={{ fontSize: 11.5, color: "#888", marginBottom: 12 }}>
            {m.tattoos && <div>Tattoos: {m.tattoos}</div>}
            {m.piercings && <div>Piercings: {m.piercings}</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
          <button
            onClick={() => onPreference(model.applicant_id, "one")}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              border: model.preference === "one" ? "2px solid #2e7d32" : "1.5px solid #ddd",
              background: model.preference === "one" ? "#2e7d32" : "#fff",
              color: model.preference === "one" ? "#fff" : "#333",
            }}
          >
            ★ Preferred 1
          </button>
          <button
            onClick={() => onPreference(model.applicant_id, "two")}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              border: model.preference === "two" ? "2px solid #c9962b" : "1.5px solid #ddd",
              background: model.preference === "two" ? "#c9962b" : "#fff",
              color: model.preference === "two" ? "#fff" : "#333",
            }}
          >
            Preferred 2
          </button>
        </div>
      </div>
    </div>
  );
}