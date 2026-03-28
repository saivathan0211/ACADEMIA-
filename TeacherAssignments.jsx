import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, upsertMark } from '../../lib/supabase'

export default function TeacherAssignments() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [activeAssignment, setActiveAssignment] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ course_id: '', title: '', description: '', due_date: '' })
  const [grading, setGrading] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    if (profile) { fetchCourses(); fetchAssignments() } 
    
    const channel1 = supabase.channel('teacher-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => fetchAssignments())
      .subscribe()
      
    // Subscribe to all submissions and conditionally update if we are viewing the specific assignment
    const channel2 = supabase.channel('teacher-submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload) => {
        // We can't easily access the current activeAssignment state from this closure without using refs, 
        // so we just trigger a generic update via an event or we can just let React handle it by including activeAssignment in the dependency array.
        // To simplify, we'll re-run fetchAssignments and if activeAssignment is set, fetch its submissions.
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(channel1)
      supabase.removeChannel(channel2)
    }
  }, [profile])
  
  // Refetch submissions if activeAssignment changes, or if new submission comes in
  useEffect(() => {
    if (activeAssignment) {
      const channel = supabase.channel(`submissions-${activeAssignment}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `assignment_id=eq.${activeAssignment}` }, () => fetchSubmissions(activeAssignment))
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [activeAssignment])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').eq('teacher_id', profile.id)
    setCourses(data || [])
  }

  const fetchAssignments = async () => {
    setLoading(true)
    const coursesRes = await supabase.from('courses').select('id').eq('teacher_id', profile.id)
    const courseIds = (coursesRes.data || []).map(c => c.id)
    if (courseIds.length === 0) { setLoading(false); return }
    const { data } = await supabase.from('assignments').select('*, courses(title)').in('course_id', courseIds).order('created_at', { ascending: false })
    setAssignments(data || [])
    setLoading(false)
  }

  const fetchSubmissions = async (assignmentId) => {
    const { data } = await supabase.from('submissions').select('*, profiles(name, roll_number)').eq('assignment_id', assignmentId).order('submitted_at', { ascending: false })
    setSubmissions(data || [])
    setActiveAssignment(assignmentId)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('assignments').insert(form)
    // Notify enrolled students
    const enrollRes = await supabase.from('enrollments').select('student_id').eq('course_id', form.course_id)
    const notifs = (enrollRes.data || []).map(e => ({ user_id: e.student_id, content: `New assignment posted: ${form.title}` }))
    if (notifs.length > 0) await supabase.from('notifications').insert(notifs)
    setSaving(false); setShowForm(false)
    setForm({ course_id: '', title: '', description: '', due_date: '' })
    await fetchAssignments()
  }

  const handleGrade = async (subId) => {
    const grade = grading[subId]
    if (!grade) return

    const submission = submissions.find(s => s.id === subId)
    const assignment = assignments.find(a => a.id === activeAssignment)

    await supabase.from('submissions').update({ grade: parseInt(grade) }).eq('id', subId)

    // Keep a simple marks table in sync so parents and students can see overall results
    if (submission && assignment) {
      await upsertMark(submission.student_id, assignment.course_id, parseInt(grade))
      await supabase.from('notifications').insert({
        user_id: submission.student_id,
        content: `✅ Your assignment "${assignment.title}" was graded: ${grade}/100.`,
      })
    }

    fetchSubmissions(activeAssignment)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">📝 Assignments</h2>
        {!activeAssignment && <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? '← Cancel' : '+ New Assignment'}</button>}
        {activeAssignment && <button onClick={() => { setActiveAssignment(null); setSubmissions([]) }} className="btn-secondary">← Back to Assignments</button>}
      </div>

      {showForm && (
        <div className="card border-purple-500/30 animate-fade-in">
          <h3 className="section-title mb-4">Create Assignment</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Course</label>
                <select className="input-field" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input type="datetime-local" className="input-field" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Title</label>
              <input type="text" className="input-field" placeholder="Assignment title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input-field min-h-20 resize-none" placeholder="Assignment details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} className="btn-primary" disabled={saving || !form.course_id || !form.title}>{saving ? 'Posting...' : '📤 Post Assignment'}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!activeAssignment ? (
        loading ? <div className="shimmer h-48 rounded-2xl"></div> : assignments.length === 0 ? (
          <div className="card text-center py-12"><p className="text-4xl mb-3">📝</p><p className="text-white font-semibold">No assignments yet</p></div>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <div key={a.id} className="card flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-white font-bold">{a.title}</h3>
                  <p className="text-[#9898b8] text-sm mt-1">{a.courses?.title}</p>
                  <p className="text-[#9898b8] text-xs">⏰ Due: {a.due_date ? new Date(a.due_date).toLocaleString() : 'No deadline'}</p>
                </div>
                <button onClick={() => fetchSubmissions(a.id)} className="btn-secondary text-sm">📥 View Submissions</button>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card">
          <h3 className="section-title mb-4">📥 Submissions ({submissions.length})</h3>
          {submissions.length === 0 ? (
            <p className="text-center text-[#9898b8] text-sm py-8">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <div key={sub.id} className="flex items-center gap-4 flex-wrap p-3 bg-[#2a2a4a]/30 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-sm">{sub.profiles?.name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{sub.profiles?.name}</p>
                    <p className="text-[#9898b8] text-xs">{sub.profiles?.roll_number} • {new Date(sub.submitted_at).toLocaleDateString()}</p>
                  </div>
                  {sub.file_url && <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline">📎 Download</a>}
                  {sub.grade ? (
                    <span className="badge-green font-bold">{sub.grade}/100</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="100" className="input-field w-20 py-1.5 text-sm" placeholder="Grade" value={grading[sub.id] || ''} onChange={e => setGrading(g => ({ ...g, [sub.id]: e.target.value }))} />
                      <button onClick={() => handleGrade(sub.id)} className="btn-primary py-1.5 text-sm">Grade</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
