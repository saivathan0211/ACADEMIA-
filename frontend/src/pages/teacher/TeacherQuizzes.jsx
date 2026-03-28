import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const EMPTY_QUIZ = { title: '', course_id: '', questions: [] }
const EMPTY_Q = { question: '', options: ['', '', '', ''], correct: 0 }

export default function TeacherQuizzes() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [quiz, setQuiz] = useState(EMPTY_QUIZ)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) { fetchCourses(); fetchQuizzes() } }, [profile])

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').eq('teacher_id', profile.id)
    setCourses(data || [])
  }

  const fetchQuizzes = async () => {
    setLoading(true)
    const coursesRes = await supabase.from('courses').select('id').eq('teacher_id', profile.id)
    const courseIds = (coursesRes.data || []).map(c => c.id)
    if (courseIds.length === 0) { setLoading(false); return }
    const { data } = await supabase.from('quizzes').select('*, courses(title)').in('course_id', courseIds).order('created_at', { ascending: false })
    setQuizzes(data || [])
    setLoading(false)
  }

  const addQuestion = () => setQuiz(q => ({ ...q, questions: [...q.questions, { ...EMPTY_Q, options: ['', '', '', ''] }] }))
  
  const updateQuestion = (idx, field, value) => setQuiz(q => ({
    ...q, questions: q.questions.map((question, i) => i === idx ? { ...question, [field]: value } : question)
  }))

  const updateOption = (qIdx, oIdx, value) => setQuiz(q => ({
    ...q, questions: q.questions.map((question, i) => i === qIdx ? { ...question, options: question.options.map((o, oi) => oi === oIdx ? value : o) } : question)
  }))

  const removeQuestion = (idx) => setQuiz(q => ({ ...q, questions: q.questions.filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    if (!quiz.title || !quiz.course_id || quiz.questions.length === 0) return
    setSaving(true)
    await supabase.from('quizzes').insert({ title: quiz.title, course_id: quiz.course_id, questions: quiz.questions })
    
    // Notify enrolled students
    const enrollRes = await supabase.from('enrollments').select('student_id').eq('course_id', quiz.course_id)
    const notifs = (enrollRes.data || []).map(e => ({ user_id: e.student_id, content: `🎯 New quiz posted: "${quiz.title}" — Take it now in Quizzes!` }))
    if (notifs.length > 0) await supabase.from('notifications').insert(notifs)
    
    setSaving(false); setShowForm(false); setQuiz(EMPTY_QUIZ)
    await fetchQuizzes()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quiz?')) return
    await supabase.from('quizzes').delete().eq('id', id)
    await fetchQuizzes()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title text-xl">🎯 Quizzes</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? '← Cancel' : '+ Create Quiz'}</button>
      </div>

      {showForm && (
        <div className="card border-purple-500/30 animate-fade-in space-y-5">
          <h3 className="section-title">Create Quiz</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Quiz Title</label>
              <input type="text" className="input-field" placeholder="e.g. Chapter 1 Quiz" value={quiz.title} onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Course</label>
              <select className="input-field" value={quiz.course_id} onChange={e => setQuiz(q => ({ ...q, course_id: e.target.value }))}>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {quiz.questions.map((q, qi) => (
              <div key={qi} className="bg-[#2a2a4a]/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Question {qi + 1}</p>
                  <button onClick={() => removeQuestion(qi)} className="text-red-400 text-xs hover:text-red-300">Remove</button>
                </div>
                <input type="text" className="input-field" placeholder="Enter question..." value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={q.correct === oi} onChange={() => updateQuestion(qi, 'correct', oi)} className="accent-purple-500" />
                      <input type="text" className="input-field py-2 text-sm" placeholder={`Option ${oi + 1}`} value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
                    </div>
                  ))}
                </div>
                <p className="text-[#9898b8] text-xs">Select the radio button next to the correct answer</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button onClick={addQuestion} className="btn-secondary">+ Add Question</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving || !quiz.title || !quiz.course_id || quiz.questions.length === 0}>
              {saving ? 'Saving...' : '💾 Save Quiz'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="shimmer h-32 rounded-xl"></div>)}</div>
      ) : quizzes.length === 0 ? (
        <div className="card text-center py-12"><p className="text-4xl mb-3">🎯</p><p className="text-white font-semibold">No quizzes yet</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(q => (
            <div key={q.id} className="card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-white font-bold">{q.title}</h3>
                <button onClick={() => handleDelete(q.id)} className="text-red-400 hover:text-red-300 text-xs">🗑️</button>
              </div>
              <p className="text-[#9898b8] text-sm">📖 {q.courses?.title}</p>
              <p className="text-[#9898b8] text-sm">❓ {(q.questions || []).length} questions</p>
              <p className="text-[#9898b8] text-xs mt-2">Created {new Date(q.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
