import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";

export default function Decks() {
  const { eventId } = useEvent();
  const [decks, setDecks] = useState([]);
  const [designerName, setDesignerName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (eventId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function load() {
    const data = await api.listDecks(eventId);
    setDecks(data);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!designerName.trim()) return;
    setCreating(true);
    try {
      await api.createDeck(eventId, designerName.trim());
      setDesignerName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  function copyLink(deck) {
    const fullUrl = `${window.location.origin}${deck.share_url}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopiedId(deck.id);
    setTimeout(() => setCopiedId(null), 1500);
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

  return (
    <div className="page">
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Designer decks</h1>

      <form className="search-bar" onSubmit={handleCreate}>
        <input
          className="search-input"
          placeholder="Designer name"
          value={designerName}
          onChange={(e) => setDesignerName(e.target.value)}
        />
        <button className="btn btn-brass" disabled={creating}>
          {creating ? "Creating…" : "New deck"}
        </button>
      </form>

      {decks.length === 0 && (
        <div className="empty-state">
          <h3>No decks yet</h3>
          <p>Create one per designer to start building their model list.</p>
        </div>
      )}

      {decks.map((d) => (
        <div className="card" key={d.id}>
          <div className="card-row">
            <div className="card-main">
              <div className="card-name">{d.designer_name}</div>
              <div className="card-meta">{d.model_count} model{d.model_count === 1 ? "" : "s"}</div>
            </div>
            <Link to={`/decks/${d.id}`} className="btn btn-outline btn-sm">Edit</Link>
            <button className="btn btn-primary btn-sm" onClick={() => copyLink(d)}>
              {copiedId === d.id ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}