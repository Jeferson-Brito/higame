import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Navbar } from './Navbar'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarOffset = collapsed ? 110 : 290 // width (80/260) + left (16) + gap (14)

  return (
    <div className="min-h-screen bg-higame-bg">
      {/* Sidebar Desktop */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Navbar */}
      <div style={{ paddingLeft: `${sidebarOffset}px` }} className="hidden lg:block transition-all duration-300 w-full fixed top-0 z-30">
        <div className="pt-4 pr-4">
          <Navbar sidebarCollapsed={collapsed} />
        </div>
      </div>
      <div className="lg:hidden w-full fixed top-0 z-30">
        <Navbar sidebarCollapsed={false} />
      </div>

      {/* Main Content */}
      <main className="transition-all duration-300 pt-24 pb-20 lg:pb-6 min-h-screen">
        <div
          className="lg:transition-all lg:duration-300"
          style={{ paddingLeft: `max(1rem, ${sidebarOffset}px)` }}
        >
          <div className="pr-4 sm:pr-6 py-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Bottom Navigation Mobile */}
      <BottomNav />
    </div>
  )
}
