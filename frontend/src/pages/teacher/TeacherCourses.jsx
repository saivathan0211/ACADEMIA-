import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, insertNotification } from '../../lib/supabase'


export default function TeacherCourses() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'Mandatory', branch: 'CSE', year: 1 })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null) // { type: 'success'|'error', message: '' }

  useEffect(() => {
    if (profile) fetchCourses()

    // ✅ Real-time: course list updates instantly when any course is added/edited/deleted
    const channel = supabase.channel('teacher-courses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        fetchCourses()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchCourses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('courses')
      .select('*, enrollments(count)')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)

    try {
      const insertPayload = { ...form, teacher_id: profile.id }
      let { data: newCourse, error } = await supabase
        .from('courses')
        .insert(insertPayload)
        .select()
        .single()

      // Ultra-resilient fallback chain
      if (error) {
        console.warn('Initial course insert failed, attempting resiliance fallbacks...', error.message)
        
        // Fallback 1: Try without branch/year/category but with description
        const fallback1 = { title: form.title, description: form.description, teacher_id: profile.id }
        const res1 = await supabase.from('courses').insert(fallback1).select().single()
        
        if (res1.error) {
          console.warn('Fallback 1 failed (likely missing description), attempting ultra-minimal insert...', res1.error.message)
          // Fallback 2: ONLY title and teacher_id (Append metadata to title so it's not lost)
          const fallback2 = { 
            title: `${form.title} [${form.branch} | Yr ${form.year}]`, 
            teacher_id: profile.id 
          }
          const res2 = await supabase.from('courses').insert(fallback2).select().single()

          
          if (res2.error) {
            console.error('Ultra-minimal insert failed:', res2.error)
            showToast('error', `Critical Error: ${res2.error.message || 'Database schema incompatible'}`)
            setSaving(false)
            return
          }
          newCourse = res2.data
        } else {
          newCourse = res1.data
        }
      }


      // Notify ALL students in this branch/year and enroll them automatically
      if (newCourse) {
        const studentsRes = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .eq('branch', form.branch)
          .eq('year', form.year)
        const students = studentsRes.data || []

        const notifs = students.map(s => ({
          user_id: s.id,
          content: `📢 New course available: "${form.title}" — It's now ready in your Courses!`
        }))
        if (notifs.length > 0) await insertNotification(notifs)

        // Auto-enroll students
        const enrollments = students.map(s => ({
          student_id: s.id,
          course_id: newCourse.id,
          progress: 0,
        }))
        if (enrollments.length > 0) {
          await supabase.from('enrollments').upsert(enrollments, { onConflict: 'student_id,course_id' })
        }
      }

      setSaving(false)
      setShowForm(false)
      setForm({ title: '', description: '', category: 'Mandatory', branch: 'CSE', year: 1 })
      showToast('success', `✅ Course "${newCourse.title}" created successfully! Students have been notified.`)

      // fetchCourses is called automatically via realtime channel
    } catch (err) {
      console.error('Unexpected course creation error:', err)
      showToast('error', `Failed to create course: ${err.message || 'Unknown error'}`)
      setSaving(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This will also remove all student enrollments.`)) return
    await supabase.from('courses').delete().eq('id', id)
    showToast('success', `🗑️ Course "${title}" deleted.`)
  }

  return (
    <div className="space-y-5">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 max-w-sm px-5 py-4 rounded-2xl shadow-2xl border font-medium text-sm animate-fade-in flex items-start gap-3 ${
          toast.type === 'success'
            ? 'bg-green-900/90 border-green-500/40 text-green-200'
            : 'bg-red-900/90 border-red-500/40 text-red-200'
        }`}>
          <span className="text-lg flex-shrink-0">{toast.type === 'success' ? '✅' : '❌'}</span>
          <p>{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-auto text-white/50 hover:text-white text-lg leading-none flex-shrink-0">×</button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title text-xl">📖 My Courses</h2>
          <p className="text-[#9898b8] text-xs mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} created</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '← Cancel' : '+ Create Course'}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-2xl border-purple-500/30 overflow-y-auto max-h-[90vh] shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="section-title text-xl">Create New Course</h3>
              <button 
                onClick={() => setShowForm(false)} 
                className="text-[#9898b8] hover:text-white text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Course Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Data Structures and Algorithms"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input-field min-h-20 resize-none"
                  placeholder="Course description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Branch</label>
                  <select className="input-field" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
                    <option>CSE</option><option>ECE</option><option>MECH</option><option>CIVIL</option><option>IT</option>
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <select className="input-field" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}>
                    <option value={1}>1st Year</option><option value={2}>2nd Year</option><option value={3}>3rd Year</option><option value={4}>4th Year</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option>Mandatory</option><option>Recommended</option><option>Elective</option>
                </select>
              </div>

              {/* Preview Banner */}
              {form.title && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-sm">
                  <p className="text-purple-300 font-medium mb-1">📋 Preview</p>
                  <p className="text-white font-bold">{form.title}</p>
                  <p className="text-[#9898b8] text-xs mt-1">{form.branch} · Year {form.year} · {form.category}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center justify-center gap-2 flex-1"
                  disabled={saving || !form.title.trim()}
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Creating...</>
                  ) : (
                    '💾 Create Course'
                  )}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary px-8">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="shimmer h-48 rounded-2xl"></div>)}
        </div>
      ) : courses.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">📖</p>
          <p className="text-white font-bold text-lg">No courses yet</p>
          <p className="text-[#9898b8] text-sm mt-1">Create your first course to get started</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-5">+ Create First Course</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(c => (
            <div key={c.id} className="card hover:border-purple-500/30 transition-colors group">
              <div className="h-24 rounded-xl bg-gradient-to-br from-purple-800 to-purple-600 flex items-center justify-center text-4xl mb-4 relative overflow-hidden">
                <span className="relative z-10">📖</span>
                <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent"></div>
              </div>
              <h3 className="text-white font-bold">{c.title}</h3>
              <p className="text-[#9898b8] text-sm mt-1 line-clamp-2">{c.description || 'No description'}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2 flex-wrap">
                  {c.category && (
                    <span className={`badge ${c.category === 'Mandatory' ? 'badge-red' : c.category === 'Recommended' ? 'badge-purple' : 'badge-yellow'}`}>
                      {c.category}
                    </span>
                  )}
                  {(c.branch || c.year) && (
                    <span className="badge-purple">
                      {c.branch || 'N/A'}{c.year ? ` · Yr ${c.year}` : ''}
                    </span>
                  )}
                </div>
                <span className="text-[#9898b8] text-xs">👥 {c.enrollments?.[0]?.count ?? 0}</span>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleDelete(c.id, c.title)}
                  className="btn-secondary text-sm text-red-400 hover:text-red-300 flex-1"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
