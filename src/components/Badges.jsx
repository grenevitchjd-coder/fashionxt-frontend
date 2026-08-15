export function StatusPill({ status }) {
  const labels = { pending: "Pending", yes: "Yes", maybe: "Maybe", no: "No" };
  return <span className={`status-pill status-${status}`}>{labels[status] || status}</span>;
}

export function PoolBadge({ pool }) {
  if (!pool) return null;
  const labels = { pool_a: "Pool A", pool_b: "Pool B", backup: "Alternate" };
  return <span className={`pool-badge pool-${pool}`}>{labels[pool]}</span>;
}

export function AuditionTag({ number, large, fastTrack }) {
  if (number === null || number === undefined) return null;
  return (
    <span
      className={`audition-tag${large ? " tag-large" : ""}`}
      style={fastTrack ? { background: "#c9962b", color: "#fff", boxShadow: "0 0 0 2px #c9962b" } : undefined}
      title={fastTrack ? "Fast Track" : undefined}
    >
      {fastTrack ? "★ " : ""}#{String(number).padStart(3, "0")}
    </span>
  );
}