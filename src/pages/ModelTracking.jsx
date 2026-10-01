import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { dayOfApi } from "../dayOfApi.js";
import DayOfNav from "../components/DayOfNav.jsx";
import { pickDefaultDay } from "../dayOf.js";

// Model Tracking — three views of the same live data:
//   Rehearsal   tick who is at each designer's walk-through (no check-in needed)
//   Live status where every model is right now, grouped by designer
//   Progress    % checked in / hair done / make up done, per designer

const REFRESH_MS = 15000;
const TABS = [
  { key: "rehearsal", label: "Rehearsal" },
  { key: "live", label: "Live status" },
  { key: "progress", label: "Progress" },
];

// Live-status groups, in the order work flows.
const STEPS = [
  { key: "not_checked_in", label: "Not checked in", color: "var(--muted)", bg: "#eeeeee" },
  { key: "waiting", label: "Checked in — waiting", color: "#3a5a9b", bg: "#e6edf9" },
  { key: "hair", label: "Hair in progress", color: "#a67600", bg: "#fff1c9" },
  { key: "makeup", label: "Make Up in progress", color: "#a0407a", bg: "#f9e3f0" },
  { key: "done", label: "All done", color: "var(--yes)", bg: "#e1f3e6" },
];

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
}

function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function Avatar({ url, name, size = 44 }) {
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

function DesignerHead({ d, right }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, background: "#f6efe3", borderColor: "var(--brass)", marginBottom: 6 }}>
      <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--brass)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
        {d.order_in_day}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{d.name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {d.totals.models} model{d.totals.models === 1 ? "" : "s"} · Walk-through{" "}
          <b style={{ color: d.walkthrough ? "var(--brass-dark)" : undefined }}>{d.walkthrough || "TBD"}</b>
        </div>
      </div>
      {right}
    </div>
  );
}

function StatePill({ label, state }) {
  const map = {
    todo: { bg: "#eeeeee", fg: "var(--muted)", text: "—" },
    in_progress: { bg: "#fff1c9", fg: "#a67600", text: "In progress" },
    done: { bg: "#e1f3e6", fg: "var(--yes)", text: "Done" },
  };
  const s = map[state] || map.todo;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.fg, whiteSpace: "nowrap" }}>
      {label}: {s.text}
    </span>
  );
}

