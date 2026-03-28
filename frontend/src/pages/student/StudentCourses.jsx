import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function StudentCourses() {
  const { profile } = useAuth()
  const [allCourses, setAllCourses] = useState([])
  const [enrolled, setEnrolled] = useState({}) // map: courseId -> progress
  const [courseAverages, setCourseAverages] = useState({})
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(null)

  useEffect(() => {
    if (profile) fetchData()

    const channel1 = supabase.channel('student-courses-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => fetchData())
      .subscribe()

    const channel2 = supabase.channel('student-enrollments-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel1)
      supabase.removeChannel(channel2)
    }
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    const [coursesRes, enrollRes] = await Promise.all([
      // Show all courses that match the student's branch/year OR all courses if no branch set
      supabase.from('courses').select('id, title, branch, year, category, profiles(name)'),
        supabase.from('enrollments').select('course_id, progress').eq('student_id', profile.id),

    ])


    const allFetched = coursesRes.data || []
    const enrolledMap = {}
    ;(enrollRes.data || []).forEach(e => { enrolledMap[e.course_id] = e.progress || 0 })

    // Filter by branch/year if student has those set AND the columns exist in courses
    const matching = profile.branch && allFetched.length > 0 && allFetched[0].branch !== undefined
      ? allFetched.filter(c => c.branch === profile.branch && c.year === profile.year)
      : allFetched


    // Fetch class-average progress for enrolled courses (advanced progress insight)
    const averageMap = {}
    const enrolledIds = Object.keys(enrolledMap)
    if (enrolledIds.length > 0) {
      const avgRes = await supabase
        .from('enrollments')
        .select('course_id, progress')
        .in('course_id', enrolledIds)

      const byCourse = {}
      ;(avgRes.data || []).forEach(r => {
        if (!byCourse[r.course_id]) byCourse[r.course_id] = []
        byCourse[r.course_id].push(r.progress || 0)
      })

      Object.entries(byCourse).forEach(([course_id, values]) => {
        const avg = values.length > 0 ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0
        averageMap[course_id] = avg
      })
    }

    setAllCourses(matching)
    setEnrolled(enrolledMap)
    setCourseAverages(averageMap)
    setLoading(false)
  }

  const handleEnroll = async (courseId) => {
    setEnrolling(courseId)
    await supabase.from('enrollments').upsert(
      { student_id: profile.id, course_id: courseId, progress: 0 },
      { onConflict: 'student_id,course_id' }
    )
    await supabase.from('notifications').insert({
      user_id: profile.id,
      content: 'You enrolled in a new course! Check your Assignments and Quizzes.',
    })
    setEnrolled(prev => ({ ...prev, [courseId]: 0 }))
    setEnrolling(null)
  }

  const handleUnenroll = async (courseId) => {
    if (!window.confirm('Are you sure you want to unenroll from this course?')) return
    await supabase.from('enrollments').delete().eq('student_id', profile.id).eq('course_id', courseId)
    setEnrolled(prev => {
      const next = { ...prev }
      delete next[courseId]
      return next
    })
  }

  const tabs = ['all', 'enrolled', 'available']
  const enrolledIds = Object.keys(enrolled)
  const filtered =
    activeTab === 'enrolled'
      ? allCourses.filter(c => enrolledIds.includes(c.id))
      : activeTab === 'available'
      ? allCourses.filter(c => !enrolledIds.includes(c.id))
      : allCourses

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title text-xl">📖 Courses</h2>
          {profile?.branch && (
            <p className="text-[#9898b8] text-xs mt-1">
              Showing courses for {profile.branch} · Year {profile.year}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                activeTab === t ? 'bg-purple-600 text-white' : 'bg-[#2a2a4a] text-[#9898b8] hover:text-white'
              }`}
            >
              {t}
              {t === 'enrolled' && <span className="ml-1 bg-purple-800 text-white text-xs rounded px-1">{enrolledIds.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      {enrolledIds.length === 0 && !loading && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300">
          💡 <strong>Tip:</strong> Click <strong>Enroll Now</strong> on a course to start learning. Once enrolled, its Assignments and Quizzes will appear in your dashboard automatically!
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="shimmer h-48 rounded-2xl"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-white font-semibold">No courses found</p>
          <p className="text-[#9898b8] text-sm mt-1">
            {activeTab === 'enrolled' ? 'You have not enrolled in any courses yet.' : 'Check back later for new courses from your teacher.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(course => {
            const isEnrolled = enrolled[course.id] !== undefined
            return (
              <div key={course.id} className={`card flex flex-col gap-4 transition-all ${isEnrolled ? 'border-purple-500/30' : ''}`}>
                <div className="h-28 rounded-xl bg-gradient-to-br from-purple-800 to-purple-600 flex items-center justify-center text-5xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <span className="relative">📖</span>
                  {isEnrolled && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      ✓ Enrolled
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold">{course.title}</h3>
                  <p className="text-[#9898b8] text-sm mt-1 line-clamp-2">{course.description || 'No description available'}</p>
                  <div className="flex gap-2 flex-wrap mt-2">
                    <span className="text-[#6060a0] text-xs">👨‍🏫 {course.profiles?.name || 'Unknown Teacher'}</span>
                    {(course.branch || course.year) && (
                      <span className="text-[#6060a0] text-xs">• {course.branch || 'N/A'}{course.year ? ` · Year ${course.year}` : ''}</span>
                    )}
                  </div>
                </div>


                {isEnrolled ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#9898b8] mb-1">
                      <span>Your Progress</span>
                      <span>{enrolled[course.id] ?? 0}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${enrolled[course.id] ?? 0}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-[#9898b8]">
                      <span>Class average</span>
                      <span className={courseAverages[course.id] >= (enrolled[course.id] ?? 0) ? 'text-green-400' : 'text-yellow-300'}>
                        {courseAverages[course.id] ?? 0}%
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnenroll(course.id)}
                      className="w-full btn-secondary text-red-400 text-sm hover:text-red-300 mt-1"
                    >
                      Unenroll
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEnroll(course.id)}
                    className="btn-primary justify-center w-full"
                    disabled={enrolling === course.id}
                  >
                    {enrolling === course.id ? 'Enrolling...' : '+ Enroll Now'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
