import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function StudentLiveClasses() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    if (profile) fetchData() 
    
    // Realtime sync for live classes
    const channel = supabase.channel('student-live-classes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const enrollRes = await supabase.from('enrollments').select('course_id').eq('student_id', profile.id)
    const courseIds = (enrollRes.data || []).map(e => e.course_id)
    if (courseIds.length === 0) { setLoading(false); return }

    const { data } = await supabase.from('live_classes')
      .select('*, courses(title, profiles(name))')
      .in('course_id', courseIds)
      .order('start_time', { ascending: true })
    
    setClasses(data || [])
    setLoading(false)
  }

  const upcomingClasses = classes.filter(c => new Date(c.start_time) >= new Date(Date.now() - 3600000)) // Include classes that started up to 1 hr ago
  const pastClasses = classes.filter(c => new Date(c.start_time) < new Date(Date.now() - 3600000))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">📹 Live Classes</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div className="space-y-4">
          <h3 className="section-title">🔴 Upcoming & Ongoing</h3>
          {loading ? (
            <div className="shimmer h-32 rounded-xl"></div>
          ) : upcomingClasses.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-white font-semibold flex items-center justify-center gap-2">No upcoming live classes</p>
            </div>
          ) : (
            upcomingClasses.map(c => {
              const now = new Date()
              const start = new Date(c.start_time)
              const end = new Date(start.getTime() + c.duration_minutes * 60000)
              const isOngoing = now >= start && now <= end
              
              return (
                <div key={c.id} className={`card border relative overflow-hidden ${isOngoing ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-purple-500/30'}`}>
                  {isOngoing && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-bold text-lg">{c.title}</h3>
                        {isOngoing && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse"><span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE</span>}
                      </div>
                      <p className="text-[#9898b8] text-sm font-medium">📖 {c.courses?.title}</p>
                      <p className="text-[#6060a0] text-xs mt-1">👨‍🏫 {c.courses?.profiles?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <p className="text-[#9898b8] text-xs">{start.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#2a2a4a] flex items-center justify-between">
                    <span className="text-[#9898b8] text-xs flex items-center gap-1">⏱ {c.duration_minutes} mins</span>
                    <a href={c.zoom_link} target="_blank" rel="noreferrer" 
                      className={`px-6 py-2 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 ${isOngoing ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}
                    >
                      {isOngoing ? 'Join Now' : 'Join Link'}
                    </a>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Past */}
        <div className="space-y-4">
          <h3 className="section-title text-[#9898b8]">⚪ Past Classes</h3>
          {pastClasses.length === 0 ? (
            <p className="text-[#6060a0] text-sm px-4">No recorded past classes here.</p>
          ) : (
            <div className="space-y-3">
              {pastClasses.map(c => (
                <div key={c.id} className="card bg-[#2a2a4a]/20 border-transparent p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-[#9898b8] font-bold">{c.title}</h3>
                    <p className="text-[#6060a0] text-xs mt-1">{c.courses?.title} • {new Date(c.start_time).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[#6060a0] text-xs font-medium px-2 py-1 bg-[#2a2a4a]/50 rounded">Ended</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
