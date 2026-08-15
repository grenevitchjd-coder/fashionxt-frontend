import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";
import { AuditionTag } from "../components/Badges.jsx";

export default function CheckIn() {
  const { eventId } = useEvent();
  const [allApplicants, setAllApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [auditionNumber, setAuditionNumber] = useState("");
  const [preselect, setPreselect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justAssigned, setJustAssigned] = useState(null);

  // Loaded once when the screen opens — everything after this is instant,
  // in-memory filtering. No network round-trip per keystroke.
  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getCheckinList();
      setAllApplicants(data);
    } finally {
      setLoading(false);
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allApplicants
      .filter(
        (a) =>
          a.full_name.toLowerCase().includes(q) ||
          (a.phone && a.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")) && q.replace(/\D/g, "").length >= 3)
      )
      .slice(0, 25);
  }, [query, allApplicants]);

  function selectPerson(person) {
    setSelected(person);
    setAuditionNumber(person.event_id === Number(eventId) && person.audition_number ? String(person.audition_number) : "");
    setPreselect(false);
    setError("");
    setJustAssigned(null);
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!eventId) return setError("Set an event ID at the top of the screen first.");
    if (!auditionNumber) return setError("Enter an audition number.");
    setSaving(true);
    setError("");
    try {
      await api.checkinApplicant(selected.id, {
        event_id: Number(eventId),
        audition_number: Number(auditionNumber),
        preselect,
      });
      setJustAssigned({ name: selected.full_name, number: auditionNumber });
      // Update local cache so the list reflects it immediately without a refetch
      setAllApplicants((prev) =>
        prev.map((a) =>
          a.id === selected.id ? { ...a, event_id: Number(eventId), audition_number: Number(auditionNumber) } : a
        )
      );
      setSelected(null);
      setQuery("");
    } catch (err) {
      setError("Couldn't assign that number — it may already be taken for this event.");
    } finally {
      setSaving(false);
    }
  }

  if (!eventId) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>No event selected</h3>
          <p>Set the event ID in the top-right corner before checking models in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Check-in</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
        {loading ? "Loading applicant list…" : `${allApplicants.length} applicants loaded — search is instant`}
      </p>

      {justAssigned && (
        <div className="card" style={{ background: "var(--yes-bg)", borderColor: "var(--yes)", marginBottom: 16 }}>
          <strong style={{ color: "var(--yes)" }}>
            {justAssigned.name} assigned #{String(justAssigned.number).padStart(3, "0")}
          </strong>
        </div>
      )}

      {!selected && (
        <>
          <input
            className="search-input"
            style={{ width: "100%", marginBottom: 12 }}
            placeholder="Search name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          {query.trim() && results.length === 0 && (
            <div className="empty-state">
              <h3>No match found</h3>
              <p>They may not have applied online. <Link to="/add" style={{ color: "var(--brass)" }}>Add them as a guest</Link> instead.</p>
            </div>
          )}

          {results.map((person) => {
            const alreadyCheckedIn = person.event_id === Number(eventId) && person.audition_number;
            return (
              <div className="card" key={person.id} onClick={() => selectPerson(person)} style={{ cursor: "pointer" }}>
                <div className="card-row">
                  <div className="card-main">
                    <div className="card-name">{person.full_name}</div>
                    <div className="card-meta">
                      {person.phone || person.email} · {person.category.replace("_", "-")}
                    </div>
                  </div>
                  {alreadyCheckedIn ? (
                    <AuditionTag number={person.audition_number} />
                  ) : (
                    <span className="status-pill status-pending">Not checked in</span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {selected && (
        <form onSubmit={handleAssign}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-name">{selected.full_name}</div>
            <div className="card-meta">{selected.phone || selected.email} · {selected.category.replace("_", "-")}</div>
          </div>

          <div className="field">
            <span className="field-label">Audition number</span>
            <input
              type="number"
              autoFocus
              value={auditionNumber}
              onChange={(e) => setAuditionNumber(e.target.value)}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 14 }}>
            <input type="checkbox" checked={preselect} onChange={(e) => setPreselect(e.target.checked)} />
            Preselect (measurements only, not judged)
          </label>

          {error && <p style={{ color: "var(--no)", fontSize: 14 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelected(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-brass" style={{ flex: 1 }} disabled={saving}>
              {saving ? "Assigning…" : "Assign & check in"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}