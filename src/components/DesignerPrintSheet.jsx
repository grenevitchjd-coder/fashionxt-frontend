import { useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// Print-formatted view of ONE show day's designers + model lineups.
//   variant="staff"    -> includes each designer's internal notes
//   variant="designer" -> same page, notes left out
// Use the browser's print dialog: pick a printer, or choose "Save as PDF".

function formatDayDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// Models who walk for two designers that run one right after the other (designer 2 then 3, ...).
// Returns { "designerId:applicantId": { prev, next } } for flagged rows; each flagged model is
// flagged under BOTH designers.
function backToBackMap(designers) {
  const ordered = [...designers].sort((a, b) => a.order_in_day - b.order_in_day || a.id - b.id);
  const flags = {};
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const here = ordered[i];
    const next = ordered[i + 1];
    const nextIds = new Set(next.models.map((m) => m.applicant_id));
    here.models.forEach((m) => {
      if (!nextIds.has(m.applicant_id)) return;
      const a = (flags[`${here.id}:${m.applicant_id}`] ||= { prev: null, next: null });
      a.next = next;
      const b = (flags[`${next.id}:${m.applicant_id}`] ||= { prev: null, next: null });
      b.prev = here;
    });
  }
  return flags;
}

export default function DesignerPrintSheet({ day, designers, variant, onClose }) {
  const showNotes = variant === "staff";
  const copyLabel = showNotes ? "Staff copy" : "Designer copy";
  const b2b = backToBackMap(designers);

  // The browser uses the page title as the default PDF file name.
  useEffect(() => {
    const previous = document.title;
    document.title = `FashioNXT ${day?.name || ""} - ${copyLabel}`;
    return () => { document.title = previous; };
  }, [day, copyLabel]);

  return (
    <div className="print-sheet-wrap">
      <style>{`
        .print-sheet-wrap { background: #fff; min-height: 100vh; }
        .print-toolbar {
          display: flex; gap: 8px; align-items: center; padding: 12px 20px;
          border-bottom: 1px solid var(--line-strong); background: var(--paper);
          position: sticky; top: 0; z-index: 5;
        }
        .print-sheet { max-width: 800px; margin: 0 auto; padding: 24px 20px 60px; color: #000; }
        .print-sheet h1 { font-size: 24px; margin: 0 0 2px; }
        .print-sub { font-size: 13px; color: #444; margin: 0 0 20px; }
        .print-designer { border: 1.5px solid #000; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
        .print-designer-head { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid #999; padding-bottom: 6px; margin-bottom: 8px; }
        .print-designer-num { font-size: 13px; font-weight: 700; border: 1.5px solid #000; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .print-designer-name { font-size: 18px; font-weight: 700; }
        .print-designer-count { margin-left: auto; font-size: 12px; color: #444; }
        .print-notes { font-size: 13px; border-left: 3px solid #000; padding: 4px 10px; margin: 0 0 10px; white-space: pre-wrap; background: #f3f3f3; }
        .print-notes b { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .print-model { display: flex; gap: 10px; font-size: 14px; padding: 3px 0; border-bottom: 1px dotted #bbb; }
        .print-model:last-child { border-bottom: none; }
        .print-model-num { width: 22px; text-align: right; font-weight: 700; flex-shrink: 0; }
        .print-model-cat { color: #444; font-size: 12px; align-self: center; }
        .print-model.b2b { background: #fff0d1; border-left: 4px solid #d98a00; padding-left: 8px; margin-left: -12px; padding-right: 8px; margin-right: -8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-b2b-warn { font-size: 11px; font-weight: 700; color: #9a5b00; margin-top: 1px; }
        .print-empty { font-size: 13px; color: #555; font-style: italic; margin: 0; }
        .print-footer { font-size: 11px; color: #666; margin-top: 18px; }

        @media print {
          .no-print, .topbar { display: none !important; }
          .print-sheet-wrap { min-height: 0; }
          .print-sheet { padding: 0; max-width: none; }
          .print-designer { background: #fff; }
          .print-notes { background: #fff; }
          @page { margin: 0.6in; }
        }
      `}</style>

      <div className="print-toolbar no-print">
        <button className="btn btn-outline btn-sm" onClick={onClose}>← Back to Designers</button>
        <a
          className="btn btn-brass btn-sm"
          href={`${API_BASE}/designers/print-pdf?show_day_id=${day?.id}&notes=${showNotes ? 1 : 0}`}
          download
          style={{ textDecoration: "none" }}
        >
          Download PDF
        </a>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>Print this page</button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {copyLabel}{showNotes ? " (includes notes)" : " (no notes)"} — "Download PDF" works on any device; "Print this page" needs a browser print dialog.
        </span>
      </div>

      <div className="print-sheet">
        <h1>FashioNXT Week — {day?.name}</h1>
        <p className="print-sub">
          {formatDayDate(day?.show_date)}{day?.show_date ? " · " : ""}{copyLabel}
        </p>

        {designers.length === 0 && <p className="print-empty">No designers have been added to this day yet.</p>}

        {designers.map((d) => (
          <div key={d.id} className="print-designer">
            <div className="print-designer-head">
              <span className="print-designer-num">{d.order_in_day}</span>
              <span className="print-designer-name">{d.name}</span>
              <span className="print-designer-count">
                {d.models.length} model{d.models.length === 1 ? "" : "s"}
              </span>
            </div>

            {showNotes && d.notes && (
              <div className="print-notes">
                <b>Notes</b>
                {d.notes}
              </div>
            )}

            {d.models.length === 0 ? (
              <p className="print-empty">No models assigned yet.</p>
            ) : (
              d.models.map((m, idx) => {
                const flag = b2b[`${d.id}:${m.applicant_id}`];
                return (
                  <div key={m.applicant_id} className={`print-model${flag ? " b2b" : ""}`}>
                    <span className="print-model-num">{idx + 1}</span>
                    <div>
                      <span>{m.full_name}</span>{" "}
                      <span className="print-model-cat">({m.category.replace("_", "-")})</span>
                      {flag && (
                        <div className="print-b2b-warn">
                          !! BACK TO BACK —{" "}
                          {[
                            flag.prev && `just came from ${flag.prev.order_in_day}. ${flag.prev.name}`,
                            flag.next && `goes straight to ${flag.next.order_in_day}. ${flag.next.name}`,
                          ].filter(Boolean).join("  |  ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ))}

        <div className="print-footer">Printed {new Date().toLocaleString("en-US")}</div>
      </div>
    </div>
  );
}