import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function StudentNotifications() {
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    if (profile) fetchNotifs() 

    const channel = supabase.channel('student-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile?.id}` }, () => fetchNotifs())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const fetchNotifs = async () => {
    setLoading(true)
    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
    setNotifs(data || [])
    setLoading(false)
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title text-xl">🔔 Notifications</h2>
          {unreadCount > 0 && <p className="text-[#9898b8] text-sm mt-1">{unreadCount} unread notifications</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">Mark all as read</button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="shimmer h-16 rounded-xl"></div>)}</div>
      ) : notifs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-white font-semibold">All caught up!</p>
          <p className="text-[#9898b8] text-sm mt-1">No notifications at the moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id} onClick={() => markRead(n.id)}
              className={`card cursor-pointer flex items-start gap-4 ${!n.is_read ? 'border-purple-500/30 bg-purple-600/5' : ''}`}>
              <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${!n.is_read ? 'bg-purple-500' : 'bg-[#2a2a4a]'}`}></div>
              <div className="flex-1">
                <p className={`text-sm ${!n.is_read ? 'text-white font-medium' : 'text-[#9898b8]'}`}>
                  {n.content || n.message || n.title || 'New Notification'}
                </p>
                <p className="text-xs text-[#6060a0] mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
