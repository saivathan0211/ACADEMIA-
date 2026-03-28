import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function StudentMessages() {
  const { profile } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { if (profile) fetchTeachers() }, [profile])

  useEffect(() => {
    if (selectedTeacher) {
      fetchMessages()
      const channel = supabase.channel('messages-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchMessages())
        .subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [selectedTeacher])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchTeachers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'teacher')
    setTeachers(data || [])
  }

  const fetchMessages = async () => {
    if (!selectedTeacher || !profile) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selectedTeacher.id}),and(sender_id.eq.${selectedTeacher.id},receiver_id.eq.${profile.id})`)
      .order('created_at')
    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedTeacher) return
    setSending(true)
    await supabase.from('messages').insert({ sender_id: profile.id, receiver_id: selectedTeacher.id, content: newMsg.trim() })
    setNewMsg('')
    await fetchMessages()
    setSending(false)
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4">
      {/* Teacher List */}
      <div className="w-64 flex-shrink-0 card overflow-y-auto">
        <h3 className="section-title mb-4">💬 Messages</h3>
        <div className="space-y-2">
          {teachers.map(t => (
            <button key={t.id} onClick={() => setSelectedTeacher(t)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${selectedTeacher?.id === t.id ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-[#2a2a4a]/40'}`}>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {t.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{t.name}</p>
                <p className="text-[#9898b8] text-xs">{t.subject}</p>
              </div>
            </button>
          ))}
          {teachers.length === 0 && <p className="text-[#9898b8] text-sm text-center py-4">No teachers available</p>}
        </div>
      </div>

      {/* Chat Window */}
      {selectedTeacher ? (
        <div className="flex-1 card flex flex-col gap-0 p-0 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#2a2a4a] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-white font-bold text-sm">
              {selectedTeacher.name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{selectedTeacher.name}</p>
              <p className="text-[#9898b8] text-xs">{selectedTeacher.subject}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8"><p className="text-[#9898b8] text-sm">Start a conversation with {selectedTeacher.name}</p></div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${m.sender_id === profile.id ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-[#2a2a4a] text-white rounded-bl-sm'}`}>
                  {m.content}
                  <p className="text-xs opacity-60 mt-1 text-right">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef}></div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#2a2a4a] flex gap-2">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Type your message..."
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="btn-primary" disabled={sending || !newMsg.trim()}>
              {sending ? '...' : '➤'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 card flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-white font-semibold">Select a teacher to start chatting</p>
            <p className="text-[#9898b8] text-sm mt-1">Send messages to your teachers</p>
          </div>
        </div>
      )}
    </div>
  )
}
