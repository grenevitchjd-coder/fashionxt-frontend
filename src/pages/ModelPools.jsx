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

const AVAIL_DAYS = [
  { key: "thursday", label: "Th" },
  { key: "friday", label: "Fr" },
  { key: "saturday", label: "Sa" },
];

const STATUS_OPTIONS = [
  { key: "yes", label: "Yes" },
  { key: "maybe", label: "Maybe" },
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
const EMPTY_AVAIL = { thursday: false, friday: false, saturday: false };
const EMPTY_STATUS = { yes: false, maybe: false };

export default function ModelPools() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("female");
  const [heightRange, setHeightRange] = useState(EMPTY_RANGE);
  const [waistRange, setWaistRange] = useState(EMPTY_RANGE);
  const [dressRange, setDressRange] = useState(EMPTY_RANGE);
  const [jacketRange, setJacketRange] = useState(EMPTY_RANGE);
  const [availFilter, setAvailFilter] = useState(EMPTY_AVAIL);
  const [statusFilter, setStatusFilter] = useState(EMPTY_STATUS);
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
    const anyStatusSelected = statusFilter.yes || statusFilter.maybe;
    return byCategory.filter((a) => {
      const m = a.measurement || {};
      if (!inRange(parseHeightToInches(m.height), heightRange, parseHeightToInches)) return false;
      if (!inRange(parseLeadingNumber(m.waist_size), waistRange, parseLeadingNumber)) return false;
      if (!inRange(parseLeadingNumber(m.dress_size), dressRange, parseLeadingNumber)) return false;
      if (!inRange(parseLeadingNumber(m.jacket_size), jacketRange, parseLeadingNumber)) return false;
      if (availFilter.thursday && !m.avail_thursday) return false;
      if (availFilter.friday && !m.avail_friday) return false;
      if (availFilter.saturday && !m.avail_saturday) return false;
      if (anyStatusSelected) {
        const matchesStatus =
          (statusFilter.yes && a.casting_status === "yes") ||
          (statusFilter.maybe && a.casting_status === "maybe");
        if (!matchesStatus) return false;
      }
      return true;
    });
  }, [byCategory, heightRange, waistRange, dressRange, jacketRange, availFilter, statusFilter]);

  function clearFilters() {
    setHeightRange(EMPTY_RANGE);
    setWaistRange(EMPTY_RANGE);
    setDressRange(EMPTY_RANGE);
    setJacketRange(EMPTY_RANGE);
    setAvailFilter(EMPTY_AVAIL);
    setStatusFilter(EMPTY_STATUS);
  }

  function handlePoolChange(applicantId, pool) {
    setAll((prev) => prev.map((a) => (a.id === applicantId ? { ...a, pool } : a)));
  }

  function handleCategoryChange(applicantId, newCategory) {
    setAll((prev) => prev.map((a) => (a.id === applicantId ? { ...a, category: newCategory } : a)));
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
    !isEmptyRange(heightRange) || !isEmptyRange(waistRange) || !isEmptyRange(dressRange) || !isEmptyRange(jacketRange) ||
    Object.values(availFilter).some(Boolean) || Object.values(statusFilter).some(Boolean);

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
        <AvailabilityFilter availFilter={availFilter} onChange={setAvailFilter} />
        <StatusFilter statusFilter={statusFilter} onChange={setStatusFilter} />
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
            onCategoryChange={handleCategoryChange}
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

function AvailabilityFilter({ availFilter, onChange }) {
  function toggleDay(key) {
    onChange((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {AVAIL_DAYS.map((d) => (
        <button
          key={d.key}
          onClick={() => toggleDay(d.key)}
          className="btn btn-sm"
          title={`Available ${d.key[0].toUpperCase()}${d.key.slice(1)}`}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            background: availFilter[d.key] ? "var(--ink)" : "var(--paper)",
            color: availFilter[d.key] ? "#fff" : "var(--muted)",
            border: "1.5px solid var(--line-strong)",
          }}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

function StatusFilter({ statusFilter, onChange }) {
  function toggleStatus(key) {
    onChange((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {STATUS_OPTIONS.map((s) => (
        <button
          key={s.key}
          onClick={() => toggleStatus(s.key)}
          className="btn btn-sm"
          title={`Show ${s.label}`}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            background: statusFilter[s.key] ? "var(--ink)" : "var(--paper)",
            color: statusFilter[s.key] ? "#fff" : "var(--muted)",
            border: "1.5px solid var(--line-strong)",
          }}
        >
          {s.label}
        </button>
      ))}
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

function ModelCard({ person, category, onPoolChange, onCategoryChange, onViewDetails }) {
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

  async function changeCategory(newCategory) {
    if (newCategory === person.category) return;
    setSaving(true);
    try {
      await api.updateContactInfo(person.id, { category: newCategory });
      onCategoryChange(person.id, newCategory);
      alert("Success! Category changed to " + newCategory);
    } catch (err) {
      alert("Category change FAILED: " + err.message);
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

        <select
          value={person.category}
          disabled={saving}
          onChange={(e) => changeCategory(e.target.value)}
          style={{
            width: "100%", fontSize: 10, padding: "3px 4px", marginBottom: 6,
            borderRadius: 4, border: "1.5px solid var(--line-strong)", background: "var(--paper)", color: "var(--ink)",
          }}
        >
          {CATEGORY_TABS.map((tab) => (
            <option key={tab.key} value={tab.key}>{tab.label}</option>
          ))}
        </select>

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
          {AVAIL_DAYS.map((d) => {
            const isAvail = m[`avail_${d.key}`];
            return (
              <span
                key={d.key}
                style={{
                  fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                  background: isAvail ? "var(--yes-bg)" : "var(--line)",
                  color: isAvail ? "var(--yes)" : "var(--muted)",
                }}
              >
                {d.label} {isAvail ? "Y" : "N"}
              </span>
            );
          })}
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