import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { CandidateDashboard } from './pages/CandidateDashboard';
import { CandidateProfile } from './pages/CandidateProfile';
import { CandidateNotifications } from './pages/CandidateNotifications';
import { PanelDashboard } from './pages/PanelDashboard';
import { PanelCandidates } from './pages/PanelCandidates';
import { PanelSchedule } from './pages/PanelSchedule';
import { PanelNotifications } from './pages/PanelNotifications';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminCandidates } from './pages/AdminCandidates';
import { AdminPanels } from './pages/AdminPanels';
import { AdminRoles } from './pages/AdminRoles';
import { AdminSchedule } from './pages/AdminSchedule';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { AdminSettings } from './pages/AdminSettings';
import { PanelSettings } from './pages/PanelSettings';
import { Landing } from './pages/Landing';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* Candidate Routes */}
          <Route
            path="/candidate/dashboard"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/candidate" element={<Navigate to="/candidate/dashboard" replace />} />
          <Route
            path="/candidate/profile"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/notifications"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateNotifications />
              </ProtectedRoute>
            }
          />


          {/* Panel Routes */}
          <Route
            path="/panel/dashboard"
            element={
              <ProtectedRoute allowedRoles={['panel']}>
                <PanelDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/panel" element={<Navigate to="/panel/dashboard" replace />} />
          <Route
            path="/panel/candidates"
            element={
              <ProtectedRoute allowedRoles={['panel']}>
                <PanelCandidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/schedule"
            element={
              <ProtectedRoute allowedRoles={['panel']}>
                <PanelSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/notifications"
            element={
              <ProtectedRoute allowedRoles={['panel']}>
                <PanelNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/settings"
            element={
              <ProtectedRoute allowedRoles={['panel']}>
                <PanelSettings />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/candidates"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCandidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/panels"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminRoles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schedule"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}