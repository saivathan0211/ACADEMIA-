import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, fetchResilientCourses } from '../../lib/supabase'


export default function TeacherAttendance() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [globalLogins, setGlobalLogins] = useState([])
  const [viewMode, setViewMode] = useState('course') // 'course' or 'global'

  useEffect(() => { 
    if (profile) {
      fetchCourses()
      fetchGlobalLogins()
    }

    // Subscribe to attendance changes in real-time
    const channel = supabase.channel('attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        if (viewMode === 'global') fetchGlobalLogins()
        else if (selectedCourse) fetchStudents(selectedCourse)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, date, viewMode, selectedCourse])

  const fetchGlobalLogins = async () => {
    setLoading(true)
    const { data } = await supabase.from('attendance')
      .select('*, profiles(name, roll_number)')
      .is('course_id', null)
      .eq('date', date)
    setGlobalLogins(data || [])
    setLoading(false)
  }

  const fetchCourses = async () => {
    const { data } = await fetchResilientCourses(profile.id)
    setCourses(data || [])
  }


  const fetchStudents = async (courseId) => {
    setLoading(true)
    const course = courses.find(c => c.id === courseId)
    let q = supabase.from('profiles').select('id, name, roll_number').eq('role', 'student')
    if (course?.branch) q = q.eq('branch', course.branch)
    if (course?.year) q = q.eq('year', course.year)
    const { data: studentsData } = await q

    // Load existing attendance for that date
    const { data: existingAtt } = await supabase.from('attendance')
      .select('student_id, status')
      .eq('course_id', courseId)
      .eq('date', date)

    const attMap = {}
    ;(existingAtt || []).forEach(a => { attMap[a.student_id] = a.status })
    // Default all to present
    ;(studentsData || []).forEach(s => { if (!attMap[s.id]) attMap[s.id] = 'present' })
    
    setStudents(studentsData || [])
    setAttendance(attMap)
    setLoading(false)
  }

  useEffect(() => { if (selectedCourse) fetchStudents(selectedCourse) }, [selectedCourse, date])

  const toggleStatus = (studentId) => {
    setAttendance(prev => ({ ...prev, [studentId]: prev[studentId] === 'present' ? 'absent' : 'present' }))
  }

  const markAll = (status) => {
    const newAtt = {}
    students.forEach(s => { newAtt[s.id] = status })
    setAttendance(newAtt)
  }

  const saveAttendance = async () => {
    setSaving(true)
    const records = students.map(s => ({
      student_id: s.id, course_id: selectedCourse, date, status: attendance[s.id] || 'present', marked_by: profile.id,
    }))
    await supabase.from('attendance').upsert(records, { onConflict: 'student_id,course_id,date' })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">✅ Mark Attendance</h2>

      {saved && <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-3 text-sm">✅ Attendance saved successfully!</div>}

      <div className="flex gap-4 mb-4 border-b border-[#2a2a4a] pb-2">
        <button onClick={() => setViewMode('course')} className={`px-4 py-2 font-semibold ${viewMode === 'course' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-[#9898b8]'}`}>Course Attendance</button>
        <button onClick={() => setViewMode('global')} className={`px-4 py-2 font-semibold ${viewMode === 'global' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-[#9898b8]'}`}>Today's Logins</button>
      </div>

      <div className="card">
        {viewMode === 'course' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Select Course</label>
                <select className="input-field" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                  <option value="">Choose a course...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

        {selectedCourse && (
          <div className="mb-4 flex items-center gap-2 text-xs text-purple-400 font-medium">
            <span className="px-2 py-0.5 bg-purple-500/10 rounded-md">
              📍 {courses.find(c => c.id === selectedCourse)?.branch}
            </span>
            <span className="px-2 py-0.5 bg-purple-500/10 rounded-md">
              📅 Year {courses.find(c => c.id === selectedCourse)?.year}
            </span>
          </div>
        )}

        {selectedCourse && students.length > 0 && (
          <>
            {/* Stats + Bulk Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-[#2a2a4a]/30 rounded-xl">
              <div className="flex gap-6">
                <div><span className="text-green-400 font-bold text-xl">{presentCount}</span><p className="text-[#9898b8] text-xs">Present</p></div>
                <div><span className="text-red-400 font-bold text-xl">{students.length - presentCount}</span><p className="text-[#9898b8] text-xs">Absent</p></div>
                <div><span className="text-white font-bold text-xl">{students.length}</span><p className="text-[#9898b8] text-xs">Total</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => markAll('present')} className="btn-secondary text-sm py-1.5 text-green-400">✅ All Present</button>
                <button onClick={() => markAll('absent')} className="btn-secondary text-sm py-1.5 text-red-400">❌ All Absent</button>
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="shimmer h-48 rounded-xl"></div>
              ) : students.map((s, i) => {
                const isPresent = attendance[s.id] === 'present'
                return (
                  <div key={s.id} className={`flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer ${isPresent ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'}`}
                    onClick={() => toggleStatus(s.id)}>
                    <span className="text-[#9898b8] text-sm w-8">{i + 1}.</span>
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-sm">{s.name.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{s.name}</p>
                      <p className="text-[#9898b8] text-xs">{s.roll_number}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(s.id) }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${isPresent ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                    >
                      {isPresent ? '✅ P' : '❌ A'}
                    </button>
                  </div>
                )
              })}
            </div>

            <button onClick={saveAttendance} className="btn-primary w-full justify-center mt-4" disabled={saving}>
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...</> : '💾 Save Attendance'}
            </button>
          </>
        )}

        {selectedCourse && students.length === 0 && !loading && (
          <p className="text-center text-[#9898b8] text-sm py-8">No students found for this course's branch/year</p>
        )}

        {!selectedCourse && (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-[#9898b8] text-sm">Select a course and date to start marking attendance</p>
          </div>
        )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="label">Date</label>
              <input type="date" className="input-field max-w-xs" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>
            
            <div className="flex gap-6 mb-4 p-3 bg-[#2a2a4a]/30 rounded-xl w-max">
              <div><span className="text-green-400 font-bold text-xl">{globalLogins.length}</span><p className="text-[#9898b8] text-xs">Total Logins</p></div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="shimmer h-48 rounded-xl"></div>
              ) : globalLogins.length === 0 ? (
                <p className="text-center text-[#9898b8] text-sm py-8">No logins recorded for this date yet</p>
              ) : globalLogins.map((a, i) => (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl transition-colors bg-green-500/5 border border-green-500/20">
                  <span className="text-[#9898b8] text-sm w-8">{i + 1}.</span>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-sm">{a.profiles?.name?.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{a.profiles?.name}</p>
                    <p className="text-[#9898b8] text-xs">{a.profiles?.roll_number}</p>
                  </div>
                  <span className="px-4 py-1.5 rounded-lg text-sm font-bold bg-green-500/20 text-green-400">
                    Logged In
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
