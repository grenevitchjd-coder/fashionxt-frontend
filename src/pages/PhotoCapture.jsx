import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";

const TAGS = ["front", "side", "swim", "other"];

export default function PhotoCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [tag, setTag] = useState("front");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadPhoto(id, file, tag);
      setDone(true);
      setFile(null);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Add photo</h1>

      {preview ? (
        <div className="card" style={{ textAlign: "center" }}>
          <img
            src={preview}
            alt="preview"
            style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 12 }}
          />
          <div className="field">
            <span className="field-label">Tag</span>
            <select value={tag} onChange={(e) => setTag(e.target.value)}>
              {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => { setFile(null); setPreview(null); }}
            >
              Retake
            </button>
            <button
              className="btn btn-brass"
              style={{ flex: 1 }}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Save photo"}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-block"
          style={{ padding: "40px 16px" }}
          onClick={() => fileInputRef.current?.click()}
        >
          Open camera
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {done && (
        <div className="card" style={{ background: "var(--yes-bg)", borderColor: "var(--yes)", marginTop: 16 }}>
          <p style={{ color: "var(--yes)", margin: 0, fontWeight: 600 }}>Photo saved.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setDone(false)}>Add another</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/applicant/${id}`)}>
              Back to profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}