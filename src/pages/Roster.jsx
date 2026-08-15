import { useEffect, useRef, useState } from "react";
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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

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

  async function handleCsvSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.importCsv(file);
      setImportResult(result);
    } catch (err) {
      setImportResult({ error: "Import failed — check the file and try again." });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  const importSection = (
    <>
      <div className="section-header">
        <span className="field-label" style={{ marginBottom: 0 }}>Roster</span>
        <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? "Importing…" : "Import CSV"}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleCsvSelected}
      />

      {importResult && (
        <div className="card" style={{ marginBottom: 16, background: importResult.error ? "var(--no-bg)" : "var(--yes-bg)", borderColor: importResult.error ? "var(--no)" : "var(--yes)" }}>
          {importResult.error ? (
            <p style={{ color: "var(--no)", margin: 0 }}>{importResult.error}</p>
          ) : (
            <>
              <p style={{ margin: 0, fontWeight: 600, color: "var(--yes)" }}>
                Added {importResult.added}, updated {importResult.updated}, skipped {importResult.skipped} blank row{importResult.skipped === 1 ? "" : "s"}.
              </p>
              {importResult.errors?.length > 0 && (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--no)" }}>
                  {importResult.errors.length} row(s) had issues: {importResult.errors.join("; ")}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );

  if (!eventId) {
    return (
      <div className="page">
        {importSection}
        <div className="empty-state">
          <h3>No event selected</h3>
          <p>Set the event ID in the top-right corner to load a roster — or import a CSV above, no event needed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {importSection}

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