import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";
import { AuditionTag } from "../components/Badges.jsx";

export default function CheckIn() {
  const { eventId } = useEvent();
  const [allApplicants, setAllApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [justCheckedIn, setJustCheckedIn] = useState(null); // the person object right after check-in
  const searchRef = useRef(null);

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

  function handleAssigned(applicant, updated) {
    setAllApplicants((prev) =>
      prev.map((a) =>
        a.id === applicant.id
          ? { ...a, event_id: Number(eventId), audition_number: updated.audition_number, preselect: updated.preselect }
          : a
      )
    );
    setJustCheckedIn({ full_name: applicant.full_name, audition_number: updated.audition_number, preselect: updated.preselect });
  }

  function handleNext() {
    setJustCheckedIn(null);
    setQuery("");
    searchRef.current?.focus();
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
        {loading ? "Loading applicant list…" : `${allApplicants.length} applicants loaded — search is instant. Numbers assign automatically in check-in order.`}
      </p>

      {justCheckedIn && (
        <div className="card" style={{ marginBottom: 16, background: "var(--yes-bg)", borderColor: "var(--yes)", textAlign: "center", padding: "20px 16px" }}>
          <div style={{ fontSize: 13, color: "var(--yes)", fontWeight: 700, marginBottom: 4 }}>CHECKED IN</div>
          <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "var(--font-display)", lineHeight: 1 }}>
            #{String(justCheckedIn.audition_number).padStart(3, "0")}
          </div>
          <div style={{ fontSize: 15, marginTop: 6 }}>{justCheckedIn.full_name}</div>
          {justCheckedIn.preselect && (
            <div style={{ fontSize: 12, color: "var(--maybe)", fontWeight: 700, marginTop: 4 }}>PRESELECT — auto-marked Yes</div>
          )}
          <button className="btn btn-brass" style={{ marginTop: 14 }} onClick={handleNext}>
            Next person
          </button>
        </div>
      )}

      {!justCheckedIn && (
        <>
          <input
            ref={searchRef}
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

          {results.map((person) => (
            <CheckInRow
              key={person.id}
              person={person}
              eventId={eventId}
              onAssigned={(updated) => handleAssigned(person, updated)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function CheckInRow({ person, eventId, onAssigned }) {
  const alreadyCheckedIn = person.event_id === Number(eventId) && person.audition_number;
  const [preselect, setPreselect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckIn() {
    setSaving(true);
    setError("");
    try {
      const updated = await api.checkinApplicant(person.id, { event_id: Number(eventId), preselect });
      onAssigned(updated);
    } catch (err) {
      let msg = "Couldn't check in.";
      try {
        const match = err.message.match(/:\s*(\{.*\})$/s);
        if (match) {
          const parsed = JSON.parse(match[1]);
          if (parsed.detail) msg = parsed.detail;
        }
      } catch {}
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (alreadyCheckedIn) {
    return (
      <div className="card">
        <div className="card-row">
          <AuditionTag number={person.audition_number} />
          <div className="card-main">
            <div className="card-name">{person.full_name}</div>
            <div className="card-meta">
              Checked in{person.preselect ? " · preselect" : ""}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-row" style={{ alignItems: "flex-start" }}>
        <div className="card-main">
          <div className="card-name">{person.full_name}</div>
          <div className="card-meta">
            {person.phone || person.email} · {person.category.replace("_", "-")}
          </div>
          {error && <div style={{ color: "var(--no)", fontSize: 12, marginTop: 4 }}>{error}</div>}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, flexShrink: 0, whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={preselect} onChange={(e) => setPreselect(e.target.checked)} />
          Preselect
        </label>
        <button
          className="btn btn-brass btn-sm"
          onClick={handleCheckIn}
          disabled={saving}
          style={{ flexShrink: 0 }}
        >
          {saving ? "…" : "Check In"}
        </button>
      </div>
    </div>
  );
}