import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, updateCourseProgress } from '../../lib/supabase'

export default function StudentAssignments() {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [uploading, setUploading] = useState(null)
  const [textSubmit, setTextSubmit] = useState({})
  const [loading, setLoading] = useState(true)
  const [enrolledCount, setEnrolledCount] = useState(null)

  useEffect(() => {
    if (profile) fetchData()

    const channel = supabase.channel('student-assignments-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const enrollRes = await supabase.from('enrollments').select('course_id').eq('student_id', profile.id)
    const courseIds = (enrollRes.data || []).map(e => e.course_id)
    setEnrolledCount(courseIds.length)

    if (courseIds.length === 0) { setLoading(false); return }

    const [asnRes, subRes] = await Promise.all([
      supabase.from('assignments').select('*, courses(title)').in('course_id', courseIds).order('due_date'),
      supabase.from('submissions').select('assignment_id, grade, feedback, submitted_at, file_url').eq('student_id', profile.id),
    ])
    setAssignments(asnRes.data || [])
    const subMap = {}
    ;(subRes.data || []).forEach(s => { subMap[s.assignment_id] = s })
    setSubmissions(subMap)
    setLoading(false)
  }

  const handleUpload = async (assignmentId, file) => {
    setUploading(assignmentId)
    const fileName = `${profile.id}/${assignmentId}/${Date.now()}_${file.name}`
    const { data: uploadData, error } = await supabase.storage.from('submissions').upload(fileName, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(fileName)
      await supabase.from('submissions').upsert({
        assignment_id: assignmentId,
        student_id: profile.id,
        file_url: publicUrl,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'assignment_id,student_id' })

      const assignment = assignments.find(a => a.id === assignmentId)
      if (assignment) {
        await updateCourseProgress(profile.id, assignment.course_id)
      }

      await fetchData()
    }
    setUploading(null)
  }

  const handleTextSubmit = async (assignmentId) => {
    const text = textSubmit[assignmentId]
    if (!text?.trim()) return
    setUploading(assignmentId)
    await supabase.from('submissions').upsert({
      assignment_id: assignmentId,
      student_id: profile.id,
      file_url: `text:${text.trim()}`,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'assignment_id,student_id' })

    const assignment = assignments.find(a => a.id === assignmentId)
    if (assignment) {
      await updateCourseProgress(profile.id, assignment.course_id)
    }

    setTextSubmit(prev => ({ ...prev, [assignmentId]: '' }))
    await fetchData()
    setUploading(null)
  }

  const isPastDue = (dueDate) => new Date(dueDate) < new Date()

  const pending = assignments.filter(a => !submissions[a.id])
  const submitted = assignments.filter(a => submissions[a.id])

  return (
    <div className="space-y-5">
      <h2 className="section-title text-xl">📝 Assignments</h2>

      {enrolledCount === 0 && !loading && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-white font-semibold">No assignments yet</p>
          <p className="text-[#9898b8] text-sm mt-1">
            Enroll in courses from the <strong>My Courses</strong> page — assignments posted by your teacher will appear here automatically.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="shimmer h-28 rounded-xl"></div>)}</div>
      ) : assignments.length === 0 && enrolledCount > 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-white font-semibold">No assignments posted yet</p>
          <p className="text-[#9898b8] text-sm mt-1">Your teacher hasn't posted any assignments. Check back soon!</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {assignments.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: assignments.length, color: 'text-white' },
                { label: 'Pending', value: pending.length, color: 'text-yellow-400' },
                { label: 'Submitted', value: submitted.length, color: 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="card text-center py-3">
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[#9898b8] text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {assignments.map(asn => {
              const sub = submissions[asn.id]
              const overdue = isPastDue(asn.due_date) && !sub
              const isTextSub = sub?.file_url?.startsWith('text:')
              return (
                <div key={asn.id} className={`card ${overdue ? 'border-red-500/30' : sub ? 'border-green-500/20' : 'border-purple-500/20'}`}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-bold">{asn.title}</h3>
                        {sub ? (
                          <span className="badge-green">✅ Submitted</span>
                        ) : overdue ? (
                          <span className="badge-red">⛔ Overdue</span>
                        ) : (
                          <span className="badge-yellow">⏳ Pending</span>
                        )}
                      </div>
                      <p className="text-[#9898b8] text-sm">{asn.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-[#6060a0]">
                        <span>📖 {asn.courses?.title}</span>
                        <span>⏰ Due: {asn.due_date ? new Date(asn.due_date).toLocaleString() : 'No deadline'}</span>
                      </div>

                      {sub?.grade && (
                        <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-green-400 font-black text-2xl">{sub.grade}/100</span>
                            {sub.grade >= 70 ? (
                              <span className="badge-green text-xs">Passed</span>
                            ) : (
                              <span className="badge-red text-xs">Failed</span>
                            )}
                          </div>
                          {sub.feedback && <p className="text-[#9898b8] text-xs mt-2">💬 Feedback: {sub.feedback}</p>}
                        </div>
                      )}

                      {sub && !sub.grade && (
                        <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2 text-xs text-yellow-400">
                          ⏳ Submitted on {new Date(sub.submitted_at).toLocaleDateString()} · Awaiting grade
                          {isTextSub && (
                            <p className="text-[#9898b8] mt-1 italic">"{sub.file_url.replace('text:', '')}"</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submission actions */}
                    {!sub && !overdue && (
                      <div className="flex flex-col gap-2 min-w-40">
                        <label className="btn-primary cursor-pointer text-center text-sm">
                          {uploading === asn.id ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>Uploading...</>
                          ) : (
                            '📎 Upload File'
                          )}
                          <input
                            type="file"
                            className="hidden"
                            onChange={e => handleUpload(asn.id, e.target.files[0])}
                            disabled={uploading === asn.id}
                          />
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Or type answer..."
                            value={textSubmit[asn.id] || ''}
                            onChange={e => setTextSubmit(prev => ({ ...prev, [asn.id]: e.target.value }))}
                            className="input-field py-2 text-sm flex-1 min-w-0"
                          />
                          <button
                            onClick={() => handleTextSubmit(asn.id)}
                            disabled={!textSubmit[asn.id]?.trim() || uploading === asn.id}
                            className="btn-secondary text-sm px-3"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}

                    {sub && sub.file_url && !isTextSub && (
                      <a href={sub.file_url} target="_blank" rel="noreferrer" className="btn-secondary text-sm text-blue-400">
                        📎 View Submission
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
