import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export default function StudentMarks() {
  const { profile } = useAuth()
  const [marks, setMarks] = useState([])
  const [quizAttempts, setQuizAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const [marksRes, quizRes] = await Promise.all([
      supabase.from('marks').select('*, courses(title)').eq('student_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('quiz_attempts').select('*, quizzes(title, courses(title))').eq('student_id', profile.id).order('completed_at', { ascending: false }),
    ])
    setMarks(marksRes.data || [])
    setQuizAttempts(quizRes.data || [])
    setLoading(false)
  }

  const avg = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + (m.score || 0), 0) / marks.length) : 0
  const quizAvg = quizAttempts.length > 0 ? Math.round(quizAttempts.reduce((s, q) => s + (q.score || 0), 0) / quizAttempts.length) : 0

  const handleDownloadPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`${profile?.name} - Academic Report`, 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)

    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Average Score: ${avg}%`, 14, 45)
    doc.text(`Quiz Average: ${quizAvg}%`, 14, 52)
    doc.text(`Courses Graded: ${marks.length}`, 80, 45)
    doc.text(`Quizzes Taken: ${quizAttempts.length}`, 80, 52)

    doc.setFontSize(14)
    doc.text('Course Marks', 14, 70)
    
    const courseData = marks.map(m => [
      m.courses?.title || 'N/A', 
      `${m.score}%`, 
      m.grade || (m.score >= 90 ? 'A' : m.score >= 70 ? 'B' : m.score >= 50 ? 'C' : 'F')
    ])

    doc.autoTable({
      startY: 75,
      head: [['Course', 'Score', 'Grade']],
      body: courseData,
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247] }
    })

    const finalY = doc.lastAutoTable.finalY || 75
    
    doc.setFontSize(14)
    doc.text('Quiz Scores', 14, finalY + 15)
    
    const quizData = quizAttempts.map(a => [
      a.quizzes?.title || 'N/A', 
      `${a.score}%`, 
      new Date(a.completed_at).toLocaleDateString()
    ])

    doc.autoTable({
      startY: finalY + 20,
      head: [['Quiz', 'Score', 'Completed On']],
      body: quizData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    })

    doc.save(`${profile?.name?.replace(/\s+/g, '_')}_Academic_Report.pdf`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="section-title text-xl mb-0">📊 Marks & Grades</h2>
        <button onClick={handleDownloadPDF} className="btn-primary flex items-center gap-2 text-sm" disabled={loading}>
          <span>📥</span> Download PDF Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Average Score', value: `${avg}%`, icon: '🎯', color: 'from-purple-600 to-purple-800' },
          { label: 'Quiz Average', value: `${quizAvg}%`, icon: '📝', color: 'from-blue-600 to-blue-800' },
          { label: 'Courses Graded', value: marks.length, icon: '📖', color: 'from-green-600 to-green-800' },
          { label: 'Quizzes Taken', value: quizAttempts.length, icon: '✅', color: 'from-yellow-600 to-yellow-800' },
        ].map(c => (
          <div key={c.label} className="card">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-xl mb-2`}>{c.icon}</div>
            <p className="text-3xl font-black text-white">{loading ? '...' : c.value}</p>
            <p className="text-[#9898b8] text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="section-title mb-4">📊 Course Marks</h3>
          {loading ? <div className="shimmer h-32 rounded-xl"></div> : marks.length === 0 ? (
            <p className="text-[#9898b8] text-sm text-center py-8">No marks recorded yet</p>
          ) : (
            <table className="w-full">
              <thead><tr>
                <th className="table-header">Course</th>
                <th className="table-header">Score</th>
                <th className="table-header">Grade</th>
              </tr></thead>
              <tbody>
                {marks.map(m => (
                  <tr key={m.id}>
                    <td className="table-cell">{m.courses?.title || 'N/A'}</td>
                    <td className="table-cell"><span className="text-purple-400 font-bold">{m.score}%</span></td>
                    <td className="table-cell">
                      <span className={`badge ${m.score >= 90 ? 'badge-green' : m.score >= 70 ? 'badge-purple' : 'badge-red'}`}>{m.grade || (m.score >= 90 ? 'A' : m.score >= 70 ? 'B' : m.score >= 50 ? 'C' : 'F')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 className="section-title mb-4">🎯 Quiz Scores</h3>
          {loading ? <div className="shimmer h-32 rounded-xl"></div> : quizAttempts.length === 0 ? (
            <p className="text-[#9898b8] text-sm text-center py-8">No quizzes attempted yet</p>
          ) : (
            <table className="w-full">
              <thead><tr>
                <th className="table-header">Quiz</th>
                <th className="table-header">Score</th>
                <th className="table-header">Date</th>
              </tr></thead>
              <tbody>
                {quizAttempts.map(a => (
                  <tr key={a.id}>
                    <td className="table-cell">{a.quizzes?.title || 'N/A'}</td>
                    <td className="table-cell"><span className={`font-bold ${a.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>{a.score}%</span></td>
                    <td className="table-cell text-[#9898b8] text-xs">{new Date(a.completed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
