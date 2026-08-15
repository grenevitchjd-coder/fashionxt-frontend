import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";

const CATEGORY_TABS = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "non_binary", label: "Non-binary" },
];

const POOL_GROUPS = [
  { key: "pool_a", label: "Pool A", bg: "#fff8e1", accent: "#c9962b" },
  { key: "pool_b", label: "Pool B", bg: "#e3f2fd", accent: "#3b7ec9" },
  { key: "backup", label: "Backup", bg: "#f2f2f2", accent: "#888" },
];

function parseLeadingNumber(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  if (!s) return null;
  const mixed = s.match(/^(\d+)\s*[-\s]\s*(\d+)\/(\d+)/);
  if (mixed) return parseFloat(mixed[1]) + parseFloat(mixed[2]) / parseFloat(mixed[3]);
  const fracOnly = s.match(/^(\d+)\/(\d+)/);
  if (fracOnly) return parseFloat(fracOnly[1]) / parseFloat(fracOnly[2]);
  const plain = s.match(/(\d+(?:\.\d+)?)/);
  if (plain) return parseFloat(plain[1]);
  return null;
}

function parseHeightToInches(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  if (!s) return null;
  let m = s.match(/(\d+)\s*['’]\s*(\d+(?:\.\d+)?)?/);
  if (m) return parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0);
  m = s.match(/(\d+)\s*ft\.?\s*(\d+(?:\.\d+)?)?\s*(?:in)?/i);
  if (m) return parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0);
  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return parseFloat(plain[1]);
  return null;
}

function inRange(value, min, max, parseFn) {
  if (!min && !max) return true;
  if (value === null) return false;
  const minVal = min ? parseFn(min) : -Infinity;
  const maxVal = max ? parseFn(max) : Infinity;
  return value >= (minVal ?? -Infinity) && value <= (maxVal ?? Infinity);
}

