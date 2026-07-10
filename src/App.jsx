import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MoodProvider } from "./context/MoodContext";
import Landing from "./pages/Landing";
import AboutUs from "./pages/AboutUs";
import MySpace from "./pages/MySpace";
import HopeVault from "./pages/HopeVault";
import SafeCircle from "./pages/SafeCircle";
import MoodInsights from "./pages/MoodInsights";
import CalmSpace from "./pages/CalmSpace";

export default function App() {
  return (
    <MoodProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/chat" element={<Navigate to="/space" replace />} />
          <Route path="/space" element={<MySpace />} />
          <Route path="/hope-vault" element={<HopeVault />} />
          <Route path="/safe-circle" element={<SafeCircle />} />
          <Route path="/mood-insights" element={<MoodInsights />} />
          <Route path="/calm-space" element={<CalmSpace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MoodProvider>
  );
}
