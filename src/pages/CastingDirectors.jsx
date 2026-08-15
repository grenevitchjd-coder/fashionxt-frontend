import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";
import { AuditionTag } from "../components/Badges.jsx";

const QUEUE_SIZE = 30;

export default function CastingDirectors() {
  const { eventId } = useEvent();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (eventId) load();
  }, [eventId]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getRoster(eventId);
      setRoster(data);
    } finally {
      setLoading(false);
    }
  }

  // Default queue: lowest audition numbers still awaiting a decision,
  // preselects excluded since they're never judged.
  const queue = useMemo(() => {
    return roster
      .filter((a) => a.casting_status === "pending" && !a.preselect && a.audition_number != null)
      .sort((x, y) => x.audition_number - y.audition_number)
      .slice(0, QUEUE_SIZE);
  }, [roster]);

  // Search reaches the WHOLE roster, regardless of status — for jumping to
  // anyone specific, not just the pending queue.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return roster
      .filter(
        (a) =>
          a.full_name.toLowerCase().includes(q) ||
          (a.audition_number != null && String(a.audition_number) === q)
      )
      .slice(0, 25);
  }, [query, roster]);

  function handleDecided(applicantId, status) {
    setRoster((prev) => prev.map((a) => (a.id === applicantId ? { ...a, casting_status: status } : a)));
  }

  if (!eventId) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>No event selected</h3>
          <p>Set the event ID in the top-right corner first.</p>
        </div>
      </div>
    );
  }

  const showing = searchResults !== null ? searchResults : queue;
  const isSearching = searchResults !== null;

  return (
    <div className="page">
      <div className="section-header">
        <h1 style={{ fontSize: 20 }}>Casting Directors</h1>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh queue"}
        </button>
      </div>

      <input
        className="search-input"
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Search any name or audition number…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        {isSearching
          ? `${showing.length} match${showing.length === 1 ? "" : "es"}`
          : `Next ${queue.length} awaiting a decision (lowest numbers first)`}
      </p>

      {showing.length === 0 && (
        <div className="empty-state">
          <h3>{isSearching ? "No match found" : "Queue is empty"}</h3>
          <p>{isSearching ? "Try a different name or number." : "Everyone's been judged, or nobody's checked in yet."}</p>
        </div>
      )}

      {showing.map((person) => (
        <JudgeRow key={person.id} person={person} onDecided={handleDecided} />
      ))}
    </div>
  );
}

function JudgeRow({ person, onDecided }) {
  const [saving, setSaving] = useState(false);

  async function decide(status) {
    setSaving(true);
    try {
      await api.updateCastingStatus(person.id, { casting_status: status });
      onDecided(person.id, status);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-row" style={{ marginBottom: person.casting_status !== "pending" || person.preselect ? 8 : 0 }}>
        <AuditionTag number={person.audition_number} large />
        <div className="card-main">
          <div className="card-name">{person.full_name}</div>
          <div className="card-meta">
            {person.category.replace("_", "-")}
            {person.height_no_shoes ? ` · ${person.height_no_shoes}` : ""}
          </div>
          {person.available_show_days && (
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
              Available: {person.available_show_days}
            </div>
          )}
        </div>
      </div>

      {person.preselect && (
        <div style={{ color: "var(--maybe)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          PRESELECT — not judged
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className={`btn-status${person.casting_status === "yes" ? " active-yes" : ""}`}
          disabled={saving}
          onClick={() => decide("yes")}
        >
          Yes
        </button>
        <button
          className={`btn-status${person.casting_status === "maybe" ? " active-maybe" : ""}`}
          disabled={saving}
          onClick={() => decide("maybe")}
        >
          Maybe
        </button>
        <button
          className={`btn-status${person.casting_status === "no" ? " active-no" : ""}`}
          disabled={saving}
          onClick={() => decide("no")}
        >
          No
        </button>
      </div>
    </div>
  );
}