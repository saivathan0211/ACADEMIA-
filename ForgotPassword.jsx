import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: resetError } = await resetPassword(email)
    if (resetError) { setError(resetError.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black gradient-text">ACADEMIA</Link>
          <div className="mt-4">
            <span className="text-3xl">🔒</span>
            <h2 className="text-2xl font-bold text-white mt-2">Forgot Password</h2>
            <p className="text-[#9898b8] text-sm mt-1">We'll send you a reset link</p>
          </div>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-white font-bold text-lg">Check your email!</h3>
              <p className="text-[#9898b8] text-sm mt-2">A password reset link has been sent to <strong className="text-purple-400">{email}</strong></p>
              <Link to="/" className="btn-primary mt-6 justify-center inline-flex">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}
              <div>
                <label className="label">Email Address</label>
                <input type="email" className="input-field" placeholder="Enter your registered email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary justify-center" disabled={loading}>
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Sending...</> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-4">
          <Link to="/" className="text-[#9898b8] text-xs hover:text-white">← Back to role selection</Link>
        </p>
      </div>
    </div>
  )
}
