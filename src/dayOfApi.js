// API calls for the Day of Show check-in page and its printouts.
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
const put = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) });

export const dayOfApi = {
  getCheckinList: (showDayId) => request(`/day-of/checkin-list?show_day_id=${showDayId}`),

  setModelCheckIn: (applicantId, showDayId, checkedIn) =>
    post(`/day-of/models/${applicantId}/check-in`, { show_day_id: showDayId, checked_in: checkedIn }),

  setModelNote: (applicantId, showDayId, note) =>
    request(`/day-of/models/${applicantId}/note`, {
      method: "PUT",
      body: JSON.stringify({ show_day_id: showDayId, note }),
    }),

  setDesignerCheckIn: (designerId, checkedIn) =>
    post(`/day-of/designers/${designerId}/check-in`, { checked_in: checkedIn }),

  setAttendeeCheckIn: (attendeeId, checkedIn) =>
    post(`/day-of/attendees/${attendeeId}/check-in`, { checked_in: checkedIn }),

  // ---- Hair / Make Up teams (team = "hair" | "makeup") ----
  getTeamBoard: (team, showDayId) => request(`/day-of/teams/${team}?show_day_id=${showDayId}`),

  // status: "todo" | "in_progress" | "done"
  setLookStatus: (team, applicantId, designerId, status) =>
    post(`/day-of/teams/${team}/look-status`, { applicant_id: applicantId, designer_id: designerId, status }),

  setAllLooksDone: (team, applicantId, showDayId, done) =>
    post(`/day-of/teams/${team}/all-done`, { applicant_id: applicantId, show_day_id: showDayId, done }),

  setTeamOrder: (team, designerId, applicantIds) =>
    put(`/day-of/teams/${team}/order`, { designer_id: designerId, applicant_ids: applicantIds }),

  resetTeamOrder: (team, designerId) =>
    request(`/day-of/teams/${team}/order?designer_id=${designerId}`, { method: "DELETE" }),

  // ---- Model Tracking ----
  getTracking: (showDayId) => request(`/day-of/tracking?show_day_id=${showDayId}`),

  setRehearsal: (applicantId, designerId, attended) =>
    post(`/day-of/tracking/rehearsal`, { applicant_id: applicantId, designer_id: designerId, attended }),

  // ---- Print Headshots ----
  getHeadshotModels: () => request(`/day-of/headshots/models`),
};

// Download links for the PDFs (plain links work on every device, including the Quest).
export const dayOfPrintUrls = {
  checkInSheet: (showDayId, onlyMissing) =>
    `${API_BASE}/day-of/print/check-in-sheet?show_day_id=${showDayId}&only_missing=${onlyMissing ? 1 : 0}`,
  modelCards: (showDayId) => `${API_BASE}/day-of/print/model-cards?show_day_id=${showDayId}`,
  teamSheet: (team, showDayId) => `${API_BASE}/day-of/print/team-sheet?team=${team}&show_day_id=${showDayId}`,
  // list = [{ id, copies }, ...] in print order
  headshots: (list) => `${API_BASE}/day-of/print/headshots?items=${list.map((p) => `${p.id}:${p.copies}`).join(",")}`,
};