import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { StatusPill } from "../components/Badges.jsx";
import PasswordConfirm from "../components/PasswordConfirm.jsx";

export default function Roster() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getDirectory();
      setAll(data);
    } finally {
      setLoading(false);
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.phone && a.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")) && q.replace(/\D/g, "").length >= 3)
    );
  }, [query, all]);

  async function handleCsvSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.importCsv(file);
      setImportResult(result);
      await load();
    } catch (err) {
      setImportResult({ error: "Import failed — check the file and try again." });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleReset() {
    const result = await api.resetAllApplicants();
    setResetResult(result);
    setShowResetConfirm(false);
    await load();
  }

  return (
    <div className="page">
      <div className="section-header">
        <span className="field-label" style={{ marginBottom: 0 }}>Roster — all applicants</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <button
            className="btn btn-outline btn-sm"
            style={{ color: "var(--no)", borderColor: "var(--no)" }}
            onClick={() => setShowResetConfirm(true)}
          >
            Reset for testing
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleCsvSelected}
      />

      {showResetConfirm && (
        <PasswordConfirm
          title="Reset all audition data?"
          message="This clears every check-in, casting decision, pool assignment, measurement, and photo for ALL applicants. Their names, emails, agencies, and addresses stay intact. This cannot be undone."
          confirmLabel="Reset everything"
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {resetResult && (
        <div className="card" style={{ marginBottom: 16, background: "var(--yes-bg)", borderColor: "var(--yes)" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--yes)" }}>
            Reset complete — {resetResult.reset_count} applicant{resetResult.reset_count === 1 ? "" : "s"} back to a clean state.
          </p>
        </div>
      )}

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

      <input
        className="search-input"
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Search name, email, or phone…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        {loading ? "Loading…" : `${results.length} of ${all.length} applicant${all.length === 1 ? "" : "s"}`}
      </p>

      {!loading && results.length === 0 && (
        <div className="empty-state">
          <h3>No models found</h3>
          <p>Try a different search, or import a CSV above.</p>
        </div>
      )}

      {results.slice(0, 100).map((a) => (
        <Link key={a.id} to={`/applicant/${a.id}`} style={{ textDecoration: "none" }}>
          <div className="card">
            <div className="card-row">
              <div className="card-main">
                <div className="card-name">{a.full_name}</div>
                <div className="card-meta">
                  {a.category.replace("_", "-")} · {a.email}
                  {a.has_agency && " · Agency"}
                </div>
              </div>
              <StatusPill status={a.casting_status} />
            </div>
          </div>
        </Link>
      ))}

      {results.length > 100 && (
        <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", marginTop: 8 }}>
          Showing first 100 — narrow your search to see more.
        </p>
      )}
    </div>
  );
}