import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, updateCourseProgress, upsertMark } from '../../lib/supabase'

export default function StudentQuizzes() {
  const { profile } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [attempts, setAttempts] = useState({})
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (profile) fetchData()

    // Real-time subscription for new quizzes
    const channel = supabase.channel('student-quizzes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const enrollRes = await supabase.from('enrollments').select('course_id').eq('student_id', profile.id)
    const courseIds = (enrollRes.data || []).map(e => e.course_id)

    if (courseIds.length === 0) {
      setLoading(false)
      return
    }

    const [qRes, aRes] = await Promise.all([
      supabase.from('quizzes').select('*, courses(title)').in('course_id', courseIds).order('created_at', { ascending: false }),
      supabase.from('quiz_attempts').select('quiz_id, score, completed_at').eq('student_id', profile.id),
    ])
    setQuizzes(qRes.data || [])
    const attMap = {}
    ;(aRes.data || []).forEach(a => { attMap[a.quiz_id] = a })
    setAttempts(attMap)
    setLoading(false)
  }

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return
    setSubmitting(true)
    const questions = activeQuiz.questions || []
    let score = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) score++
    })
    const finalScore = Math.round((score / questions.length) * 100)
    await supabase.from('quiz_attempts').insert({
      quiz_id: activeQuiz.id,
      student_id: profile.id,
      score: finalScore,
      completed_at: new Date().toISOString(),
    })

    // Update enrollment progress for this course
    if (activeQuiz.course_id) {
      await updateCourseProgress(profile.id, activeQuiz.course_id)
      await upsertMark(profile.id, activeQuiz.course_id, finalScore)
    }

    setResult({ score: finalScore, total: questions.length, correct: score })
    setAttempts(prev => ({ ...prev, [activeQuiz.id]: { score: finalScore, completed_at: new Date().toISOString() } }))
    setSubmitting(false)
  }

  if (activeQuiz) {
    const questions = activeQuiz.questions || []
    const answeredCount = Object.keys(answers).length
    const progress = Math.round((answeredCount / questions.length) * 100)

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveQuiz(null); setAnswers({}); setResult(null) }}
            className="btn-secondary"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h2 className="section-title text-xl mb-0">{activeQuiz.title}</h2>
            <p className="text-[#9898b8] text-xs mt-1">📖 {activeQuiz.courses?.title}</p>
          </div>
        </div>

        {result ? (
          <div className="card text-center py-12 animate-fade-in">
            <div className="text-7xl mb-4">{result.score >= 70 ? '🎉' : result.score >= 50 ? '📚' : '😕'}</div>
            <h3 className="text-4xl font-black text-white mb-2">{result.score}%</h3>
            <p className="text-[#9898b8] mt-2">{result.correct} out of {result.total} correct answers</p>
            <div className={`badge mt-4 mx-auto inline-block text-base py-1.5 px-4 ${result.score >= 70 ? 'badge-green' : 'badge-red'}`}>
              {result.score >= 70 ? '✅ Passed!' : '❌ Failed'}
            </div>
            {result.score < 70 && (
              <p className="text-[#9898b8] text-sm mt-3">Don't worry, you can retake this quiz anytime!</p>
            )}
            <button
              onClick={() => { setActiveQuiz(null); setAnswers({}); setResult(null) }}
              className="btn-primary mt-6"
            >
              Back to Quizzes
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="card p-3 flex items-center gap-4">
              <span className="text-white text-sm font-medium">{answeredCount}/{questions.length}</span>
              <div className="flex-1 progress-bar">
                <div className="progress-fill transition-all" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-[#9898b8] text-sm">{progress}% done</span>
            </div>

            {questions.map((q, i) => (
              <div key={i} className={`card transition-all ${answers[i] !== undefined ? 'border-purple-500/30' : ''}`}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-white font-semibold">{q.question}</p>
                </div>
                <div className="space-y-2 ml-10">
                  {q.options.map((opt, j) => (
                    <label
                      key={j}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        answers[i] === j
                          ? 'bg-purple-600/20 border border-purple-500/50 text-white'
                          : 'bg-[#2a2a4a]/30 hover:bg-[#2a2a4a]/60 text-[#9898b8]'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${i}`}
                        className="accent-purple-500"
                        checked={answers[i] === j}
                        onChange={() => setAnswers(prev => ({ ...prev, [i]: j }))}
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleSubmitQuiz}
              className="btn-primary w-full justify-center"
              disabled={answeredCount < questions.length || submitting}
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Grading...</>
              ) : answeredCount < questions.length ? (
                `Answer all questions (${answeredCount}/${questions.length})`
              ) : (
                '✅ Submit Quiz'
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">🎯 Quizzes</h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="shimmer h-40 rounded-xl"></div>)}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-white font-semibold">No quizzes available yet</p>
          <p className="text-[#9898b8] text-sm mt-1">
            Make sure you are enrolled in a course — quizzes will appear here automatically as your teacher posts them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(quiz => {
            const attempt = attempts[quiz.id]
            const attempted = attempt !== undefined
            const passed = attempted && attempt.score >= 70
            return (
              <div key={quiz.id} className={`card flex flex-col gap-3 ${!attempted ? 'border-purple-500/20' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{quiz.title}</h3>
                    <p className="text-[#9898b8] text-sm mt-1">📖 {quiz.courses?.title}</p>
                  </div>
                  {attempted ? (
                    <span className={`badge flex-shrink-0 ${passed ? 'badge-green' : 'badge-red'}`}>
                      {passed ? '✅ Passed' : '❌ Failed'}
                    </span>
                  ) : (
                    <span className="badge-purple flex-shrink-0">🆕 New</span>
                  )}
                </div>

                <div className="flex gap-4 text-sm text-[#9898b8]">
                  <span>❓ {(quiz.questions || []).length} questions</span>
                  {attempted && <span>📅 {new Date(attempt.completed_at).toLocaleDateString()}</span>}
                </div>

                {attempted && (
                  <div className="bg-[#2a2a4a]/40 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-[#9898b8] text-sm">Your Score</span>
                    <span className={`text-2xl font-black ${passed ? 'text-green-400' : 'text-red-400'}`}>
                      {attempt.score}%
                    </span>
                  </div>
                )}

                <button
                  onClick={() => { setActiveQuiz(quiz); setAnswers({}); setResult(null) }}
                  className={`w-full ${attempted ? 'btn-secondary' : 'btn-primary'} justify-center mt-auto`}
                >
                  {attempted ? '🔄 Retake Quiz' : '▶ Start Quiz'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
