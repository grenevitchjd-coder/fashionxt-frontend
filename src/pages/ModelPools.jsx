import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { AuditionTag } from "../components/Badges.jsx";

const CATEGORY_TABS = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "non_binary", label: "Non-binary" },
];

const POOL_OPTIONS = [
  { key: "pool_a", label: "A" },
  { key: "pool_b", label: "B" },
  { key: "backup", label: "Alternate" },
];

// Parses "28", "28.5", "28 1/2\"", "30\"" etc into a plain number.
function parseLeadingNumber(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  if (!s) return null;
  const mixed = s.match(/^(\d+)\s*[-\s]\s*(\d+)\/(\d+)/);
  if (mixed) return parseFloat(mixed[1]) + parseFloat(mixed[2]) / parseFloat(mixed[3]);
  const fracOnly = s.match(/^(\d+)\/(\d+)/);
  if (fracOnly) return parseFloat(fracOnly[1]) / parseFloat(fracOnly[2]);
  const plain = s.match(/(\d+(?:\.\d+)?)/);
  if (plain) return parseFloat(plain[1]);
  return null;
}

// Parses "5'9\"", "5' 10\"", "5 ft 9 in", "6'" etc into total inches,
// regardless of spacing around the feet/inches marks.
function parseHeightToInches(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  if (!s) return null;
  let m = s.match(/(\d+)\s*['’]\s*(\d+(?:\.\d+)?)?/);
  if (m) return parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0);
  m = s.match(/(\d+)\s*ft\.?\s*(\d+(?:\.\d+)?)?\s*(?:in)?/i);
  if (m) return parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0);
  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return parseFloat(plain[1]);
  return null;
}

function inRange(value, range, parseFn) {
  const hasMin = range.min !== "" && range.min != null;
  const hasMax = range.max !== "" && range.max != null;
  if (!hasMin && !hasMax) return true;
  if (value === null) return false;
  const minVal = hasMin ? parseFn(range.min) : -Infinity;
  const maxVal = hasMax ? parseFn(range.max) : Infinity;
  if (minVal === null && maxVal === null) return true;
  return value >= (minVal ?? -Infinity) && value <= (maxVal ?? Infinity);
}

const EMPTY_RANGE = { min: "", max: "" };

