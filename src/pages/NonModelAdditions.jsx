import { useEffect, useState } from "react";
import { api } from "../api.js";
import DayOfNav from "../components/DayOfNav.jsx";
import { pickDefaultDay } from "../dayOf.js";

const TYPE_OPTIONS = ["Volunteer", "Designer staff", "Hair", "Make Up", "Security", "Other"];
const ALL_DAYS = "all";

export default function NonModelAdditions() {
  const [showDays, setShowDays] = useState([]);
  const [viewDay, setViewDay] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [typeChoice, setTypeChoice] = useState(TYPE_OPTIONS[0]);
  const [otherType, setOtherType] = useState("");
  const [dayChoice, setDayChoice] = useState(ALL_DAYS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getShowDays().then((days) => {
      setShowDays(days);
      setViewDay(pickDefaultDay(days));
    });
  }, []);

  useEffect(() => {
    if (viewDay) loadPeople();
  }, [viewDay]);

  async function loadPeople() {
    setLoading(true);
    setError("");
    try {
      setPeople(await api.getNonModelAttendees(viewDay));
    } catch (e) {
      setError("Couldn't load the list. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    const finalType = typeChoice === "Other" ? otherType.trim() : typeChoice;
    if (!name.trim() || !finalType) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), attendee_type: finalType };
      if (dayChoice === ALL_DAYS) payload.all_days = true;
      else payload.show_day_id = Number(dayChoice);
      await api.addNonModelAttendee(payload);
      const where = dayChoice === ALL_DAYS ? "all days" : showDays.find((d) => String(d.id) === dayChoice)?.name;
      setMessage(`Added ${name.trim()} (${finalType}) for ${where}.`);
      setName("");
      setOtherType("");
      await loadPeople();
    } catch (err) {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(person, allDays) {
    const dayName = showDays.find((d) => d.id === person.show_day_id)?.name || "this day";
    const prompt = allDays
      ? `Remove ${person.name} from ALL days?`
      : `Remove ${person.name} from ${dayName}?`;
    if (!confirm(prompt)) return;
    try {
      await api.removeNonModelAttendee(person.id, allDays);
      await loadPeople();
    } catch (err) {
      setError("Couldn't remove. Please try again.");
    }
  }

  const viewDayObj = showDays.find((d) => d.id === viewDay);
  const inputStyle = {
    padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--line-strong)",
    fontSize: 14, boxSizing: "border-box", background: "var(--paper)",
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Non-Model Check-In Additions</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        Add anyone who needs backstage access who isn't a model or a designer — volunteers, designer staff,
        hair and make-up team, security. They'll appear on the Day of Show check-in list.
      </p>
      <DayOfNav current="/day-of/non-model" />

      <form onSubmit={handleAdd} className="card" style={{ marginBottom: 20 }}>
        <span className="field-label">Add a person</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...inputStyle, flex: 2, minWidth: 180 }}
          />
          <select value={typeChoice} onChange={(e) => setTypeChoice(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }}>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={dayChoice} onChange={(e) => setDayChoice(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }}>
            {showDays.map((d) => <option key={d.id} value={String(d.id)}>{d.name} only</option>)}
            <option value={ALL_DAYS}>All days</option>
          </select>
        </div>
        {typeChoice === "Other" && (
          <input
            placeholder="Type (e.g. Photographer, Sponsor)"
            value={otherType}
            onChange={(e) => setOtherType(e.target.value)}
            style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
          />
        )}
        <button className="btn btn-brass btn-sm" disabled={saving || !name.trim() || (typeChoice === "Other" && !otherType.trim())}>
          {saving ? "Adding…" : "+ Add"}
        </button>
        {message && <p style={{ color: "var(--yes)", fontSize: 13, margin: "10px 0 0" }}>{message}</p>}
        {error && <p style={{ color: "var(--no)", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
      </form>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {showDays.map((d) => (
          <button
            key={d.id}
            onClick={() => setViewDay(d.id)}
            className="btn btn-sm"
            style={
              viewDay === d.id
                ? { background: "var(--ink)", color: "#fff" }
                : { background: "var(--paper)", color: "var(--muted)", border: "1.5px solid var(--line-strong)" }
            }
          >
            {d.name}
          </button>
        ))}
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 4 }}>
          {!loading && `${people.length} ${people.length === 1 ? "person" : "people"} on ${viewDayObj?.name || "this day"}`}
        </span>
      </div>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {!loading && people.length === 0 && (
        <div className="empty-state">
          <h3>No one added for {viewDayObj?.name}</h3>
          <p>Use the form above to add volunteers, staff or anyone else who needs backstage access.</p>
        </div>
      )}

      {people.map((p) => (
        <div key={p.id} className="card" style={{ marginBottom: 6 }}>
          <div className="card-row">
            <div className="card-main">
              <div className="card-name">{p.name}</div>
              <div className="card-meta">
                {p.attendee_type}{p.group_key ? " · added for all days" : ""}
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => handleRemove(p, false)}>
              Remove{p.group_key ? " (this day)" : ""}
            </button>
            {p.group_key && (
              <button
                className="btn btn-outline btn-sm"
                style={{ color: "var(--no)", borderColor: "var(--no)" }}
                onClick={() => handleRemove(p, true)}
              >
                Remove all days
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}