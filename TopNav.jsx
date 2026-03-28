import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TopNav({ role, title, onMenuClick }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [notifCount, setNotifCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile) return
    fetchNotifications()
    // Realtime subscription
    const channel = supabase.channel('notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
        fetchNotifications()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile])

  const fetchNotifications = async () => {
    if (!profile) return
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifs(data || [])
    setNotifCount((data || []).filter(n => !n.is_read).length)
  }

  const markAllRead = async () => {
    if (!profile) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    setNotifCount(0)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const rolePaths = { student: '/student', teacher: '/teacher', parent: '/parent' }

  return (
    <header className="h-16 bg-[#12122a] border-b border-[#2a2a4a] flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-[#9898b8] hover:text-white p-2 rounded-lg hover:bg-[#2a2a4a] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-white font-semibold text-lg">{title || 'Dashboard'}</h1>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex items-center gap-2 bg-[#1a1a35] border border-[#2a2a4a] rounded-xl px-4 py-2 w-64 focus-within:border-purple-500 transition-colors">
        <svg className="w-4 h-4 text-[#9898b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-white text-sm outline-none w-full placeholder-[#9898b8]"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Right: Notifs + Profile */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-[#9898b8] hover:text-white hover:bg-[#2a2a4a] rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 card shadow-2xl z-50 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm">Notifications</h3>
                <button onClick={markAllRead} className="text-xs text-purple-400 hover:text-purple-300">Mark all read</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-[#9898b8] text-sm text-center py-4">No notifications</p>
                ) : notifs.map(n => (
                  <div key={n.id} className={`p-3 rounded-xl text-sm ${n.is_read ? 'bg-[#2a2a4a]/30' : 'bg-purple-600/10 border border-purple-500/20'}`}>
                    <p className={n.is_read ? 'text-[#9898b8]' : 'text-white'}>{n.content}</p>
                    <p className="text-xs text-[#6060a0] mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <button
          onClick={() => navigate(`${rolePaths[role]}/profile`)}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#2a2a4a] transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-xs">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span className="hidden sm:block text-white text-sm font-medium max-w-24 truncate">{profile?.name?.split(' ')[0]}</span>
        </button>
      </div>
    </header>
  )
}
