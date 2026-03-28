import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signUp = async (email, password, metadata) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { data, error }
}

// Utility helpers
export const updateCourseProgress = async (studentId, courseId) => {
  if (!studentId || !courseId) return 0

  // Count total tasks (assignments + quizzes) for this course
  const [assignRes, quizRes] = await Promise.all([
    supabase.from('assignments').select('id', { count: 'exact' }).eq('course_id', courseId),
    supabase.from('quizzes').select('id', { count: 'exact' }).eq('course_id', courseId),
  ])

  const totalTasks = (assignRes.count || 0) + (quizRes.count || 0)
  if (totalTasks === 0) {
    try {
      await supabase.from('enrollments').upsert({ student_id: studentId, course_id: courseId, progress: 0 }, { onConflict: 'student_id,course_id' })
    } catch (e) {
      // Fallback if unique constraint not present
      await supabase.from('enrollments').update({ progress: 0 }).eq('student_id', studentId).eq('course_id', courseId)
    }
    return 0
  }

  // Completed assignment submissions
  const completedAssignRes = await supabase
    .from('submissions')
    .select('id', { count: 'exact' })
    .eq('student_id', studentId)
    .in(
      'assignment_id',
      (assignRes.data || []).map(a => a.id)
    )

  // Completed quiz attempts
  const completedQuizRes = await supabase
    .from('quiz_attempts')
    .select('id', { count: 'exact' })
    .eq('student_id', studentId)
    .in(
      'quiz_id',
      (quizRes.data || []).map(q => q.id)
    )

  const completedTasks = (completedAssignRes.count || 0) + (completedQuizRes.count || 0)
  const progress = Math.round((completedTasks / totalTasks) * 100)

  try {
    await supabase.from('enrollments').upsert({ student_id: studentId, course_id: courseId, progress }, { onConflict: 'student_id,course_id' })
  } catch (e) {
    // Fallback when the DB doesn't enforce a unique constraint
    await supabase.from('enrollments').update({ progress }).eq('student_id', studentId).eq('course_id', courseId)
  }
  return progress
}

export const fetchResilientCourses = async (teacherId) => {
  // Try full selection first
  const { data, error } = await supabase.from('courses')
    .select('id, title, branch, year, category, enrollments(count)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  if (error && error.code === 'PGRST204') { // Column not found
    console.warn('Full course fetch failed, retrying minimal selection...', error.message)
    return await supabase.from('courses')
      .select('id, title')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
  }
  return { data, error }
}

export const insertNotification = async (payload) => {

  // Payload can be a single object or an array
  const items = Array.isArray(payload) ? payload : [payload]
  
  // Try 'content' first, fallback to 'message' if it fails
  const { error } = await supabase.from('notifications').insert(items)
  
  if (error && /content/i.test(error.message)) {
    const legacyItems = items.map(item => ({
      user_id: item.user_id,
      title: 'Notification',
      message: item.content,
      is_read: false
    }))
    return await supabase.from('notifications').insert(legacyItems)
  }
  return { error }
}

export const upsertMark = async (studentId, courseId, score, grade = null, comments = null) => {

  if (!studentId || !courseId || score === undefined || score === null) return
  const payload = { student_id: studentId, course_id: courseId, score, grade, comments }
  try {
    await supabase.from('marks').upsert(payload, { onConflict: 'student_id,course_id' })
  } catch (e) {
    // Fallback if DB doesn't enforce uniqueness
    await supabase.from('marks').insert(payload)
  }
}

