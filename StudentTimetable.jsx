import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function StudentTimetable() {
  const { profile } = useAuth()
  const [timetable, setTimetable] = useState([])
  const [view, setView] = useState('week') // 'week' or 'today'
  const [loading, setLoading] = useState(true)
  const today = new Date().getDay()

  useEffect(() => { if (profile) fetchTimetable() }, [profile])

  const fetchTimetable = async () => {
    setLoading(true)
    const { data } = await supabase.from('timetable')
      .select('*, courses(title), profiles(name)')
      .eq('branch', profile.branch)
      .eq('year', profile.year)
      .order('day_of_week')
      .order('start_time')
    setTimetable(data || [])
    setLoading(false)
  }

  const formatTime = (t) => {
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  const todayClasses = timetable.filter(t => t.day_of_week === today)
  const displayItems = view === 'today' ? todayClasses : timetable

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">📅 Timetable</h2>
        <div className="flex gap-2">
          {['today', 'week'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${view === v ? 'bg-purple-600 text-white' : 'bg-[#2a2a4a] text-[#9898b8] hover:text-white'}`}>
              {v === 'today' ? "Today's Classes" : 'Weekly View'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="shimmer h-20 rounded-xl"></div>)}</div>
      ) : view === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.slice(1, 6).map((day, idx) => {
            const dayClasses = timetable.filter(t => t.day_of_week === idx + 1)
            return (
              <div key={day} className={`card ${idx + 1 === today ? 'border-purple-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold text-sm ${idx + 1 === today ? 'text-purple-400' : 'text-white'}`}>{day}</h3>
                  {idx + 1 === today && <span className="badge-purple text-xs">Today</span>}
                </div>
                {dayClasses.length === 0 ? (
                  <p className="text-[#9898b8] text-xs">No classes</p>
                ) : (
                  <div className="space-y-2">
                    {dayClasses.map(cls => (
                      <div key={cls.id} className="bg-[#2a2a4a]/40 rounded-xl p-3">
                        <p className="text-white text-sm font-semibold">{cls.courses?.title}</p>
                        <p className="text-purple-400 text-xs mt-1">{formatTime(cls.start_time)} – {formatTime(cls.end_time)}</p>
                        <p className="text-[#9898b8] text-xs">👨‍🏫 {cls.profiles?.name}</p>
                        {cls.room_link && (
                          <a href={cls.room_link} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline">🔗 Join class</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <h3 className="font-bold text-white mb-4">📅 {DAYS[today]}'s Classes</h3>
          {todayClasses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-white font-semibold">No classes today!</p>
              <p className="text-[#9898b8] text-sm mt-1">Enjoy your free day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((cls) => (
                <div key={cls.id} className="flex items-center gap-4 p-4 bg-[#2a2a4a]/40 rounded-xl">
                  <div className="text-center w-20 flex-shrink-0">
                    <p className="text-purple-400 font-bold text-sm">{formatTime(cls.start_time)}</p>
                    <p className="text-[#9898b8] text-xs">{formatTime(cls.end_time)}</p>
                  </div>
                  <div className="w-0.5 h-10 bg-purple-600/30"></div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{cls.courses?.title}</p>
                    <p className="text-[#9898b8] text-sm">👨‍🏫 {cls.profiles?.name}</p>
                  </div>
                  {cls.room_link ? (
                    <a href={cls.room_link} target="_blank" rel="noreferrer" className="btn-primary text-xs py-1.5">Join</a>
                  ) : <span className="badge bg-[#2a2a4a] text-[#9898b8]">On-site</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {timetable.length === 0 && !loading && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-white font-semibold">No timetable yet</p>
          <p className="text-[#9898b8] text-sm mt-1">Your teacher hasn't set up a schedule yet</p>
        </div>
      )}
    </div>
  )
}
