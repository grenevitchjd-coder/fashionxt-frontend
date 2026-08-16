import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Designers() {
  const [showDays, setShowDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [designers, setDesigners] = useState([]);
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    loadDays();
  }, []);

  useEffect(() => {
    if (selectedDay) loadAll();
  }, [selectedDay]);

  async function loadDays() {
    const days = await api.getShowDays();
    setShowDays(days);
    if (days.length) setSelectedDay(days[0].id);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([api.getDesigners(selectedDay), api.getFinalRoster(selectedDay)]);
      setDesigners(d);
      setPool(r);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.addDesigner({ show_day_id: selectedDay, name: newName.trim(), notes: newNotes.trim() || null });
      setNewName("");
      setNewNotes("");
      await loadAll();
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id, name) {
    if (!confirm(`Remove ${name}? This also removes their model assignments for this day.`)) return;
    await api.removeDesigner(id);
    await loadAll();
  }

  async function handleMoveDesigner(index, direction) {
    const newOrder = [...designers];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setDesigners(newOrder);
    await api.reorderDesigners(newOrder.map((d) => d.id));
    await loadAll();
  }

  async function handleMoveDay(designerId, showDayId) {
    await api.moveDesigner(designerId, Number(showDayId));
    await loadAll();
  }

  async function handleAddModel(designerId, applicantId) {
    await api.addAssignment(designerId, applicantId);
    await loadAll();
  }

  async function handleRemoveModel(designerId, applicantId) {
    await api.removeAssignment(designerId, applicantId);
    await loadAll();
  }

  async function handleMoveModel(designerId, models, index, direction) {
    const newOrder = [...models];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    await api.reorderAssignments(designerId, newOrder.map((m) => m.applicant_id));
    await loadAll();
  }

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const dayObj = showDays.find((d) => d.id === selectedDay);

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Designers</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        Manage each show day's designer lineup — add, remove, reorder, and build out each designer's model lineup.
        You can have multiple designers' lineups open at once to compare who's walking when.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {showDays.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDay(d.id)}
            className="btn btn-sm"
            style={
              selectedDay === d.id
                ? { background: "var(--ink)", color: "#fff" }
                : { background: "var(--paper)", color: "var(--muted)", border: "1.5px solid var(--line-strong)" }
            }
          >
            {d.name}
          </button>
        ))}
      </div>

      <form onSubmit={handleAdd} className="card" style={{ marginBottom: 20 }}>
        <span className="field-label">Add a designer to {dayObj?.name || "this day"}</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="Designer name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, minWidth: 160, padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
          />
          <input
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            style={{ flex: 1, minWidth: 160, padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--line-strong)", fontSize: 14, boxSizing: "border-box" }}
          />
          <button className="btn btn-brass btn-sm" disabled={adding || !newName.trim()}>
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
      </form>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {!loading && designers.length === 0 && (
        <div className="empty-state">
          <h3>No designers yet</h3>
          <p>Add the first one above to start building {dayObj?.name}'s lineup.</p>
        </div>
      )}

      {designers.map((d, i) => (
        <DesignerRow
          key={d.id}
          designer={d}
          index={i}
          total={designers.length}
          showDays={showDays}
          currentDayId={selectedDay}
          pool={pool}
          expanded={expandedIds.has(d.id)}
          onToggle={() => toggleExpanded(d.id)}
          onMoveDesigner={handleMoveDesigner}
          onRemove={handleRemove}
          onMoveDay={handleMoveDay}
          onAddModel={handleAddModel}
          onRemoveModel={handleRemoveModel}
          onMoveModel={handleMoveModel}
        />
      ))}
    </div>
  );
}

