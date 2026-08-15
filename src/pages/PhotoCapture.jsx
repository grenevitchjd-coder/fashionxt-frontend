import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";

const REQUIRED_SLOTS = [
  { tag: "headshot", label: "Headshot" },
  { tag: "full_frontal", label: "Full Frontal" },
  { tag: "left_side", label: "Left Side" },
  { tag: "right_side", label: "Right Side" },
];

export default function PhotoCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goToMeasurements = searchParams.get("next") === "measurements";
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingTag, setUploadingTag] = useState(null);
  const fileInputRef = useRef(null);
  const pendingTagRef = useRef(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getApplicantDetail(id);
      setApplicant(data);
    } finally {
      setLoading(false);
    }
  }

  // Most-recent photo per tag — retaking uploads a new photo with the same
  // tag, and this always shows the latest one as the slot's thumbnail.
  function latestForTag(tag) {
    const matches = applicant.photos.filter((p) => p.tag === tag);
    return matches.length ? matches[matches.length - 1] : null;
  }

  function countForPrefix(prefix) {
    const uniqueTags = new Set(
      applicant.photos.filter((p) => p.tag && p.tag.startsWith(prefix + "_")).map((p) => p.tag)
    );
    return uniqueTags.size;
  }

  function openCamera(tag) {
    pendingTagRef.current = tag;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    const tag = pendingTagRef.current;
    if (!file || !tag) return;
    setUploadingTag(tag);
    try {
      await api.uploadPhoto(id, file, tag);
      await load();
    } finally {
      setUploadingTag(null);
      e.target.value = "";
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!applicant) return <div className="page"><p>Not found.</p></div>;

  const piercingCount = countForPrefix("piercing");
  const tattooCount = countForPrefix("tattoo");

  return (
    <div className="page">
      <Link to={goToMeasurements ? "/pools" : "/photo-station"} style={{ fontSize: 13, color: "var(--muted)" }}>
        ← Back to {goToMeasurements ? "Model Pools" : "Photo Station"}
      </Link>
      <h1 style={{ fontSize: 20, margin: "8px 0 2px" }}>{applicant.full_name}</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        {applicant.audition_number ? `#${String(applicant.audition_number).padStart(3, "0")} · ` : ""}
        {applicant.category.replace("_", "-")}
      </p>

      <span className="field-label">Required shots — tap any photo to retake it</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {REQUIRED_SLOTS.map((slot) => {
          const photo = latestForTag(slot.tag);
          const isUploading = uploadingTag === slot.tag;
          return (
            <button
              key={slot.tag}
              onClick={() => openCamera(slot.tag)}
              disabled={isUploading}
              style={{
                border: photo ? "2px solid var(--yes)" : "1.5px dashed var(--line-strong)",
                borderRadius: 10,
                background: photo ? "var(--yes-bg)" : "var(--paper)",
                padding: 0,
                overflow: "hidden",
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
              }}
            >
              {photo ? (
                <>
                  <img src={photo.url} alt={slot.label} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                  <div
                    style={{
                      position: "absolute", top: 6, right: 6,
                      background: "rgba(20,21,26,0.75)", color: "#fff",
                      fontSize: 10, fontWeight: 600, padding: "3px 7px", borderRadius: 100,
                    }}
                  >
                    ↻ retake
                  </div>
                </>
              ) : (
                <div style={{ aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
                  {isUploading ? "Uploading…" : "Tap to shoot"}
                </div>
              )}
              <div style={{ padding: "6px 8px", fontSize: 12, fontWeight: 600, color: photo ? "var(--yes)" : "var(--muted)" }}>
                {photo ? "✓ " : ""}{slot.label}
              </div>
            </button>
          );
        })}
      </div>

      <RepeatableSlotGroup
        title="Piercings"
        prefix="piercing"
        count={piercingCount}
        photos={applicant.photos}
        onCapture={openCamera}
        uploadingTag={uploadingTag}
      />

      <RepeatableSlotGroup
        title="Tattoos"
        prefix="tattoo"
        count={tattooCount}
        photos={applicant.photos}
        onCapture={openCamera}
        uploadingTag={uploadingTag}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 24 }}
        onClick={() => navigate(goToMeasurements ? `/measurements/${id}?from=pools` : "/photo-station")}
      >
        {goToMeasurements ? "Continue to measurements →" : "Done — back to queue"}
      </button>
    </div>
  );
}

function RepeatableSlotGroup({ title, prefix, count, photos, onCapture, uploadingTag }) {
  const nextIndex = count + 1;
  const nextTag = `${prefix}_${nextIndex}`;
  const isUploadingNext = uploadingTag === nextTag;

  const existing = [];
  for (let i = 1; i <= count; i++) {
    const tag = `${prefix}_${i}`;
    const matches = photos.filter((p) => p.tag === tag);
    if (matches.length) existing.push({ index: i, tag, photo: matches[matches.length - 1] });
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <span className="field-label">{title} — tap a photo to retake it</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {existing.map(({ index, tag, photo }) => {
          const isUploadingThis = uploadingTag === tag;
          return (
            <button
              key={index}
              onClick={() => onCapture(tag)}
              disabled={isUploadingThis}
              style={{ width: 90, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={photo.url}
                  alt={`${title} ${index}`}
                  style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "2px solid var(--yes)", display: "block" }}
                />
                {isUploadingThis && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, borderRadius: 8 }}>
                    Uploading…
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, textAlign: "center", marginTop: 4, color: "var(--yes)", fontWeight: 600 }}>
                ✓ #{index} · retake
              </div>
            </button>
          );
        })}

        <button
          onClick={() => onCapture(nextTag)}
          disabled={isUploadingNext}
          style={{
            width: 90,
            height: 90,
            border: "1.5px dashed var(--line-strong)",
            borderRadius: 8,
            background: "var(--paper)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "var(--brass)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isUploadingNext ? "…" : `+ Add #${nextIndex}`}
        </button>
      </div>
    </div>
  );
}