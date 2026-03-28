import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TeacherTimetable() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [timetable, setTimetable] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ course_id: '', day_of_week: '1', start_time: '09:00', end_time: '10:00', room_link: '', branch: '', year: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) { fetchCourses(); fetchTimetable() } }, [profile])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').eq('teacher_id', profile.id)
    setCourses(data || [])
  }

  const fetchTimetable = async () => {
    setLoading(true)
    const { data } = await supabase.from('timetable').select('*, courses(title)')
      .eq('teacher_id', profile.id).order('day_of_week').order('start_time')
    setTimetable(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = { ...form, teacher_id: profile.id, day_of_week: parseInt(form.day_of_week), year: parseInt(form.year) || null }
    if (editItem) {
      await supabase.from('timetable').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('timetable').insert(payload)
    }
    setSaving(false); setShowForm(false); setEditItem(null)
    setForm({ course_id: '', day_of_week: '1', start_time: '09:00', end_time: '10:00', room_link: '', branch: '', year: '' })
    await fetchTimetable()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule?')) return
    await supabase.from('timetable').delete().eq('id', id)
    await fetchTimetable()
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({ course_id: item.course_id, day_of_week: String(item.day_of_week), start_time: item.start_time, end_time: item.end_time, room_link: item.room_link || '', branch: item.branch || '', year: String(item.year || '') })
    setShowForm(true)
  }

  const formatTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">📅 Timetable Management</h2>
        <button onClick={() => { setEditItem(null); setShowForm(!showForm) }} className="btn-primary">
          {showForm ? '← Cancel' : '+ Add Schedule'}
        </button>
      </div>

      {showForm && (
        <div className="card border-purple-500/30 animate-fade-in">
          <h3 className="section-title mb-4">{editItem ? 'Edit Schedule' : 'New Schedule Entry'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Course</label>
              <select className="input-field" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))} required>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Day of Week</label>
              <select className="input-field" value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                {DAYS.slice(1).map((d, i) => <option key={i+1} value={i+1}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input-field" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input-field" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input-field" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
                <option value="">All Branches</option>
                <option>CSE</option><option>ECE</option><option>ME</option><option>CE</option><option>EE</option>
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select className="input-field" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                <option value="">All Years</option>
                <option value="1">1st Year</option><option value="2">2nd Year</option>
                <option value="3">3rd Year</option><option value="4">4th Year</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Meeting Link (Zoom / Google Meet)</label>
              <input type="url" className="input-field" placeholder="https://zoom.us/j/..." value={form.room_link} onChange={e => setForm(f => ({ ...f, room_link: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="btn-primary" disabled={saving || !form.course_id}>
              {saving ? 'Saving...' : editItem ? '💾 Update' : '💾 Save'}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null) }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="shimmer h-20 rounded-xl"></div>)}</div>
      ) : timetable.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-white font-semibold">No schedules yet</p>
          <p className="text-[#9898b8] text-sm mt-1">Add a schedule entry to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.slice(1, 6).map((day, i) => {
            const dayItems = timetable.filter(t => t.day_of_week === i + 1)
            if (dayItems.length === 0) return null
            return (
              <div key={day} className="card">
                <h3 className="font-bold text-white mb-3">{day}</h3>
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div key={item.id} className="bg-[#2a2a4a]/30 rounded-xl p-3">
                      <p className="text-white text-sm font-semibold">{item.courses?.title}</p>
                      <p className="text-purple-400 text-xs mt-1">{formatTime(item.start_time)} – {formatTime(item.end_time)}</p>
                      {item.branch && <p className="text-[#9898b8] text-xs">{item.branch} • Year {item.year}</p>}
                      {item.room_link && <a href={item.room_link} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline">🔗 Meeting link</a>}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleEdit(item)} className="text-[#9898b8] hover:text-white text-xs">✏️ Edit</button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 text-xs">🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