// ---------------------------------------------------------------- Rehearsal
function RehearsalView({ designers, busy, onToggle }) {
  const [designerId, setDesignerId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const current = designers.find((d) => d.id === designerId) || designers[0] || null;
  if (!current) return <div className="empty-state"><h3>No designers on this day yet</h3></div>;

  const q = search.trim().toLowerCase();
  const rows = current.models
    .filter((m) => filter === "all" || (filter === "here" ? m.rehearsal : !m.rehearsal))
    .filter((m) => !q || m.full_name.toLowerCase().includes(q));

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {designers.map((d) => (
          <Chip key={d.id} active={current.id === d.id} onClick={() => setDesignerId(d.id)}>
            {d.order_in_day}. {d.name} <span style={{ opacity: 0.7 }}>· {d.totals.rehearsal}/{d.totals.models}</span>
          </Chip>
        ))}
      </div>

      <DesignerHead
        d={current}
        right={
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: current.totals.rehearsal === current.totals.models && current.totals.models > 0 ? "var(--yes)" : "var(--ink)" }}>
              {current.totals.rehearsal}<span style={{ color: "var(--muted)", fontWeight: 500 }}> / {current.totals.models}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>at rehearsal</div>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap", alignItems: "center" }}>
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
        <Chip active={filter === "not"} onClick={() => setFilter("not")}>Not here yet</Chip>
        <Chip active={filter === "here"} onClick={() => setFilter("here")}>Here</Chip>
        <input className="search-input" placeholder="Search a model…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
      </div>

      {current.models.length === 0 && <div className="empty-state"><h3>No models assigned to {current.name} yet</h3></div>}
      {current.models.length > 0 && rows.length === 0 && <div className="empty-state"><h3>No one matches</h3></div>}

      {rows.map((m) => (
        <div key={m.applicant_id} className="card" style={{ display: "flex", gap: 12, alignItems: "center", background: m.rehearsal ? "#f1faf3" : undefined }}>
          <Avatar url={m.photo_url} name={m.full_name} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{m.full_name}</div>
            <div style={{ marginTop: 2 }}>
              {m.checked_in_at
                ? <span className="status-pill status-yes">Checked in {timeLabel(m.checked_in_at)}</span>
                : <span className="status-pill status-pending">Not checked in</span>}
            </div>
            {m.note && <div style={{ fontSize: 12, color: "var(--maybe)", marginTop: 2 }}>📝 {m.note}</div>}
          </div>
          <button
            onClick={() => onToggle(m, current.id)}
            disabled={busy}
            aria-pressed={m.rehearsal}
            style={{
              minWidth: 120, padding: "14px 10px", borderRadius: 10, fontSize: 15, fontWeight: 700,
              border: `2.5px solid ${m.rehearsal ? "var(--yes)" : "var(--ink)"}`,
              background: m.rehearsal ? "var(--yes)" : "var(--paper)", color: m.rehearsal ? "#fff" : "var(--ink)",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {m.rehearsal ? "✓ Here" : "At rehearsal"}
          </button>
        </div>
      ))}
    </>
  );
}

// -------------------------------------------------------------- Live status
function LiveView({ designers }) {
  if (designers.length === 0) return <div className="empty-state"><h3>No designers on this day yet</h3></div>;

  // day-wide counts across every designer's models
  const counts = Object.fromEntries(STEPS.map((s) => [s.key, 0]));
  designers.forEach((d) => d.models.forEach((m) => { counts[m.step] += 1; }));

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {STEPS.map((s) => (
          <div key={s.key} style={{ flex: 1, minWidth: 120, background: s.bg, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{counts[s.key]}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: 0.3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
        Counts are per designer lineup, so a model walking for two designers counts once under each.
      </p>

      {designers.map((d) => (
        <div key={d.id} style={{ marginBottom: 18 }}>
          <DesignerHead d={d} />
          {d.models.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>No models assigned yet.</p>}
          {STEPS.map((s) => {
            const here = d.models.filter((m) => m.step === s.key);
            if (here.length === 0) return null;
            return (
              <div key={s.key} style={{ marginBottom: 8 }}>
                <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 999, padding: "2px 10px", margin: "4px 0" }}>
                  {s.label} · {here.length}
                </div>
                {here.map((m) => (
                  <div key={m.applicant_id} className="card" style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", margin: "0 0 4px", borderLeft: `5px solid ${s.color}` }}>
                    <Avatar url={m.photo_url} name={m.full_name} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{m.full_name}</div>
                      {m.note && <div style={{ fontSize: 11, color: "var(--maybe)" }}>📝 {m.note}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <StatePill label="Hair" state={m.hair} />
                      <StatePill label="Make Up" state={m.makeup} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

// ----------------------------------------------------------------- Progress
function Bar({ label, done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
        <span>{label}</span>
        <span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{pct}%</span>{" "}
          <span style={{ color: "var(--muted)", fontWeight: 500 }}>({done}/{total})</span>
        </span>
      </div>
      <div style={{ height: 14, borderRadius: 7, background: "var(--line)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function ProgressView({ designers }) {
  if (designers.length === 0) return <div className="empty-state"><h3>No designers on this day yet</h3></div>;
  const all = designers.reduce(
    (a, d) => ({
      models: a.models + d.totals.models,
      checked_in: a.checked_in + d.totals.checked_in,
      hair_done: a.hair_done + d.totals.hair_done,
      makeup_done: a.makeup_done + d.totals.makeup_done,
    }),
    { models: 0, checked_in: 0, hair_done: 0, makeup_done: 0 },
  );
  return (
    <>
      {designers.map((d) => (
        <div key={d.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--brass)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              {d.order_in_day}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {d.totals.models} model{d.totals.models === 1 ? "" : "s"} · Walk-through {d.walkthrough || "TBD"}
              </div>
            </div>
          </div>
          <Bar label="Checked in" done={d.totals.checked_in} total={d.totals.models} color="#3a5a9b" />
          <Bar label="Hair done" done={d.totals.hair_done} total={d.totals.models} color="#d9a400" />
          <Bar label="Make Up done" done={d.totals.makeup_done} total={d.totals.models} color="#b8508f" />
        </div>
      ))}

      <div className="card" style={{ background: "#f6efe3", borderColor: "var(--brass)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>All designers combined</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Counts each designer's lineup spot, so a model in two lineups counts twice.</div>
        <Bar label="Checked in" done={all.checked_in} total={all.models} color="#3a5a9b" />
        <Bar label="Hair done" done={all.hair_done} total={all.models} color="#d9a400" />
        <Bar label="Make Up done" done={all.makeup_done} total={all.models} color="#b8508f" />
      </div>
    </>
  );
}

// --------------------------------------------------------------------- page
export default function ModelTracking() {
  const [showDays, setShowDays] = useState([]);
  const [dayId, setDayId] = useState(null);
  const [board, setBoard] = useState(null);
  const [tab, setTab] = useState("rehearsal");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dayRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    api.getShowDays().then((days) => {
      setShowDays(days);
      setDayId(pickDefaultDay(days));
    }).catch(() => setError("Couldn't load the show days."));
  }, []);

  const load = useCallback(async (id) => {
    try {
      const data = await dayOfApi.getTracking(id);
      if (dayRef.current !== id) return;
      setBoard(data);
      setError("");
    } catch (e) {
      setError("Couldn't refresh. Check your connection — showing the last data we got.");
    }
  }, []);

  useEffect(() => {
    dayRef.current = dayId;
    setBoard(null);
    if (!dayId) return undefined;
    load(dayId);
    const timer = setInterval(() => { if (!pausedRef.current) load(dayId); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [dayId, load]);

  useEffect(() => { pausedRef.current = busy; }, [busy]);

  async function toggleRehearsal(m, designerId) {
    setBusy(true);
    try {
      await dayOfApi.setRehearsal(m.applicant_id, designerId, !m.rehearsal);
      await load(dayId);
    } catch (e) {
      setError("That didn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const designers = board?.designers || [];

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Model Tracking</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        Tick models in at rehearsal, see where everyone is right now, and watch each designer's progress. Updates every few seconds.
      </p>
      <DayOfNav current="/day-of/tracking" />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {showDays.map((d) => (
          <Chip key={d.id} active={d.id === dayId} onClick={() => setDayId(d.id)}>{d.name}</Chip>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn"
            style={tab === t.key
              ? { background: "var(--brass)", color: "#fff", fontWeight: 700 }
              : { background: "var(--paper)", color: "var(--ink)", border: "1.5px solid var(--line-strong)", fontWeight: 600 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "var(--no)", fontSize: 13 }}>{error}</p>}
      {!board && !error && <p style={{ color: "var(--muted)" }}>Loading…</p>}

      {board && tab === "rehearsal" && <RehearsalView designers={designers} busy={busy} onToggle={toggleRehearsal} />}
      {board && tab === "live" && <LiveView designers={designers} />}
      {board && tab === "progress" && <ProgressView designers={designers} />}
    </div>
  );
}