import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";
import { AuditionTag } from "../components/Badges.jsx";

const QUEUE_SIZE = 30;

export default function MeasurementsQueue() {
  const { eventId } = useEvent();
  const navigate = useNavigate();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (eventId) load();
  }, [eventId]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getMeasurementsList(eventId);
      setRoster(data);
    } finally {
      setLoading(false);
    }
  }

  // Default queue: lowest audition numbers marked Yes/Maybe who don't have
  // measurements recorded yet.
  const queue = useMemo(() => {
    return roster
      .filter((a) => (a.casting_status === "yes" || a.casting_status === "maybe") && !a.has_measurement)
      .sort((x, y) => x.audition_number - y.audition_number)
      .slice(0, QUEUE_SIZE);
  }, [roster]);

  // Search reaches everyone at this event, any status — for special cases.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return roster
      .filter((a) => String(a.audition_number).startsWith(q) || a.full_name.toLowerCase().includes(q))
      .slice(0, 25);
  }, [query, roster]);

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
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="section-header">
        <h1 style={{ fontSize: 20 }}>Measurements</h1>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <input
        className="search-input"
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Audition number or name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        inputMode="numeric"
      />

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        {isSearching
          ? `${showing.length} match${showing.length === 1 ? "" : "es"}`
          : `Next ${queue.length} awaiting measurements (Yes/Maybe, lowest numbers first)`}
      </p>

      {showing.length === 0 && (
        <div className="empty-state">
          <h3>{isSearching ? "No match found" : "Nobody's waiting"}</h3>
          <p>{isSearching ? "Try a different number or name." : "Everyone marked Yes/Maybe has measurements recorded."}</p>
        </div>
      )}

      {showing.map((person) => (
        <div className="card" key={person.id} style={{ padding: "10px 14px" }}>
          <div className="card-row" style={{ gap: 12 }}>
            <AuditionTag number={person.audition_number} />
            <div className="card-main">
              <div className="card-name" style={{ fontSize: 15 }}>{person.full_name}</div>
              <div className="card-meta">
                {person.category.replace("_", "-")}
                {person.preselect ? " · preselect" : ""}
              </div>
            </div>
            {person.has_measurement && (
              <span className="status-pill status-yes" style={{ flexShrink: 0 }}>recorded</span>
            )}
            <button
              className="btn btn-brass btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => navigate(`/measurements/${person.id}`)}
            >
              {person.has_measurement ? "Edit" : "Enter measurements"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}