import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { PoolBadge, AuditionTag } from "../components/Badges.jsx";
import PasswordConfirm from "../components/PasswordConfirm.jsx";

const STATUS_OPTIONS = [
  { key: "yes", label: "Yes", cls: "active-yes" },
  { key: "maybe", label: "Maybe", cls: "active-maybe" },
  { key: "no", label: "No", cls: "active-no" },
];

const POOL_OPTIONS = [
  { key: "pool_a", label: "Pool A" },
  { key: "pool_b", label: "Pool B" },
  { key: "backup", label: "Alternate" },
];

const EMPTY_CONTACT = {
  category: "female", email: "", phone: "",
  agency_name: "", agency_address: "",
  address_street: "", address_city: "", address_state: "",
};

export default function ApplicantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [hasAgency, setHasAgency] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState(() => new Set());

  function markPhotoBroken(id) {
    setBrokenPhotoIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getApplicantDetail(id);
      setApplicant(data);
      setContact({
        category: data.category || "female",
        email: data.email || "",
        phone: data.phone || "",
        agency_name: data.agency_name || "",
        agency_address: data.agency_address || "",
        address_street: data.address_street || "",
        address_city: data.address_city || "",
        address_state: data.address_state || "",
      });
      const agencyVal = (data.agency_name || "").trim().toUpperCase();
      setHasAgency(agencyVal !== "" && agencyVal !== "N/A" && agencyVal !== "NA");
    } finally {
      setLoading(false);
    }
  }

  function updateContact(key, value) {
    setContact((c) => ({ ...c, [key]: value }));
    setContactSaved(false);
  }

  async function handleContactSave(e) {
    e.preventDefault();
    setContactSaving(true);
    try {
      const payload = {
        ...contact,
        agency_name: hasAgency ? contact.agency_name : "N/A",
        agency_address: hasAgency ? contact.agency_address : "",
      };
      await api.updateContactInfo(id, payload);
      setContactSaved(true);
      await load();
    } finally {
      setContactSaving(false);
    }
  }

  async function handleStatus(status) {
    setSaving(true);
    try {
      await api.updateCastingStatus(id, { casting_status: status });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function togglePreselect() {
    setSaving(true);
    try {
      await api.updateCastingStatus(id, {
        casting_status: applicant.casting_status,
        preselect: !applicant.preselect,
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handlePool(pool) {
    setSaving(true);
    try {
      await api.setPool(id, applicant.pool === pool ? null : pool);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    await api.resetApplicant(id);
    setShowResetConfirm(false);
    await load();
  }

  if (loading) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!applicant) return <div className="page"><p>Not found.</p></div>;

  return (
    <div className="page">
      <div className="card-row" style={{ marginBottom: 20 }}>
        <AuditionTag number={applicant.audition_number} large fastTrack={applicant.preselect} />
        <div>
          <h1 style={{ fontSize: 22 }}>{applicant.full_name}</h1>
          <div className="card-meta">
            {applicant.category.replace("_", "-")} · {applicant.address_city}
            {applicant.address_state ? `, ${applicant.address_state}` : ""}
          </div>
        </div>
      </div>

      {applicant.preselect && (
        <div className="card" style={{ background: "var(--maybe-bg)", borderColor: "var(--maybe)", marginBottom: 16 }}>
          <strong style={{ color: "var(--maybe)", fontSize: 13 }}>FAST TRACK — measurements only, not judged</strong>
        </div>
      )}

      <div className="field">
        <span className="field-label">Contact & agency — confirm and correct as needed</span>
        <form onSubmit={handleContactSave} className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 3 }}>Modeling as</label>
              <select
                value={contact.category}
                onChange={(e) => updateContact("category", e.target.value)}
                style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-binary</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 3 }}>Email</label>
              <input
                value={contact.email}
                onChange={(e) => updateContact("email", e.target.value)}
                style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 3 }}>Phone</label>
              <input
                value={contact.phone}
                onChange={(e) => updateContact("phone", e.target.value)}
                style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 14 }}>
            <input type="checkbox" checked={hasAgency} onChange={(e) => setHasAgency(e.target.checked)} />
            Signed with an agency
          </label>

          {hasAgency && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 3 }}>Agency name</label>
                <input
                  value={contact.agency_name}
                  onChange={(e) => updateContact("agency_name", e.target.value)}
                  style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 3 }}>Agency address</label>
                <input
                  value={contact.agency_address}
                  onChange={(e) => updateContact("agency_address", e.target.value)}
                  style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
            </div>
          )}

          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Model's address</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <input
              placeholder="Street"
              value={contact.address_street}
              onChange={(e) => updateContact("address_street", e.target.value)}
              style={{ padding: "7px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
            />
            <input
              placeholder="City"
              value={contact.address_city}
              onChange={(e) => updateContact("address_city", e.target.value)}
              style={{ padding: "7px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
            />
            <input
              placeholder="State, Zip"
              value={contact.address_state}
              onChange={(e) => updateContact("address_state", e.target.value)}
              style={{ padding: "7px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          {contactSaved && <p style={{ color: "var(--yes)", fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>Saved.</p>}

          <button type="submit" className="btn btn-brass btn-sm" disabled={contactSaving}>
            {contactSaving ? "Saving…" : "Save contact info"}
          </button>
        </form>
      </div>

      <div className="field">
        <span className="field-label">Casting decision</span>
        <div style={{ display: "flex", gap: 8 }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`btn-status${applicant.casting_status === opt.key ? " " + opt.cls : ""}`}
              disabled={saving}
              onClick={() => handleStatus(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          className="btn btn-outline btn-sm"
          style={{ marginTop: 8 }}
          onClick={togglePreselect}
          disabled={saving}
        >
          {applicant.preselect ? "Remove Fast Track flag" : "Mark as Fast Track"}
        </button>
      </div>

      <div className="field">
        <span className="field-label">Pool</span>
        <div style={{ display: "flex", gap: 8 }}>
          {POOL_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className="btn btn-outline btn-sm"
              style={
                applicant.pool === opt.key
                  ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }
                  : undefined
              }
              disabled={saving}
              onClick={() => handlePool(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {applicant.measurement && (
        <div className="field">
          <span className="field-label">Measurements</span>
          <div className="card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 14 }}>
              <div><span style={{ color: "var(--muted)" }}>Height</span><br />{applicant.measurement.height || "—"}</div>
              <div><span style={{ color: "var(--muted)" }}>Bust/chest</span><br />{applicant.measurement.bust_chest || "—"}</div>
              <div><span style={{ color: "var(--muted)" }}>Waist</span><br />{applicant.measurement.waist_size || "—"}</div>
              <div><span style={{ color: "var(--muted)" }}>Hip</span><br />{applicant.measurement.hip_size || "—"}</div>
              <div><span style={{ color: "var(--muted)" }}>Shoe</span><br />{applicant.measurement.shoe_size || "—"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="field">
        <div className="section-header">
          <span className="field-label" style={{ marginBottom: 0 }}>Photos ({applicant.photos.filter((p) => !brokenPhotoIds.has(p.id)).length})</span>
          <Link to={`/photo/${applicant.id}`} className="btn btn-brass btn-sm">Add photo</Link>
        </div>
        {applicant.photos.filter((p) => !brokenPhotoIds.has(p.id)).length > 0 ? (
          <div className="photo-grid">
            {applicant.photos.filter((p) => !brokenPhotoIds.has(p.id)).map((p) => (
              <img key={p.id} src={p.url} alt={p.tag || "model photo"} onError={() => markPhotoBroken(p.id)} />
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>No photos yet.</p>
        )}
      </div>

      <div className="field">
        <button
          className="btn btn-outline btn-sm"
          style={{ color: "var(--no)", borderColor: "var(--no)" }}
          onClick={() => setShowResetConfirm(true)}
        >
          Remove casting information (reset for testing)
        </button>
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
          Clears check-in, casting decision, pool, measurements, and photos. Keeps name, email, agency, and address.
        </p>
      </div>

      {showResetConfirm && (
        <PasswordConfirm
          title={`Reset ${applicant.full_name}?`}
          message="This clears their check-in, casting decision, pool assignment, measurements, and photos. Their contact and agency info stay intact. This cannot be undone."
          confirmLabel="Reset this applicant"
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  );
}