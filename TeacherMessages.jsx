import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TeacherMessages() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { if (profile) fetchStudents() }, [profile])
  useEffect(() => { if (selectedStudent) { fetchMessages(); } }, [selectedStudent])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchStudents = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'student')
    setStudents(data || [])
  }

  const fetchMessages = async () => {
    if (!selectedStudent || !profile) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selectedStudent.id}),and(sender_id.eq.${selectedStudent.id},receiver_id.eq.${profile.id})`)
      .order('created_at')
    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedStudent) return
    setSending(true)
    await supabase.from('messages').insert({ sender_id: profile.id, receiver_id: selectedStudent.id, content: newMsg.trim() })
    await supabase.from('notifications').insert({ user_id: selectedStudent.id, content: `New message from ${profile.name}` })
    setNewMsg('')
    await fetchMessages()
    setSending(false)
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4">
      <div className="w-64 flex-shrink-0 card overflow-y-auto">
        <h3 className="section-title mb-4">💬 Students</h3>
        <div className="space-y-2">
          {students.map(s => (
            <button key={s.id} onClick={() => setSelectedStudent(s)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${selectedStudent?.id === s.id ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-[#2a2a4a]/40'}`}>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-sm">{s.name.charAt(0)}</div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{s.name}</p>
                <p className="text-[#9898b8] text-xs">{s.roll_number}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      {selectedStudent ? (
        <div className="flex-1 card flex flex-col gap-0 p-0 overflow-hidden">
          <div className="p-4 border-b border-[#2a2a4a] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-bold text-sm">{selectedStudent.name.charAt(0)}</div>
            <div><p className="text-white font-semibold text-sm">{selectedStudent.name}</p><p className="text-[#9898b8] text-xs">{selectedStudent.roll_number}</p></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
          <div className="p-4 border-t border-[#2a2a4a] flex gap-2">
            <input type="text" className="input-field flex-1" placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage} className="btn-primary" disabled={sending || !newMsg.trim()}>➤</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 card flex items-center justify-center">
          <div className="text-center"><p className="text-5xl mb-4">💬</p><p className="text-white font-semibold">Select a student to message</p></div>
        </div>
      )}
    </div>
  )
}
