import { Routes, Route } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import DateRangePage from "@/pages/DateRangePage";
import MealsResultPage from "@/pages/MealsResultPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/school/:schoolCode" element={<DateRangePage />} />
      <Route path="/school/:schoolCode/meals" element={<MealsResultPage />} />
    </Routes>
  );
}
