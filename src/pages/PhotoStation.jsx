import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useEvent } from "../components/EventContext.jsx";
import { AuditionTag } from "../components/Badges.jsx";

const QUEUE_SIZE = 30;
const REQUIRED_SLOTS = [
  { tag: "headshot", label: "Head" },
  { tag: "full_frontal", label: "Front" },
  { tag: "left_side", label: "Left" },
  { tag: "right_side", label: "Right" },
];

function missingRequired(photos) {
  const tags = photos.map((p) => p.tag);
  return REQUIRED_SLOTS.some((s) => !tags.includes(s.tag));
}

export default function PhotoStation() {
  const { eventId } = useEvent();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [uploadingKey, setUploadingKey] = useState(null); // `${applicantId}:${tag}`
  const fileInputRef = useRef(null);
  const pendingRef = useRef(null); // { applicantId, tag }

  useEffect(() => {
    if (eventId) load();
  }, [eventId]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getPhotoStationList(eventId);
      setRoster(data);
    } finally {
      setLoading(false);
    }
  }

  const queue = useMemo(() => {
    return roster
      .filter(
        (a) => (a.casting_status === "yes" || a.casting_status === "maybe") && missingRequired(a.photos)
      )
      .sort((x, y) => x.audition_number - y.audition_number)
      .slice(0, QUEUE_SIZE);
  }, [roster]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return roster
      .filter((a) => String(a.audition_number).startsWith(q) || a.full_name.toLowerCase().includes(q))
      .slice(0, 25);
  }, [query, roster]);

  function openCamera(applicantId, tag) {
    pendingRef.current = { applicantId, tag };
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    const pending = pendingRef.current;
    if (!file || !pending) return;
    const key = `${pending.applicantId}:${pending.tag}`;
    setUploadingKey(key);
    try {
      const result = await api.uploadPhoto(pending.applicantId, file, pending.tag);
      setRoster((prev) =>
        prev.map((a) =>
          a.id === pending.applicantId
            ? { ...a, photos: [...a.photos, { id: result.photo_id, url: result.url, tag: pending.tag }] }
            : a
        )
      );
    } finally {
      setUploadingKey(null);
      e.target.value = "";
    }
  }

  if (!eventId) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>No event selected</h3>
          <p>Set the event ID in the top-right corner first.</p>
        </div>
      </div>
    );
  }

  const showing = searchResults !== null ? searchResults : queue;
  const isSearching = searchResults !== null;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="section-header">
        <h1 style={{ fontSize: 20 }}>Photo Station</h1>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <input
        className="search-input"
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Audition number or name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        inputMode="numeric"
      />

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        {isSearching
          ? `${showing.length} match${showing.length === 1 ? "" : "es"}`
          : `Next ${queue.length} awaiting photos (Yes/Maybe, lowest numbers first)`}
      </p>

      {showing.length === 0 && (
        <div className="empty-state">
          <h3>{isSearching ? "No match found" : "Nobody's waiting"}</h3>
          <p>{isSearching ? "Try a different number or name." : "Everyone marked Yes/Maybe has their required shots."}</p>
        </div>
      )}

      {showing.map((person) => (
        <PhotoRow key={person.id} person={person} onCapture={openCamera} uploadingKey={uploadingKey} />
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}

function PhotoRow({ person, onCapture, uploadingKey }) {
  function latestForTag(tag) {
    const matches = person.photos.filter((p) => p.tag === tag);
    return matches.length ? matches[matches.length - 1] : null;
  }
  function countForPrefix(prefix) {
    const uniqueTags = new Set(
      person.photos.filter((p) => p.tag && p.tag.startsWith(prefix + "_")).map((p) => p.tag)
    );
    return uniqueTags.size;
  }

  const piercingCount = countForPrefix("piercing");
  const tattooCount = countForPrefix("tattoo");

  return (
    <div className="card" style={{ padding: "12px 14px" }}>
      <div className="card-row" style={{ marginBottom: 10 }}>
        <AuditionTag number={person.audition_number} />
        <div className="card-main">
          <div className="card-name" style={{ fontSize: 15 }}>{person.full_name}</div>
          <div className="card-meta">
            {person.category.replace("_", "-")}
            {person.preselect ? " · preselect" : ""}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {REQUIRED_SLOTS.map((slot) => {
          const photo = latestForTag(slot.tag);
          const key = `${person.id}:${slot.tag}`;
          const isUploading = uploadingKey === key;
          return (
            <button
              key={slot.tag}
              onClick={() => onCapture(person.id, slot.tag)}
              disabled={isUploading}
              style={{
                width: 64,
                border: photo ? "2px solid var(--yes)" : "1.5px dashed var(--line-strong)",
                borderRadius: 8,
                background: photo ? "var(--yes-bg)" : "var(--paper)",
                padding: 0,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              {photo ? (
                <img src={photo.url} alt={slot.label} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 10 }}>
                  {isUploading ? "…" : "Shoot"}
                </div>
              )}
              <div style={{ fontSize: 9, fontWeight: 600, padding: "2px 3px", color: photo ? "var(--yes)" : "var(--muted)" }}>
                {photo ? "✓ " : ""}{slot.label}
              </div>
            </button>
          );
        })}

        <RepeatableInline
          title="Piercing"
          prefix="piercing"
          count={piercingCount}
          photos={person.photos}
          applicantId={person.id}
          onCapture={onCapture}
          uploadingKey={uploadingKey}
        />
        <RepeatableInline
          title="Tattoo"
          prefix="tattoo"
          count={tattooCount}
          photos={person.photos}
          applicantId={person.id}
          onCapture={onCapture}
          uploadingKey={uploadingKey}
        />
      </div>
    </div>
  );
}

function RepeatableInline({ title, prefix, count, photos, applicantId, onCapture, uploadingKey }) {
  const nextIndex = count + 1;
  const nextTag = `${prefix}_${nextIndex}`;
  const nextKey = `${applicantId}:${nextTag}`;
  const isUploadingNext = uploadingKey === nextKey;

  const existing = [];
  for (let i = 1; i <= count; i++) {
    const tag = `${prefix}_${i}`;
    const matches = photos.filter((p) => p.tag === tag);
    if (matches.length) existing.push({ index: i, tag, photo: matches[matches.length - 1] });
  }

  return (
    <>
      {existing.map(({ index, tag, photo }) => {
        const key = `${applicantId}:${tag}`;
        const isUploadingThis = uploadingKey === key;
        return (
          <button
            key={tag}
            onClick={() => onCapture(applicantId, tag)}
            disabled={isUploadingThis}
            style={{ width: 64, padding: 0, border: "2px solid var(--yes)", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "transparent" }}
          >
            <img src={photo.url} alt={`${title} ${index}`} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
            <div style={{ fontSize: 9, fontWeight: 600, padding: "2px 3px", color: "var(--yes)" }}>
              ✓ {title} {index}
            </div>
          </button>
        );
      })}
      <button
        onClick={() => onCapture(applicantId, nextTag)}
        disabled={isUploadingNext}
        style={{
          width: 64,
          border: "1.5px dashed var(--line-strong)",
          borderRadius: 8,
          background: "var(--paper)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          aspectRatio: "3/4",
          fontSize: 10,
          color: "var(--brass)",
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        {isUploadingNext ? "…" : `+ ${title} ${nextIndex}`}
      </button>
    </>
  );
}