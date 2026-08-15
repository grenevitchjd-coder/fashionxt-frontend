import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";

export default function AddPoolGuest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", category: "female",
    agency_name: "", agency_address: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await api.createPoolGuest(form);
      // Straight into the existing photo-capture screen for this new guest —
      // reuses the same slot UI, no need to rebuild that logic here.
      navigate(`/photo/${result.id}`);
    } catch (err) {
      setError("Couldn't add this model — check the email isn't already in use.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Link to="/pools" style={{ fontSize: 13, color: "var(--muted)" }}>← Back to Model Pools</Link>
      <h1 style={{ fontSize: 20, margin: "8px 0 4px" }}>Add model to pools</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        For designer requests or late additions — skips audition day, marked Yes automatically.
        After saving, you'll go straight to photos, then measurements.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <span className="field-label">Full name</span>
          <input required value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
        </div>
        <div className="field">
          <span className="field-label">Email</span>
          <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="field">
          <span className="field-label">Phone</span>
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div className="field">
          <span className="field-label">Category</span>
          <select value={form.category} onChange={(e) => update("category", e.target.value)}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
          </select>
        </div>
        <div className="field">
          <span className="field-label">Agency name (if signed)</span>
          <input value={form.agency_name} onChange={(e) => update("agency_name", e.target.value)} placeholder="N/A if not signed" />
        </div>
        <div className="field">
          <span className="field-label">Agency address</span>
          <input value={form.agency_address} onChange={(e) => update("agency_address", e.target.value)} />
        </div>

        {error && <p style={{ color: "var(--no)", fontSize: 14 }}>{error}</p>}

        <button className="btn btn-brass btn-block" disabled={saving}>
          {saving ? "Adding…" : "Add & continue to photos"}
        </button>
      </form>
    </div>
  );
}