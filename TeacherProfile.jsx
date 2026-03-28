import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TeacherProfile() {
  const { profile, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: profile?.name || '', subject: profile?.subject || '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ name: form.name, subject: form.subject }).eq('id', profile.id)
    if (!error) { await refreshProfile(); setSuccess(true); setEditing(false); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="section-title text-xl">👤 My Profile</h2>
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-3 text-sm">✅ Profile updated successfully!</div>}

      <div className="card">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-white font-black text-3xl">{profile?.name?.charAt(0)?.toUpperCase()}</div>
          <div>
            <h3 className="text-white text-2xl font-bold">{profile?.name}</h3>
            <p className="text-[#9898b8]">Teacher ID: {profile?.teacher_id}</p>
            <span className="badge bg-blue-600/20 text-blue-400 mt-1 inline-block">Teacher</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Teacher ID', value: profile?.teacher_id, icon: '🎫' },
            { label: 'Subject', value: profile?.subject, icon: '📚' },
            { label: 'Role', value: 'Teacher', icon: '👨‍🏫' },
          ].map(item => (
            <div key={item.label} className="bg-[#2a2a4a]/30 rounded-xl p-3">
              <p className="text-[#9898b8] text-xs mb-1">{item.icon} {item.label}</p>
              <p className="text-white font-semibold">{item.value || 'N/A'}</p>
            </div>
          ))}
        </div>

        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary">✏️ Edit Profile</button>
        ) : (
          <div className="space-y-4">
            <div><label className="label">Full Name</label><input type="text" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label">Subject</label><input type="text" className="input-field" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div className="flex gap-3">
              <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</button>
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
