import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";
import { AuditionTag } from "../components/Badges.jsx";

const QUEUE_SIZE = 30;
const REQUIRED_TAGS = ["headshot", "full_frontal", "left_side", "right_side"];

function missingRequired(tags) {
  return REQUIRED_TAGS.some((t) => !tags.includes(t));
}

export default function PhotoStation() {
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
      const data = await api.getPhotoStationList(eventId);
      setRoster(data);
    } finally {
      setLoading(false);
    }
  }

  // Default queue: lowest audition numbers who were marked Yes/Maybe by
  // Casting Directors and are still missing one of the 4 required shots.
  const queue = useMemo(() => {
    return roster
      .filter(
        (a) =>
          (a.casting_status === "yes" || a.casting_status === "maybe") &&
          missingRequired(a.tags)
      )
      .sort((x, y) => x.audition_number - y.audition_number)
      .slice(0, QUEUE_SIZE);
  }, [roster]);

  // Search reaches EVERYONE at this event, any status — for special cases
  // (preselects, re-shoots, corrections).
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return roster
      .filter(
        (a) =>
          String(a.audition_number).startsWith(q) ||
          a.full_name.toLowerCase().includes(q)
      )
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
        <h1 style={{ fontSize: 20 }}>Photo Station</h1>
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
          : `Next ${queue.length} awaiting photos (Yes/Maybe, lowest numbers first)`}
      </p>

      {showing.length === 0 && (
        <div className="empty-state">
          <h3>{isSearching ? "No match found" : "Nobody's waiting"}</h3>
          <p>{isSearching ? "Try a different number or name." : "Everyone marked Yes/Maybe has their required shots."}</p>
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
            {person.photo_count > 0 && (
              <span className="status-pill status-yes" style={{ flexShrink: 0 }}>
                {person.photo_count} photo{person.photo_count === 1 ? "" : "s"}
              </span>
            )}
            <button
              className="btn btn-brass btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => navigate(`/photo/${person.id}`)}
            >
              {person.photo_count > 0 ? "Continue" : "Take photos"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}