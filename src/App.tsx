import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Chatbot from './components/Chatbot';
import FeedPage from './pages/FeedPage';
import MapPage from './pages/MapPage';
import AddReportPage from './pages/AddReportPage';
import InfoPage from './pages/InfoPage';
import AdminPage from './pages/AdminPage';
import AdminDashboard from './pages/AdminDashboard';
import ReportDetailPage from './pages/ReportDetailPage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/add" element={<AddReportPage />} />
          <Route path="/info" element={<InfoPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/report/:id" element={<ReportDetailPage />} />
        </Routes>
      </Layout>
      <Chatbot />
    </Router>
  );
}
