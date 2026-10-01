import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { dayOfApi, dayOfPrintUrls } from "../dayOfApi.js";
import DayOfNav from "../components/DayOfNav.jsx";
import { pickDefaultDay } from "../dayOf.js";

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "models", label: "Models" },
  { key: "designers", label: "Designers" },
  { key: "staff", label: "Staff" },
];
const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "in", label: "Checked in" },
  { key: "out", label: "Not yet" },
];
const REFRESH_MS = 15000;

function timeLabel(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles",
  });
}

function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function Avatar({ url, name, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const box = {
    width: size, height: size, borderRadius: 8, flexShrink: 0, objectFit: "cover",
    background: "var(--line)", border: "1px solid var(--line-strong)",
  };
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
      style={
        active
          ? { background: "var(--ink)", color: "#fff" }
          : { background: "var(--paper)", color: "var(--muted)", border: "1.5px solid var(--line-strong)" }
      }
    >
      {children}
    </button>
  );
}

function Counter({ label, done, total }) {
  const complete = total > 0 && done === total;
  return (
    <div className="card" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "10px 12px", margin: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: complete ? "var(--yes)" : "var(--ink)" }}>
        {done}<span style={{ color: "var(--muted)", fontWeight: 500 }}> / {total}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function CheckedPill({ at }) {
  if (!at) return <span className="status-pill status-pending">Not yet</span>;
  return <span className="status-pill status-yes">In {timeLabel(at)}</span>;
}

