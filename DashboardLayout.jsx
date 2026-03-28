import React, { useState } from 'react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function DashboardLayout({ role, title, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#0d0d1a] overflow-hidden">
      <Sidebar role={role} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <TopNav role={role} title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
