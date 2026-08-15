import React, { createContext, useContext, useState } from "react";

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const [eventId, setEventIdState] = useState(() => localStorage.getItem("eventId") || "");

  const setEventId = (id) => {
    localStorage.setItem("eventId", id);
    setEventIdState(id);
  };

  return (
    <EventContext.Provider value={{ eventId, setEventId }}>{children}</EventContext.Provider>
  );
}

export function useEvent() {
  return useContext(EventContext);
}