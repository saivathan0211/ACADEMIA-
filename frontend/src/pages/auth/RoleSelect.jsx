import React from 'react'
import { useNavigate } from 'react-router-dom'

const roles = [
  {
    key: 'student',
    label: 'Student',
    icon: '🎓',
    desc: 'Access courses, quizzes, and track your progress',
    color: 'from-purple-600 to-purple-800',
    border: 'border-purple-500/30 hover:border-purple-500',
  },
  {
    key: 'teacher',
    label: 'Teacher',
    icon: '📚',
    desc: 'Manage classes, create assignments, and track attendance',
    color: 'from-blue-600 to-blue-800',
    border: 'border-blue-500/30 hover:border-blue-500',
  },
  {
    key: 'parent',
    label: 'Parent',
    icon: '👨‍👩‍👧',
    desc: 'Monitor your child\'s academic progress and attendance',
    color: 'from-green-600 to-green-800',
    border: 'border-green-500/30 hover:border-green-500',
  },
]

export default function RoleSelect() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center p-6">
      {/* Glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-3xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black gradient-text mb-3">ACADEMIA</h1>
          <p className="text-[#9898b8] text-lg">Modern Learning Management System</p>
        </div>

        <h2 className="text-center text-white text-2xl font-bold mb-8">Who are you?</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.key}
              onClick={() => navigate(`/${role.key}/login`)}
              className={`card border ${role.border} cursor-pointer group flex flex-col items-center text-center gap-4 p-8 hover:scale-105`}
            >
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-4xl shadow-lg`}>
                {role.icon}
              </div>
              <div>
                <h3 className="text-white text-xl font-bold">{role.label}</h3>
                <p className="text-[#9898b8] text-sm mt-1">{role.desc}</p>
              </div>
              <button className="btn-primary w-full justify-center">
                Login as {role.label}
              </button>
              <p
                className="text-[#9898b8] text-xs hover:text-purple-400 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); navigate(`/${role.key}/register`) }}
              >
                Don't have an account? <span className="text-purple-400 font-medium">Register</span>
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-[#9898b8] text-sm mt-10">
          © 2024 Academia LMS. All rights reserved.
        </p>
      </div>
    </div>
  )
}
