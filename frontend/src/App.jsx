/**
 * App.jsx
 * -------------------------------------------------
 * Main application component for CampusPulse
 * Handles routing, navigation, theme toggle, and auth context.
 * 
 * Routes:
 *   / — Home page (public)
 *   /auth/select-role — Select role page (public)
 *   /event/:eventName — Check Review page (public, NOT behind auth)
 *     → Shows overall sentiment summary + individual student reviews
 *   /submit — Submit Review form (requires authentication)
 *   /dashboard — Admin dashboard (admin only)
 *   /history — Upload history (admin only)
 * -------------------------------------------------
 */
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import SelectRole from './pages/SelectRole';
import History from './pages/History';
import Profile from './pages/Profile';
import Inbox from './pages/Inbox';
import Community from './pages/Community';
import Events from './pages/Events';
import EventReviews from './pages/EventReviews';
import { AuthProvider, useAuth } from './context/AuthContext';



import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, LogOut, User as UserIcon, LayoutDashboard, PenLine, Home as HomeIcon, History as HistoryIcon, Activity, Inbox as InboxIcon, MessagesSquare, CalendarDays } from 'lucide-react';

/* Protected Route wrapper — redirects unauthenticated users to select-role */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth/select-role" />;
  if (adminOnly && !['admin', 'editor_admin', 'hod', 'principal', 'black_hat_admin'].includes(user.role)) return <Navigate to="/" />;
  return children;
};

/* Scroll to top on route change */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  };

  return (
    <>
      <ScrollToTop />
      <div className="app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Transparent Navigation and Main Content */}



        {/* ========== NAVIGATION ========== */}
        <nav>
          <div className="nav-container">
            <Link to="/" className="logo">
              <div className="logo-icon">
                <Activity size={18} />
              </div>
              CampusPulse
            </Link>

            <ul className="nav-main">
              <li>
                <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                  <HomeIcon size={18} /> <span>Home</span>
                </Link>
              </li>

              {user && (
                <>
                  <li>
                    <Link to="/community" className={`nav-link ${location.pathname === '/community' ? 'active' : ''}`}>
                      <MessagesSquare size={18} /> <span>Community</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/events" className={`nav-link ${location.pathname === '/events' ? 'active' : ''}`}>
                      <CalendarDays size={18} /> <span>Events</span>
                    </Link>
                  </li>
                  {['admin', 'editor_admin', 'hod', 'principal', 'faculty', 'black_hat_admin'].includes(user.role) && (
                    <>
                      <li>
                        <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                          <LayoutDashboard size={18} /> <span>Dashboard</span>
                        </Link>
                      </li>
                      <li>
                        <Link to="/history" className={`nav-link ${location.pathname === '/history' ? 'active' : ''}`}>
                          <HistoryIcon size={18} /> <span>History</span>
                        </Link>
                      </li>
                    </>
                  )}
                </>
              )}
            </ul>

            <ul className="nav-actions">
              {!user ? (
                <>
                  <li>
                    <Link to="/auth/select-role" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                      Join SREC
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/dashboard/profile" className="user-profile-btn">
                      <div className="avatar">
                        {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span>{user?.email?.split('@')[0] || 'User'}</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/inbox" className="icon-btn" title="Inbox">
                      <InboxIcon size={20} />
                    </Link>
                  </li>
                  <div className="nav-divider"></div>
                  <li>
                    <button onClick={logout} className="icon-btn logout-btn" title="Logout">
                      <LogOut size={18} />
                    </button>
                  </li>
                </>
              )}

              <li>
                <button onClick={toggleDarkMode} className="icon-btn" title="Toggle Theme">
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* ========== MAIN CONTENT ========== */}
        <main style={{ flex: 1, paddingTop: '100px' }}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Navigate to="/auth/select-role" />} />
              <Route path="/register" element={<Navigate to="/auth/select-role" />} />

              {/* Dynamic Auth Selection */}
              <Route path="/auth/select-role" element={<SelectRole />} />
              <Route path="/auth/student/login" element={<Login routeType="student" />} />
              <Route path="/auth/faculty/login" element={<Login routeType="faculty" />} />
              <Route path="/auth/student/register" element={<Register routeType="student" />} />
              <Route path="/auth/faculty/register" element={<Register routeType="faculty" />} />

              {/* Review Module is inherently secure & internal now */}
              <Route path="/community" element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              } />
              <Route path="/events" element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              } />
              <Route path="/event/:eventName" element={<EventReviews />} />

              <Route path="/dashboard" element={
                <ProtectedRoute adminOnly={true}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/inbox" element={
                <ProtectedRoute>
                  <Inbox />
                </ProtectedRoute>
              } />
              <Route path="/history" element={
                <ProtectedRoute adminOnly={true}>
                  <History />
                </ProtectedRoute>
              } />
            </Routes>
          </AnimatePresence>
        </main>

        {/* ========== FOOTER ========== */}
        <footer style={{
          background: 'rgba(0,0,0,0.15)',
          padding: '4rem 0',
          borderTop: '1px solid var(--glass-border)'
        }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '4rem', marginBottom: '3rem' }}>
              <div>
                <Link to="/" className="logo" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
                  <div className="logo-icon" style={{ width: '28px', height: '28px', borderRadius: '8px' }}>
                    <Activity size={16} />
                  </div>
                  CampusPulse
                </Link>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '400px', marginTop: '1rem' }}>
                  The official AI-powered sentiment analysis platform for SREC Nandyal.
                  Transforming student voices into actionable campus intelligence.
                </p>
              </div>
              <div>
                <h4 style={{ marginBottom: '1.5rem', color: 'var(--accent-green-light)' }}>Platform</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <li><Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>How it Works</Link></li>
                  <li><Link to="/auth/select-role" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Student Portal</Link></li>
                </ul>
              </div>
              <div>
                <h4 style={{ marginBottom: '1.5rem', color: 'var(--accent-green-light)' }}>College</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  SREC Nandyal<br />
                  Andhra Pradesh, India<br />
                  contact@srecnandyal.edu.in
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'center', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                © 2026 CampusPulse — SREC Nandyal. Engineered for Excellence.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
