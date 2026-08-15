import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";

export default function ManualAdd() {
  const { eventId } = useEvent();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    category: "female",
    audition_number: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!eventId) return setError("Set an event ID at the top of the screen first.");
    setSaving(true);
    setError("");
    try {
      const applicant = await api.addManualApplicant({
        ...form,
        event_id: Number(eventId),
        audition_number: Number(form.audition_number),
      });
      navigate(`/applicant/${applicant.id}`);
    } catch (e) {
      setError("Couldn't add this model. Check the audition number isn't already taken for this event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Add guest model</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        For walk-ins and guest appearances who skipped the application form.
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
          <span className="field-label">Category</span>
          <select value={form.category} onChange={(e) => update("category", e.target.value)}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
          </select>
        </div>
        <div className="field">
          <span className="field-label">Audition number</span>
          <input
            required
            type="number"
            value={form.audition_number}
            onChange={(e) => update("audition_number", e.target.value)}
          />
        </div>
        <div className="field">
          <span className="field-label">Phone</span>
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>

        {error && <p style={{ color: "var(--no)", fontSize: 14 }}>{error}</p>}

        <button className="btn btn-brass btn-block" disabled={saving}>
          {saving ? "Adding…" : "Add to roster"}
        </button>
      </form>
    </div>
  );
}