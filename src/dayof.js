// Shared helpers for the Day of Show pages.

// Every Day of Show page, in the order they appear on the hub and in the page menu.
// Flip `built` to true as each page goes live.
export const DAY_OF_PAGES = [
  { path: "/day-of/check-in", label: "Check-In", built: false, accent: "var(--brass)" },
  { path: "/day-of/non-model", label: "Non-Model Check-In Additions", built: true, accent: "var(--navy)" },
  { path: "/day-of/headshots", label: "Print Headshots", built: false, accent: "var(--yes)" },
  { path: "/day-of/hair", label: "Hair Team", built: false, accent: "var(--maybe)" },
  { path: "/day-of/makeup", label: "Make Up Team", built: false, accent: "var(--brass)" },
];

// Today's date in Portland time, as YYYY-MM-DD (so the default day is right
// even if the device or server clock is in another time zone).
export function todayInPortland() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

// Default show day for the Day of Show pages: today if it is a show day, otherwise the first.
export function pickDefaultDay(days) {
  if (!days || days.length === 0) return null;
  const today = todayInPortland();
  const match = days.find((d) => d.show_date === today);
  return (match || days[0]).id;
}