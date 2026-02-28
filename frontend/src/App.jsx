/**
 * App.jsx
 * -------------------------------------------------
 * Main application component for CampusPulse v2.0
 * Production-grade with:
 *  - Error boundary
 *  - Responsive mobile navigation
 *  - Role-based route protection
 *  - Theme toggle (dark/light)
 *  - Authenticated navigation
 * -------------------------------------------------
 */
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import SelectRole from './pages/SelectRole';

import Profile from './pages/Profile';
import Inbox from './pages/Inbox';
import Community from './pages/Community';
import Events from './pages/Events';
import ErrorBoundary from './components/ErrorBoundary';
import ProfileRing from './components/ProfileRing';
import { AuthProvider, useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, Sun, LogOut, User as UserIcon, LayoutDashboard,
  Home as HomeIcon, Activity,
  Inbox as InboxIcon, MessagesSquare, CalendarDays,
  Menu, X, Shield
} from 'lucide-react';

/* Protected Route wrapper */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth/select-role" />;
  if (adminOnly && !['admin', 'editor_admin', 'black_hat_admin'].includes(user.role)) return <Navigate to="/" />;
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

/* Role badge component */
const RoleBadge = ({ role }) => {
  const roleConfig = {
    black_hat_admin: { label: 'SUPER ADMIN', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    admin: { label: 'ADMIN', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    editor_admin: { label: 'EDITOR', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    faculty: { label: 'FACULTY', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    student: { label: 'STUDENT', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' }
  };
  const config = roleConfig[role] || roleConfig.student;
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em',
      padding: '2px 8px', borderRadius: '100px',
      background: config.bg, color: config.color,
      border: `1px solid ${config.color}20`
    }}>
      {config.label}
    </span>
  );
};

/**
 * Get a short display name — first name only, max ~12 chars.
 * "kasa kranthi kiran" → "Kranthi"
 * "Ashok Kumar" → "Ashok"
 * "John" → "John"
 */
const getShortName = (fullName) => {
  if (!fullName) return 'User';
  const parts = fullName.trim().split(/\s+/);
  // If 3+ names, use the middle one (common Indian naming: last first middle)
  // If 2 names, use the first
  // If 1 name, use it
  let displayName;
  if (parts.length >= 3) {
    displayName = parts[1]; // middle name
  } else {
    displayName = parts[0]; // first name
  }
  // Capitalize first letter
  return displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
};

function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  };

  const isAdmin = user && ['admin', 'editor_admin', 'black_hat_admin'].includes(user.role);
  const canViewDashboard = user && ['admin', 'editor_admin', 'black_hat_admin', 'faculty'].includes(user.role);

  return (
    <>
      <ScrollToTop />
      <div className="app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* ========== NAVIGATION ========== */}
        <nav>
          <div className="nav-container">
            <Link to="/" className="logo" id="nav-logo">
              <div className="logo-icon">
                <Activity size={18} />
              </div>
              CampusPulse
            </Link>

            {/* Desktop Navigation */}
            <ul className="nav-main" id="nav-main-desktop">
              <li>
                <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} id="nav-home">
                  <HomeIcon size={18} /> <span>Home</span>
                </Link>
              </li>

              {user && (
                <>
                  <li>
                    <Link to="/community" className={`nav-link ${location.pathname === '/community' ? 'active' : ''}`} id="nav-community">
                      <MessagesSquare size={18} /> <span>Community</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/events" className={`nav-link ${location.pathname === '/events' ? 'active' : ''}`} id="nav-events">
                      <CalendarDays size={18} /> <span>Events</span>
                    </Link>
                  </li>
                  {isAdmin && (
                    <>
                      <li>
                        <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`} id="nav-dashboard">
                          <LayoutDashboard size={18} /> <span>Dashboard</span>
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
                  <li className="desktop-only">
                    <Link to="/dashboard/profile" className="user-profile-btn" id="nav-profile">
                      <ProfileRing role={user.role} size={28}>
                        <div className="avatar">
                          {(user?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      </ProfileRing>
                      <span>{getShortName(user?.fullName || user?.email?.split('@')[0])}</span>
                      <RoleBadge role={user.role} />
                    </Link>
                  </li>
                  <li className="desktop-only">
                    <Link to="/dashboard/inbox" className="icon-btn" title="Inbox" id="nav-inbox">
                      <InboxIcon size={20} />
                    </Link>
                  </li>
                  <div className="nav-divider desktop-only"></div>
                  <li className="desktop-only">
                    <button onClick={logout} className="icon-btn logout-btn" title="Logout" id="nav-logout">
                      <LogOut size={18} />
                    </button>
                  </li>
                </>
              )}

              <li>
                <button onClick={toggleDarkMode} className="icon-btn" title="Toggle Theme" id="nav-theme-toggle">
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </li>

              {/* Mobile menu toggle */}
              <li className="mobile-only">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="icon-btn"
                  title="Menu"
                  id="nav-mobile-toggle"
                >
                  {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </li>
            </ul>
          </div>

          {/* Mobile Menu Overlay */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                className="mobile-menu-overlay"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
                id="mobile-menu"
              >
                <div className="mobile-menu-content">
                  {user && (
                    <div className="mobile-user-info">
                      <ProfileRing role={user.role} size={40}>
                        <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                          {(user?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      </ProfileRing>
                      <div>
                        <div style={{ fontWeight: '700' }}>{getShortName(user?.fullName || user?.email?.split('@')[0])}</div>
                        <RoleBadge role={user.role} />
                      </div>
                    </div>
                  )}

                  <Link to="/" className="mobile-menu-link">
                    <HomeIcon size={18} /> Home
                  </Link>

                  {user && (
                    <>
                      <Link to="/community" className="mobile-menu-link">
                        <MessagesSquare size={18} /> Community
                      </Link>
                      <Link to="/events" className="mobile-menu-link">
                        <CalendarDays size={18} /> Events
                      </Link>
                      <Link to="/dashboard/inbox" className="mobile-menu-link">
                        <InboxIcon size={18} /> Inbox
                      </Link>
                      <Link to="/dashboard/profile" className="mobile-menu-link">
                        <UserIcon size={18} /> Profile
                      </Link>
                      {isAdmin && (
                        <>
                          <div className="mobile-menu-divider"></div>
                          <div className="mobile-menu-section-label">
                            <Shield size={14} /> Admin
                          </div>
                          <Link to="/dashboard" className="mobile-menu-link">
                            <LayoutDashboard size={18} /> Dashboard
                          </Link>

                        </>
                      )}
                      <div className="mobile-menu-divider"></div>
                      <button onClick={logout} className="mobile-menu-link" style={{ color: 'var(--danger)', border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <LogOut size={18} /> Logout
                      </button>
                    </>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ========== MAIN CONTENT ========== */}
        <main style={{ flex: 1, paddingTop: '100px' }}>
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Navigate to="/auth/select-role" />} />
                <Route path="/register" element={<Navigate to="/auth/select-role" />} />

                {/* Auth Routes */}
                <Route path="/auth/select-role" element={<SelectRole />} />
                <Route path="/auth/student/login" element={<Login routeType="student" />} />
                <Route path="/auth/faculty/login" element={<Login routeType="faculty" />} />
                <Route path="/auth/student/register" element={<Register routeType="student" />} />
                <Route path="/auth/faculty/register" element={<Register routeType="faculty" />} />
                <Route path="/auth/student/forgot-password" element={<ForgotPassword routeType="student" />} />
                <Route path="/auth/faculty/forgot-password" element={<ForgotPassword routeType="faculty" />} />

                {/* Protected Routes */}
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


                {/* 404 Catch-all */}
                <Route path="*" element={
                  <div className="container" style={{ textAlign: 'center', padding: '8rem 0' }}>
                    <h1 className="gradient-text" style={{ fontSize: '6rem', lineHeight: 1 }}>404</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', margin: '1rem 0 2rem' }}>
                      Page not found. The page you're looking for doesn't exist.
                    </p>
                    <Link to="/" className="btn btn-primary">
                      <HomeIcon size={18} /> Go Home
                    </Link>
                  </div>
                } />
              </Routes>
            </AnimatePresence>
          </ErrorBoundary>
        </main>

        {/* ========== FOOTER ========== */}
        <footer style={{
          background: 'rgba(0,0,0,0.15)',
          padding: '4rem 0',
          borderTop: '1px solid var(--glass-border)'
        }}>
          <div className="container">
            <div className="footer-grid">
              <div>
                <Link to="/" className="logo" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
                  <div className="logo-icon" style={{ width: '28px', height: '28px', borderRadius: '8px' }}>
                    <Activity size={16} />
                  </div>
                  CampusPulse
                </Link>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '400px', marginTop: '1rem' }}>
                  The official campus community platform for SREC Nandyal.
                  Admin-driven reviews, community posts, and campus events — all in one place.
                </p>
              </div>
              <div>
                <h4 style={{ marginBottom: '1.5rem', color: 'var(--accent-green-light)' }}>Platform</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <li><Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>How it Works</Link></li>
                  <li><Link to="/auth/select-role" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Student Portal</Link></li>
                  <li><Link to="/community" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Community</Link></li>
                  <li><Link to="/events" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Events</Link></li>
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
            <div style={{ textAlign: 'center', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)', marginTop: '3rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                © 2026 CampusPulse v2.0 — SREC Nandyal. Production-Grade Campus Platform.
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
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
