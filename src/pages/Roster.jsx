import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";
import { StatusPill, PoolBadge, AuditionTag } from "../components/Badges.jsx";

export default function Roster() {
  const { eventId } = useEvent();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadRoster() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getRoster(eventId);
      setResults(data);
    } catch (e) {
      setError("Couldn't load roster. Check the event ID and API connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return loadRoster();
    setLoading(true);
    setError("");
    try {
      const data = await api.searchApplicants(query, eventId || undefined);
      setResults(data);
    } catch (e) {
      setError("Search failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!eventId) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>No event selected</h3>
          <p>Set the event ID in the top-right corner to load a roster.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          className="search-input"
          placeholder="Search name or audition number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      {error && <p style={{ color: "var(--no)", fontSize: 14 }}>{error}</p>}
      {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>}

      {!loading && results.length === 0 && (
        <div className="empty-state">
          <h3>No models found</h3>
          <p>Try a different search, or add a guest model.</p>
        </div>
      )}

      {results.map((a) => (
        <Link key={a.id} to={`/applicant/${a.id}`} style={{ textDecoration: "none" }}>
          <div className="card">
            <div className="card-row">
              <AuditionTag number={a.audition_number} />
              <div className="card-main">
                <div className="card-name">{a.full_name}</div>
                <div className="card-meta">{a.category.replace("_", "-")}</div>
              </div>
              <StatusPill status={a.casting_status} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}