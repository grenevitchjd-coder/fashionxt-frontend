import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Designers() {
  const [showDays, setShowDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadDays();
  }, []);

  useEffect(() => {
    if (selectedDay) loadDesigners();
  }, [selectedDay]);

  async function loadDays() {
    const days = await api.getShowDays();
    setShowDays(days);
    if (days.length) setSelectedDay(days[0].id);
  }

  async function loadDesigners() {
    setLoading(true);
    try {
      const data = await api.getDesigners(selectedDay);
      setDesigners(data);
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
      await loadDesigners();
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id, name) {
    if (!confirm(`Remove ${name}? This also removes their model assignments for this day.`)) return;
    await api.removeDesigner(id);
    await loadDesigners();
  }

  async function handleMove(index, direction) {
    const newOrder = [...designers];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setDesigners(newOrder);
    await api.reorderDesigners(newOrder.map((d) => d.id));
    await loadDesigners();
  }

  async function handleRemoveAssignment(designerId, applicantId) {
    await api.removeAssignment(designerId, applicantId);
    await loadDesigners();
  }

  const dayObj = showDays.find((d) => d.id === selectedDay);

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Designers</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        Manage each show day's designer lineup — add, remove, and reorder. Assign models from the Final Roster page.
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
          expanded={expandedId === d.id}
          onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
          onMove={handleMove}
          onRemove={handleRemove}
          onRemoveAssignment={handleRemoveAssignment}
        />
      ))}
    </div>
  );
}

function DesignerRow({ designer, index, total, expanded, onToggle, onMove, onRemove, onRemoveAssignment }) {
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div className="card-row">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            style={{ border: "none", background: "none", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.3 : 1, fontSize: 14, padding: 0, lineHeight: 1 }}
          >
            ▲
          </button>
          <button
            onClick={() => onMove(index, 1)}
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
          {expanded ? "Hide models" : "View models"}
        </button>
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
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              No models assigned yet — assign from the Final Roster page.
            </p>
          ) : (
            designer.models.map((m) => (
              <div key={m.applicant_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 14 }}>
                <span>
                  {m.full_name} <span style={{ color: "var(--muted)", fontSize: 12 }}>({m.category.replace("_", "-")})</span>
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 11, padding: "3px 8px" }}
                  onClick={() => onRemoveAssignment(designer.id, m.applicant_id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}