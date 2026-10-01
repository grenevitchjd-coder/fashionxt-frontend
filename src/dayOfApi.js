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
};

// Download links for the PDFs (plain links work on every device, including the Quest).
export const dayOfPrintUrls = {
  checkInSheet: (showDayId, onlyMissing) =>
    `${API_BASE}/day-of/print/check-in-sheet?show_day_id=${showDayId}&only_missing=${onlyMissing ? 1 : 0}`,
  modelCards: (showDayId) => `${API_BASE}/day-of/print/model-cards?show_day_id=${showDayId}`,
};