export default function FinalRoster() {
  const [showDays, setShowDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [designers, setDesigners] = useState([]);
  const [activeDesignerId, setActiveDesignerId] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("female");
  const [heightMin, setHeightMin] = useState("");
  const [heightMax, setHeightMax] = useState("");
  const [waistMin, setWaistMin] = useState("");
  const [waistMax, setWaistMax] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");

  useEffect(() => {
    loadDays();
  }, []);

  useEffect(() => {
    if (selectedDay) { setActiveDesignerId(null); loadAll(); }
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
      setRoster(r);
    } finally {
      setLoading(false);
    }
  }

  function updateLocalPerson(personId, updater) {
    setRoster((prev) => prev.map((p) => (p.id === personId ? updater(p) : p)));
  }

  async function saveMeasurementField(personId, field, value) {
    updateLocalPerson(personId, (p) => ({ ...p, measurement: { ...(p.measurement || {}), [field]: value } }));
    await api.saveMeasurement(personId, { [field]: value });
  }

  async function saveMinor(personId, value) {
    updateLocalPerson(personId, (p) => ({ ...p, is_minor: value }));
    await api.saveMeasurement(personId, { is_minor: value });
  }

  async function saveAgency(personId, value) {
    updateLocalPerson(personId, (p) => ({
      ...p,
      agency_name: value,
      has_agency: value.trim() !== "" && value.trim().toUpperCase() !== "N/A",
    }));
    await api.updateContactInfo(personId, { agency_name: value });
  }

  async function handlePhotoSelected(personId, file) {
    const result = await api.uploadPhoto(personId, file, "headshot");
    updateLocalPerson(personId, (p) => ({ ...p, photo_url: result.url }));
  }

  async function handleAssign(personId, designerId) {
    await api.addAssignment(designerId, personId);
    await loadAll();
  }

  async function handleUnassign(personId, designerId) {
    await api.removeAssignment(designerId, personId);
    await loadAll();
  }

  const byCategory = useMemo(() => roster.filter((p) => p.category === category), [roster, category]);

  const filtered = useMemo(() => {
    return byCategory.filter((p) => {
      const m = p.measurement || {};
      if (!inRange(parseHeightToInches(m.height), heightMin, heightMax, parseHeightToInches)) return false;
      if (!inRange(parseLeadingNumber(m.waist_size), waistMin, waistMax, parseLeadingNumber)) return false;
      const sizeVal = category === "male" ? m.jacket_size : m.dress_size;
      if (!inRange(parseLeadingNumber(sizeVal), sizeMin, sizeMax, parseLeadingNumber)) return false;
      return true;
    });
  }, [byCategory, heightMin, heightMax, waistMin, waistMax, sizeMin, sizeMax, category]);

  const groups = useMemo(() => {
    return POOL_GROUPS.map((g) => ({
      ...g,
      people: filtered.filter((p) => p.pool === g.key).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    }));
  }, [filtered]);

  const dayObj = showDays.find((d) => d.id === selectedDay);
  const activeDesigner = designers.find((d) => d.id === activeDesignerId) || null;
  const showDress = category === "female" || category === "non_binary";
  const showJacket = category === "male" || category === "non_binary";

  return (
    <div className="page" style={{ maxWidth: "100%" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Final Roster</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 4 }}>
        Every finalist from Model Pools. Pick a designer below, then add or remove people from their lineup directly from the roster.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 16, fontStyle: "italic" }}>
        Note: the Avail Th/Fr/Sa columns are general willingness from Measurements — separate from the designer day tabs below.
      </p>

      <span className="field-label">Show day</span>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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

      <span className="field-label">Working on designer</span>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveDesignerId(null)}
          className="btn btn-sm"
          style={
            activeDesignerId === null
              ? { background: "var(--ink)", color: "#fff" }
              : { background: "var(--paper)", color: "var(--muted)", border: "1.5px solid var(--line-strong)" }
          }
        >
          Overview (no designer selected)
        </button>
        {designers.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveDesignerId(d.id)}
            className="btn btn-sm"
            style={
              activeDesignerId === d.id
                ? { background: "var(--brass)", color: "#fff" }
                : { background: "var(--paper)", color: "var(--muted)", border: "1.5px solid var(--line-strong)" }
            }
          >
            D{d.order_in_day} · {d.name} ({d.models.length})
          </button>
        ))}
        {designers.length === 0 && (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>No designers set up for {dayObj?.name} yet — add some on the Designers page.</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className="btn btn-sm"
            style={
              category === tab.key
                ? { background: "var(--ink)", color: "#fff" }
                : { background: "var(--paper)", color: "var(--muted)", border: "1.5px solid var(--line-strong)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
        <RangeInputs label="Height" min={heightMin} max={heightMax} setMin={setHeightMin} setMax={setHeightMax} ph1="5'7&quot;" ph2="5'10&quot;" />
        <RangeInputs label="Waist" min={waistMin} max={waistMax} setMin={setWaistMin} setMax={setWaistMax} ph1="28" ph2="30" />
        {(showDress || showJacket) && (
          <RangeInputs
            label={category === "male" ? "Jacket" : "Dress"}
            min={sizeMin} max={sizeMax} setMin={setSizeMin} setMax={setSizeMax} ph1="4" ph2="6"
          />
        )}
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1.5px solid var(--line-strong)", borderRadius: 10 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ background: "var(--ink)", color: "#fff" }}>
                <Th>Photo</Th>
                <Th>Name</Th>
                <Th>Height</Th>
                <Th>Bust/Chest</Th>
                <Th>Waist</Th>
                <Th>Hip</Th>
                <Th>Shoe</Th>
                {showDress && <Th>Dress</Th>}
                {showJacket && <Th>Jacket</Th>}
                <Th>Agency</Th>
                <Th>Minor</Th>
                <Th>Swim OK</Th>
                <Th>Lingerie OK</Th>
                <Th>See-thru OK</Th>
                <Th>Avail Th</Th>
                <Th>Avail Fr</Th>
                <Th>Avail Sa</Th>
                <Th>Designer assignment</Th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <PoolGroup
                  key={g.key}
                  group={g}
                  showDress={showDress}
                  showJacket={showJacket}
                  designers={designers}
                  activeDesigner={activeDesigner}
                  onFieldSave={saveMeasurementField}
                  onMinorSave={saveMinor}
                  onAgencySave={saveAgency}
                  onPhoto={handlePhotoSelected}
                  onAssign={handleAssign}
                  onUnassign={handleUnassign}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RangeInputs({ label, min, max, setMin, setMax, ph1, ph2 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{label}:</span>
      <input value={min} onChange={(e) => setMin(e.target.value)} placeholder={ph1} style={{ width: 56, padding: "4px 6px", borderRadius: 5, border: "1.5px solid var(--line-strong)", fontSize: 12 }} />
      <span style={{ color: "var(--muted)" }}>–</span>
      <input value={max} onChange={(e) => setMax(e.target.value)} placeholder={ph2} style={{ width: 56, padding: "4px 6px", borderRadius: 5, border: "1.5px solid var(--line-strong)", fontSize: 12 }} />
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700 }}>{children}</th>;
}

function PoolGroup({ group, showDress, showJacket, designers, activeDesigner, onFieldSave, onMinorSave, onAgencySave, onPhoto, onAssign, onUnassign }) {
  if (group.people.length === 0) return null;
  return (
    <>
      <tr>
        <td colSpan={20} style={{ padding: "8px 10px", fontWeight: 800, fontSize: 12, background: group.accent, color: "#fff" }}>
          {group.label} ({group.people.length})
        </td>
      </tr>
      {group.people.map((p) => (
        <RosterRow
          key={p.id}
          person={p}
          bg={group.bg}
          showDress={showDress}
          showJacket={showJacket}
          designers={designers}
          activeDesigner={activeDesigner}
          onFieldSave={onFieldSave}
          onMinorSave={onMinorSave}
          onAgencySave={onAgencySave}
          onPhoto={onPhoto}
          onAssign={onAssign}
          onUnassign={onUnassign}
        />
      ))}
      <tr><td colSpan={20} style={{ height: group.key === "pool_b" ? 20 : 0 }} /></tr>
    </>
  );
}

function Cell({ children }) {
  return <td style={{ padding: "4px 6px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{children}</td>;
}

function EditableCell({ value, onSave, width = 60 }) {
  const [local, setLocal] = useState(value || "");
  useEffect(() => setLocal(value || ""), [value]);
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== (value || "")) onSave(local); }}
      style={{ width, padding: "3px 5px", border: "1px solid transparent", borderRadius: 4, fontSize: 12, background: "transparent" }}
      onFocus={(e) => (e.target.style.border = "1px solid var(--brass)")}
    />
  );
}

function YesNoMini({ value, onChange }) {
  return (
    <div style={{ display: "flex", border: "1px solid var(--line-strong)", borderRadius: 5, overflow: "hidden", width: "fit-content" }}>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{ padding: "2px 6px", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", background: value === true ? "var(--yes)" : "var(--paper)", color: value === true ? "#fff" : "var(--muted)" }}
      >
        Y
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{ padding: "2px 6px", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", background: value === false ? "var(--no)" : "var(--paper)", color: value === false ? "#fff" : "var(--muted)" }}
      >
        N
      </button>
    </div>
  );
}

function RosterRow({ person, bg, showDress, showJacket, designers, activeDesigner, onFieldSave, onMinorSave, onAgencySave, onPhoto, onAssign, onUnassign }) {
  const m = person.measurement || {};
  const fileInputRef = useRef(null);
  const assignedIds = new Set(person.assignments.map((a) => a.designer_id));
  const available = designers.filter((d) => !assignedIds.has(d.id));

  const isAssignedToActive = activeDesigner ? assignedIds.has(activeDesigner.id) : false;
  const adjacentConflict = activeDesigner
    ? person.assignments.find((a) => Math.abs(a.order_in_day - activeDesigner.order_in_day) === 1)
    : null;

  return (
    <tr style={{ background: bg }}>
      <Cell>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ width: 32, height: 32, borderRadius: 6, overflow: "hidden", border: "none", padding: 0, cursor: "pointer", background: "var(--line)" }}
          title="Click to retake"
        >
          {person.photo_url ? (
            <img src={person.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 8, color: "var(--muted)" }}>none</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(person.id, f); e.target.value = ""; }}
        />
      </Cell>
      <Cell><strong style={{ fontSize: 12 }}>{person.full_name}</strong></Cell>
      <Cell><EditableCell value={m.height} onSave={(v) => onFieldSave(person.id, "height", v)} /></Cell>
      <Cell><EditableCell value={m.bust_chest} onSave={(v) => onFieldSave(person.id, "bust_chest", v)} /></Cell>
      <Cell><EditableCell value={m.waist_size} onSave={(v) => onFieldSave(person.id, "waist_size", v)} /></Cell>
      <Cell><EditableCell value={m.hip_size} onSave={(v) => onFieldSave(person.id, "hip_size", v)} /></Cell>
      <Cell><EditableCell value={m.shoe_size} onSave={(v) => onFieldSave(person.id, "shoe_size", v)} width={40} /></Cell>
      {showDress && <Cell><EditableCell value={m.dress_size} onSave={(v) => onFieldSave(person.id, "dress_size", v)} width={40} /></Cell>}
      {showJacket && <Cell><EditableCell value={m.jacket_size} onSave={(v) => onFieldSave(person.id, "jacket_size", v)} width={40} /></Cell>}
      <Cell><EditableCell value={person.agency_name} onSave={(v) => onAgencySave(person.id, v)} width={90} /></Cell>
      <Cell><YesNoMini value={person.is_minor} onChange={(v) => onMinorSave(person.id, v)} /></Cell>
      <Cell><YesNoMini value={m.swim_ok} onChange={(v) => onFieldSave(person.id, "swim_ok", v)} /></Cell>
      <Cell><YesNoMini value={m.lingerie_ok} onChange={(v) => onFieldSave(person.id, "lingerie_ok", v)} /></Cell>
      <Cell><YesNoMini value={m.see_through_ok} onChange={(v) => onFieldSave(person.id, "see_through_ok", v)} /></Cell>
      <Cell>
        <input type="checkbox" checked={!!m.avail_thursday} onChange={(e) => onFieldSave(person.id, "avail_thursday", e.target.checked)} />
      </Cell>
      <Cell>
        <input type="checkbox" checked={!!m.avail_friday} onChange={(e) => onFieldSave(person.id, "avail_friday", e.target.checked)} />
      </Cell>
      <Cell>
        <input type="checkbox" checked={!!m.avail_saturday} onChange={(e) => onFieldSave(person.id, "avail_saturday", e.target.checked)} />
      </Cell>
      <Cell>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start", minWidth: 180 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {person.assignments.map((a) => (
              <span
                key={a.designer_id}
                onClick={() => onUnassign(person.id, a.designer_id)}
                title="Click to remove"
                style={{ cursor: "pointer", background: "var(--ink)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}
              >
                D{a.order_in_day} ✕
              </span>
            ))}
          </div>

          {activeDesigner ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button
                onClick={() => (isAssignedToActive ? onUnassign(person.id, activeDesigner.id) : onAssign(person.id, activeDesigner.id))}
                style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                  border: isAssignedToActive ? "1.5px solid var(--yes)" : "1.5px solid var(--brass)",
                  background: isAssignedToActive ? "var(--yes-bg)" : "var(--brass)",
                  color: isAssignedToActive ? "var(--yes)" : "#fff",
                }}
              >
                {isAssignedToActive ? `✓ On D${activeDesigner.order_in_day} — remove` : `+ Add to D${activeDesigner.order_in_day} ${activeDesigner.name}`}
              </button>
              {adjacentConflict && (
                <span style={{ fontSize: 10, color: "var(--no)", fontWeight: 600 }}>
                  ⚠ also walks D{adjacentConflict.order_in_day} — back-to-back
                </span>
              )}
            </div>
          ) : (
            available.length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) onAssign(person.id, Number(e.target.value)); }}
                style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4, border: "1px solid var(--line-strong)" }}
              >
                <option value="">+ assign</option>
                {available.map((d) => (
                  <option key={d.id} value={d.id}>D{d.order_in_day} {d.name}</option>
                ))}
              </select>
            )
          )}
        </div>
      </Cell>
    </tr>
  );
}