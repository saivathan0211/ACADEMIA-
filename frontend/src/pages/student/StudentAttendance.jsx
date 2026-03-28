import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function StudentAttendance() {
  const { profile } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchAttendance() }, [profile])

  const fetchAttendance = async () => {
    setLoading(true)
    const { data } = await supabase.from('attendance')
      .select('*, courses(title)')
      .eq('student_id', profile.id)
      .order('date', { ascending: false })
    setAttendance(data || [])
    setLoading(false)
  }

  const present = attendance.filter(a => a.status === 'present').length
  const absent = attendance.filter(a => a.status === 'absent').length
  const total = attendance.length
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0

  const chartData = {
    labels: ['Present', 'Absent'],
    datasets: [{
      data: [present || 0.1, absent || 0.1], // Small values to keep ring visible if 0
      backgroundColor: ['rgba(168, 85, 247, 0.8)', 'rgba(42, 42, 74, 0.6)'],
      hoverBackgroundColor: ['#a855f7', '#3a3a5a'],
      borderColor: ['#a855f7', '#2a2a4a'],
      borderWidth: 0,
      borderRadius: 10,
      hoverOffset: 4
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        enabled: true,
        backgroundColor: '#1a1a35',
        titleColor: '#fff',
        bodyColor: '#9898b8',
        padding: 10,
        cornerRadius: 8,
        displayColors: false
      },
    },
    cutout: '82%',
  }

  // Group by course
  const byCourse = attendance.reduce((acc, a) => {
    const key = a.courses?.title || 'Unknown'
    if (!acc[key]) acc[key] = { present: 0, absent: 0 }
    acc[key][a.status]++
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">✅ Attendance</h2>

      {loading ? (
        <div className="shimmer h-48 rounded-2xl"></div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Overall Chart */}
            <div className="card flex flex-col items-center gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-600/10 transition-colors duration-500"></div>
              <h3 className="section-title w-full flex items-center justify-between">
                Overall Attendance
                <span className="text-[10px] uppercase tracking-wider text-[#9898b8] bg-[#2a2a4a] px-2 py-1 rounded-md">Real-time</span>
              </h3>
              
              {/* Custom Legend moved above chart for better visibility like in reference but styled better */}
              <div className="flex gap-4 w-full justify-center text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#a855f7]"></div>
                  <span className="text-[#9898b8]">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#2a2a4a] border border-[#3a3a5a]"></div>
                  <span className="text-[#9898b8]">Absent</span>
                </div>
              </div>

              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[10px] border-[#2a2a4a]/30"></div>
                <Doughnut data={chartData} options={chartOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-white drop-shadow-lg tracking-tight">{percentage}%</span>
                  <span className="text-[#9898b8] text-[10px] uppercase font-bold tracking-widest mt-0.5">Attendance</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 w-full">
                <div className="text-center p-3 rounded-2xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 transition-colors">
                  <p className="text-green-400 font-black text-2xl tracking-tighter">{present}</p>
                  <p className="text-[#9898b8] text-[10px] uppercase font-bold mt-1">Present</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                  <p className="text-red-400 font-black text-2xl tracking-tighter">{absent}</p>
                  <p className="text-[#9898b8] text-[10px] uppercase font-bold mt-1">Absent</p>
                </div>
              </div>

              {percentage < 75 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-4 py-3 text-xs w-full flex items-center gap-3 relative group/alert">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="font-semibold">Requirement Alert:</span>
                  <span className="text-[#9898b8]">Below 75% threshold</span>
                  <div className="absolute inset-0 rounded-2xl bg-red-500/0 group-hover/alert:bg-red-500/5 transition-colors pointer-events-none"></div>
                </div>
              )}
            </div>

            {/* By Course */}
            <div className="card lg:col-span-2">
              <h3 className="section-title mb-4">By Course</h3>
              {Object.keys(byCourse).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">📊</p>
                  <p className="text-[#9898b8] text-sm">No attendance records yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(byCourse).map(([course, data]) => {
                    const total = data.present + data.absent
                    const pct = Math.round((data.present / total) * 100)
                    return (
                      <div key={course}>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-white text-sm font-semibold">{course}</p>
                          <span className={`badge ${pct >= 75 ? 'badge-green' : 'badge-red'}`}>{pct}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 75 ? 'linear-gradient(to right, #22c55e, #16a34a)' : 'linear-gradient(to right, #ef4444, #dc2626)' }}></div>
                        </div>
                        <p className="text-[#9898b8] text-xs mt-1">{data.present}/{total} classes attended</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Attendance History */}
          <div className="card">
            <h3 className="section-title mb-4">📋 Attendance History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Course</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-[#9898b8]">No attendance records</td></tr>
                  ) : attendance.map(a => (
                    <tr key={a.id}>
                      <td className="table-cell">{new Date(a.date).toLocaleDateString()}</td>
                      <td className="table-cell">{a.courses?.title || 'N/A'}</td>
                      <td className="table-cell">
                        <span className={`badge ${a.status === 'present' ? 'badge-green' : 'badge-red'} capitalize`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
