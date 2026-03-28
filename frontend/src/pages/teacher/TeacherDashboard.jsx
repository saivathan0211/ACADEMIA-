import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { supabase, fetchResilientCourses, insertNotification } from '../../lib/supabase'

import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'

// Sub-pages
import TeacherStudents from './TeacherStudents'
import TeacherCourses from './TeacherCourses'
import TeacherTimetable from './TeacherTimetable'
import TeacherAttendance from './TeacherAttendance'
import TeacherAssignments from './TeacherAssignments'
import TeacherQuizzes from './TeacherQuizzes'
import TeacherAnalytics from './TeacherAnalytics'
import TeacherMessages from './TeacherMessages'
import TeacherAnnouncements from './TeacherAnnouncements'
import TeacherProfile from './TeacherProfile'
import TeacherVideos from './TeacherVideos'
import TeacherLiveClasses from './TeacherLiveClasses'
import TeacherMarks from './TeacherMarks'


ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

function TeacherHome() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ students: 0, courses: 0, assignments: 0, avgAttendance: 0 })
  const [courses, setCourses] = useState([])
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) { fetchStats(); fetchCourses() } }, [profile])

  const fetchCourses = async () => {
    const { data } = await fetchResilientCourses(profile.id)
    setCourses(data || [])
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Use the courses state which is populated by fetchCourses
      const courseIds = (courses || []).map(c => c.id)

      if (courseIds.length === 0) {
        setStats({ courses: 0, students: 0, assignments: 0, avgAttendance: 0 })
        setRecentSubmissions([])
        setLoading(false)
        return
      }

      const [enrollRes, asnRes, attRes, subRes] = await Promise.all([
        courseIds.length ? supabase.from('enrollments').select('student_id', { count: 'exact' }).in('course_id', courseIds) : { count: 0, data: [] },
        courseIds.length ? supabase.from('assignments').select('id').in('course_id', courseIds) : { data: [] },
        courseIds.length ? supabase.from('attendance').select('status').in('course_id', courseIds) : { data: [] },
        courseIds.length ? supabase.from('submissions')
          .select('*, profiles(name), assignments(title)')
          .in('assignment_id', (await supabase.from('assignments').select('id').in('course_id', courseIds)).data?.map(a => a.id) || [])
          .order('submitted_at', { ascending: false }).limit(5) : { data: [] },
      ])

      const att = attRes.data || []
      const present = att.filter(a => a.status === 'present').length
      const avgAtt = att.length > 0 ? Math.round((present / att.length) * 100) : 0

      const uniqueStudents = new Set((enrollRes.data || []).map(e => e.student_id)).size

      setStats({
        students: uniqueStudents,
        courses: myCourses.length,
        assignments: (asnRes.data || []).length,
        avgAttendance: avgAtt,
      })
      setCourses(myCourses)
      setRecentSubmissions(subRes.data || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Avg Attendance %',
      data: [82, 75, 88, 79, 92, 85],
      backgroundColor: 'rgba(168, 85, 247, 0.6)',
      borderRadius: 6,
    }],
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a35', titleColor: '#fff', bodyColor: '#9898b8' } },
    scales: { x: { grid: { color: '#2a2a4a' }, ticks: { color: '#9898b8' } }, y: { grid: { color: '#2a2a4a' }, ticks: { color: '#9898b8' } } },
  }

  const statCards = [
    { icon: '👥', label: 'Total Students', value: stats.students, color: 'from-purple-600 to-purple-800' },
    { icon: '📖', label: 'My Courses', value: stats.courses, color: 'from-blue-600 to-blue-800' },
    { icon: '📝', label: 'Assignments', value: stats.assignments, color: 'from-green-600 to-green-800' },
    { icon: '✅', label: 'Avg Attendance', value: `${stats.avgAttendance}%`, color: 'from-yellow-600 to-yellow-800' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Welcome, <span className="gradient-text">Prof. {profile?.name?.split(' ')[0]}!</span> 👋
        </h2>
        <p className="text-[#9898b8] mt-1 text-sm">Here's an overview of your classes today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="card">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl mb-3`}>{card.icon}</div>
            <p className="text-3xl font-black text-white">{loading ? '...' : card.value}</p>
            <p className="text-[#9898b8] text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="section-title mb-4">📊 Attendance Trend</h3>
          <div className="h-48">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title mb-4">⚡ Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Mark Attendance', icon: '✅', path: '/teacher/attendance' },
              { label: 'Create Quiz', icon: '🎯', path: '/teacher/quizzes' },
              { label: 'Add Assignment', icon: '📝', path: '/teacher/assignments' },
              { label: 'Enter Marks', icon: '📊', path: '/teacher/marks' },
              { label: 'Schedule Class', icon: '📅', path: '/teacher/timetable' },

              { label: 'Send Announcement', icon: '📢', path: '/teacher/announcements' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 p-3 bg-[#2a2a4a]/30 hover:bg-[#2a2a4a]/60 rounded-xl transition-colors text-sm text-white">
                <span>{item.icon}</span><span>{item.label}</span>
                <span className="ml-auto text-[#9898b8]">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses + Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">📖 My Courses</h3>
            <button onClick={() => navigate('/teacher/courses')} className="text-purple-400 text-xs">View all →</button>
          </div>
          {courses.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[#9898b8] text-sm">No courses yet</p>
              <button onClick={() => navigate('/teacher/courses')} className="btn-primary mt-3">Create Course</button>
            </div>
          ) : (
            <div className="space-y-2">
              {courses.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-[#2a2a4a]/30 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-sm">{c.title.charAt(0)}</div>
                  <p className="text-white text-sm font-medium">{c.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">📥 Recent Submissions</h3>
            <button onClick={() => navigate('/teacher/assignments')} className="text-purple-400 text-xs">View all →</button>
          </div>
          {recentSubmissions.length === 0 ? (
            <p className="text-[#9898b8] text-sm text-center py-6">No submissions yet</p>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 p-3 bg-[#2a2a4a]/30 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-[#2a2a4a] flex items-center justify-center text-white font-bold text-sm">{sub.profiles?.name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{sub.profiles?.name}</p>
                    <p className="text-[#9898b8] text-xs">{sub.assignments?.title}</p>
                  </div>
                  {sub.grade ? <span className="badge-green">{sub.grade}/100</span> : <span className="badge-yellow">Pending</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeacherDashboard() {
  return (
    <DashboardLayout role="teacher" title="Teacher Dashboard">
      <Routes>
        <Route index element={<TeacherHome />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="courses" element={<TeacherCourses />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="assignments" element={<TeacherAssignments />} />
        <Route path="quizzes" element={<TeacherQuizzes />} />
        <Route path="analytics" element={<TeacherAnalytics />} />
        <Route path="messages" element={<TeacherMessages />} />
        <Route path="announcements" element={<TeacherAnnouncements />} />
        <Route path="videos" element={<TeacherVideos />} />
        <Route path="live-classes" element={<TeacherLiveClasses />} />
        <Route path="marks" element={<TeacherMarks />} />
        <Route path="profile" element={<TeacherProfile />} />

      </Routes>
    </DashboardLayout>
  )
}
