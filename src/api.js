const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res.text();
}

export const api = {
  searchApplicants: (q, eventId) =>
    request(`/applicants/search?q=${encodeURIComponent(q)}${eventId ? `&event_id=${eventId}` : ""}`),

  getRoster: (eventId) => request(`/applicants/roster?event_id=${eventId}`),

  getPoolsList: () => request(`/applicants/pools-list`),

  createPoolGuest: (payload) =>
    request(`/applicants/pool-guest`, { method: "POST", body: JSON.stringify(payload) }),

  getCheckinList: () => request(`/applicants/checkin-list`),

  getPhotoStationList: (eventId) => request(`/applicants/photo-station-list?event_id=${eventId}`),

  getMeasurementsList: (eventId) => request(`/applicants/measurements-list?event_id=${eventId}`),

  importCsv: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/applicants/import-csv`, { method: "POST", body: form }).then((res) => {
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    });
  },

  getEvents: () => request(`/events`),

  getMeasurement: (applicantId) => request(`/applicants/${applicantId}/measurement`),

  saveMeasurement: (applicantId, payload) =>
    request(`/applicants/${applicantId}/measurement`, { method: "PUT", body: JSON.stringify(payload) }),

  checkinApplicant: (applicantId, payload) =>
    request(`/applicants/${applicantId}/checkin`, { method: "PUT", body: JSON.stringify(payload) }),

  getApplicantDetail: (applicantId) => request(`/applicants/${applicantId}/detail`),

  addManualApplicant: (payload) =>
    request(`/applicants/manual`, { method: "POST", body: JSON.stringify(payload) }),

  updateCastingStatus: (applicantId, payload) =>
    request(`/applicants/${applicantId}/casting-status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  setPool: (applicantId, pool) =>
    request(`/applicants/${applicantId}/pool`, {
      method: "PUT",
      body: JSON.stringify({ pool }),
    }),

  uploadPhoto: (applicantId, file, tag) => {
    const form = new FormData();
    form.append("applicant_id", applicantId);
    form.append("tag", tag || "");
    form.append("file", file);
    return fetch(`${API_BASE}/ingest/photo`, { method: "POST", body: form }).then((res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    });
  },

  listDecks: (eventId) => request(`/decks?event_id=${eventId}`),

  createDeck: (eventId, designerName) =>
    request(`/decks?event_id=${eventId}&designer_name=${encodeURIComponent(designerName)}`, {
      method: "POST",
    }),

  getDeck: (deckId) => request(`/decks/${deckId}`),

  addModelToDeck: (deckId, applicantId) =>
    request(`/decks/${deckId}/models/${applicantId}`, { method: "PUT" }),

  removeModelFromDeck: (deckId, applicantId) =>
    request(`/decks/${deckId}/models/${applicantId}`, { method: "DELETE" }),

  viewDeckByToken: (token) => request(`/decks/view/${token}`),

  setDesignerResponse: (token, applicantId, response) =>
    request(
      `/decks/view/${token}/models/${applicantId}/response?designer_response=${response || ""}`,
      { method: "PUT" }
    ),
};