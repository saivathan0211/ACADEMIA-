import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Auth Pages
import RoleSelect from './pages/auth/RoleSelect'
import StudentLogin from './pages/auth/StudentLogin'
import StudentRegister from './pages/auth/StudentRegister'
import TeacherLogin from './pages/auth/TeacherLogin'
import TeacherRegister from './pages/auth/TeacherRegister'
import ParentLogin from './pages/auth/ParentLogin'
import ParentRegister from './pages/auth/ParentRegister'
import ForgotPassword from './pages/auth/ForgotPassword'

// Dashboard Pages
import StudentDashboard from './pages/student/StudentDashboard'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import ParentDashboard from './pages/parent/ParentDashboard'

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0d1a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#9898b8] text-sm">Loading Academia...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) return <Navigate to="/" replace />
  if (allowedRoles && !allowedRoles.includes(profile.role)) return <Navigate to="/" replace />
  return children
}

const DashboardRedirect = () => {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/" replace />
  if (profile.role === 'student') return <Navigate to="/student" replace />
  if (profile.role === 'teacher') return <Navigate to="/teacher" replace />
  if (profile.role === 'parent') return <Navigate to="/parent" replace />
  return <Navigate to="/" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/" element={<RoleSelect />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/register" element={<StudentRegister />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/teacher/register" element={<TeacherRegister />} />
        <Route path="/parent/login" element={<ParentLogin />} />
        <Route path="/parent/register" element={<ParentRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* Protected Routes */}
        <Route path="/student/*" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentDashboard />
          </PrivateRoute>
        } />
        <Route path="/teacher/*" element={
          <PrivateRoute allowedRoles={['teacher']}>
            <TeacherDashboard />
          </PrivateRoute>
        } />
        <Route path="/parent/*" element={
          <PrivateRoute allowedRoles={['parent']}>
            <ParentDashboard />
          </PrivateRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