export default function ModelPools() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("female");
  const [heightRange, setHeightRange] = useState(EMPTY_RANGE);
  const [waistRange, setWaistRange] = useState(EMPTY_RANGE);
  const [dressRange, setDressRange] = useState(EMPTY_RANGE);
  const [jacketRange, setJacketRange] = useState(EMPTY_RANGE);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getPoolsList();
      setAll(data);
    } finally {
      setLoading(false);
    }
  }

  const byCategory = useMemo(() => all.filter((a) => a.category === category), [all, category]);

  const filtered = useMemo(() => {
    return byCategory.filter((a) => {
      const m = a.measurement || {};
      if (!inRange(parseHeightToInches(m.height), heightRange, parseHeightToInches)) return false;
      if (!inRange(parseLeadingNumber(m.waist_size), waistRange, parseLeadingNumber)) return false;
      if (!inRange(parseLeadingNumber(m.dress_size), dressRange, parseLeadingNumber)) return false;
      if (!inRange(parseLeadingNumber(m.jacket_size), jacketRange, parseLeadingNumber)) return false;
      return true;
    });
  }, [byCategory, heightRange, waistRange, dressRange, jacketRange]);

  function clearFilters() {
    setHeightRange(EMPTY_RANGE);
    setWaistRange(EMPTY_RANGE);
    setDressRange(EMPTY_RANGE);
    setJacketRange(EMPTY_RANGE);
  }

  function handlePoolChange(applicantId, pool) {
    setAll((prev) => prev.map((a) => (a.id === applicantId ? { ...a, pool } : a)));
  }

  const counts = useMemo(() => {
    const c = { female: 0, male: 0, non_binary: 0 };
    all.forEach((a) => { c[a.category] = (c[a.category] || 0) + 1; });
    return c;
  }, [all]);

  const showDressFilter = category === "female" || category === "non_binary";
  const showJacketFilter = category === "male" || category === "non_binary";
  const isEmptyRange = (r) => !r.min && !r.max;
  const anyFilterActive =
    !isEmptyRange(heightRange) || !isEmptyRange(waistRange) || !isEmptyRange(dressRange) || !isEmptyRange(jacketRange);

  return (
    <div className="page" style={{ maxWidth: 1300 }}>
      <div className="section-header">
        <h1 style={{ fontSize: 20 }}>Model Pools</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link to="/pools/add-guest" className="btn btn-brass btn-sm">+ Add model</Link>
        </div>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        Every Yes/Maybe/preselect model across both cities — narrow the field for designers.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setCategory(tab.key); clearFilters(); }}
            className="btn btn-sm"
            style={
              category === tab.key
                ? { background: "var(--ink)", color: "#fff" }
                : { background: "var(--paper)", color: "var(--muted)", border: "1.5px solid var(--line-strong)" }
            }
          >
            {tab.label} ({counts[tab.key] || 0})
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <RangeFilter label="Height" range={heightRange} onChange={setHeightRange} placeholderMin="5'7&quot;" placeholderMax="5'10&quot;" />
        <RangeFilter label="Waist" range={waistRange} onChange={setWaistRange} placeholderMin="28" placeholderMax="30" />
        {showDressFilter && (
          <RangeFilter label="Dress" range={dressRange} onChange={setDressRange} placeholderMin="4" placeholderMax="6" />
        )}
        {showJacketFilter && (
          <RangeFilter label="Jacket" range={jacketRange} onChange={setJacketRange} placeholderMin="40" placeholderMax="42" />
        )}
        {anyFilterActive && (
          <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <h3>Nobody here yet</h3>
          <p>No Yes/Maybe/preselect models match this category and filter combination.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {filtered.map((person) => (
          <ModelCard
            key={person.id}
            person={person}
            category={category}
            onPoolChange={handlePoolChange}
            onViewDetails={() => setDetailId(person.id)}
          />
        ))}
      </div>

      {detailId && <DetailModal applicantId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function RangeFilter({ label, range, onChange, placeholderMin, placeholderMax }) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(range.min);
  const [localMax, setLocalMax] = useState(range.max);

  function toggle() {
    if (!open) { setLocalMin(range.min); setLocalMax(range.max); }
    setOpen((o) => !o);
  }

  function apply() {
    onChange({ min: localMin, max: localMax });
    setOpen(false);
  }

  function clear() {
    setLocalMin(""); setLocalMax("");
    onChange(EMPTY_RANGE);
    setOpen(false);
  }

  const active = range.min || range.max;
  const summary = active ? `${label}: ${range.min || "…"}–${range.max || "…"}` : `${label}: All`;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={toggle}
        className="btn btn-sm"
        style={{
          fontSize: 12,
          background: active ? "var(--ink)" : "var(--paper)",
          color: active ? "#fff" : "var(--muted)",
          border: "1.5px solid var(--line-strong)",
        }}
      >
        {summary}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "110%", left: 0, background: "#fff",
            border: "1.5px solid var(--line-strong)", borderRadius: 8, padding: 10,
            zIndex: 20, width: 190, boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              placeholder={placeholderMin || "Min"}
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
              style={{ width: "50%", padding: "5px 6px", fontSize: 12, borderRadius: 5, border: "1.5px solid var(--line-strong)", boxSizing: "border-box" }}
            />
            <input
              placeholder={placeholderMax || "Max"}
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
              style={{ width: "50%", padding: "5px 6px", fontSize: 12, borderRadius: 5, border: "1.5px solid var(--line-strong)", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-outline btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={clear}>Clear</button>
            <button className="btn btn-brass btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={apply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ fontSize: 10 }}>
      <span style={{ color: "var(--muted)" }}>{label} </span>
      <span style={{ fontWeight: 700, color: "var(--ink)" }}>{value || "—"}</span>
    </div>
  );
}

function ModelCard({ person, category, onPoolChange, onViewDetails }) {
  const [saving, setSaving] = useState(false);
  const m = person.measurement || {};

  async function setPool(pool) {
    const next = person.pool === pool ? null : pool;
    setSaving(true);
    try {
      await api.setPool(person.id, next);
      onPoolChange(person.id, next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", height: 70, background: "var(--line)" }}>
        {person.photo_url ? (
          <img
            src={person.photo_url}
            alt={person.full_name}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 10 }}>
            No photo
          </div>
        )}
        <div style={{ position: "absolute", top: 4, left: 4 }}>
          <AuditionTag number={person.audition_number} />
        </div>
        {person.preselect && (
          <div style={{ position: "absolute", top: 4, right: 4, background: "var(--maybe)", color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 4px", borderRadius: 3 }}>
            PS
          </div>
        )}
      </div>

      <div style={{ padding: 8 }}>
        <div className="card-name" style={{ fontSize: 12, marginBottom: 4, lineHeight: 1.2 }}>{person.full_name}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginBottom: 6 }}>
          <Stat label="H:" value={m.height} />
          <Stat label="W:" value={m.waist_size} />
          {(category === "female" || category === "non_binary") && <Stat label="Dr:" value={m.dress_size} />}
          {(category === "male" || category === "non_binary") && <Stat label="Jk:" value={m.jacket_size} />}
        </div>

        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: person.has_agency ? "var(--yes-bg)" : "var(--line)", color: person.has_agency ? "var(--yes)" : "var(--muted)" }}>
            Agency {person.has_agency ? "Y" : "N"}
          </span>
        </div>

        <button className="btn btn-outline btn-sm" style={{ width: "100%", marginBottom: 5, fontSize: 10, padding: "4px 2px" }} onClick={onViewDetails}>
          Details
        </button>

        <div style={{ display: "flex", gap: 3 }}>
          {POOL_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPool(opt.key)}
              disabled={saving}
              style={{
                flex: 1,
                fontSize: 9,
                fontWeight: 700,
                padding: "4px 1px",
                borderRadius: 4,
                border: "1.5px solid var(--line-strong)",
                cursor: "pointer",
                background: person.pool === opt.key ? "var(--ink)" : "var(--paper)",
                color: person.pool === opt.key ? "#fff" : "var(--muted)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailModal({ applicantId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [measurement, setMeasurement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getApplicantDetail(applicantId), api.getMeasurement(applicantId)])
      .then(([d, m]) => { setDetail(d); setMeasurement(m); })
      .finally(() => setLoading(false));
  }, [applicantId]);

  const rows = measurement
    ? [
        ["Eye color", measurement.eye_color], ["Hair color", measurement.hair_color],
        ["Height", measurement.height], ["Bust/Chest", measurement.bust_chest],
        ["Hip", measurement.hip_size], ["Waist", measurement.waist_size],
        ["Arm length", measurement.arm_length], ["Inseam", measurement.inseam],
        ["Shoe size", measurement.shoe_size], ["Dress size", measurement.dress_size],
        ["Jacket size", measurement.jacket_size],
        ["Tattoos", measurement.tattoos === null ? "—" : measurement.tattoos ? "Yes" : "No"],
        ["Piercings", measurement.piercings === null ? "—" : measurement.piercings ? "Yes" : "No"],
        ["Swim OK", measurement.swim_ok === null ? "—" : measurement.swim_ok ? "Yes" : "No"],
        ["Lingerie OK", measurement.lingerie_ok === null ? "—" : measurement.lingerie_ok ? "Yes" : "No"],
        ["See-through OK", measurement.see_through_ok === null ? "—" : measurement.see_through_ok ? "Yes" : "No"],
        ["Minor", measurement.is_minor ? "Yes" : "No"],
      ]
    : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto" }}
      >
        {loading || !detail ? (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 2 }}>{detail.full_name}</h2>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  {detail.audition_number ? `#${String(detail.audition_number).padStart(3, "0")} · ` : ""}
                  {detail.category.replace("_", "-")}
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
            </div>

            {detail.photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 16 }}>
                {detail.photos.map((p) => (
                  <div key={p.id}>
                    <img
                      src={p.url}
                      alt={p.tag}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 6 }}
                    />
                    <div style={{ fontSize: 9, color: "var(--muted)", textAlign: "center", marginTop: 2 }}>{p.tag}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
              {rows.map(([label, value]) => (
                <div key={label}>
                  <span style={{ color: "var(--muted)" }}>{label}: </span>
                  <span style={{ fontWeight: 600 }}>{value || "—"}</span>
                </div>
              ))}
            </div>

            {measurement?.notes && (
              <div style={{ marginTop: 14, padding: 10, background: "var(--surface)", borderRadius: 8, fontSize: 13 }}>
                <strong>Notes:</strong> {measurement.notes}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}