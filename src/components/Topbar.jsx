import { NavLink } from "react-router-dom";
import { useEvent } from "./EventContext.jsx";

export default function Topbar() {
  const { eventId, setEventId } = useEvent();

  return (
    <div className="topbar">
      <div className="topbar-title">FashioNXT Casting</div>
      <div className="topbar-nav">
        <NavLink to="/" end>Roster</NavLink>
        <NavLink to="/add">Add guest</NavLink>
        <NavLink to="/decks">Decks</NavLink>
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