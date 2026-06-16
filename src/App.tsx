import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import OkrList from "@/pages/OkrList";
import OkrDetail from "@/pages/OkrDetail";
import WeeklyUpdate from "@/pages/WeeklyUpdate";
import Heatmap from "@/pages/Heatmap";
import Review from "@/pages/Review";
import Archive from "@/pages/Archive";
import Dependencies from "@/pages/Dependencies";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/okrs" element={<OkrList />} />
          <Route path="/okrs/:id" element={<OkrDetail />} />
          <Route path="/weekly" element={<WeeklyUpdate />} />
          <Route path="/heatmap" element={<Heatmap />} />
          <Route path="/review" element={<Review />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/dependencies" element={<Dependencies />} />
        </Routes>
      </Layout>
    </Router>
  );
}
