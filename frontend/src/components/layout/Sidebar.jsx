import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const StudentNav = [
  { icon: '🏠', label: 'Dashboard', path: '/student' },
  { icon: '📖', label: 'My Courses', path: '/student/courses' },
  { icon: '📅', label: 'Timetable', path: '/student/timetable' },
  { icon: '✅', label: 'Attendance', path: '/student/attendance' },
  { icon: '📝', label: 'Assignments', path: '/student/assignments' },
  { icon: '🎥', label: 'Videos', path: '/student/videos' },
  { icon: '📹', label: 'Live Classes', path: '/student/live-classes' },
  { icon: '🎯', label: 'Quizzes', path: '/student/quizzes' },
  { icon: '📊', label: 'Marks', path: '/student/marks' },
  { icon: '💬', label: 'Messages', path: '/student/messages' },
  { icon: '🔔', label: 'Notifications', path: '/student/notifications' },
  { icon: '🤖', label: 'AI Tutor', path: '/student/chatbot' },
  { icon: '👤', label: 'Profile', path: '/student/profile' },
]

const TeacherNav = [
  { icon: '🏠', label: 'Dashboard', path: '/teacher' },
  { icon: '👥', label: 'Students', path: '/teacher/students' },
  { icon: '📖', label: 'Courses', path: '/teacher/courses' },
  { icon: '📅', label: 'Timetable', path: '/teacher/timetable' },
  { icon: '✅', label: 'Attendance', path: '/teacher/attendance' },
  { icon: '📝', label: 'Assignments', path: '/teacher/assignments' },
  { icon: '🎥', label: 'Videos', path: '/teacher/videos' },
  { icon: '📹', label: 'Live Classes', path: '/teacher/live-classes' },
  { icon: '🎯', label: 'Quizzes', path: '/teacher/quizzes' },
  { icon: '📊', label: 'Analytics', path: '/teacher/analytics' },
  { icon: '💬', label: 'Messages', path: '/teacher/messages' },
  { icon: '🔔', label: 'Announce', path: '/teacher/announcements' },
  { icon: '👤', label: 'Profile', path: '/teacher/profile' },
]

const ParentNav = [
  { icon: '🏠', label: 'Dashboard', path: '/parent' },
  { icon: '📊', label: 'Progress', path: '/parent/progress' },
  { icon: '✅', label: 'Attendance', path: '/parent/attendance' },
  { icon: '📊', label: 'Marks', path: '/parent/marks' },
  { icon: '📅', label: 'Timetable', path: '/parent/timetable' },
  { icon: '🔔', label: 'Notifications', path: '/parent/notifications' },
  { icon: '👤', label: 'Profile', path: '/parent/profile' },
]

const NAV_MAP = { student: StudentNav, teacher: TeacherNav, parent: ParentNav }

export default function Sidebar({ role, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const navItems = NAV_MAP[role] || []

  const handleLogout = async () => {
    setLoggingOut(true)
    await signOut()
    navigate('/')
  }

  const handleNav = (path) => {
    navigate(path)
    setMobileOpen && setMobileOpen(false)
  }

  const isActive = (path) => {
    if (path === `/${role}`) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#12122a] border-r border-[#2a2a4a] flex flex-col z-40
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:z-auto
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-[#2a2a4a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-800 rounded-xl flex items-center justify-center text-white font-black text-sm">A</div>
            <span className="text-white font-black text-xl tracking-wider">ACADEMIA</span>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-[#2a2a4a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{profile?.name || 'Loading...'}</p>
              <p className="text-[#9898b8] text-xs capitalize">{role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`sidebar-link w-full ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#2a2a4a]">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <span>🚪</span>
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
