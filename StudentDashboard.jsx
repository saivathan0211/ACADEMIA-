import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

// Page imports
import StudentCourses from './StudentCourses'
import StudentTimetable from './StudentTimetable'
import StudentAttendance from './StudentAttendance'
import StudentAssignments from './StudentAssignments'
import StudentQuizzes from './StudentQuizzes'
import StudentMarks from './StudentMarks'
import StudentMessages from './StudentMessages'
import StudentNotifications from './StudentNotifications'
import StudentChatbot from './StudentChatbot'
import StudentProfile from './StudentProfile'
import StudentVideos from './StudentVideos'
import StudentLiveClasses from './StudentLiveClasses'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function StudentHome() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ courses: 0, attendance: 0, deadlines: 0, quizzes: 0 })
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [recentNotifs, setRecentNotifs] = useState([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([])
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchData()
      recordLogin()
    }
  }, [profile])

  const recordLogin = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      // 1. Check if already logged in today
      const { data: existing } = await supabase.from('attendance')
        .select('id')
        .eq('student_id', profile.id)
        .is('course_id', null)
        .eq('date', today)
        .limit(1)

      if (existing && existing.length > 0) return // Already recorded

      // 2. Record global login
      await supabase.from('attendance').insert({
        student_id: profile.id,
        course_id: null,
        date: today,
        status: 'present'
      })
    } catch (err) {
      console.warn('Failed to record login:', err)
    }
  }



  useEffect(() => {
    if (!profile) return

    const channel = supabase.channel('student-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new
          setRecentNotifs(prev => [n, ...(prev || [])].slice(0, 5))
          setToast({ id: n.id, message: n.content })
          setTimeout(() => setToast(null), 4000)
        } else {
          fetchData()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${profile.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marks', filter: `student_id=eq.${profile.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments', filter: `student_id=eq.${profile.id}` }, () => fetchData())
      .subscribe()


    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    try {
      const now = new Date().toISOString()
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const [coursesRes, enrollRes, attendRes, assignRes, notifRes, upcomingRes] = await Promise.all([
        // Show all courses that match the student's branch/year OR all courses if no branch set
        supabase.from('courses').select('id, title, branch, year, category, profiles(name)'),
        supabase.from('enrollments').select('course_id, progress').eq('student_id', profile.id),
        supabase.from('attendance').select('status').eq('student_id', profile.id),
        supabase.from('assignments').select('id, due_date, title, course_id').gt('due_date', now).limit(5),
        supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('assignments')
          .select('id, due_date, title, course_id, courses(title)')
          .gt('due_date', now)
          .lt('due_date', nextWeek)
          .order('due_date', { ascending: true })
          .limit(5),
      ])

      const att = attendRes.data || []
      const present = att.filter(a => a.status === 'present').length
      const pct = att.length > 0 ? Math.round((present / att.length) * 100) : 0

      setStats({
        courses: (enrollRes.data || []).length,
        attendance: pct,
        deadlines: (assignRes.data || []).length,
        quizzes: 0,
      })
      setEnrolledCourses(enrollRes.data || [])
      setRecentNotifs(notifRes.data || [])
      setUpcomingDeadlines(upcomingRes.data || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Study Hours',
      data: [12, 19, 15, 24, 18, 22, 16, 20, 14, 25, 17, 21],
      backgroundColor: (context) => {
        const chart = context.chart;
        const {ctx, chartArea} = chart;
        if (!chartArea) return null;
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.8)');
        return gradient;
      },
      borderRadius: 12,
      borderSkipped: false,
      hoverBackgroundColor: 'rgba(168, 85, 247, 1)',
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1a1a35', titleColor: '#fff', bodyColor: '#9898b8', borderColor: '#2a2a4a', borderWidth: 1 },
    },
    scales: {
      x: { grid: { color: '#2a2a4a' }, ticks: { color: '#9898b8', font: { size: 11 } } },
      y: { grid: { color: '#2a2a4a' }, ticks: { color: '#9898b8', font: { size: 11 } } },
    },
  }

  const statCards = [
    { icon: '📖', label: 'Enrolled Courses', value: stats.courses, sub: `Active courses`, color: 'from-purple-600 to-purple-800' },
    { icon: '✅', label: 'Attendance', value: `${stats.attendance}%`, sub: stats.attendance >= 75 ? 'Good standing' : 'Needs improvement', color: 'from-green-600 to-green-800' },
    { icon: '⏰', label: 'Upcoming Deadlines', value: stats.deadlines, sub: 'Assignments due', color: 'from-yellow-600 to-yellow-800' },
    { icon: '🏆', label: 'Leaderboard Rank', value: '#5', sub: 'Top performer', color: 'from-blue-600 to-blue-800' },
  ]

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 w-80 p-4 rounded-2xl bg-purple-900/90 border border-purple-500/30 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="text-xl">🔔</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">New Notification</p>
              <p className="text-xs text-[#b8b8f0] mt-1">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Welcome back, <span className="gradient-text">{profile?.name?.split(' ')[0] || 'Student'}!</span> 👋
          </h2>
          <p className="text-[#9898b8] mt-1 text-sm">Here's what's happening with your studies today.</p>
        </div>
        <div className="text-right">
          <p className="text-[#9898b8] text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl mb-3`}>
              {card.icon}
            </div>
            <p className="text-3xl font-black text-white">{loading ? '...' : card.value}</p>
            <p className="text-white font-semibold text-sm mt-1">{card.label}</p>
            <p className="text-[#9898b8] text-xs mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts + Schedule Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progress Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">📊 My Study Progress</h3>
            <span className="badge-purple">Monthly Hours</span>
          </div>
          <div className="h-52">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Quick Schedule */}
        <div className="card">
          <h3 className="section-title mb-4">📅 Today's Schedule</h3>
          <div className="space-y-3">
            {[
              { time: '09:00', sub: 'Data Structures', room: 'Lab 3', status: 'ongoing' },
              { time: '11:00', sub: 'Math Analysis', room: 'Room 201', status: 'upcoming' },
              { time: '14:00', sub: 'Digital Circuits', room: 'Online', status: 'upcoming' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#2a2a4a]/40 rounded-xl">
                <div className="text-center min-w-12">
                  <p className="text-purple-400 text-xs font-bold">{s.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{s.sub}</p>
                  <p className="text-[#9898b8] text-xs">{s.room}</p>
                </div>
                <span className={`badge text-xs ${s.status === 'ongoing' ? 'badge-green' : 'badge-purple'}`}>
                  {s.status}
                </span>
              </div>
            ))}
            <button onClick={() => navigate('/student/timetable')} className="w-full text-center text-purple-400 text-xs hover:text-purple-300 mt-2">
              View full timetable →
            </button>
          </div>
        </div>
      </div>

      {/* Courses + Notifications Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Enrolled Courses */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">📖 My Courses</h3>
            <button onClick={() => navigate('/student/courses')} className="text-purple-400 text-xs hover:text-purple-300">View all →</button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="shimmer h-16 rounded-xl"></div>)}
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">📚</p>
              <p className="text-[#9898b8] text-sm">No courses enrolled yet</p>
              <button onClick={() => navigate('/student/courses')} className="btn-primary mt-3">Browse Courses</button>
            </div>
          ) : (
            <div className="space-y-3">
              {enrolledCourses.map((en) => (
                <div key={en.id} className="flex items-center gap-4 p-3 bg-[#2a2a4a]/30 rounded-xl hover:bg-[#2a2a4a]/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {en.courses?.title?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{en.courses?.title}</p>
                    <div className="progress-bar mt-2">
                      <div className="progress-fill" style={{ width: `${en.progress || 0}%` }}></div>
                    </div>
                    <p className="text-[#9898b8] text-xs mt-1">{en.progress || 0}% complete</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications + Upcoming Deadlines */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="section-title mb-4">🔔 Notifications</h3>
            <div className="space-y-3">
              {recentNotifs.length === 0 ? (
                <p className="text-[#9898b8] text-sm text-center py-4">No new notifications</p>
              ) : recentNotifs.map(n => (
                <div key={n.id} className={`p-3 rounded-xl text-sm ${n.is_read ? 'bg-[#2a2a4a]/20' : 'bg-purple-600/10 border border-purple-500/20'}`}>
                  <p className="text-white text-xs">{n.content}</p>
                  <p className="text-[#6060a0] text-xs mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="section-title mb-4">⏰ Upcoming Deadlines</h3>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="shimmer h-12 rounded-xl"></div>)}
              </div>
            ) : upcomingDeadlines.length === 0 ? (
              <p className="text-[#9898b8] text-sm text-center py-8">No upcoming due dates in the next 7 days.</p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map(a => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24)))
                  const statusClass = daysLeft <= 1 ? 'text-red-400' : daysLeft <= 3 ? 'text-yellow-300' : 'text-green-300'
                  return (
                    <div key={a.id} className="p-3 rounded-xl bg-[#2a2a4a]/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{a.title}</p>
                          <p className="text-[#9898b8] text-xs mt-1">{a.courses?.title || 'Course'} • Due {new Date(a.due_date).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs font-semibold ${statusClass}`}>{daysLeft}d left</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Chatbot Banner */}
      <div className="card bg-gradient-to-r from-purple-900/50 to-purple-700/30 border-purple-500/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🤖</div>
            <div>
              <h3 className="text-white font-bold">AI Tutor Assistant</h3>
              <p className="text-[#9898b8] text-sm">Get instant help with your studies from our AI assistant</p>
            </div>
          </div>
          <button onClick={() => navigate('/student/chatbot')} className="btn-primary">
            Chat with AI →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  return (
    <DashboardLayout role="student" title="Student Dashboard">
      <Routes>
        <Route index element={<StudentHome />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="quizzes" element={<StudentQuizzes />} />
        <Route path="marks" element={<StudentMarks />} />
        <Route path="messages" element={<StudentMessages />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="chatbot" element={<StudentChatbot />} />
        <Route path="videos" element={<StudentVideos />} />
        <Route path="live-classes" element={<StudentLiveClasses />} />
        <Route path="profile" element={<StudentProfile />} />
      </Routes>
    </DashboardLayout>
  )
}
