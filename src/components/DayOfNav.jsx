import { Link } from "react-router-dom";
import { DAY_OF_PAGES } from "../dayOf.js";

// Small menu shown at the top of every Day of Show page for jumping between them.
export default function DayOfNav({ current }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      <Link to="/day-of" className="btn btn-outline btn-sm" style={{ textDecoration: "none" }}>
        ← Day of Show
      </Link>
      {DAY_OF_PAGES.map((p) => {
        const active = p.path === current;
        if (!p.built) {
          return (
            <span
              key={p.path}
              className="btn btn-outline btn-sm"
              style={{ opacity: 0.4, cursor: "default" }}
              title="Coming soon"
            >
              {p.label}
            </span>
          );
        }
        return (
          <Link
            key={p.path}
            to={p.path}
            className="btn btn-sm"
            style={
              active
                ? { background: "var(--ink)", color: "#fff", textDecoration: "none" }
                : { background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line-strong)", textDecoration: "none" }
            }
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}