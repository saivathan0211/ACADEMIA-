import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

// Sub-pages (inline for parent dashboard simplicity)
function ParentProgress() {
  const { profile } = useAuth()
  const [studentData, setStudentData] = useState(null)
  const [studentId, setStudentId] = useState(null)
  const [loading, setLoading] = useState(true)


  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const { data: student } = await supabase.from('profiles').select('*').eq('roll_number', profile.roll_number).eq('role', 'student').single()
    if (!student) { setLoading(false); return }
    setStudentId(student.id)

    const [attRes, marksRes, enrollRes] = await Promise.all([
      supabase.from('attendance').select('status').eq('student_id', student.id).is('course_id', 'not.null'),
      supabase.from('marks').select('score, courses(title)').eq('student_id', student.id),
      supabase.from('enrollments').select('courses(title), progress').eq('student_id', student.id),
    ])


    const att = attRes.data || []
    const present = att.filter(a => a.status === 'present').length
    const attPct = att.length > 0 ? Math.round((present / att.length) * 100) : 0
    const marks = marksRes.data || []
    const avgScore = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m.score, 0) / marks.length) : 0

    setStudentData({ ...student, attPct, avgScore, marks, enrollments: enrollRes.data || [] })
    setLoading(false)
  }

  if (loading) return <div className="shimmer h-64 rounded-2xl"></div>
  if (!studentData) return <div className="card text-center py-12"><p className="text-4xl mb-3">❌</p><p className="text-white">Student data not found</p></div>

  const attChartData = {
    labels: ['Present', 'Absent'],
    datasets: [{ data: [studentData.attPct, 100 - studentData.attPct], backgroundColor: ['#a855f7', '#2a2a4a'], borderColor: ['#7c3aed', '#3a3a5a'], borderWidth: 2 }]
  }

  const handleDownloadPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`${studentData.name} - Progress Report`, 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)

    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Attendance: ${studentData.attPct}%`, 14, 45)
    doc.text(`Average Score: ${studentData.avgScore}%`, 14, 52)
    doc.text(`Enrolled Courses: ${studentData.enrollments.length}`, 80, 45)
    doc.text(`Marks Recorded: ${studentData.marks.length}`, 80, 52)

    doc.setFontSize(14)
    doc.text('Course Marks', 14, 70)
    
    const courseData = studentData.marks.map(m => [
      m.courses?.title || 'N/A', 
      `${m.score}%`, 
      m.grade || (m.score >= 90 ? 'A' : m.score >= 75 ? 'B' : m.score >= 50 ? 'C' : 'F')
    ])

    doc.autoTable({
      startY: 75,
      head: [['Course', 'Score', 'Grade']],
      body: courseData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }
    })

    const finalY = doc.lastAutoTable.finalY || 75
    
    doc.setFontSize(14)
    doc.text('Course Progress', 14, finalY + 15)
    
    const progressData = studentData.enrollments.map(e => [
      e.courses?.title || 'N/A', 
      `${e.progress || 0}%`
    ])

    doc.autoTable({
      startY: finalY + 20,
      head: [['Course', 'Progress']],
      body: progressData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    })

    doc.save(`${studentData.name?.replace(/\s+/g, '_')}_Progress_Report.pdf`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="section-title text-xl mb-0">📊 {studentData.name}'s Progress</h2>
        <button onClick={handleDownloadPDF} className="btn-primary flex items-center gap-2 text-sm" disabled={loading}>
          <span>📥</span> Download PDF Report
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Attendance', value: `${studentData.attPct}%`, color: studentData.attPct >= 75 ? 'text-green-400' : 'text-red-400' },
          { label: 'Avg Score', value: `${studentData.avgScore}%`, color: 'text-purple-400' },
          { label: 'Courses', value: studentData.enrollments.length, color: 'text-blue-400' },
          { label: 'Marks Recorded', value: studentData.marks.length, color: 'text-yellow-400' },
        ].map(c => (
          <div key={c.label} className="card text-center">
            <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-[#9898b8] text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card flex flex-col items-center gap-4">
          <h3 className="section-title w-full">Attendance Overview</h3>
          <div className="relative w-40 h-40">
            <Doughnut data={attChartData} options={{ responsive: true, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a35' } }, cutout: '70%' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white">{studentData.attPct}%</span>
            </div>
          </div>
          <p className={`text-sm font-bold ${studentData.attPct >= 75 ? 'text-green-400' : 'text-red-400'}`}>{studentData.attPct >= 75 ? '✅ Good Standing' : '⚠️ Below 75% Requirement'}</p>
        </div>
        <div className="card">
          <h3 className="section-title mb-4">📖 Course Progress</h3>
          {studentData.enrollments.length === 0 ? <p className="text-[#9898b8] text-sm">No courses enrolled</p> : (
            <div className="space-y-3">
              {studentData.enrollments.map((e, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-white">{e.courses?.title}</span><span className="text-[#9898b8]">{e.progress || 0}%</span></div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${e.progress || 0}%` }}></div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ParentHome() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [studentData, setStudentData] = useState(null)
  const [studentId, setStudentId] = useState(null)
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchData() }, [profile])

  useEffect(() => {
    if (!studentId) return

    const channel = supabase.channel('parent-home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marks', filter: `student_id=eq.${studentId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${studentId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments', filter: `student_id=eq.${studentId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts', filter: `student_id=eq.${studentId}` }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [studentId])

  const fetchData = async () => {
    setLoading(true)
    const { data: student } = await supabase.from('profiles').select('*').eq('roll_number', profile.roll_number).eq('role', 'student').single()
    if (student) {
      const [attRes, marksRes] = await Promise.all([
        supabase.from('attendance').select('status').eq('student_id', student.id).is('course_id', 'not.null'),
        supabase.from('marks').select('score').eq('student_id', student.id),
      ])

      const att = attRes.data || []
      const present = att.filter(a => a.status === 'present').length
      const attPct = att.length > 0 ? Math.round((present / att.length) * 100) : 0
      const marks = marksRes.data || []
      const avgScore = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m.score, 0) / marks.length) : 0
      setStudentData({ ...student, attPct, avgScore })
    }
    const notifsRes = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5)
    setNotifs(notifsRes.data || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Parent Dashboard <span className="gradient-text">👨‍👩‍👧</span></h2>
        <p className="text-[#9898b8] mt-1 text-sm">Monitoring {studentData?.name || 'your child'}'s academic progress</p>
      </div>

      {studentData && (
        <div className="card bg-gradient-to-r from-green-900/30 to-green-700/20 border-green-500/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-600 to-green-900 flex items-center justify-center text-white font-black text-2xl">{studentData.name.charAt(0)}</div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold">{studentData.name}</h3>
              <p className="text-[#9898b8] text-sm">{studentData.roll_number} • {studentData.branch} Year {studentData.year}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '✅', label: 'Attendance', value: loading ? '...' : `${studentData?.attPct || 0}%`, sub: studentData?.attPct >= 75 ? 'Good' : 'At risk', color: 'from-green-600 to-green-800' },
          { icon: '📊', label: 'Avg Score', value: loading ? '...' : `${studentData?.avgScore || 0}%`, sub: 'Overall', color: 'from-purple-600 to-purple-800' },
          { icon: '🔔', label: 'Notifications', value: notifs.filter(n => !n.is_read).length, sub: 'Unread', color: 'from-yellow-600 to-yellow-800' },
          { icon: '📅', label: 'Timetable', value: '→', sub: 'View schedule', color: 'from-blue-600 to-blue-800' },
        ].map(c => (
          <div key={c.label} className="card cursor-pointer" onClick={() => c.label === 'Timetable' && navigate('/parent/timetable')}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-xl mb-3`}>{c.icon}</div>
            <p className="text-3xl font-black text-white">{c.value}</p>
            <p className="text-white font-semibold text-sm mt-1">{c.label}</p>
            <p className="text-[#9898b8] text-xs">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">🔔 Recent Notifications</h3>
            <button onClick={() => navigate('/parent/notifications')} className="text-purple-400 text-xs">View all →</button>
          </div>
          {notifs.length === 0 ? <p className="text-[#9898b8] text-sm text-center py-4">No notifications</p> : (
            <div className="space-y-2">
              {notifs.map(n => (
                <div key={n.id} className={`p-3 rounded-xl text-sm ${!n.is_read ? 'bg-purple-600/10 border border-purple-500/20' : 'bg-[#2a2a4a]/20'}`}>
                  <p className="text-white text-xs">{n.content}</p>
                  <p className="text-[#6060a0] text-xs mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="section-title mb-4">⚡ Quick Links</h3>
          <div className="space-y-2">
            {[
              { label: "View Progress", icon: "📊", path: "/parent/progress" },
              { label: "Attendance Report", icon: "✅", path: "/parent/attendance" },
              { label: "Marks & Grades", icon: "📊", path: "/parent/marks" },
              { label: "Weekly Timetable", icon: "📅", path: "/parent/timetable" },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 p-3 bg-[#2a2a4a]/30 hover:bg-[#2a2a4a]/60 rounded-xl transition-colors text-left">
                <span>{item.icon}</span><span className="text-white text-sm">{item.label}</span><span className="ml-auto text-[#9898b8]">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ParentAttendance() {
  const { profile } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const { data: s } = await supabase.from('profiles').select('id, name').eq('roll_number', profile.roll_number).eq('role', 'student').single()
    if (s) {
      setStudent(s)
      const { data } = await supabase.from('attendance')
        .select('*, courses(title)')
        .eq('student_id', s.id)
        .is('course_id', 'not.null')
        .order('date', { ascending: false })

      setAttendance(data || [])
    }
    setLoading(false)
  }

  const present = attendance.filter(a => a.status === 'present').length
  const pct = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">✅ {student?.name}'s Attendance</h2>
      {loading ? <div className="shimmer h-48 rounded-2xl"></div> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[{ l: 'Present', v: present, c: 'text-green-400' }, { l: 'Absent', v: attendance.length - present, c: 'text-red-400' }, { l: 'Overall %', v: `${pct}%`, c: pct >= 75 ? 'text-green-400' : 'text-red-400' }].map(c => (
              <div key={c.l} className="card text-center"><p className={`text-3xl font-black ${c.c}`}>{c.v}</p><p className="text-[#9898b8] text-sm mt-1">{c.l}</p></div>
            ))}
          </div>
          <div className="card overflow-x-auto">
            <h3 className="section-title mb-4">Attendance History</h3>
            <table className="w-full"><thead><tr><th className="table-header">Date</th><th className="table-header">Course</th><th className="table-header">Status</th></tr></thead>
              <tbody>{attendance.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-[#9898b8]">No records</td></tr> : attendance.map(a => (
                <tr key={a.id}><td className="table-cell">{new Date(a.date).toLocaleDateString()}</td><td className="table-cell">{a.courses?.title || 'N/A'}</td><td className="table-cell"><span className={`badge ${a.status === 'present' ? 'badge-green' : 'badge-red'} capitalize`}>{a.status}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function ParentMarks() {
  const { profile } = useAuth()
  const [marks, setMarks] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const { data: s } = await supabase.from('profiles').select('id, name').eq('roll_number', profile.roll_number).eq('role', 'student').single()
    if (s) {
      setStudent(s)
      const { data } = await supabase.from('marks').select('*, courses(title)').eq('student_id', s.id).order('created_at', { ascending: false })
      setMarks(data || [])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">📊 {student?.name}'s Marks</h2>
      {loading ? <div className="shimmer h-48 rounded-2xl"></div> : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="table-header">Course</th><th className="table-header">Score</th><th className="table-header">Grade</th><th className="table-header">Comments</th></tr></thead>
            <tbody>{marks.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-[#9898b8]">No marks recorded yet</td></tr> : marks.map(m => (
              <tr key={m.id}>
                <td className="table-cell">{m.courses?.title || 'N/A'}</td>
                <td className="table-cell"><span className="text-purple-400 font-bold">{m.score}%</span></td>
                <td className="table-cell"><span className={`badge ${m.score >= 75 ? 'badge-green' : 'badge-red'}`}>{m.grade || (m.score >= 90 ? 'A' : m.score >= 75 ? 'B' : m.score >= 50 ? 'C' : 'F')}</span></td>
                <td className="table-cell text-[#9898b8]">{m.comments || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ParentTimetable() {
  const { profile } = useAuth()
  const [timetable, setTimetable] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const { data: s } = await supabase.from('profiles').select('id, name, branch, year').eq('roll_number', profile.roll_number).eq('role', 'student').single()
    if (s) {
      setStudent(s)
      const { data } = await supabase.from('timetable').select('*, courses(title), profiles(name)').eq('branch', s.branch).eq('year', s.year).order('day_of_week').order('start_time')
      setTimetable(data || [])
    }
    setLoading(false)
  }

  const fmt = (t) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}` }

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">📅 {student?.name}'s Timetable</h2>
      {loading ? <div className="shimmer h-48 rounded-2xl"></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5].map(day => {
            const classes = timetable.filter(t => t.day_of_week === day)
            return classes.length > 0 ? (
              <div key={day} className="card">
                <h3 className="font-bold text-white mb-3">{DAYS[day]}</h3>
                {classes.map(cls => (
                  <div key={cls.id} className="bg-[#2a2a4a]/30 rounded-xl p-3 mb-2">
                    <p className="text-white text-sm font-semibold">{cls.courses?.title}</p>
                    <p className="text-purple-400 text-xs mt-1">{fmt(cls.start_time)} – {fmt(cls.end_time)}</p>
                    <p className="text-[#9898b8] text-xs">👨‍🏫 {cls.profiles?.name}</p>
                  </div>
                ))}
              </div>
            ) : null
          })}
          {timetable.length === 0 && <div className="card text-center py-12 lg:col-span-3"><p className="text-4xl mb-3">📅</p><p className="text-white">No timetable available yet</p></div>}
        </div>
      )}
    </div>
  )
}

