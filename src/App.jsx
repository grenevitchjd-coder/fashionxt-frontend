import { Routes, Route } from "react-router-dom";
import { EventProvider } from "./components/EventContext.jsx";
import Topbar from "./components/Topbar.jsx";
import Home from "./pages/Home.jsx";
import Placeholder from "./pages/Placeholder.jsx";
import Roster from "./pages/Roster.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import ApplicantDetail from "./pages/ApplicantDetail.jsx";
import PhotoCapture from "./pages/PhotoCapture.jsx";
import ManualAdd from "./pages/ManualAdd.jsx";
import Decks from "./pages/Decks.jsx";
import DeckBuilder from "./pages/DeckBuilder.jsx";
import DesignerView from "./pages/DesignerView.jsx";

function StaffLayout({ children }) {
  return (
    <div className="app-shell">
      <Topbar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <EventProvider>
      <Routes>
        {/* Public — no topbar, no login, reached via share link */}
        <Route path="/deck/:token" element={<DesignerView />} />

        {/* Home — password gate lives here */}
        <Route path="/" element={<Home />} />

        {/* Staff-facing screens */}
        <Route path="/roster" element={<StaffLayout><Roster /></StaffLayout>} />
        <Route path="/checkin" element={<StaffLayout><CheckIn /></StaffLayout>} />
        <Route path="/applicant/:id" element={<StaffLayout><ApplicantDetail /></StaffLayout>} />
        <Route path="/photo/:id" element={<StaffLayout><PhotoCapture /></StaffLayout>} />
        <Route path="/add" element={<StaffLayout><ManualAdd /></StaffLayout>} />
        <Route path="/decks" element={<StaffLayout><Decks /></StaffLayout>} />
        <Route path="/decks/:deckId" element={<StaffLayout><DeckBuilder /></StaffLayout>} />

        {/* Not built yet — placeholders so nothing breaks */}
        <Route path="/pools" element={<StaffLayout><Placeholder title="Model Pools" /></StaffLayout>} />
        <Route path="/audition/portland" element={<StaffLayout><Placeholder title="Portland Auditions" /></StaffLayout>} />
        <Route path="/audition/seattle" element={<StaffLayout><Placeholder title="Seattle Auditions" /></StaffLayout>} />
      </Routes>
    </EventProvider>
  );
}