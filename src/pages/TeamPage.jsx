import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { dayOfApi, dayOfPrintUrls } from "../dayOfApi.js";
import DayOfNav from "../components/DayOfNav.jsx";
import { pickDefaultDay } from "../dayOf.js";

// Shared by the Hair Team and Make Up Team pages (team = "hair" | "makeup").
// One designer at a time, in walk order; each team can reorder a designer's models for its own
// view (the designer's real lineup is never changed).

const REFRESH_MS = 15000;
const FILTERS = [
  { key: "all", label: "All" },
  { key: "todo", label: "Not started" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
}

function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function Headshot({ url, name, size = 64, onClick }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: 8, flexShrink: 0, objectFit: "cover", background: "var(--line)", border: "1px solid var(--line-strong)" };
  if (!url || failed) {
    return (
      <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontWeight: 600, fontSize: size * 0.34 }}>
        {initials(name)}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      style={{ ...box, cursor: onClick ? "zoom-in" : undefined }}
      onClick={onClick}
      onError={() => setFailed(true)}
    />
  );
}

// Full-size photo view: tap anywhere (or the ✕) to close.
function PhotoViewer({ model, onClose }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10,10,14,0.88)", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, gap: 12 }}
    >
      <button
        onClick={onClose}
        aria-label="Close photo"
        style={{ position: "absolute", top: 12, right: 12, width: 44, height: 44, borderRadius: "50%", border: "none", background: "#fff", fontSize: 22, cursor: "pointer" }}
      >✕</button>
      {failed ? (
        <div style={{ width: 280, height: 350, background: "var(--line)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 700, color: "var(--muted)" }}>
          {initials(model.full_name)}
        </div>
      ) : (
        <img
          src={model.photo_url}
          alt={model.full_name}
          onError={() => setFailed(true)}
          style={{ maxWidth: "94vw", maxHeight: "74vh", objectFit: "contain", borderRadius: 10, background: "#000" }}
        />
      )}
      <div style={{ color: "#fff", textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{model.full_name}</div>
        {model.other_designers.length > 0 && (
          <div style={{ fontSize: 14, marginTop: 4, color: "#e8d3a8" }}>
            Also walking for: {model.other_designers.map((x) => `${x.order_in_day}. ${x.name} (${x.walkthrough || "TBD"})`).join("  ·  ")}
          </div>
        )}
        {model.note && <div style={{ fontSize: 14, marginTop: 4, color: "#ffd98a" }}>📝 {model.note}</div>}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-sm"
      style={active ? { background: "var(--ink)", color: "#fff" } : { background: "var(--paper)", color: "var(--muted)", border: "1.5px solid var(--line-strong)" }}
    >
      {children}
    </button>
  );
}

// A big tap target: "In progress" (amber) or "Done" (green). Tap again to undo.
function StatusButton({ active, tone, label, disabled, onClick }) {
  const colors = tone === "done"
    ? { on: "var(--yes)", text: "#fff" }
    : { on: "#e0a100", text: "#fff" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      style={{
        minWidth: 84, padding: "10px 8px", borderRadius: 10, fontSize: 13, fontWeight: 700, lineHeight: 1.1,
        border: `2.5px solid ${active ? colors.on : "var(--ink)"}`,
        background: active ? colors.on : "var(--paper)",
        color: active ? colors.text : "var(--ink)",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1,
      }}
    >
      {active && tone === "done" ? "✓ " : ""}{label}
    </button>
  );
}

export default function TeamPage({ team, title, path }) {
  const [showDays, setShowDays] = useState([]);
  const [dayId, setDayId] = useState(null);
  const [board, setBoard] = useState(null);
  const [designerId, setDesignerId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [localOrder, setLocalOrder] = useState(null); // applicant ids while dragging
  const [dragId, setDragId] = useState(null);
  const [zoomId, setZoomId] = useState(null); // applicant id whose photo is open full-size

  const dayRef = useRef(null);
  const pausedRef = useRef(false);
  const rowRefs = useRef({});
  const orderRef = useRef(null);
  const startOrderRef = useRef(null);

  useEffect(() => {
    api.getShowDays().then((days) => {
      setShowDays(days);
      setDayId(pickDefaultDay(days));
    }).catch(() => setError("Couldn't load the show days."));
  }, []);

  const load = useCallback(async (id) => {
    try {
      const data = await dayOfApi.getTeamBoard(team, id);
      if (dayRef.current !== id) return;
      setBoard(data);
      setError("");
    } catch (e) {
      setError("Couldn't refresh. Check your connection — showing the last list we got.");
    }
  }, [team]);

  useEffect(() => {
    dayRef.current = dayId;
    setBoard(null);
    setDesignerId(null);
    if (!dayId) return undefined;
    load(dayId);
    const timer = setInterval(() => { if (!pausedRef.current) load(dayId); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [dayId, load]);

  useEffect(() => { pausedRef.current = busy || dragId !== null; }, [busy, dragId]);

  const designers = board?.designers || [];
  const current = designers.find((d) => d.id === designerId) || designers[0] || null;

  async function run(action) {
    setBusy(true);
    try {
      await action();
      await load(dayId);
    } catch (e) {
      const msg = String(e.message || "");
      setError(msg.includes("409") ? "That model isn't checked in yet." : "That didn't save. Please try again.");
      await load(dayId);
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (m, status) =>
    run(() => dayOfApi.setLookStatus(team, m.applicant_id, current.id, m.status === status ? "todo" : status));
  const toggleAll = (m) => run(() => dayOfApi.setAllLooksDone(team, m.applicant_id, dayId, !m.all_done));
  const resetOrder = () => {
    if (!confirm(`Put ${current.name}'s models back in the show's order for the ${title}?`)) return;
    run(() => dayOfApi.resetTeamOrder(team, current.id));
  };

  // ---- ordering (drag grip or arrows) ----
  const reorderable = filter === "all" && !search.trim();
  const shownIds = localOrder || current?.models.map((m) => m.applicant_id) || [];
  const byId = Object.fromEntries((current?.models || []).map((m) => [m.applicant_id, m]));
  const ordered = shownIds.map((id) => byId[id]).filter(Boolean);

  const q = search.trim().toLowerCase();
  const visible = ordered
    .filter((m) => filter === "all" || m.status === filter)
    .filter((m) => !q || m.full_name.toLowerCase().includes(q));

  function startDrag(e, id) {
    if (!reorderable || busy) return;
    e.preventDefault();
    const ids = current.models.map((m) => m.applicant_id);
    startOrderRef.current = ids;
    orderRef.current = ids;
    setLocalOrder(ids);
    setDragId(id);
  }

  useEffect(() => {
    if (dragId === null) return undefined;
    function onMove(e) {
      const y = e.clientY;
      // auto-scroll near the screen edges
      if (y < 70) window.scrollBy(0, -14);
      else if (y > window.innerHeight - 70) window.scrollBy(0, 14);
      const others = orderRef.current.filter((id) => id !== dragId);
      let target = 0;
      for (const id of others) {
        const el = rowRefs.current[id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (y > r.top + r.height / 2) target += 1;
      }
      const next = [...others];
      next.splice(target, 0, dragId);
      if (next.join() !== orderRef.current.join()) {
        orderRef.current = next;
        setLocalOrder(next);
      }
    }
    async function onUp() {
      const finalOrder = orderRef.current;
      const changed = finalOrder.join() !== startOrderRef.current.join();
      setDragId(null);
      if (changed) {
        await run(() => dayOfApi.setTeamOrder(team, current.id, finalOrder));
      }
      setLocalOrder(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  async function nudge(id, delta) {
    const ids = current.models.map((m) => m.applicant_id);
    const i = ids.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await run(() => dayOfApi.setTeamOrder(team, current.id, ids));
  }

  const doneCount = current ? current.models.filter((m) => m.status === "done").length : 0;
  const progressCount = current ? current.models.filter((m) => m.status === "in_progress").length : 0;

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{title}</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        Pick a designer and work down their models. Drag a model by its ⠿ grip (or use the arrows) to change the order for your team only.
      </p>
      <DayOfNav current={path} />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {showDays.map((d) => (
          <Chip key={d.id} active={d.id === dayId} onClick={() => setDayId(d.id)}>{d.name}</Chip>
        ))}
        {dayId && (
          <a className="btn btn-outline btn-sm" style={{ textDecoration: "none", marginLeft: "auto" }} href={dayOfPrintUrls.teamSheet(team, dayId)} download>
            ⬇ Download PDF (all designers)
          </a>
        )}
      </div>

      {error && <p style={{ color: "var(--no)", fontSize: 13 }}>{error}</p>}
      {!board && !error && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {board && designers.length === 0 && (
        <div className="empty-state"><h3>No designers on this day yet</h3></div>
      )}

      {designers.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {designers.map((d) => {
            const done = d.models.filter((m) => m.status === "done").length;
            const inProgress = d.models.filter((m) => m.status === "in_progress").length;
            return (
              <Chip key={d.id} active={current?.id === d.id} onClick={() => { setDesignerId(d.id); setLocalOrder(null); }}>
                {d.order_in_day}. {d.name}{" "}
                <span style={{ opacity: 0.7 }}>· {done}/{d.models.length}{inProgress > 0 ? ` · ${inProgress} in progress` : ""}</span>
              </Chip>
            );
          })}
        </div>
      )}

      {current && (
        <>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, background: "#f6efe3", borderColor: "var(--brass)" }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--brass)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              {current.order_in_day}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{current.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {current.models.length} model{current.models.length === 1 ? "" : "s"} · {progressCount} in progress · {doneCount} done
                {" · "}Walk-through <b style={{ color: current.walkthrough ? "var(--brass-dark)" : undefined }}>{current.walkthrough || "TBD"}</b>
                {current.custom_order && " · your team's custom order"}
              </div>
            </div>
            {current.custom_order && (
              <button className="btn btn-outline btn-sm" onClick={resetOrder} disabled={busy}>Reset to show order</button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap", alignItems: "center" }}>
            {FILTERS.map((f) => (
              <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Chip>
            ))}
            <input
              className="search-input"
              placeholder="Search a model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
          </div>
          {!reorderable && (
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>Set the filter to All and clear the search to reorder.</p>
          )}

          {current.models.length === 0 && <div className="empty-state"><h3>No models assigned to {current.name} yet</h3></div>}
          {current.models.length > 0 && visible.length === 0 && <div className="empty-state"><h3>No one matches</h3></div>}

          {visible.map((m) => {
            const position = shownIds.indexOf(m.applicant_id) + 1;
            const checkedIn = !!m.checked_in_at;
            const multi = m.looks_total > 1;
            const dragging = dragId === m.applicant_id;
            return (
              <div
                key={m.applicant_id}
                ref={(el) => { rowRefs.current[m.applicant_id] = el; }}
                className="card"
                style={{
                  display: "flex", gap: 10, alignItems: "center", opacity: m.status === "done" && !dragging ? 0.5 : 1,
                  borderLeft: m.status === "in_progress" && !dragging ? "5px solid #e0a100" : undefined,
                  boxShadow: dragging ? "0 6px 18px rgba(0,0,0,0.25)" : undefined,
                  borderColor: dragging ? "var(--brass)" : undefined,
                  background: dragging ? "#fffaf0" : (m.status === "in_progress" ? "#fff7e0" : undefined),
                  position: "relative", zIndex: dragging ? 5 : 1,
                }}
              >
                {reorderable && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <button className="btn btn-outline btn-sm" style={{ padding: "0 8px", lineHeight: "18px" }} disabled={busy || position === 1} onClick={() => nudge(m.applicant_id, -1)} aria-label="Move up">▲</button>
                    <div
                      onPointerDown={(e) => startDrag(e, m.applicant_id)}
                      style={{ touchAction: "none", cursor: "grab", fontSize: 22, lineHeight: "26px", padding: "0 8px", color: "var(--muted)", userSelect: "none" }}
                      title="Drag to reorder"
                    >⠿</div>
                    <button className="btn btn-outline btn-sm" style={{ padding: "0 8px", lineHeight: "18px" }} disabled={busy || position === current.models.length} onClick={() => nudge(m.applicant_id, 1)} aria-label="Move down">▼</button>
                  </div>
                )}
                <span style={{ width: 22, textAlign: "right", fontWeight: 700, color: "var(--brass-dark)" }}>{position}</span>
                <Headshot url={m.photo_url} name={m.full_name} onClick={m.photo_url ? () => setZoomId(m.applicant_id) : undefined} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>{m.full_name}</div>
                  <div style={{ marginTop: 2 }}>
                    {checkedIn
                      ? <span className="status-pill status-yes">Checked in {timeLabel(m.checked_in_at)}</span>
                      : <span className="status-pill status-pending">Not arrived</span>}
                  </div>
                  {m.other_designers.length > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--brass-dark)", marginTop: 4 }}>
                      Also walking for: {m.other_designers.map((x) => `${x.order_in_day}. ${x.name} (${x.walkthrough || "TBD"})`).join("  ·  ")}
                    </div>
                  )}
                  {m.note && <div style={{ fontSize: 12, color: "var(--maybe)", marginTop: 2 }}>📝 {m.note}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                  {multi && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, textAlign: "center" }}>
                      This look
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <StatusButton
                      tone="progress" label="In progress" active={m.status === "in_progress"}
                      disabled={busy || (!checkedIn && m.status !== "in_progress")}
                      onClick={() => setStatus(m, "in_progress")}
                    />
                    <StatusButton
                      tone="done" label="Done" active={m.status === "done"}
                      disabled={busy || (!checkedIn && m.status !== "done")}
                      onClick={() => setStatus(m, "done")}
                    />
                  </div>
                  {multi && (
                    <button
                      onClick={() => toggleAll(m)}
                      disabled={busy || (!checkedIn && !m.all_done)}
                      aria-pressed={m.all_done}
                      style={{
                        padding: "7px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: `2px solid ${m.all_done ? "var(--yes)" : "var(--line-strong)"}`,
                        background: m.all_done ? "var(--yes)" : "var(--paper)", color: m.all_done ? "#fff" : "var(--ink)",
                        cursor: busy || (!checkedIn && !m.all_done) ? "not-allowed" : "pointer",
                        opacity: busy || (!checkedIn && !m.all_done) ? 0.35 : 1,
                      }}
                    >
                      {m.all_done ? "✓ " : ""}All looks done
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {zoomId !== null && byId[zoomId] && <PhotoViewer model={byId[zoomId]} onClose={() => setZoomId(null)} />}
    </div>
  );
}