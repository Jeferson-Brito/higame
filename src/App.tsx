import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { PrivateRoute } from '@/components/PrivateRoute'
import { AppLayout } from '@/components/layout/AppLayout'

// Páginas públicas
import Login from '@/pages/Login'

// Páginas do colaborador
import Dashboard from '@/pages/Dashboard'
import Ranking from '@/pages/Ranking'
import Seasons from '@/pages/Seasons'
import Profile from '@/pages/Profile'
import Players from '@/pages/Players'
import Store from '@/pages/Store'
import Badges from '@/pages/Badges'

// Páginas admin
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminEmployees from '@/pages/admin/Employees'
import AdminSeasons from '@/pages/admin/Seasons'
import SeasonDetails from '@/pages/admin/SeasonDetails'
import AdminKPIs from '@/pages/admin/KPIs'
import AdminResults from '@/pages/admin/Results'
import AdminRanking from '@/pages/admin/AdminRanking'
import AdminStore from '@/pages/admin/AdminStore'
import AdminQuests from '@/pages/admin/AdminQuests'
import AdminBadges from '@/pages/admin/AdminBadges'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<Login />} />

          {/* Área do Colaborador */}
          <Route path="/" element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="seasons" element={<Seasons />} />
            <Route path="profile" element={<Profile />} />
            <Route path="players" element={<Players />} />
            <Route path="players/:id" element={<Profile />} />
            <Route path="store" element={<Store />} />
            <Route path="badges" element={<Badges />} />
          </Route>

          {/* Área Admin */}
          <Route path="/admin" element={
            <PrivateRoute requiredRole="admin">
              <AppLayout />
            </PrivateRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="badges" element={<AdminBadges />} />
            <Route path="seasons" element={<AdminSeasons />} />
            <Route path="seasons/:id" element={<SeasonDetails />} />
            <Route path="kpis" element={<AdminKPIs />} />
            <Route path="results" element={<AdminResults />} />
            <Route path="ranking" element={<AdminRanking />} />
            <Route path="store" element={<AdminStore />} />
            <Route path="quests" element={<AdminQuests />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#12121F',
            border: '1px solid #2A2A45',
            color: '#E2E8F0',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            borderRadius: '12px',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#12121F' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#12121F' },
          },
        }}
      />
    </AuthProvider>
  )
}
