import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Providers, useAuth } from './context.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import News from './pages/News.jsx';
import NewsDetail from './pages/NewsDetail.jsx';
import Volunteer from './pages/Volunteer.jsx';
import Contact from './pages/Contact.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import Meetings from './pages/Meetings.jsx';
import MeetingDetail from './pages/MeetingDetail.jsx';
import MeetingProtocol from './pages/MeetingProtocol.jsx';
import VoteDetail from './pages/VoteDetail.jsx';
import Surveys from './pages/Surveys.jsx';
import Downloads from './pages/Downloads.jsx';
import Members from './pages/Members.jsx';
import Partners from './pages/Partners.jsx';
import Jobs from './pages/Jobs.jsx';
import Donate from './pages/Donate.jsx';
import Privacy from './pages/Privacy.jsx';
import { initGa } from './seo.js';
import { Login, Register, Forgot, Reset, VerifyEmail } from './pages/Auth.jsx';

function Protected({ children, adminOnly = false }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="py-16 text-center text-slate-400">…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !['admin', 'deputy'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function Shell() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<Forgot />} />
          <Route path="/reset-password/:token" element={<Reset />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/meetings" element={<Protected><Meetings /></Protected>} />
          <Route path="/meetings/:id" element={<Protected><MeetingDetail /></Protected>} />
          <Route path="/meetings/:id/protocol" element={<Protected adminOnly><MeetingProtocol /></Protected>} />
          <Route path="/votes/:id" element={<Protected><VoteDetail /></Protected>} />
          <Route path="/members" element={<Protected><Members /></Protected>} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/surveys" element={<Protected><Surveys /></Protected>} />
          <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  useEffect(() => { initGa(); }, []);
  return (
    <Providers>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </Providers>
  );
}
