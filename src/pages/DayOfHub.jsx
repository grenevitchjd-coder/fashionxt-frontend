import { Link } from "react-router-dom";
import { DAY_OF_PAGES } from "../dayOf.js";

export default function DayOfHub() {
  return (
    <div className="page">
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Day of Show</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
        Backstage tools for show days — pick a station below.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {DAY_OF_PAGES.map((p) => {
          const style = {
            display: "block",
            textDecoration: "none",
            background: "var(--ink)",
            color: "#fff",
            borderRadius: 12,
            padding: "28px 16px",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 15,
            borderTop: `3px solid ${p.accent}`,
          };
          if (!p.built) {
            return (
              <div key={p.path} style={{ ...style, opacity: 0.4, cursor: "default" }}>
                {p.label}
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 6, opacity: 0.8 }}>Coming soon</div>
              </div>
            );
          }
          return (
            <Link key={p.path} to={p.path} style={style}>
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}