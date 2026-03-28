import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function StudentVideos() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [videos, setVideos] = useState([])
  const [activeCourse, setActiveCourse] = useState('all')
  const [playingVideo, setPlayingVideo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    if (profile) fetchData() 
    
    const channel = supabase.channel('student-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_videos' }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const enrollRes = await supabase.from('enrollments').select('course_id, courses(id, title)').eq('student_id', profile.id)
    const enrolledCourses = (enrollRes.data || []).map(e => ({ id: e.courses.id, title: e.courses.title }))
    setCourses(enrolledCourses)

    const courseIds = enrolledCourses.map(c => c.id)
    if (courseIds.length === 0) { setLoading(false); return }

    const { data } = await supabase.from('course_videos')
      .select('*, courses(title)')
      .in('course_id', courseIds)
      .order('created_at', { ascending: false })
    
    setVideos(data || [])
    setLoading(false)
  }

  const getSubYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const filteredVideos = activeCourse === 'all' ? videos : videos.filter(v => v.course_id === activeCourse)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">🎥 Course Videos</h2>
        <select className="input-field max-w-xs text-sm py-2" value={activeCourse} onChange={e => setActiveCourse(e.target.value)}>
          <option value="all">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {playingVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-[#12122a] rounded-2xl overflow-hidden border border-[#2a2a4a] shadow-2xl animate-fade-in relative">
            <div className="p-4 border-b border-[#2a2a4a] flex justify-between items-center">
              <h3 className="text-white font-bold">{playingVideo.title}</h3>
              <button onClick={() => setPlayingVideo(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a4a] text-white hover:bg-red-500 transition-colors">✕</button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe 
                width="100%" height="100%" 
                src={`https://www.youtube.com/embed/${getSubYouTubeId(playingVideo.youtube_url)}?autoplay=1`} 
                title="Course Video" frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen>
              </iframe>
            </div>
            {playingVideo.description && (
              <div className="p-4 bg-[#0d0d1a]">
                <p className="text-[#9898b8] text-sm">{playingVideo.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="shimmer h-64 rounded-xl"></div>)}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-white font-semibold">No videos available</p>
          <p className="text-[#9898b8] text-sm mt-1">Check back later for new lesson uploads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVideos.map(v => {
            const ytId = getSubYouTubeId(v.youtube_url)
            return (
              <div key={v.id} onClick={() => setPlayingVideo(v)} className="card p-4 cursor-pointer hover:border-purple-500/50 transition-colors group flex flex-col">
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-[#2a2a4a] mb-3 relative bg-black">
                  {ytId ? (
                    <>
                      <img src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} onError={(e) => {e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Video Thumbnail" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center text-2xl pl-1 shadow-[0_0_20px_rgba(168,85,247,0.5)]">▶</div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#9898b8]">Invalid Video</div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold line-clamp-1 group-hover:text-purple-400 transition-colors">{v.title}</h3>
                  <p className="text-purple-400 text-xs mt-1 font-medium">{v.courses?.title}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
