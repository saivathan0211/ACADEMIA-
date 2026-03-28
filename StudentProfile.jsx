import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function StudentProfile() {
  const { profile, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: profile?.name || '', branch: profile?.branch || '', year: profile?.year || '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ name: form.name, branch: form.branch, year: parseInt(form.year) }).eq('id', profile.id)
    if (!error) { await refreshProfile(); setSuccess(true); setEditing(false); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  const infoItems = [
    { label: 'Roll Number', value: profile?.roll_number, icon: '🎫' },
    { label: 'Branch', value: profile?.branch, icon: '🏫' },
    { label: 'Year', value: profile?.year ? `${profile.year}${['st','nd','rd','th'][profile.year - 1] || 'th'} Year` : 'N/A', icon: '📅' },
    { label: 'Role', value: 'Student', icon: '🎓' },
  ]

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="section-title text-xl">👤 My Profile</h2>

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-3 text-sm">
          ✅ Profile updated successfully!
        </div>
      )}

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white font-black text-3xl">
            {profile?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h3 className="text-white text-2xl font-bold">{profile?.name}</h3>
            <p className="text-[#9898b8]">Roll No: {profile?.roll_number}</p>
            <span className="badge-purple mt-1 inline-block">Student</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {infoItems.map(item => (
            <div key={item.label} className="bg-[#2a2a4a]/30 rounded-xl p-3">
              <p className="text-[#9898b8] text-xs mb-1">{item.icon} {item.label}</p>
              <p className="text-white font-semibold">{item.value || 'N/A'}</p>
            </div>
          ))}
        </div>

        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary">
            ✏️ Edit Profile
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Branch</label>
                <select className="input-field" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
                  <option value="">Select Branch</option>
                  <option>CSE</option><option>ECE</option><option>ME</option><option>CE</option><option>EE</option>
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input-field" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option><option value="2">2nd Year</option>
                  <option value="3">3rd Year</option><option value="4">4th Year</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
