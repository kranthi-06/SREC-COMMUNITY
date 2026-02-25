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
import BackgroundAnimation from './components/BackgroundAnimation';
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

  useEffect(() => {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  };

  return (
    <Router>
      <ScrollToTop />
      <div className="app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="noise-overlay"></div>
        <div className="bg-mesh">
          <div className="orb orb-ambient"></div>
        </div>
        <BackgroundAnimation />

        {/* ========== NAVIGATION ========== */}
        <nav>
          <div className="nav-container">
            <Link to="/" className="logo">
              <div className="logo-icon">
                <Activity size={20} />
              </div>
              CampusPulse
            </Link>

            <ul className="nav-links">
              <li>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HomeIcon size={18} /> Home
                </Link>
              </li>

              {user && (
                <>
                  <li>
                    <Link to="/community" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessagesSquare size={18} /> Community
                    </Link>
                  </li>
                  <li>
                    <Link to="/events" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CalendarDays size={18} /> Events
                    </Link>
                  </li>
                  <>{/* Private reviews are fetched strictly via inbox, no public submit link allowed */}</>
                  {['admin', 'editor_admin', 'hod', 'principal', 'faculty', 'black_hat_admin'].includes(user.role) && (
                    <>
                      <li>
                        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <LayoutDashboard size={18} /> Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link to="/history" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <HistoryIcon size={18} /> History
                        </Link>
                      </li>
                    </>
                  )}
                </>
              )}

              <li style={{ height: '24px', width: '1px', background: 'var(--glass-border)' }}></li>

              {!user ? (
                <>
                  <li><Link to="/auth/select-role">Sign In</Link></li>
                  <li>
                    <Link to="/auth/select-role" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                      Join SREC
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>
                    <Link to="/dashboard/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{
                        width: '30px', height: '30px',
                        background: 'linear-gradient(135deg, var(--accent-green), var(--accent-olive))',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: '800'
                      }}>
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.9rem' }}>{user.email.split('@')[0]}</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/inbox" style={{ padding: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center' }} title="Inbox">
                      <InboxIcon size={20} />
                    </Link>
                  </li>
                  <li>
                    <button onClick={logout} style={{
                      background: 'none', border: 'none',
                      color: '#ef4444', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontWeight: '600', fontSize: '0.9rem', fontFamily: 'inherit'
                    }}>
                      <LogOut size={16} /> Logout
                    </button>
                  </li>
                </>
              )}

              <li>
                <button
                  onClick={toggleDarkMode}
                  style={{
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-main)',
                    padding: '8px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center',
                    transition: '0.3s'
                  }}
                >
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
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