function ParentNotifications() {
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchNotifs() }, [profile])

  const fetchNotifs = async () => {
    setLoading(true)
    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
    setNotifs(data || [])
    setLoading(false)
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h2 className="section-title text-xl">🔔 Notifications</h2><button onClick={markAllRead} className="btn-secondary text-sm">Mark all read</button></div>
      {loading ? <div className="shimmer h-48 rounded-2xl"></div> : notifs.length === 0 ? (
        <div className="card text-center py-12"><p className="text-4xl mb-3">🔔</p><p className="text-white font-semibold">No notifications</p></div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id} className={`card flex items-start gap-4 ${!n.is_read ? 'border-purple-500/30 bg-purple-600/5' : ''}`}>
              <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${!n.is_read ? 'bg-purple-500' : 'bg-[#2a2a4a]'}`}></div>
              <div><p className={`text-sm ${!n.is_read ? 'text-white font-medium' : 'text-[#9898b8]'}`}>{n.content}</p><p className="text-xs text-[#6060a0] mt-1">{new Date(n.created_at).toLocaleString()}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ParentProfile() {
  const { profile } = useAuth()
  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="section-title text-xl">👤 Profile</h2>
      <div className="card">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-600 to-green-900 flex items-center justify-center text-white font-black text-3xl">{profile?.name?.charAt(0)?.toUpperCase()}</div>
          <div><h3 className="text-white text-2xl font-bold">{profile?.name}</h3><span className="badge bg-green-600/20 text-green-400 mt-1 inline-block">Parent</span></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[{ l: 'Parent Name', v: profile?.name, i: '👤' }, { l: "Child's Roll No", v: profile?.roll_number, i: '🎫' }, { l: 'Role', v: 'Parent', i: '👨‍👩‍👧' }].map(item => (
            <div key={item.l} className="bg-[#2a2a4a]/30 rounded-xl p-3"><p className="text-[#9898b8] text-xs mb-1">{item.i} {item.l}</p><p className="text-white font-semibold">{item.v || 'N/A'}</p></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ParentDashboard() {
  return (
    <DashboardLayout role="parent" title="Parent Dashboard">
      <Routes>
        <Route index element={<ParentHome />} />
        <Route path="progress" element={<ParentProgress />} />
        <Route path="attendance" element={<ParentAttendance />} />
        <Route path="marks" element={<ParentMarks />} />
        <Route path="timetable" element={<ParentTimetable />} />
        <Route path="notifications" element={<ParentNotifications />} />
        <Route path="profile" element={<ParentProfile />} />
      </Routes>
    </DashboardLayout>
  )
}
