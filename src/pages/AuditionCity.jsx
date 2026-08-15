import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";

const STATIONS = [
  { path: "/checkin", label: "Check-in", accent: "var(--brass)" },
  { path: "/casting", label: "Casting Directors", accent: "var(--maybe)" },
  { path: "/photo-station", label: "Photo Station", accent: "var(--yes)" },
  { path: "/measurements", label: "Measurements", accent: "var(--navy)" },
];

// Landing here auto-sets the shared event context for this city — staff
// just pick the city, then the station, no manual event ID needed.
export default function AuditionCity({ city }) {
  const { setEventId } = useEvent();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [city]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const events = await api.getEvents();
      const matches = events.filter((e) => e.city.toLowerCase() === city.toLowerCase());
      if (matches.length === 0) {
        setError(`No ${city} event has been created yet.`);
        return;
      }
      const latest = matches.reduce((a, b) => (b.id > a.id ? b : a));
      setEvent(latest);
      setEventId(String(latest.id));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  if (error) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>{city} Auditions</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{city} Auditions</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
        {event.season_label} · Event ID {event.id} — pick a station below
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {STATIONS.map((s) => (
          <Link
            key={s.path}
            to={s.path}
            style={{
              display: "block",
              textDecoration: "none",
              background: "var(--ink)",
              color: "#fff",
              borderRadius: 12,
              padding: "28px 16px",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 15,
              borderTop: `3px solid ${s.accent}`,
            }}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}