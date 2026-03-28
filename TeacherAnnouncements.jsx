import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, insertNotification } from '../../lib/supabase'


export default function TeacherAnnouncements() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ content: '', course_id: '', target: 'course' })
  const [announcements, setAnnouncements] = useState([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) { fetchCourses(); fetchRecentAnnouncements() } }, [profile])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').eq('teacher_id', profile.id)
    setCourses(data || [])
  }

  const fetchRecentAnnouncements = async () => {
    setLoading(true)
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)
    setAnnouncements(data || [])
    setLoading(false)
  }

  const handleSend = async () => {
    if (!form.content.trim()) return
    setSending(true)

    let studentIds = []
    if (form.target === 'all') {
      const { data } = await supabase.from('profiles').select('id').eq('role', 'student')
      studentIds = (data || []).map(s => s.id)
    } else if (form.target === 'course' && form.course_id) {
      const { data } = await supabase.from('enrollments').select('student_id').eq('course_id', form.course_id)
      studentIds = (data || []).map(e => e.student_id)
    }

    if (studentIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('roll_number').in('id', studentIds)
      const rollNumbers = (profiles || []).map(p => p.roll_number)
      
      const { data: parents } = await supabase.from('profiles').select('id').eq('role', 'parent').in('roll_number', rollNumbers)
      
      const studentNotifs = studentIds.map(sid => ({ user_id: sid, content: `📢 ${profile.name}: ${form.content}` }))
      const parentNotifs = (parents || []).map(p => ({ user_id: p.id, content: `📢 Message from Teacher (${profile.name}): ${form.content}` }))
      
      await insertNotification([...studentNotifs, ...parentNotifs])
    }




    setSending(false); setSent(true); setForm(f => ({ ...f, content: '' }))
    await fetchRecentAnnouncements()
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">📢 Announcements</h2>

      {sent && <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-3 text-sm">✅ Announcement sent successfully!</div>}

      <div className="card">
        <h3 className="section-title mb-4">Send Announcement</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Target Audience</label>
              <select className="input-field" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                <option value="course">Specific Course</option>
                <option value="all">All Students</option>
              </select>
            </div>
            {form.target === 'course' && (
              <div>
                <label className="label">Course</label>
                <select className="input-field" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input-field min-h-24 resize-none" placeholder="Type your announcement..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <button onClick={handleSend} className="btn-primary" disabled={sending || !form.content.trim()}>
            {sending ? 'Sending...' : '📤 Send Announcement'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">📋 Recent Announcements</h3>
        {loading ? <div className="shimmer h-24 rounded-xl"></div> : announcements.length === 0 ? (
          <p className="text-[#9898b8] text-sm text-center py-4">No announcements yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {announcements.map(a => (
              <div key={a.id} className="bg-[#2a2a4a]/30 rounded-xl p-3">
                <p className="text-white text-sm">{a.content}</p>
                <p className="text-[#9898b8] text-xs mt-1">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
