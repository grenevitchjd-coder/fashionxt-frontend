import { useEffect } from "react";

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

export default function DesignerPrintSheet({ day, designers, variant, onClose }) {
  const showNotes = variant === "staff";
  const copyLabel = showNotes ? "Staff copy" : "Designer copy";

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
        <button className="btn btn-brass btn-sm" onClick={() => window.print()}>Print / Save as PDF</button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {copyLabel}{showNotes ? " (includes notes)" : " (no notes)"} — in the print window, choose "Save as PDF" to download.
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
              d.models.map((m, idx) => (
                <div key={m.applicant_id} className="print-model">
                  <span className="print-model-num">{idx + 1}</span>
                  <span>{m.full_name}</span>
                  <span className="print-model-cat">({m.category.replace("_", "-")})</span>
                </div>
              ))
            )}
          </div>
        ))}

        <div className="print-footer">Printed {new Date().toLocaleString("en-US")}</div>
      </div>
    </div>
  );
}