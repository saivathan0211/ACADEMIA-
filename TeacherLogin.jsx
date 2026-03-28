import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, supabase } from '../../lib/supabase'

export default function TeacherLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')

    const { data, error: signInError } = await signIn(email, password)

    if (signInError) { setError('Invalid Email or Password'); setLoading(false); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile || profile.role !== 'teacher') {
      await supabase.auth.signOut()
      setError('This account is not a teacher account.')
      setLoading(false); return
    }
    navigate('/teacher')
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black gradient-text">ACADEMIA</Link>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-3xl">📚</span>
            <h2 className="text-2xl font-bold text-white">Teacher Login</h2>
          </div>
          <p className="text-[#9898b8] mt-2 text-sm">Sign in with your email address</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input-field" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input-field" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-purple-400 hover:text-purple-300">Forgot Password?</Link>
            </div>
            <button type="submit" className="btn-primary justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }} disabled={loading}>
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-[#9898b8] text-sm mt-5">
            Don't have an account?{' '}
            <Link to="/teacher/register" className="text-blue-400 hover:text-blue-300 font-medium">Register here</Link>
          </p>
        </div>

        <p className="text-center mt-4">
          <Link to="/" className="text-[#9898b8] text-xs hover:text-white">← Back to role selection</Link>
        </p>
      </div>
    </div>
  )
}
