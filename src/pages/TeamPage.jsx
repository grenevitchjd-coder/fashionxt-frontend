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
  { key: "todo", label: "Not done" },
  { key: "done", label: "Done" },
];

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
}

function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function Headshot({ url, name, size = 64 }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: 8, flexShrink: 0, objectFit: "cover", background: "var(--line)", border: "1px solid var(--line-strong)" };
  if (!url || failed) {
    return (
      <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontWeight: 600, fontSize: size * 0.34 }}>
        {initials(name)}
      </div>
    );
  }
  return <img src={url} alt="" style={box} onError={() => setFailed(true)} />;
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

function DoneBox({ checked, disabled, label, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={checked}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none",
        padding: 4, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1, minWidth: 64,
      }}
    >
      <span style={{
        width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        border: `2.5px solid ${checked ? "var(--yes)" : "var(--ink)"}`, background: checked ? "var(--yes)" : "var(--paper)",
        color: "#fff", fontSize: 22, fontWeight: 700,
      }}>
        {checked ? "✓" : ""}
      </span>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
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

  const toggleLook = (m) => run(() => dayOfApi.setLookDone(team, m.applicant_id, current.id, !m.done));
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
    .filter((m) => filter === "all" || (filter === "done" ? m.done : !m.done))
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

  const doneCount = current ? current.models.filter((m) => m.done).length : 0;

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
            const done = d.models.filter((m) => m.done).length;
            return (
              <Chip key={d.id} active={current?.id === d.id} onClick={() => { setDesignerId(d.id); setLocalOrder(null); }}>
                {d.order_in_day}. {d.name} <span style={{ opacity: 0.7 }}>· {done}/{d.models.length}</span>
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
                {current.models.length} model{current.models.length === 1 ? "" : "s"} · {doneCount} done
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
                  display: "flex", gap: 10, alignItems: "center", opacity: m.done && !dragging ? 0.5 : 1,
                  boxShadow: dragging ? "0 6px 18px rgba(0,0,0,0.25)" : undefined,
                  borderColor: dragging ? "var(--brass)" : undefined, background: dragging ? "#fffaf0" : undefined,
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
                <Headshot url={m.photo_url} name={m.full_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>{m.full_name}</div>
                  <div style={{ marginTop: 2 }}>
                    {checkedIn
                      ? <span className="status-pill status-yes">Checked in {timeLabel(m.checked_in_at)}</span>
                      : <span className="status-pill status-pending">Not arrived</span>}
                  </div>
                  {m.other_designers.length > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--brass-dark)", marginTop: 4 }}>
                      Also walking for: {m.other_designers.map((x) => `${x.order_in_day}. ${x.name}`).join("  ·  ")}
                    </div>
                  )}
                  {m.note && <div style={{ fontSize: 12, color: "var(--maybe)", marginTop: 2 }}>📝 {m.note}</div>}
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <DoneBox
                    checked={m.done}
                    disabled={busy || (!checkedIn && !m.done)}
                    label={multi ? "This look" : "Done"}
                    onClick={() => toggleLook(m)}
                  />
                  {multi && (
                    <DoneBox
                      checked={m.all_done}
                      disabled={busy || (!checkedIn && !m.all_done)}
                      label="All looks"
                      onClick={() => toggleAll(m)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}