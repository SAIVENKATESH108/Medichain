import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import Reports from './pages/Reports';
import ReviewQueue from './pages/ReviewQueue';
import Settings from './pages/Settings';
import QuarantineVault from './pages/QuarantineVault';
import LedgerExplorer from './pages/LedgerExplorer';
import CdscoHub from './pages/CdscoHub';
import RadarScanner from './pages/RadarScanner';
import TelemetryLab from './pages/TelemetryLab';

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
      </div>
    );
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Home />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '12px',
                background: '#0F172A',
                color: '#fff',
                fontSize: '14px',
                border: '1px solid #334155',
              },
            }}
          />
          <Routes>
            {/* Public 3D Animated Landing Page (Redirects to /dashboard if logged in) */}
            <Route path="/" element={<RootRoute />} />

            {/* Public Sign In & Sign Up Portal */}
            <Route path="/login" element={<Login />} />

            {/* Auth Verification & OAuth Callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Authenticated Workspace with Sidebar & Breadcrumbs */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/verify" element={<ProtectedRoute><Verify /></ProtectedRoute>} />
              <Route path="/review-queue" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
              <Route path="/quarantine-vault" element={<ProtectedRoute><QuarantineVault /></ProtectedRoute>} />
              <Route path="/radar-scanner" element={<ProtectedRoute><RadarScanner /></ProtectedRoute>} />
              <Route path="/telemetry-lab" element={<ProtectedRoute><TelemetryLab /></ProtectedRoute>} />
              <Route path="/cdsco-hub" element={<ProtectedRoute><CdscoHub /></ProtectedRoute>} />
              <Route path="/ledger-explorer" element={<ProtectedRoute><LedgerExplorer /></ProtectedRoute>} />
              <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            </Route>

            {/* Catch-all Wildcard Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