export default function DayOfCheckIn() {
  const [showDays, setShowDays] = useState([]);
  const [dayId, setDayId] = useState(null);
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openModelId, setOpenModelId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
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
      const data = await dayOfApi.getCheckinList(id);
      if (dayRef.current !== id) return; // user switched days while this was loading
      setRoster(data);
      setError("");
    } catch (e) {
      setError("Couldn't refresh. Check your connection — showing the last list we got.");
    }
  }, []);

  useEffect(() => {
    dayRef.current = dayId;
    setRoster(null);
    setOpenModelId(null);
    if (!dayId) return undefined;
    load(dayId);
    const timer = setInterval(() => { if (!pausedRef.current) load(dayId); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [dayId, load]);

  // Don't let a background refresh overwrite what someone is typing in the pop-up.
  const openModel = roster?.models.find((m) => m.applicant_id === openModelId) || null;
  useEffect(() => {
    pausedRef.current = busy;
  }, [busy]);
  useEffect(() => {
    setNoteDraft(openModel?.note || "");
    setNoteSaved(false);
    // only reset when a different model is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModelId]);

  async function run(action) {
    setBusy(true);
    try {
      await action();
      await load(dayId);
    } catch (e) {
      setError("That didn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const toggleDesigner = (d) => run(() => dayOfApi.setDesignerCheckIn(d.id, !d.checked_in_at));
  const toggleStaff = (s) => run(() => dayOfApi.setAttendeeCheckIn(s.id, !s.checked_in_at));
  const setModelIn = (m, value) => run(() => dayOfApi.setModelCheckIn(m.applicant_id, dayId, value));
  async function saveNote(m) {
    await run(() => dayOfApi.setModelNote(m.applicant_id, dayId, noteDraft));
    setNoteSaved(true);
  }

  // ---- build the combined list ----
  const q = search.trim().toLowerCase();
  const items = [];
  if (roster) {
    roster.models.forEach((m) => items.push({
      kind: "models", key: `m${m.applicant_id}`, name: m.full_name, at: m.checked_in_at, model: m,
      searchText: `${m.full_name} ${m.designers.map((d) => d.name).join(" ")}`.toLowerCase(),
    }));
    roster.designers.forEach((d) => items.push({
      kind: "designers", key: `d${d.id}`, name: d.name, at: d.checked_in_at, designer: d,
      searchText: d.name.toLowerCase(),
    }));
    roster.staff.forEach((s) => items.push({
      kind: "staff", key: `s${s.id}`, name: s.name, at: s.checked_in_at, staff: s,
      searchText: `${s.name} ${s.attendee_type}`.toLowerCase(),
    }));
  }
  const visible = items
    .filter((i) => typeFilter === "all" || i.kind === typeFilter)
    .filter((i) => statusFilter === "all" || (statusFilter === "in" ? !!i.at : !i.at))
    .filter((i) => !q || i.searchText.includes(q))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const modelsIn = roster ? roster.models.filter((m) => m.checked_in_at).length : 0;
  const designersIn = roster ? roster.designers.filter((d) => d.checked_in_at).length : 0;
  const dayObj = showDays.find((d) => d.id === dayId);

  const printBtn = { textDecoration: "none" };

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Day of Show Check-In</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        Tap a model to check them in and tell them which designers they're walking for. Designers and staff check in with one tap.
      </p>
      <DayOfNav current="/day-of/check-in" />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {showDays.map((d) => (
          <Chip key={d.id} active={d.id === dayId} onClick={() => setDayId(d.id)}>{d.name}</Chip>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Counter label="Models checked in" done={modelsIn} total={roster?.models.length || 0} />
        <Counter label="Designers checked in" done={designersIn} total={roster?.designers.length || 0} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {dayId && (
          <>
            <a className="btn btn-outline btn-sm" style={printBtn} href={dayOfPrintUrls.checkInSheet(dayId, false)} download>
              ⬇ Check-in sheet (everyone)
            </a>
            <a className="btn btn-outline btn-sm" style={printBtn} href={dayOfPrintUrls.checkInSheet(dayId, true)} download>
              ⬇ Sheet: not yet checked in
            </a>
            <a className="btn btn-outline btn-sm" style={printBtn} href={dayOfPrintUrls.modelCards(dayId)} download>
              ⬇ Model cards (cut-outs)
            </a>
          </>
        )}
      </div>

      <input
        className="search-input"
        placeholder="Search a name or designer…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {TYPE_FILTERS.map((f) => (
          <Chip key={f.key} active={typeFilter === f.key} onClick={() => setTypeFilter(f.key)}>{f.label}</Chip>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((f) => (
          <Chip key={f.key} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)}>{f.label}</Chip>
        ))}
      </div>

      {error && <p style={{ color: "var(--no)", fontSize: 13 }}>{error}</p>}
      {!roster && !error && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {roster && visible.length === 0 && (
        <div className="empty-state">
          <h3>{items.length === 0 ? `No one is set up for ${dayObj?.name || "this day"} yet` : "No one matches"}</h3>
          {items.length === 0 && <p>Assign models to designers first (Designers page).</p>}
        </div>
      )}

      {visible.map((i) => {
        if (i.kind === "models") {
          const m = i.model;
          return (
            <div key={i.key} className="card" onClick={() => setOpenModelId(m.applicant_id)}
              style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer", opacity: m.checked_in_at ? 0.7 : 1 }}>
              <Avatar url={m.photo_url} name={m.full_name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{m.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {m.designers.map((d) => `${d.order_in_day}. ${d.name}`).join("  ·  ")}
                </div>
                {m.note && <div style={{ fontSize: 12, color: "var(--maybe)", marginTop: 2 }}>📝 {m.note}</div>}
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Model</span>
              <CheckedPill at={m.checked_in_at} />
            </div>
          );
        }
        const isDesigner = i.kind === "designers";
        const row = isDesigner ? i.designer : i.staff;
        return (
          <div key={i.key} className="card" style={{ display: "flex", gap: 12, alignItems: "center", opacity: row.checked_in_at ? 0.7 : 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{row.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {isDesigner ? `Designer #${row.order_in_day} · ${row.model_count} model${row.model_count === 1 ? "" : "s"}` : row.attendee_type}
              </div>
            </div>
            <CheckedPill at={row.checked_in_at} />
            <button
              className={row.checked_in_at ? "btn btn-outline btn-sm" : "btn btn-brass btn-sm"}
              disabled={busy}
              onClick={() => (isDesigner ? toggleDesigner(row) : toggleStaff(row))}
            >
              {row.checked_in_at ? "Undo" : "Check in"}
            </button>
          </div>
        );
      })}

      {openModel && (
        <div
          onClick={() => setOpenModelId(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,21,26,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--paper)", borderRadius: 14, width: "100%", maxWidth: 460, maxHeight: "92vh", overflowY: "auto", padding: 20 }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
              <Avatar url={openModel.photo_url} name={openModel.full_name} size={96} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{openModel.full_name}</div>
                <div style={{ marginTop: 6 }}><CheckedPill at={openModel.checked_in_at} /></div>
              </div>
            </div>

            <span className="field-label">Walking for (number = order in the show)</span>
            <div style={{ marginBottom: 14 }}>
              {openModel.designers.map((d) => (
                <div key={d.designer_id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%", background: "var(--brass)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>{d.order_in_day}</span>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{d.name}</span>
                </div>
              ))}
            </div>

            <span className="field-label">Note (late arrival, etc.)</span>
            <textarea
              value={noteDraft}
              onChange={(e) => { setNoteDraft(e.target.value); setNoteSaved(false); }}
              onFocus={() => { pausedRef.current = true; }}
              onBlur={() => { pausedRef.current = busy; }}
              rows={2}
              placeholder="e.g. Arriving 30 min late"
              style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 8, border: "1.5px solid var(--line-strong)", fontSize: 15, fontFamily: "inherit", marginBottom: 6 }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <button className="btn btn-outline btn-sm" disabled={busy || noteDraft.trim() === (openModel.note || "")} onClick={() => saveNote(openModel)}>
                Save note
              </button>
              {noteSaved && <span style={{ fontSize: 12, color: "var(--yes)" }}>Saved</span>}
            </div>

            {openModel.checked_in_at ? (
              <button className="btn btn-outline btn-block" disabled={busy} onClick={() => setModelIn(openModel, false)} style={{ marginBottom: 8 }}>
                Undo check-in
              </button>
            ) : (
              <button className="btn btn-brass btn-block" disabled={busy} onClick={() => setModelIn(openModel, true)}
                style={{ padding: "16px 12px", fontSize: 18, marginBottom: 8 }}>
                Check in
              </button>
            )}
            <button className="btn btn-primary btn-block" onClick={() => setOpenModelId(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}