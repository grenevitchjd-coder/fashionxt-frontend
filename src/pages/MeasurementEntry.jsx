import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";

const CATEGORY_OPTIONS = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "non_binary", label: "Non-binary" },
];

const TEXT_FIELDS = [
  { key: "eye_color", label: "Eye Color" },
  { key: "hair_color", label: "Hair Color" },
  { key: "height", label: "Height" },
  { key: "bust_chest", label: "Bust / Chest" },
  { key: "hip_size", label: "Hip Size" },
  { key: "waist_size", label: "Waist Size" },
  { key: "arm_length", label: "Arm Length" },
  { key: "inseam", label: "Inseam" },
  { key: "shoe_size", label: "Shoe Size" },
  { key: "dress_size", label: "Dress Size" },
  { key: "jacket_size", label: "Jacket Size" },
];

const YES_NO_FIELDS = [
  { key: "tattoos", label: "Tattoos" },
  { key: "piercings", label: "Piercings" },
  { key: "swim_ok", label: "Swim OK" },
  { key: "lingerie_ok", label: "Lingerie OK" },
  { key: "see_through_ok", label: "See-Through OK" },
  { key: "is_minor", label: "Minor" },
];

const DAY_FIELDS = [
  { key: "avail_thursday", label: "Thursday" },
  { key: "avail_friday", label: "Friday" },
  { key: "avail_saturday", label: "Saturday" },
];

const EMPTY_FORM = {
  tattoos: null, piercings: null, eye_color: "", hair_color: "", height: "",
  bust_chest: "", hip_size: "", waist_size: "", arm_length: "", inseam: "",
  shoe_size: "", dress_size: "", jacket_size: "",
  avail_thursday: false, avail_friday: false, avail_saturday: false,
  swim_ok: null, lingerie_ok: null, see_through_ok: null, notes: "", is_minor: null,
};

export default function MeasurementEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPools = searchParams.get("from") === "pools";
  const [applicant, setApplicant] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [detail, measurement] = await Promise.all([
        api.getApplicantDetail(id),
        api.getMeasurement(id),
      ]);
      setApplicant(detail);
      if (measurement) {
        setForm({ ...EMPTY_FORM, ...measurement, notes: measurement.notes || "" });
      }
    } finally {
      setLoading(false);
    }
  }

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function changeCategory(newCategory) {
    if (!applicant || newCategory === applicant.category) return;
    setCategorySaving(true);
    try {
      await api.updateContactInfo(id, { category: newCategory });
      setApplicant((a) => ({ ...a, category: newCategory }));
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveMeasurement(id, form);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!applicant) return <div className="page"><p>Not found.</p></div>;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <Link to={fromPools ? "/pools" : "/measurements"} style={{ fontSize: 13, color: "var(--muted)" }}>
        ← Back to {fromPools ? "Model Pools" : "Measurements"}
      </Link>
      <h1 style={{ fontSize: 20, margin: "8px 0 2px" }}>{applicant.full_name}</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        {applicant.audition_number ? `#${String(applicant.audition_number).padStart(3, "0")}` : ""}
      </p>

      <span className="field-label">Auditioning as</span>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => changeCategory(opt.key)}
            disabled={categorySaving}
            className="btn btn-sm"
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 10px",
              background: applicant.category === opt.key ? "var(--ink)" : "var(--paper)",
              color: applicant.category === opt.key ? "#fff" : "var(--muted)",
              border: "1.5px solid var(--line-strong)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        <span className="field-label">Physical details</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {TEXT_FIELDS.map((f) => (
            <div key={f.key}>
              <label
                style={{
                  fontSize: 11,
                  display: "block",
                  marginBottom: 3,
                  color: form[f.key] ? "var(--muted)" : "var(--ink)",
                  fontWeight: form[f.key] ? 400 : 700,
                }}
              >
                {f.label}
              </label>
              <input
                value={form[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          ))}
        </div>

        <span className="field-label">Notes</span>
        <textarea
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--line-strong)", fontSize: 14, marginBottom: 20, boxSizing: "border-box", fontFamily: "inherit" }}
        />

        <span className="field-label">Yes / No</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {YES_NO_FIELDS.map((f) => (
            <YesNoToggle key={f.key} label={f.label} value={form[f.key]} onChange={(v) => update(f.key, v)} />
          ))}
        </div>

        <span className="field-label">Available</span>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {DAY_FIELDS.map((f) => (
            <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
              <input type="checkbox" checked={!!form[f.key]} onChange={(e) => update(f.key, e.target.checked)} />
              {f.label}
            </label>
          ))}
        </div>

        {saved && (
          <div className="card" style={{ background: "var(--yes-bg)", borderColor: "var(--yes)", marginBottom: 16 }}>
            <strong style={{ color: "var(--yes)" }}>Saved.</strong>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-brass" style={{ flex: 1 }} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(fromPools ? "/pools" : "/measurements")}>
            {fromPools ? "Done — back to Model Pools" : "Done — next model"}
          </button>
        </div>
      </form>
    </div>
  );
}

function YesNoToggle({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
      <div style={{ display: "flex", border: "1.5px solid var(--line-strong)", borderRadius: 6, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => onChange(true)}
          style={{
            padding: "5px 10px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
            background: value === true ? "var(--yes)" : "var(--paper)",
            color: value === true ? "#fff" : "var(--muted)",
          }}
        >
          Y
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          style={{
            padding: "5px 10px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
            background: value === false ? "var(--no)" : "var(--paper)",
            color: value === false ? "#fff" : "var(--muted)",
          }}
        >
          N
        </button>
      </div>
    </div>
  );
}