function DesignerRow({
  designer, index, total, showDays, currentDayId, pool,
  expanded, onToggle, onMoveDesigner, onRemove, onMoveDay,
  onAddModel, onRemoveModel, onMoveModel,
}) {
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyLink() {
    const url = `${window.location.origin}/deck/${designer.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div className="card-row">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            onClick={() => onMoveDesigner(index, -1)}
            disabled={index === 0}
            style={{ border: "none", background: "none", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.3 : 1, fontSize: 14, padding: 0, lineHeight: 1 }}
          >
            ▲
          </button>
          <button
            onClick={() => onMoveDesigner(index, 1)}
            disabled={index === total - 1}
            style={{ border: "none", background: "none", cursor: index === total - 1 ? "default" : "pointer", opacity: index === total - 1 ? 0.3 : 1, fontSize: 14, padding: 0, lineHeight: 1 }}
          >
            ▼
          </button>
        </div>

        <div
          style={{
            width: 28, height: 28, borderRadius: 14, background: "var(--ink)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}
        >
          {designer.order_in_day}
        </div>

        <div className="card-main">
          <div className="card-name">{designer.name}</div>
          <div className="card-meta">
            {designer.models.length} model{designer.models.length === 1 ? "" : "s"} assigned
            {designer.notes ? ` · ${designer.notes}` : ""}
          </div>
        </div>

        <button className="btn btn-outline btn-sm" onClick={onToggle}>
          {expanded ? "Hide lineup" : "Edit lineup"}
        </button>
        <button className="btn btn-brass btn-sm" onClick={handleCopyLink}>
          {linkCopied ? "Copied!" : "Copy deck link"}
        </button>
        <select
          value=""
          onChange={(e) => { if (e.target.value) onMoveDay(designer.id, e.target.value); }}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1.5px solid var(--line-strong)", color: "var(--muted)" }}
        >
          <option value="">Move to…</option>
          {showDays.filter((d) => d.id !== currentDayId).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button
          className="btn btn-outline btn-sm"
          style={{ color: "var(--no)", borderColor: "var(--no)" }}
          onClick={() => onRemove(designer.id, designer.name)}
        >
          Remove
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
          {designer.models.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 10px" }}>
              No models assigned yet — search below to add the first one.
            </p>
          ) : (
            <div style={{ marginBottom: 10 }}>
              {designer.models.map((m, idx) => (
                <div key={m.applicant_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 14, borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <button
                      onClick={() => onMoveModel(designer.id, designer.models, idx, -1)}
                      disabled={idx === 0}
                      style={{ border: "none", background: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.25 : 1, fontSize: 11, padding: 0, lineHeight: 1 }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onMoveModel(designer.id, designer.models, idx, 1)}
                      disabled={idx === designer.models.length - 1}
                      style={{ border: "none", background: "none", cursor: idx === designer.models.length - 1 ? "default" : "pointer", opacity: idx === designer.models.length - 1 ? 0.25 : 1, fontSize: 11, padding: 0, lineHeight: 1 }}
                    >
                      ▼
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)", width: 16 }}>{idx + 1}</span>
                  <span style={{ flex: 1 }}>
                    {m.full_name} <span style={{ color: "var(--muted)", fontSize: 12 }}>({m.category.replace("_", "-")})</span>
                    {m.preference === "one" && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--yes)" }}>★ Preferred 1</span>}
                    {m.preference === "two" && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--brass)" }}>Preferred 2</span>}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, padding: "3px 8px" }}
                    onClick={() => onRemoveModel(designer.id, m.applicant_id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <AddModelSearch
            pool={pool}
            alreadyAssignedIds={new Set(designer.models.map((m) => m.applicant_id))}
            onAdd={(applicantId) => onAddModel(designer.id, applicantId)}
          />
        </div>
      )}
    </div>
  );
}

function AddModelSearch({ pool, alreadyAssignedIds, onAdd }) {
  const [query, setQuery] = useState("");

  const results = query.trim()
    ? pool
        .filter((p) => !alreadyAssignedIds.has(p.id) && p.full_name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  return (
    <div>
      <input
        placeholder="Search a model to add to this lineup…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1.5px solid var(--line-strong)", boxSizing: "border-box" }}
      />
      {results.length > 0 && (
        <div style={{ border: "1px solid var(--line-strong)", borderRadius: 6, marginTop: 4, maxHeight: 160, overflowY: "auto" }}>
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => { onAdd(p.id); setQuery(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", fontSize: 13, border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid var(--line)" }}
            >
              {p.full_name} <span style={{ color: "var(--muted)", fontSize: 11 }}>({p.category.replace("_", "-")})</span>
            </button>
          ))}
        </div>
      )}
      {query.trim() && results.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 0" }}>No match — they may already be on this lineup, or aren't a Final Roster finalist.</p>
      )}
    </div>
  );
}