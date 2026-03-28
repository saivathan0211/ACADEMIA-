import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TeacherLiveClasses() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [classes, setClasses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ course_id: '', title: '', zoom_link: '', start_time: '', duration_minutes: 60 })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    if (profile) { fetchCourses(); fetchClasses() } 
  }, [profile])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').eq('teacher_id', profile.id)
    setCourses(data || [])
  }

  const fetchClasses = async () => {
    setLoading(true)
    const coursesRes = await supabase.from('courses').select('id').eq('teacher_id', profile.id)
    const courseIds = (coursesRes.data || []).map(c => c.id)
    if (courseIds.length === 0) { setLoading(false); return }
    const { data } = await supabase.from('live_classes')
      .select('*, courses(title)')
      .in('course_id', courseIds)
      .order('start_time', { ascending: true })
    setClasses(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('live_classes').insert(form)
    
    // Notify enrolled students
    const enrollRes = await supabase.from('enrollments').select('student_id').eq('course_id', form.course_id)
    const notifs = (enrollRes.data || []).map(e => ({ user_id: e.student_id, content: `New Live Class scheduled: ${form.title}` }))
    if (notifs.length > 0) await supabase.from('notifications').insert(notifs)
    
    setSaving(false)
    setShowForm(false)
    setForm({ course_id: '', title: '', zoom_link: '', start_time: '', duration_minutes: 60 })
    await fetchClasses()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this live class?')) return
    await supabase.from('live_classes').delete().eq('id', id)
    fetchClasses()
  }

  const upcomingClasses = classes.filter(c => new Date(c.start_time) >= new Date())
  const pastClasses = classes.filter(c => new Date(c.start_time) < new Date())

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">📹 Live Classes Setup</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '← Cancel' : '+ Schedule Class'}
        </button>
      </div>

      {showForm && (
        <div className="card border-purple-500/30 animate-fade-in">
          <h3 className="section-title mb-4">Schedule a Live Class</h3>
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
                <label className="label">Zoom Meeting Link</label>
                <input type="text" className="input-field" placeholder="https://zoom.us/j/..." value={form.zoom_link} onChange={e => setForm(f => ({ ...f, zoom_link: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Class Title</label>
                <input type="text" className="input-field" placeholder="Chapter 1: Live Discussion" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Time</label>
                  <input type="datetime-local" className="input-field" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Duration (mins)</label>
                  <input type="number" className="input-field" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} min="15" step="15" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleSave} className="btn-primary" disabled={saving || !form.course_id || !form.title || !form.zoom_link || !form.start_time}>
                {saving ? 'Scheduling...' : '📅 Schedule Class'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div>
          <h3 className="section-title mb-4">🟢 Upcoming Classes</h3>
          {loading ? (
            <div className="space-y-3"><div className="shimmer h-24 rounded-xl"></div></div>
          ) : upcomingClasses.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-white font-semibold">No upcoming classes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map(c => (
                <div key={c.id} className="card border border-green-500/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-bold text-lg">{c.title}</h3>
                      <p className="text-[#9898b8] text-sm font-medium mt-1">📖 {c.courses?.title}</p>
                      <p className="text-green-400 font-medium text-sm mt-2">
                        ⏰ {new Date(c.start_time).toLocaleString()} ({c.duration_minutes} mins)
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#2a2a4a] flex items-center justify-between">
                    <a href={c.zoom_link} target="_blank" rel="noreferrer" className="btn-primary py-1.5 px-4 text-sm">
                      Start Meeting
                    </a>
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 text-sm hover:underline">Cancel Class</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past */}
        <div>
          <h3 className="section-title mb-4">⚪ Past Classes</h3>
          {loading ? (
            <div className="space-y-3"><div className="shimmer h-24 rounded-xl"></div></div>
          ) : pastClasses.length === 0 ? (
            <div className="card text-center py-8 bg-[#2a2a4a]/10">
              <p className="text-[#9898b8]">No past classes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastClasses.map(c => (
                <div key={c.id} className="card bg-[#2a2a4a]/20 border border-[#2a2a4a]">
                  <h3 className="text-[#9898b8] font-bold text-lg line-through">{c.title}</h3>
                  <p className="text-[#6060a0] text-sm mt-1">{c.courses?.title}</p>
                  <p className="text-[#6060a0] text-xs mt-2">
                    Ended on: {new Date(c.start_time).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
