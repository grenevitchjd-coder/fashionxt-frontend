import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";

export default function CheckIn() {
  const { eventId } = useEvent();
  const [allApplicants, setAllApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
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

  // Numbers already in use for THIS event — checked instantly against the
  // preloaded list, no network round-trip needed to catch a duplicate.
  const takenNumbers = useMemo(() => {
    const map = {};
    for (const a of allApplicants) {
      if (a.event_id === Number(eventId) && a.audition_number != null) {
        map[a.audition_number] = a.full_name;
      }
    }
    return map;
  }, [allApplicants, eventId]);

  function handleAssigned(applicantId, number) {
    setAllApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, event_id: Number(eventId), audition_number: number } : a))
    );
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
          takenNumbers={takenNumbers}
          onAssigned={(number) => {
            handleAssigned(person.id, number);
            setQuery("");
            searchRef.current?.focus();
          }}
        />
      ))}
    </div>
  );
}

function CheckInRow({ person, eventId, takenNumbers, onAssigned }) {
  const alreadyCheckedIn = person.event_id === Number(eventId) && person.audition_number;
  const [number, setNumber] = useState(alreadyCheckedIn ? String(person.audition_number) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const numVal = number ? Number(number) : null;
  const conflictName =
    numVal && takenNumbers[numVal] && takenNumbers[numVal] !== person.full_name ? takenNumbers[numVal] : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!numVal) return setError("Enter a number");
    if (conflictName) return setError(`Already used by ${conflictName}`);
    setSaving(true);
    setError("");
    try {
      await api.checkinApplicant(person.id, { event_id: Number(eventId), audition_number: numVal });
      onAssigned(numVal);
    } catch (err) {
      let msg = "Couldn't assign that number.";
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

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="card-row" style={{ alignItems: "flex-start" }}>
        <div className="card-main">
          <div className="card-name">{person.full_name}</div>
          <div className="card-meta">
            {person.phone || person.email} · {person.category.replace("_", "-")}
          </div>
          {error && <div style={{ color: "var(--no)", fontSize: 12, marginTop: 4 }}>{error}</div>}
          {!error && conflictName && (
            <div style={{ color: "var(--maybe)", fontSize: 12, marginTop: 4 }}>Already used by {conflictName}</div>
          )}
        </div>
        <input
          type="number"
          value={number}
          onChange={(e) => { setNumber(e.target.value); setError(""); }}
          placeholder="#"
          style={{ width: 70, padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--line-strong)", fontSize: 15 }}
        />
        <button
          type="submit"
          className="btn btn-brass btn-sm"
          disabled={saving || !numVal || !!conflictName}
        >
          {saving ? "…" : alreadyCheckedIn ? "Update" : "Assign"}
        </button>
      </form>
    </div>
  );
}