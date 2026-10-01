import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { dayOfApi, dayOfPrintUrls } from "../dayOfApi.js";
import DayOfNav from "../components/DayOfNav.jsx";

const STORAGE_KEY = "fashionxt-headshot-list";
const MAX_COPIES = 20;

function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => x && Number.isInteger(x.id)) : [];
  } catch {
    return [];
  }
}

function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function Thumb({ url, name, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size * 0.8, height: size, borderRadius: 6, flexShrink: 0, objectFit: "cover", background: "var(--line)", border: "1px solid var(--line-strong)" };
  if (!url || failed) {
    return (
      <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontWeight: 600, fontSize: size * 0.3 }}>
        {initials(name)}
      </div>
    );
  }
  return <img src={url} alt="" style={box} onError={() => setFailed(true)} />;
}

export default function Headshots() {
  const [models, setModels] = useState(null);
  const [showDays, setShowDays] = useState([]);
  const [list, setList] = useState(loadSaved); // [{ id, copies }]
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    dayOfApi.getHeadshotModels().then(setModels).catch(() => setError("Couldn't load the model list. Check your connection and refresh."));
    api.getShowDays().then(setShowDays).catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* storage unavailable: fine */ }
  }, [list]);

  const byId = useMemo(() => Object.fromEntries((models || []).map((m) => [m.id, m])), [models]);
  const inList = useMemo(() => new Set(list.map((x) => x.id)), [list]);

  // keep the printed list alphabetical; drop anyone no longer on the Final Roster
  const rows = useMemo(
    () => (models ? list.filter((x) => byId[x.id]).map((x) => ({ ...x, model: byId[x.id] }))
      .sort((a, b) => a.model.full_name.toLowerCase().localeCompare(b.model.full_name.toLowerCase())) : []),
    [list, byId, models]
  );

  const q = search.trim().toLowerCase();
  const matches = q && models ? models.filter((m) => m.full_name.toLowerCase().includes(q)).slice(0, 10) : [];

  const add = (id) => { if (!inList.has(id)) setList((l) => [...l, { id, copies: 1 }]); };
  const remove = (id) => setList((l) => l.filter((x) => x.id !== id));
  const setCopies = (id, copies) =>
    setList((l) => l.map((x) => (x.id === id ? { ...x, copies: Math.max(1, Math.min(MAX_COPIES, copies || 1)) } : x)));
  function addDay(dayId) {
    if (!models) return;
    setList((l) => {
      const have = new Set(l.map((x) => x.id));
      return [...l, ...models.filter((m) => m.day_ids.includes(dayId) && !have.has(m.id)).map((m) => ({ id: m.id, copies: 1 }))];
    });
  }
  const clear = () => { if (confirm("Clear the whole print list?")) setList([]); };

  const totalPhotos = rows.reduce((n, r) => n + r.copies, 0);
  const pages = Math.ceil(totalPhotos / 6);

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Print Headshots</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        Search any model on the Final Roster, choose how many copies of each, and download one PDF of same-size headshots with large names.
      </p>
      <DayOfNav current="/day-of/headshots" />

      {error && <p style={{ color: "var(--no)", fontSize: 13 }}>{error}</p>}
      {!models && !error && <p style={{ color: "var(--muted)" }}>Loading models…</p>}

      {models && (
        <>
          <input
            className="search-input"
            placeholder="Search a model to add…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {q && matches.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>No model on the Final Roster matches “{search}”.</p>}
          {matches.map((m) => (
            <div key={m.id} className="card" style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px" }}>
              <Thumb url={m.photo_url} name={m.full_name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.category}</div>
              </div>
              {inList.has(m.id)
                ? <span style={{ fontSize: 12, color: "var(--yes)", fontWeight: 600 }}>✓ On the list</span>
                : <button className="btn btn-brass btn-sm" onClick={() => add(m.id)}>+ Add</button>}
            </div>
          ))}

          {showDays.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
              {showDays.map((d) => (
                <button key={d.id} className="btn btn-outline btn-sm" onClick={() => addDay(d.id)}>
                  + Everyone walking {d.name}
                </button>
              ))}
            </div>
          )}

          <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "#f6efe3", borderColor: "var(--brass)" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{rows.length} {rows.length === 1 ? "person" : "people"} · {totalPhotos} headshot{totalPhotos === 1 ? "" : "s"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{pages > 0 ? `${pages} page${pages === 1 ? "" : "s"}, 6 per page` : "Nothing on the list yet"}</div>
            </div>
            {rows.length > 0 && <button className="btn btn-outline btn-sm" onClick={clear}>Clear list</button>}
            {rows.length > 0 ? (
              <a className="btn btn-brass" style={{ textDecoration: "none" }} href={dayOfPrintUrls.headshots(rows)} download>
                ⬇ Download PDF
              </a>
            ) : (
              <span className="btn btn-brass" style={{ opacity: 0.4 }}>⬇ Download PDF</span>
            )}
          </div>

          {rows.map((r) => (
            <div key={r.id} className="card" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Thumb url={r.model.photo_url} name={r.model.full_name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{r.model.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.model.category}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="btn btn-outline btn-sm" style={{ width: 36, fontSize: 18 }} onClick={() => setCopies(r.id, r.copies - 1)} disabled={r.copies <= 1} aria-label="Fewer copies">−</button>
                <div style={{ minWidth: 44, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{r.copies}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>{r.copies === 1 ? "copy" : "copies"}</div>
                </div>
                <button className="btn btn-outline btn-sm" style={{ width: 36, fontSize: 18 }} onClick={() => setCopies(r.id, r.copies + 1)} disabled={r.copies >= MAX_COPIES} aria-label="More copies">+</button>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => remove(r.id)} aria-label={`Remove ${r.model.full_name}`}>✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}