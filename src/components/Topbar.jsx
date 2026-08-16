import { NavLink } from "react-router-dom";
import { useEvent } from "./EventContext.jsx";

export default function Topbar() {
  const { eventId, setEventId } = useEvent();

  return (
    <div className="topbar">
      <NavLink to="/" className="topbar-title" style={{ textDecoration: "none" }}>
        FashioNXT Casting
      </NavLink>
      <div className="topbar-nav">
        <NavLink to="/" end>Roster</NavLink>
        <NavLink to="/pools">Model Pools</NavLink>
        <NavLink to="/designers">Designers</NavLink>
        <NavLink to="/final-roster">Final Roster</NavLink>
        <NavLink to="/add">Add guest</NavLink>
        <span style={{ width: 1, background: "rgba(255,255,255,0.15)", margin: "0 2px" }} />
        <NavLink to="/audition/portland">Portland</NavLink>
        <NavLink to="/audition/seattle">Seattle</NavLink>
      </div>
      <input
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        placeholder="Event ID"
        style={{
          width: 84,
          padding: "6px 8px",
          borderRadius: 6,
          border: "none",
          fontSize: 13,
          fontFamily: "var(--font-tag)",
        }}
        title="Current audition event ID"
      />
    </div>
  );
}