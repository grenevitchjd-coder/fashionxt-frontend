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
  { key: "backup", label: "Backup" },
];

function distinctValues(list, key) {
  return [...new Set(list.map((a) => a.measurement?.[key]).filter(Boolean))].sort();
}

export default function ModelPools() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("female");
  const [filterHeight, setFilterHeight] = useState("");
  const [filterWaist, setFilterWaist] = useState("");
  const [filterSize, setFilterSize] = useState("");
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

  const heightOptions = useMemo(() => distinctValues(byCategory, "height"), [byCategory]);
  const waistOptions = useMemo(() => distinctValues(byCategory, "waist_size"), [byCategory]);
  const sizeOptions = useMemo(() => {
    if (category === "male") return distinctValues(byCategory, "jacket_size");
    if (category === "female") return distinctValues(byCategory, "dress_size");
    return [...new Set([...distinctValues(byCategory, "dress_size"), ...distinctValues(byCategory, "jacket_size")])].sort();
  }, [byCategory, category]);

  const filtered = useMemo(() => {
    return byCategory.filter((a) => {
      const m = a.measurement || {};
      if (filterHeight && m.height !== filterHeight) return false;
      if (filterWaist && m.waist_size !== filterWaist) return false;
      if (filterSize && m.dress_size !== filterSize && m.jacket_size !== filterSize) return false;
      return true;
    });
  }, [byCategory, filterHeight, filterWaist, filterSize]);

  function clearFilters() {
    setFilterHeight("");
    setFilterWaist("");
    setFilterSize("");
  }

  function handlePoolChange(applicantId, pool) {
    setAll((prev) => prev.map((a) => (a.id === applicantId ? { ...a, pool } : a)));
  }

  const counts = useMemo(() => {
    const c = { female: 0, male: 0, non_binary: 0 };
    all.forEach((a) => { c[a.category] = (c[a.category] || 0) + 1; });
    return c;
  }, [all]);

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
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

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <FilterSelect label="Height" value={filterHeight} onChange={setFilterHeight} options={heightOptions} />
        <FilterSelect label="Waist" value={filterWaist} onChange={setFilterWaist} options={waistOptions} />
        <FilterSelect
          label={category === "male" ? "Jacket size" : category === "female" ? "Dress size" : "Dress/Jacket size"}
          value={filterSize}
          onChange={setFilterSize}
          options={sizeOptions}
        />
        {(filterHeight || filterWaist || filterSize) && (
          <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <h3>Nobody here yet</h3>
          <p>No Yes/Maybe/preselect models match this category and filter combination.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
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

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--line-strong)", fontSize: 13, background: "var(--paper)" }}
    >
      <option value="">{label}: All</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{label}: {opt}</option>
      ))}
    </select>
  );
}

function YesNoPill({ label, value }) {
  if (value === null || value === undefined) return null;
  return (
    <span
      style={{
        fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4,
        background: value ? "var(--yes-bg)" : "var(--line)",
        color: value ? "var(--yes)" : "var(--muted)",
      }}
    >
      {label} {value ? "Y" : "N"}
    </span>
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

  const sizeLine =
    category === "male" ? (m.jacket_size ? `Jacket ${m.jacket_size}` : "") :
    category === "female" ? (m.dress_size ? `Dress ${m.dress_size}` : "") :
    [m.dress_size && `Dress ${m.dress_size}`, m.jacket_size && `Jacket ${m.jacket_size}`].filter(Boolean).join(" · ");

  const days = [
    m.avail_thursday && "Th",
    m.avail_friday && "F",
    m.avail_saturday && "Sa",
  ].filter(Boolean).join(" ");

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", aspectRatio: "3/4", background: "var(--line)" }}>
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.full_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>
            No photo
          </div>
        )}
        <div style={{ position: "absolute", top: 6, left: 6 }}>
          <AuditionTag number={person.audition_number} />
        </div>
        {person.preselect && (
          <div style={{ position: "absolute", top: 6, right: 6, background: "var(--maybe)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 6px", borderRadius: 4 }}>
            PRESELECT
          </div>
        )}
      </div>

      <div style={{ padding: 10 }}>
        <div className="card-name" style={{ fontSize: 14, marginBottom: 4 }}>{person.full_name}</div>

        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, lineHeight: 1.5 }}>
          {m.height && <div>{m.height}{m.bust_chest ? ` · B/C ${m.bust_chest}` : ""}{m.waist_size ? ` · W ${m.waist_size}` : ""}</div>}
          {sizeLine && <div>{sizeLine}</div>}
          {days && <div>Avail: {days}</div>}
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          <YesNoPill label="Lingerie" value={m.lingerie_ok} />
          <YesNoPill label="See-thru" value={m.see_through_ok} />
          <span
            style={{
              fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4,
              background: person.has_agency ? "var(--yes-bg)" : "var(--line)",
              color: person.has_agency ? "var(--yes)" : "var(--muted)",
            }}
          >
            Agency {person.has_agency ? "Y" : "N"}
          </span>
        </div>

        <button className="btn btn-outline btn-sm" style={{ width: "100%", marginBottom: 6, fontSize: 11 }} onClick={onViewDetails}>
          View full details
        </button>

        <div style={{ display: "flex", gap: 4 }}>
          {POOL_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPool(opt.key)}
              disabled={saving}
              style={{
                flex: 1,
                fontSize: 10,
                fontWeight: 700,
                padding: "5px 2px",
                borderRadius: 5,
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
                    <img src={p.url} alt={p.tag} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 6 }} />
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