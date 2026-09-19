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

  getShowDays: () => request(`/show-days`),

  getDesigners: (showDayId) => request(`/designers?show_day_id=${showDayId}`),

  addDesigner: (payload) => request(`/designers`, { method: "POST", body: JSON.stringify(payload) }),

  removeDesigner: (designerId) => request(`/designers/${designerId}`, { method: "DELETE" }),

  moveDesigner: (designerId, showDayId) =>
    request(`/designers/${designerId}/move`, { method: "PUT", body: JSON.stringify({ show_day_id: showDayId }) }),

  setDesignerRosterOnly: (designerId, rosterOnly) =>
    request(`/designers/${designerId}/roster-only`, { method: "PUT", body: JSON.stringify({ roster_only: rosterOnly }) }),

  setDesignerNotes: (designerId, notes) =>
    request(`/designers/${designerId}/notes`, { method: "PUT", body: JSON.stringify({ notes }) }),

  reorderDesigners: (orderedIds) =>
    request(`/designers/reorder`, { method: "PUT", body: JSON.stringify({ ordered_ids: orderedIds }) }),

  reorderAssignments: (designerId, orderedApplicantIds) =>
    request(`/designers/${designerId}/assignments/reorder`, { method: "PUT", body: JSON.stringify({ ordered_applicant_ids: orderedApplicantIds }) }),

  addAssignment: (designerId, applicantId) =>
    request(`/designers/${designerId}/assignments`, { method: "POST", body: JSON.stringify({ applicant_id: applicantId }) }),

  removeAssignment: (designerId, applicantId) =>
    request(`/designers/${designerId}/assignments/${applicantId}`, { method: "DELETE" }),

  getFinalRoster: (showDayId) => request(`/final-roster?show_day_id=${showDayId}`),

  getDirectory: () => request(`/applicants/directory`),

  resetApplicant: (applicantId) => request(`/applicants/${applicantId}/reset`, { method: "POST" }),

  resetAllApplicants: () => request(`/applicants/reset-all`, { method: "POST" }),

  updateContactInfo: (applicantId, payload) =>
    request(`/applicants/${applicantId}/contact-info`, { method: "PUT", body: JSON.stringify(payload) }),

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

  getDesignerDeck: (token) => request(`/deck/${token}`),

  setDeckPreference: (token, applicantId, preference) =>
    request(`/deck/${token}/models/${applicantId}/preference`, { method: "PUT", body: JSON.stringify({ preference }) }),
};