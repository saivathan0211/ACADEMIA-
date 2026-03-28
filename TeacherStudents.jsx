import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TeacherStudents() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState({ branch: '', year: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchStudents() }, [profile])

  const fetchStudents = async () => {
    setLoading(true)
    let q = supabase.from('profiles').select('*, attendance(status)').eq('role', 'student')
    if (filter.branch) q = q.eq('branch', filter.branch)
    if (filter.year) q = q.eq('year', filter.year)
    const { data } = await q
    setStudents(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchStudents() }, [filter])

  const getAttendance = (att) => {
    if (!att || att.length === 0) return 0
    const present = att.filter(a => a.status === 'present').length
    return Math.round((present / att.length) * 100)
  }

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.roll_number?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">👥 Students ({filtered.length})</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" className="input-field w-48" placeholder="Search by name or roll..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field w-36" value={filter.branch} onChange={e => setFilter(f => ({ ...f, branch: e.target.value }))}>
          <option value="">All Branches</option>
          <option>CSE</option><option>ECE</option><option>ME</option><option>CE</option><option>EE</option>
        </select>
        <select className="input-field w-32" value={filter.year} onChange={e => setFilter(f => ({ ...f, year: e.target.value }))}>
          <option value="">All Years</option>
          <option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option>
        </select>
      </div>

      {loading ? (
        <div className="shimmer h-64 rounded-2xl"></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">Name</th>
                <th className="table-header">Roll No</th>
                <th className="table-header">Branch</th>
                <th className="table-header">Year</th>
                <th className="table-header">Attendance</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#9898b8]">No students found</td></tr>
              ) : filtered.map((s, i) => {
                const att = getAttendance(s.attendance)
                return (
                  <tr key={s.id} className="hover:bg-[#2a2a4a]/20 transition-colors">
                    <td className="table-cell text-[#9898b8]">{i + 1}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white text-xs font-bold">{s.name.charAt(0)}</div>
                        <span className="text-white font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-purple-400">{s.roll_number}</td>
                    <td className="table-cell">{s.branch || 'N/A'}</td>
                    <td className="table-cell">{s.year ? `Year ${s.year}` : 'N/A'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-20"><div className="progress-fill" style={{ width: `${att}%`, background: att >= 75 ? 'linear-gradient(to right, #22c55e, #16a34a)' : 'linear-gradient(to right, #ef4444, #dc2626)' }}></div></div>
                        <span className={`text-xs font-bold ${att >= 75 ? 'text-green-400' : 'text-red-400'}`}>{att}%</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${att >= 75 ? 'badge-green' : 'badge-red'}`}>{att >= 75 ? 'Good' : 'At Risk'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
