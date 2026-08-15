import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";
import { AuditionTag } from "../components/Badges.jsx";

export default function DeckBuilder() {
  const { deckId } = useParams();
  const { eventId } = useEvent();
  const [deck, setDeck] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  async function load() {
    const data = await api.getDeck(deckId);
    setDeck(data);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return setResults([]);
    const data = await api.searchApplicants(query, eventId || undefined);
    setResults(data);
  }

  async function handleAdd(applicantId) {
    await api.addModelToDeck(deckId, applicantId);
    setResults([]);
    setQuery("");
    await load();
  }

  async function handleRemove(applicantId) {
    await api.removeModelFromDeck(deckId, applicantId);
    await load();
  }

  if (!deck) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  const inDeckIds = new Set(deck.models.map((m) => m.applicant_id));

  return (
    <div className="page">
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{deck.designer_name}</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        {deck.models.length} model{deck.models.length === 1 ? "" : "s"} in this deck
      </p>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          className="search-input"
          placeholder="Search a model to add…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-primary">Search</button>
      </form>

      {results.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {results.map((a) => (
            <div className="card" key={a.id}>
              <div className="card-row">
                <AuditionTag number={a.audition_number} />
                <div className="card-main">
                  <div className="card-name">{a.full_name}</div>
                </div>
                {inDeckIds.has(a.id) ? (
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>Already added</span>
                ) : (
                  <button className="btn btn-brass btn-sm" onClick={() => handleAdd(a.id)}>Add</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <span className="field-label">In this deck</span>
      {deck.models.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>No models added yet.</p>
      )}
      {deck.models.map((m) => (
        <div className="card" key={m.applicant_id}>
          <div className="card-row">
            <AuditionTag number={m.audition_number} />
            <div className="card-main">
              <div className="card-name">{m.name}</div>
              {m.designer_response && (
                <div className="card-meta">Designer picked: {m.designer_response}</div>
              )}
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => handleRemove(m.applicant_id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}