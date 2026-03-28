import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TeacherVideos() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [videos, setVideos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ course_id: '', title: '', youtube_url: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    if (profile) { 
      fetchCourses()
      fetchVideos() 
    } 
  }, [profile])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').eq('teacher_id', profile.id)
    setCourses(data || [])
  }

  const fetchVideos = async () => {
    setLoading(true)
    const coursesRes = await supabase.from('courses').select('id').eq('teacher_id', profile.id)
    const courseIds = (coursesRes.data || []).map(c => c.id)
    if (courseIds.length === 0) { setLoading(false); return }
    const { data } = await supabase.from('course_videos')
      .select('*, courses(title)')
      .in('course_id', courseIds)
      .order('created_at', { ascending: false })
    setVideos(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('course_videos').insert(form)
    
    // Notify enrolled students
    const enrollRes = await supabase.from('enrollments').select('student_id').eq('course_id', form.course_id)
    const notifs = (enrollRes.data || []).map(e => ({ user_id: e.student_id, content: `New video uploaded: ${form.title}` }))
    if (notifs.length > 0) await supabase.from('notifications').insert(notifs)
    
    setSaving(false)
    setShowForm(false)
    setForm({ course_id: '', title: '', youtube_url: '', description: '' })
    await fetchVideos()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return
    await supabase.from('course_videos').delete().eq('id', id)
    fetchVideos()
  }

  // Helper to extract YouTube ID
  const getSubYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">🎥 Video Courses</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '← Cancel' : '+ Add Video'}
        </button>
      </div>

      {showForm && (
        <div className="card border-purple-500/30 animate-fade-in">
          <h3 className="section-title mb-4">Add Course Video</h3>
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
                <label className="label">YouTube URL</label>
                <input type="text" className="input-field" placeholder="https://youtube.com/watch?v=..." value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Video Title</label>
              <input type="text" className="input-field" placeholder="Lesson 1: Introduction" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description (Optional)</label>
              <textarea className="input-field min-h-20 resize-none" placeholder="Video description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            
            {/* Preview */}
            {form.youtube_url && getSubYouTubeId(form.youtube_url) && (
              <div className="mt-2 rounded-xl overflow-hidden aspect-video border border-[#2a2a4a]">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${getSubYouTubeId(form.youtube_url)}`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen>
                </iframe>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleSave} className="btn-primary" disabled={saving || !form.course_id || !form.title || !form.youtube_url}>
                {saving ? 'Saving...' : '💾 Save Video'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="shimmer h-64 rounded-xl"></div>)}
        </div>
      ) : videos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🎥</p>
          <p className="text-white font-semibold">No videos added yet</p>
          <p className="text-[#9898b8] text-sm mt-1">Upload YouTube videos for your students</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {videos.map(v => {
            const ytId = getSubYouTubeId(v.youtube_url)
            return (
              <div key={v.id} className="card flex flex-col p-4">
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-[#2a2a4a] mb-3 bg-black">
                  {ytId ? (
                    <img src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} onError={(e) => {e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}} className="w-full h-full object-cover" alt="Video Thumbnail" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#9898b8]">Invalid URL</div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold line-clamp-1">{v.title}</h3>
                  <p className="text-[#9898b8] text-xs mt-1 bg-[#2a2a4a]/50 py-1 px-2 rounded w-max">📖 {v.courses?.title}</p>
                  <p className="text-[#9898b8] text-sm mt-2 line-clamp-2">{v.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#2a2a4a] flex justify-between items-center text-xs">
                  <span className="text-[#6060a0]">{new Date(v.created_at).toLocaleDateString()}</span>
                  <button onClick={() => handleDelete(v.id)} className="text-red-400 hover:text-red-300 font-medium">Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
