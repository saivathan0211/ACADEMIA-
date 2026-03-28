import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, insertNotification, fetchResilientCourses } from '../../lib/supabase'

import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

export default function TeacherAnalytics() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [courseStats, setCourseStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const { data: courses } = await fetchResilientCourses(profile.id)
    const myCourses = courses || []
    const courseIds = myCourses.map(c => c.id)


    if (courseIds.length === 0) { setLoading(false); return }

    const [enrollRes, attRes, marksRes, submissionsRes] = await Promise.all([
      supabase.from('enrollments').select('student_id, course_id').in('course_id', courseIds),
      supabase.from('attendance').select('student_id, course_id, status').in('course_id', courseIds),
      supabase.from('marks').select('student_id, score, course_id').in('course_id', courseIds),
      supabase.from('submissions').select('id, grade, assignment_id').in('assignment_id', (await supabase.from('assignments').select('id').in('course_id', courseIds)).data?.map(a => a.id) || []),
    ])

    // Per-course stats
    const stats = courses.map(course => {
      const enrolled = (enrollRes.data || []).filter(e => e.course_id === course.id).length
      const att = (attRes.data || []).filter(a => a.course_id === course.id)
      const present = att.filter(a => a.status === 'present').length
      const attPct = att.length > 0 ? Math.round((present / att.length) * 100) : 0
      const marks = (marksRes.data || []).filter(m => m.course_id === course.id)
      const avgScore = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m.score, 0) / marks.length) : 0
      return { name: course.title, enrolled, attPct, avgScore }
    })
    setCourseStats(stats)

    // Student leaderboard
    const studentIds = [...new Set((enrollRes.data || []).map(e => e.student_id))]
    if (studentIds.length > 0) {
      const profilesRes = await supabase.from('profiles').select('id, name, roll_number').in('id', studentIds)
      const profileMap = {}
      ;(profilesRes.data || []).forEach(p => { profileMap[p.id] = p })

      const leaderboard = studentIds.map(sid => {
        const att = (attRes.data || []).filter(a => a.student_id === sid)
        const present = att.filter(a => a.status === 'present').length
        const attPct = att.length > 0 ? Math.round((present / att.length) * 100) : 0
        const marks = (marksRes.data || []).filter(m => m.student_id === sid)
        const avgScore = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m.score, 0) / marks.length) : 0
        return { ...profileMap[sid], attPct, avgScore, score: (attPct + avgScore) / 2 }
      }).sort((a, b) => b.score - a.score).slice(0, 10)

      setStudents(leaderboard)
    }
    setLoading(false)
  }

  const barData = {
    labels: courseStats.map(c => c.name.slice(0, 15)),
    datasets: [
      { label: 'Attendance %', data: courseStats.map(c => c.attPct), backgroundColor: 'rgba(168, 85, 247, 0.7)', borderRadius: 6 },
      { label: 'Avg Score', data: courseStats.map(c => c.avgScore), backgroundColor: 'rgba(59, 130, 246, 0.7)', borderRadius: 6 },
    ],
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#9898b8' } }, tooltip: { backgroundColor: '#1a1a35', titleColor: '#fff', bodyColor: '#9898b8' } },
    scales: { x: { grid: { color: '#2a2a4a' }, ticks: { color: '#9898b8', font: { size: 10 } } }, y: { grid: { color: '#2a2a4a' }, ticks: { color: '#9898b8' }, max: 100 } },
  }

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">📊 Analytics Dashboard</h2>

      {loading ? (
        <div className="shimmer h-64 rounded-2xl"></div>
      ) : (
        <>
          {courseStats.length > 0 && (
            <div className="card">
              <h3 className="section-title mb-4">📈 Course Performance Overview</h3>
              <div className="h-56">
                <Bar data={barData} options={chartOptions} />
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="section-title mb-4">🏆 Student Leaderboard</h3>
            {students.length === 0 ? (
              <p className="text-[#9898b8] text-sm text-center py-8">No student data yet</p>
            ) : (
              <div className="space-y-2">
                {students.map((s, i) => (
                  <div key={s.id} className={`flex items-center gap-4 p-3 rounded-xl ${i < 3 ? 'bg-purple-600/10 border border-purple-500/20' : 'bg-[#2a2a4a]/20'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${i === 0 ? 'bg-yellow-500 text-yellow-900' : i === 1 ? 'bg-gray-400 text-gray-900' : i === 2 ? 'bg-orange-600 text-white' : 'bg-[#2a2a4a] text-[#9898b8]'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{s.name || 'Unknown'}</p>
                      <p className="text-[#9898b8] text-xs">{s.roll_number}</p>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div><p className="text-green-400 text-xs font-bold">{s.attPct}%</p><p className="text-[#9898b8] text-xs">Att.</p></div>
                      <div><p className="text-purple-400 text-xs font-bold">{s.avgScore}%</p><p className="text-[#9898b8] text-xs">Score</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {courseStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courseStats.map(c => (
                <div key={c.name} className="card">
                  <h4 className="text-white font-bold text-sm truncate mb-3">{c.name}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-[#9898b8] text-xs">Enrolled</span><span className="text-white text-xs font-bold">{c.enrolled}</span></div>
                    <div className="flex justify-between"><span className="text-[#9898b8] text-xs">Attendance</span><span className={`text-xs font-bold ${c.attPct >= 75 ? 'text-green-400' : 'text-red-400'}`}>{c.attPct}%</span></div>
                    <div className="flex justify-between"><span className="text-[#9898b8] text-xs">Avg Score</span><span className="text-purple-400 text-xs font-bold">{c.avgScore}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
