import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Navbar } from './Navbar'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 72 : 240

  return (
    <div className="min-h-screen bg-higame-bg">
      {/* Sidebar Desktop */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Navbar */}
      <div style={{ marginLeft: `${sidebarWidth}px` }} className="hidden lg:block transition-all duration-300">
        <Navbar sidebarCollapsed={collapsed} />
      </div>
      <div className="lg:hidden">
        <Navbar sidebarCollapsed={false} />
      </div>

      {/* Main Content */}
      <main
        className="transition-all duration-300 pt-16 pb-20 lg:pb-6 min-h-screen"
        style={{ marginLeft: 0 }}
      >
        <div
          className="lg:transition-all lg:duration-300"
          style={{ marginLeft: `${sidebarWidth}px` }}
        >
          <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Bottom Navigation Mobile */}
      <BottomNav />
    </div>
  )
}
