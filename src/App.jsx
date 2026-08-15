import { Routes, Route } from "react-router-dom";
import { EventProvider } from "./components/EventContext.jsx";
import Topbar from "./components/Topbar.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Placeholder from "./pages/Placeholder.jsx";
import Roster from "./pages/Roster.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import CastingDirectors from "./pages/CastingDirectors.jsx";
import PhotoStation from "./pages/PhotoStation.jsx";
import ApplicantDetail from "./pages/ApplicantDetail.jsx";
import PhotoCapture from "./pages/PhotoCapture.jsx";
import ManualAdd from "./pages/ManualAdd.jsx";
import Decks from "./pages/Decks.jsx";
import DeckBuilder from "./pages/DeckBuilder.jsx";
import DesignerView from "./pages/DesignerView.jsx";

function StaffLayout({ children, guarded }) {
  return (
    <div className="app-shell">
      <Topbar />
      {guarded ? <RequireAuth>{children}</RequireAuth> : children}
    </div>
  );
}

export default function App() {
  return (
    <EventProvider>
      <Routes>
        {/* Public — no topbar, no login, reached via share link */}
        <Route path="/deck/:token" element={<DesignerView />} />

        {/* Admin — password required (Roster, Model Pools, Decks, Add Guest) */}
        <Route path="/" element={<StaffLayout guarded><Roster /></StaffLayout>} />
        <Route path="/pools" element={<StaffLayout guarded><Placeholder title="Model Pools" /></StaffLayout>} />
        <Route path="/decks" element={<StaffLayout guarded><Decks /></StaffLayout>} />
        <Route path="/decks/:deckId" element={<StaffLayout guarded><DeckBuilder /></StaffLayout>} />
        <Route path="/add" element={<StaffLayout guarded><ManualAdd /></StaffLayout>} />

        {/* Audition-day stations — no password, needs to be instant */}
        <Route path="/checkin" element={<StaffLayout><CheckIn /></StaffLayout>} />
        <Route path="/casting" element={<StaffLayout><CastingDirectors /></StaffLayout>} />
        <Route path="/photo-station" element={<StaffLayout><PhotoStation /></StaffLayout>} />
        <Route path="/applicant/:id" element={<StaffLayout><ApplicantDetail /></StaffLayout>} />
        <Route path="/photo/:id" element={<StaffLayout><PhotoCapture /></StaffLayout>} />
        <Route path="/audition/portland" element={<StaffLayout><Placeholder title="Portland Auditions" /></StaffLayout>} />
        <Route path="/audition/seattle" element={<StaffLayout><Placeholder title="Seattle Auditions" /></StaffLayout>} />
      </Routes>
    </EventProvider>
  );
}