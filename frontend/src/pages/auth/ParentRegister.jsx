import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp, supabase } from '../../lib/supabase'

export default function ParentRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ rollNumber: '', name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')

    // Verify student exists
    const { data: student } = await supabase.from('profiles').select('id').eq('roll_number', form.rollNumber).eq('role', 'student').single()
    if (!student) { setError('No student found with that roll number. Please check and try again.'); setLoading(false); return }

    const { data, error: signUpError } = await signUp(form.email, form.password, {
      role: 'parent', name: form.name, email: form.email, student_roll_number: form.rollNumber,
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id, role: 'parent', name: form.name, email: form.email, roll_number: form.rollNumber,
    })

    if (profileError) { setError(profileError.message); setLoading(false); return }
    navigate('/parent')
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-700/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black gradient-text">ACADEMIA</Link>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-3xl">👨‍👩‍👧</span>
            <h2 className="text-2xl font-bold text-white">Parent Registration</h2>
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>}
            <div>
              <label className="label">Student Roll Number</label>
              <input name="rollNumber" type="text" className="input-field" placeholder="Your child's roll number" value={form.rollNumber} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Parent Name</label>
              <input name="name" type="text" className="input-field" placeholder="Your full name" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input name="email" type="email" className="input-field" placeholder="your@email.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" className="input-field" placeholder="Create a password" value={form.password} onChange={handleChange} required minLength={6} />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input name="confirm" type="password" className="input-field" placeholder="Confirm password" value={form.confirm} onChange={handleChange} required />
            </div>

            <button type="submit" className="btn-primary justify-center mt-2" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }} disabled={loading}>
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Registering...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-[#9898b8] text-sm mt-5">
            Already have an account?{' '}
            <Link to="/parent/login" className="text-green-400 hover:text-green-300 font-medium">Login here</Link>
          </p>
        </div>

        <p className="text-center mt-4">
          <Link to="/" className="text-[#9898b8] text-xs hover:text-white">← Back to role selection</Link>
        </p>
      </div>
    </div>
  )
}
