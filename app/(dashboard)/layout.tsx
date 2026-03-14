'use client'

import { useState, useEffect } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import { Menu, X } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { lightColors, darkColors } from '@/lib/theme'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme } = useTheme()
  const c = theme === 'dark' ? darkColors : lightColors

  useEffect(() => {
    async function getUser() {
      const supabase = await (await import('@/lib/supabase/client')).createClient() // Use client-side for interactivity
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) return null

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--color-bg)',
      position: 'relative'
    }}>
      {/* Mobile Header Toggle */}
      <div className="mobile-dashboard-header" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 60,
        background: c.surface, borderBottom: `1px solid ${c.border}`,
        zIndex: 40, display: 'none', alignItems: 'center', padding: '0 16px', gap: 12
      }}>
        <button 
          onClick={() => setSidebarOpen(true)}
          style={{ 
            background: 'none', border: 'none', color: c.textPrimary, 
            cursor: 'pointer', display: 'flex', alignItems: 'center' 
          }}
        >
          <Menu size={24} />
        </button>
        <span style={{ fontWeight: 800, fontSize: '1rem', color: c.textPrimary, letterSpacing: '0.04em' }}>PLATFORM</span>
      </div>

      {/* Sidebar Wrapper for Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
          zIndex: 45, display: 'none', transition: 'opacity 0.3s'
        }}
      />

      <div className={`sidebar-container ${sidebarOpen ? 'open' : ''}`} style={{
          position: 'relative', height: '100vh', zIndex: 50, transition: 'transform 0.3s'
      }}>
          {sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(false)}
                style={{ 
                    position: 'absolute', top: 20, right: -40, background: c.surface, 
                    border: `1px solid ${c.border}`, borderRadius: '50%', padding: 8, 
                    cursor: 'pointer', zIndex: 60, display: 'none' 
                }}
                className="sidebar-close-btn"
              >
                  <X size={20} color={c.textPrimary} />
              </button>
          )}
          <Sidebar user={user} />
      </div>

      {/* Main content area — scrollable */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }} className="dashboard-main-content">
        {children}
      </main>

      <style>{`
          @media (max-width: 768px) {
              .mobile-dashboard-header { display: flex !important; }
              .sidebar-overlay.open { display: block !important; }
              .sidebar-container { 
                  position: fixed !important; 
                  left: 0; top: 0; 
                  transform: translateX(-100%); 
                  width: 240px;
              }
              .sidebar-container.open { transform: translateX(0); }
              .sidebar-close-btn { display: block !important; }
              .dashboard-main-content { padding-top: 80px !important; padding-left: 16px !important; padding-right: 16px !important; }
          }
      `}</style>
    </div>
  )
}
