import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, insertNotification, fetchResilientCourses, upsertMark } from '../../lib/supabase'

export default function TeacherMarks() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState([])
  const [marksData, setMarksData] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (profile) fetchCourses()
  }, [profile])

  const fetchCourses = async () => {
    const { data } = await fetchResilientCourses(profile.id)
    setCourses(data || [])
  }


  useEffect(() => {
    if (selectedCourse) fetchEnrolledStudents()
    else setStudents([])
  }, [selectedCourse])

  const fetchEnrolledStudents = async () => {
    setLoading(true)
    const { data: enrollments } = await supabase.from('enrollments')
      .select('student_id, profiles(name, roll_number)')
      .eq('course_id', selectedCourse)
    
    const { data: existingMarks } = await supabase.from('marks')
      .select('*')
      .eq('course_id', selectedCourse)

    const marksMap = {}
    ;(existingMarks || []).forEach(m => {
      marksMap[m.student_id] = { score: m.score, grade: m.grade || '', comments: m.comments || '' }
    })

    setStudents(enrollments || [])
    setMarksData(marksMap)
    setLoading(false)
  }

  const handleInputChange = (studentId, field, value) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    const promises = Object.entries(marksData).map(([studentId, data]) => {
      if (data.score === undefined || data.score === '') return Promise.resolve()
      return upsertMark(studentId, selectedCourse, parseInt(data.score), data.grade, data.comments)
    })

    try {
      await Promise.all(promises)
      // Send notifications to students
      const notifs = Object.keys(marksData).map(sid => ({
        user_id: sid,
        content: `📊 New marks/results have been updated for your course: ${courses.find(c => c.id === selectedCourse)?.title}`
      }))
      if (notifs.length > 0) await insertNotification(notifs)

      
      setMessage({ type: 'success', text: 'Marks updated successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to update marks.' })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">📊 Results Management</h2>
        <div className="flex items-center gap-2">
          <label className="text-[#9898b8] text-sm">Course:</label>
          <select 
            className="input-field max-w-xs text-sm py-1.5" 
            value={selectedCourse} 
            onChange={e => setSelectedCourse(e.target.value)}
          >
            <option value="">Select Course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm border animate-fade-in ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {selectedCourse ? (
        loading ? (
          <div className="shimmer h-64 rounded-2xl"></div>
        ) : students.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-white font-semibold">No students enrolled in this course.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto space-y-4">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Student</th>
                  <th className="table-header">Roll Number</th>
                  <th className="table-header w-24">Score (%)</th>
                  <th className="table-header w-24">Grade</th>
                  <th className="table-header">Comments</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.student_id}>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#2a2a4a] flex items-center justify-center text-white text-xs font-bold">
                          {s.profiles?.name?.charAt(0)}
                        </div>
                        <span className="text-white font-medium">{s.profiles?.name}</span>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-purple-400">{s.profiles?.roll_number}</td>
                    <td className="table-cell">
                      <input 
                        type="number" min="0" max="100" 
                        className="input-field py-1 px-2 text-center" 
                        value={marksData[s.student_id]?.score || ''} 
                        onChange={e => handleInputChange(s.student_id, 'score', e.target.value)}
                      />
                    </td>
                    <td className="table-cell">
                      <input 
                        type="text" 
                        className="input-field py-1 px-2 text-center" 
                        placeholder="A, B..."
                        value={marksData[s.student_id]?.grade || ''} 
                        onChange={e => handleInputChange(s.student_id, 'grade', e.target.value)}
                      />
                    </td>
                    <td className="table-cell">
                      <input 
                        type="text" 
                        className="input-field py-1 px-3" 
                        placeholder="Add teacher comments..."
                        value={marksData[s.student_id]?.comments || ''} 
                        onChange={e => handleInputChange(s.student_id, 'comments', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSave} 
                className="btn-primary px-8" 
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save all marks'}
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📖</p>
          <p className="text-white font-semibold">Please select a course to enter marks.</p>
        </div>
      )}
    </div>
  )
}
